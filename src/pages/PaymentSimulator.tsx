// src/pages/PaymentSimulator.tsx
// Simulateur de paiement MTN MoMo USSD
// Flow : Formulaire → Téléphone simulé (USSD) → Polling statut → Résultat
// L'utilisateur contrôle manuellement la réponse téléphone (confirmer / refuser / timeout)

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import client from '../lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type SimState =
  | 'idle'          // Formulaire vierge
  | 'initiating'    // Appel POST en cours
  | 'waiting_phone' // En attente interaction USSD simulée
  | 'confirming'    // PIN confirmé, polling en cours
  | 'success'       // Transaction SUCCESSFUL
  | 'failed'        // Transaction FAILED
  | 'cancelled'     // Utilisateur a refusé
  | 'timeout'       // Timeout polling

interface PaymentForm {
  amount: number
  phone: string
  name: string
  ref: string
  description: string
  scenario: 'success' | 'failure' | 'timeout'
}

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'ok' | 'err' | 'warn'
}

interface TxResult {
  txId: string
  providerRef?: string
  status: string
  amount: number
  duration: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtXAF(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

async function initiatePayment(form: PaymentForm, apiKey: string) {
  const res = await client.post('/api/Payment', {
    amount:   form.amount,
    currency: 'XAF',
    provider: 'MOCK',
    customer: {
      phoneNumber: form.phone,
      name:        form.name,
      email:       'test@stpay.local',
    },
    merchant: {
      reference:   form.ref,
      callbackUrl: `${window.location.origin}/callback`,
      name:        'ST Pay Simulator',
    },
    description: form.description,
    metadata: { simulatorMode: true, scenario: form.scenario },
  })
  return res.data as { transactionId?: string; id?: string; providerReference?: string }
}

async function fetchStatus(txId: string) {
  const res = await client.get(`/api/Payment/${txId}`)
  return res.data as { status?: string; Status?: string; providerReference?: string }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Configurer' },
    { n: 2, label: 'Téléphone' },
    { n: 3, label: 'Résultat' },
  ]
  return (
    <div className="flex bg-[var(--bg-page)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
      {steps.map(({ n, label }, i) => {
        const done   = n < current
        const active = n === current
        return (
          <div key={n}
               className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2
                           text-[12px] transition-colors
                           ${i > 0 ? 'border-l border-[var(--border)]' : ''}
                           ${done   ? 'bg-[var(--green-bg)] text-[var(--green)]' : ''}
                           ${active ? 'bg-[var(--orange-bg)] text-[var(--orange-dark)] font-bold' : ''}
                           ${!done && !active ? 'text-[var(--text-3)]' : ''}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center
                             text-[10px] font-bold flex-shrink-0
                             ${done   ? 'bg-[var(--green)] text-white' : ''}
                             ${active ? 'text-white' : 'bg-[var(--border)] text-[var(--text-3)]'}` }
                 style={active ? { background: 'var(--orange)' } : {}}>
              {done ? '✓' : n}
            </div>
            {label}
          </div>
        )
      })}
    </div>
  )
}

// ─── Event log ────────────────────────────────────────────────────────────────

function EventLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [entries])

  const COLOR: Record<string, string> = {
    ok:   'text-[var(--green)]',
    err:  'text-[var(--red)]',
    warn: 'text-[var(--amber)]',
    info: 'text-[var(--blue)]',
  }

  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Journal d'événements</span></div>
      <div ref={ref}
           className="p-3 font-mono text-[11px] leading-relaxed bg-[var(--bg-subtle)]
                      overflow-y-auto space-y-0.5"
           style={{ minHeight: 80, maxHeight: 180 }}>
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[var(--text-4)] flex-shrink-0">{e.time}</span>
            <span className={COLOR[e.type] ?? 'text-[var(--text-2)]'}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Simulated phone ──────────────────────────────────────────────────────────

type PhoneScreen = 'idle' | 'ussd' | 'processing' | 'success' | 'failed' | 'cancelled'

interface PhoneProps {
  screen:    PhoneScreen
  txId?:     string
  amount?:   number
  ref_?:     string
  desc?:     string
  onConfirm: (pin: string) => void
  onCancel:  () => void
  onReset:   () => void
  polling:   boolean
  pollCount: number
}

function SimulatedPhone({
  screen, txId, amount, ref_, desc,
  onConfirm, onCancel, onReset,
  polling, pollCount,
}: PhoneProps) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => { setPin(''); setPinError(false) }, [screen])

  const dialKey = (k: string) => {
    if (screen !== 'ussd') return
    if (pin.length < 5) setPin((p) => p + k)
  }

  const handleConfirm = () => {
    if (screen !== 'ussd') return
    if (pin.length < 4) {
      setPinError(true)
      setTimeout(() => setPinError(false), 1200)
      return
    }
    onConfirm(pin)
  }

  const handleDel = () => {
    if (screen !== 'ussd') return
    setPin((p) => p.slice(0, -1))
  }

  // Current time for idle screen
  const [clockTime, setClockTime] = useState(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  const clockDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone chassis */}
      <div style={{
        width: 240,
        background: '#1A1A1A',
        borderRadius: 36,
        padding: '14px 10px',
        border: '3px solid #333',
      }}>
        {/* Notch */}
        <div style={{ width: 70, height: 8, background: '#333', borderRadius: 4, margin: '0 auto 10px' }} />

        {/* Screen */}
        <div style={{ background: '#000', borderRadius: 20, overflow: 'hidden', minHeight: 300 }}>

          {/* Status bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 12px 4px', background: '#000', color: 'white',
            fontFamily: 'DM Mono, monospace', fontSize: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              {[4, 6, 8, 10].map((h) => (
                <div key={h} style={{ width: 3, height: h, background: 'white', borderRadius: 1 }} />
              ))}
            </div>
            <span style={{ letterSpacing: 1 }}>MTN CM</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
              <span>4G</span>
              <div style={{ width: 18, height: 9, border: '1.5px solid white', borderRadius: 2, display: 'flex', alignItems: 'center', padding: '1px 1.5px' }}>
                <div style={{ width: '70%', height: '100%', background: 'white', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* IDLE */}
          {screen === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '28px 16px', minHeight: 220 }}>
              <div style={{ fontSize: 30, fontWeight: 300, color: 'white', fontFamily: 'DM Mono, monospace', letterSpacing: 3 }}>{clockTime}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: 'DM Mono, monospace', marginTop: 4, textAlign: 'center' }}>{clockDate}</div>
              <div style={{ marginTop: 20, background: '#FFD700', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>MTN MoMo</div>
              <div style={{ marginTop: 8, fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>En attente d'une requête USSD...</div>
            </div>
          )}

          {/* USSD prompt */}
          {screen === 'ussd' && (
            <div style={{ display: 'flex', flexDirection: 'column', background: '#000', padding: '8px 8px 10px' }}>
              <div style={{ background: '#FFD700', padding: '6px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#000', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
                MTN Mobile Money — *126#
              </div>
              <div style={{ background: '#FFFDE7', padding: '10px', borderRadius: '0 0 4px 4px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#000', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>PAIEMENT MOBILE MONEY</div>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>Transaction ID:</div>
                <div style={{ fontSize: 9, wordBreak: 'break-all', marginBottom: 6, color: '#333' }}>
                  {txId?.slice(0, 28)}...
                </div>
                <div style={{ fontSize: 10, color: '#555' }}>Marchand:</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{ref_}</div>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, borderTop: '1px solid #E0D800', borderBottom: '1px solid #E0D800', padding: '5px 0', margin: '6px 0' }}>
                  {amount ? fmtXAF(amount) : '—'}
                </div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Motif:</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>{desc}</div>

                {/* PIN input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>PIN:</span>
                  <div style={{
                    flex: 1, background: 'white',
                    border: `1px solid ${pinError ? '#C02020' : '#333'}`,
                    borderRadius: 3, padding: '3px 6px',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 14, letterSpacing: 5,
                    color: '#000', textAlign: 'center',
                    minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border .2s',
                  }}>
                    {pin ? '•'.repeat(pin.length) : <span style={{ color: '#BBB', fontSize: 11 }}>_ _ _ _ _</span>}
                  </div>
                </div>
                {pinError && <p style={{ fontSize: 9, color: '#C02020', textAlign: 'center', margin: '4px 0 0', fontFamily: 'DM Mono, monospace' }}>PIN incomplet (min. 4 chiffres)</p>}

                <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#0A5A0A', fontWeight: 700 }}>OK → Confirmer</div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#7A1010', fontWeight: 700 }}>✕ → Refuser</div>
                </div>
              </div>
            </div>
          )}

          {/* Processing */}
          {screen === 'processing' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, border: '3px solid #FFD700', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ color: '#FFD700', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700 }}>TRAITEMENT...</div>
              <div style={{ color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 6 }}>
                {polling ? `Poll #${pollCount} en cours...` : 'Validation MTN MoMo'}
              </div>
            </div>
          )}

          {/* Success */}
          {screen === 'success' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#0A3A0A', border: '2px solid #1A7A40', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M5 11.5l4.5 4.5 8-8" stroke="#1A7A40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>PAIEMENT RÉUSSI</div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700 }}>{amount ? fmtXAF(amount) : ''}</div>
              <div style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 9, marginTop: 8 }}>débités sur votre compte MTN MoMo</div>
              <div style={{ marginTop: 12, background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 2, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>MTN MoMo</div>
            </div>
          )}

          {/* Failed / Cancelled */}
          {(screen === 'failed' || screen === 'cancelled') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#3A0A0A', border: '2px solid #C02020', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M6 6l10 10M16 6L6 16" stroke="#C02020" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {screen === 'cancelled' ? 'TRANSACTION ANNULÉE' : 'PAIEMENT ÉCHOUÉ'}
              </div>
              <div style={{ color: '#666', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
                {screen === 'cancelled' ? 'Vous avez refusé le paiement' : 'Une erreur est survenue'}
              </div>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div style={{ background: '#111', padding: 8, borderRadius: '0 0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginTop: 0 }}>
          {['1','2','3','4','5','6','7','8','9'].map((k) => (
            <button key={k} onClick={() => dialKey(k)}
                    style={{ background: '#2A2A2A', border: 'none', borderRadius: 6, color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
              {k}
            </button>
          ))}
          <button onClick={handleDel}
                  style={{ background: '#3A2A1A', border: 'none', borderRadius: 6, color: '#F59E0B', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            ⌫
          </button>
          <button onClick={() => dialKey('0')}
                  style={{ background: '#2A2A2A', border: 'none', borderRadius: 6, color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            0
          </button>
          <button onClick={screen === 'ussd' ? handleConfirm : onReset}
                  style={{ background: screen === 'ussd' ? '#0A3A0A' : '#1A1A1A', border: 'none', borderRadius: 6, color: screen === 'ussd' ? '#22C55E' : '#555', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            OK
          </button>
          <button onClick={screen === 'ussd' ? onCancel : onReset}
                  style={{ background: '#3A0A0A', border: 'none', borderRadius: 6, color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer', gridColumn: '1 / span 2' }}>
            ✕
          </button>
          <button
                  style={{ background: '#0A1A3A', border: 'none', borderRadius: 6, color: '#3B82F6', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            #
          </button>
        </div>
        <div style={{ width: 36, height: 6, background: '#333', borderRadius: 3, margin: '8px auto 2px' }} />
      </div>

      {/* Phone hint */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', maxWidth: 220, lineHeight: 1.5 }}>
        {screen === 'idle'       && 'Initiez un paiement pour recevoir le prompt USSD'}
        {screen === 'ussd'       && 'Entrez le PIN (ex: 1234) puis OK pour confirmer, ✕ pour refuser'}
        {screen === 'processing' && (polling ? `Polling #${pollCount}/12 — vérification statut toutes les 5s` : 'Validation en cours...')}
        {screen === 'success'    && 'Paiement confirmé. Webhook payment.completed déclenché.'}
        {(screen === 'failed' || screen === 'cancelled') && 'Transaction terminée. Appuyez sur ✕ pour réinitialiser.'}
      </div>
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: TxResult | null }) {
  if (!result) return null
  const ok = ['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => result.status.toUpperCase().includes(s))
  const rows: [string, React.ReactNode][] = [
    ['Transaction ID', <span className="font-mono text-[11px] break-all">{result.txId}</span>],
    ['Statut final',   <span className={ok ? 'text-[var(--green)] font-bold' : 'text-[var(--red)] font-bold'}>{result.status}</span>],
    ['Provider ref.',  <span className="font-mono text-[11px]">{result.providerRef || '—'}</span>],
    ['Montant',        fmtXAF(result.amount)],
    ['Durée totale',   `${result.duration}ms`],
  ]
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Résultat de la transaction</span>
        <Badge ok={ok} />
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {rows.map(([k, v]) => (
          <div key={k as string} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">{k}</span>
            <span className="text-[12px] text-[var(--text-1)] text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
      ${ok ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>
      {ok ? 'Succès' : 'Échec'}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SCENARIOS = [
  { value: 'success', label: 'Succès attendu',  sub: 'Le MockAdapter retournera SUCCESSFUL' },
  { value: 'failure', label: 'Échec attendu',   sub: 'Le MockAdapter retournera FAILED' },
  { value: 'timeout', label: 'Timeout (60s)',   sub: 'Simule une absence de réponse' },
] as const

export default function PaymentSimulator() {
  const [state, setState] = useState<SimState>('idle')
  const [form, setForm] = useState<PaymentForm>({
    amount: 5000, phone: '237677123456', name: 'Jean Dupont',
    ref: 'TEST_SIM_001', description: 'Paiement test ST Pay', scenario: 'success',
  })
  const [txId,      setTxId]      = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number>(0)
  const [logs,      setLogs]      = useState<LogEntry[]>([
    { time: '--:--:--', message: 'Simulateur prêt — configurez et initiez un paiement.', type: 'info' },
  ])
  const [result,    setResult]    = useState<TxResult | null>(null)
  const [polling,   setPolling]   = useState(false)
  const [pollCount, setPollCount] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { time: nowTime(), message, type }])
  }, [])

  // Step derived from state
  const step: 1 | 2 | 3 =
    state === 'idle' || state === 'initiating' ? 1
    : state === 'waiting_phone' ? 2
    : 3

  // Phone screen derived from state
  const phoneScreen: PhoneScreen =
    state === 'idle'          ? 'idle'
    : state === 'initiating'  ? 'idle'
    : state === 'waiting_phone' ? 'ussd'
    : state === 'confirming'  ? 'processing'
    : state === 'success'     ? 'success'
    : state === 'failed'      ? 'failed'
    : state === 'cancelled'   ? 'cancelled'
    : state === 'timeout'     ? 'failed'
    : 'idle'

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setPolling(false)
  }

  const startPolling = (tid: string) => {
    let count = 0
    setPolling(true)
    setPollCount(0)
    pollRef.current = setInterval(async () => {
      count++
      setPollCount(count)
      addLog(`Poll #${count} — GET /api/Payment/${tid.slice(-8)}...`, 'info')
      try {
        const data = await fetchStatus(tid)
        const st = (data.status || data.Status || '').toUpperCase()
        addLog(`Statut reçu: ${st}`, ['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => st.includes(s)) ? 'ok' : 'info')

        if (['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => st.includes(s))) {
          stopPolling()
          setState('success')
          setResult({ txId: tid, providerRef: data.providerReference, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.completed déclenché', 'ok')
          addLog('Transaction terminée avec succès !', 'ok')
          toast.success('Paiement confirmé !')
        } else if (['FAILED','ERROR','REJECTED','CANCELLED'].some(s => st.includes(s))) {
          stopPolling()
          setState('failed')
          setResult({ txId: tid, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.failed déclenché', 'err')
          toast.error('Transaction échouée')
        } else if (count >= 12) {
          stopPolling()
          setState('timeout')
          addLog('Timeout — 60s sans réponse définitive', 'warn')
          toast('Timeout de la simulation', { icon: '⏱' })
        }
      } catch (e: unknown) {
        addLog(`Erreur polling: ${e instanceof Error ? e.message : String(e)}`, 'err')
      }
    }, 5000)
  }

  // Initiate payment
  const initMutation = useMutation({
    mutationFn: () => initiatePayment(form, localStorage.getItem('stpay_api_key') || 'sk_test_local_stpay_2026'),
    onMutate: () => {
      setState('initiating')
      setStartedAt(Date.now())
      addLog(`Initiation paiement — ${fmtXAF(form.amount)} → ${form.phone}`, 'info')
      addLog('POST /api/Payment — provider: MOCK (TestMode)', 'info')
    },
    onSuccess: (data) => {
      const id = data.transactionId || data.id || `SIM-${Date.now()}`
      setTxId(id)
      addLog(`Transaction créée: ${id}`, 'ok')
      addLog('Statut initial: PENDING', 'warn')
      addLog(`Prompt USSD envoyé au ${form.phone} — Vérifiez le téléphone →`, 'ok')
      setState('waiting_phone')
    },
    onError: (e: Error) => {
      addLog(`Erreur API: ${e.message}`, 'err')
      addLog('Vérifiez que le backend tourne sur localhost:5169', 'warn')
      setState('idle')
      toast.error(e.message)
    },
  })

  const handleConfirm = (pin: string) => {
    if (!txId) return
    addLog(`PIN saisi (${pin.length} chiffres) — Confirmation envoyée`, 'ok')
    addLog('Démarrage du polling statut (toutes les 5s, max 60s)', 'info')
    setState('confirming')
    startPolling(txId)
  }

  const handleCancel = () => {
    addLog('Paiement refusé par l\'utilisateur (bouton Annuler)', 'err')
    addLog('Transaction marquée CANCELLED', 'err')
    stopPolling()
    setState('cancelled')
    if (txId) setResult({ txId, status: 'CANCELLED', amount: form.amount, duration: Date.now() - startedAt })
    toast.error('Paiement annulé')
  }

  const handleReset = () => {
    stopPolling()
    setState('idle')
    setTxId(null)
    setResult(null)
    setPollCount(0)
    setLogs([{ time: nowTime(), message: 'Simulateur réinitialisé.', type: 'info' }])
  }

  const canInitiate = state === 'idle'

  // Inject spin keyframe once
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div className="space-y-4">
      <StepBar current={step} />

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        {/* LEFT */}
        <div className="space-y-4">

          {/* Config form */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Configurer le paiement test</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                              bg-[var(--amber-bg)] text-[var(--amber)]
                              border border-[var(--amber-border)]">
                MTN MoMo TEST
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Montant (XAF)', key: 'amount', type: 'number', placeholder: '5000' },
                  { label: 'Numéro simulé', key: 'phone',  type: 'text',   placeholder: '237677123456' },
                  { label: 'Nom client',    key: 'name',   type: 'text',   placeholder: 'Jean Dupont' },
                  { label: 'Référence',     key: 'ref',    type: 'text',   placeholder: 'TEST_001' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">
                      {label}
                    </label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof PaymentForm] as string}
                      disabled={!canInitiate}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2
                                 text-[13px] bg-white text-[var(--text-1)] outline-none transition
                                 focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]
                                 disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  disabled={!canInitiate}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2
                             text-[13px] bg-white text-[var(--text-1)] outline-none transition
                             focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]
                             disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]"
                />
              </div>

              {/* Scenario selector */}
              <div>
                <p className="mb-2 text-[11px] font-semibold text-[var(--text-2)]">
                  Scénario MockAdapter
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SCENARIOS.map(({ value, label, sub }) => (
                    <label
                      key={value}
                      className={`flex flex-col gap-0.5 p-2.5 rounded-[6px] border cursor-pointer
                                  transition-all text-left
                                  ${!canInitiate ? 'opacity-50 cursor-not-allowed' : ''}
                                  ${form.scenario === value
                                    ? value === 'success'
                                      ? 'border-[var(--green-border)] bg-[var(--green-bg)]'
                                      : value === 'failure'
                                        ? 'border-[var(--red-border)] bg-[var(--red-bg)]'
                                        : 'border-[var(--amber-border)] bg-[var(--amber-bg)]'
                                    : 'border-[var(--border)] bg-transparent hover:bg-[var(--bg-subtle)]'}`}
                    >
                      <input type="radio" className="sr-only" value={value}
                             disabled={!canInitiate}
                             checked={form.scenario === value}
                             onChange={() => canInitiate && setForm((f) => ({ ...f, scenario: value }))} />
                      <span className={`text-[11px] font-bold
                        ${form.scenario === value
                          ? value === 'success' ? 'text-[var(--green)]'
                          : value === 'failure' ? 'text-[var(--red)]'
                          : 'text-[var(--amber)]'
                          : 'text-[var(--text-1)]'}`}>
                        {label}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)]">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="p-3 bg-[var(--orange-bg)] rounded-[6px] border border-[var(--orange-border)]">
                <p className="text-[11px] font-bold text-[var(--orange-dark)] mb-1">Mode simulateur actif</p>
                <p className="text-[10px] text-[var(--text-2)]">
                  Appel réel vers <code className="font-mono">POST /api/Payment</code> avec provider MOCK.
                  Vous contrôlez manuellement la réponse USSD simulée sur le téléphone.
                </p>
              </div>

              {/* CTA */}
              {canInitiate ? (
                <button
                  className="btn-primary w-full justify-center"
                  onClick={() => initMutation.mutate()}
                  disabled={initMutation.isPending}
                >
                  {initMutation.isPending ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                           style={{ animation: 'spin .8s linear infinite' }}>
                        <path d="M12 6.5A5.5 5.5 0 112 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Envoi en cours…
                    </>
                  ) : '▶ Initier le paiement'}
                </button>
              ) : (
                <button className="btn-secondary w-full justify-center" onClick={handleReset}>
                  ↺ Réinitialiser le simulateur
                </button>
              )}
            </div>
          </div>

          <EventLog entries={logs} />
          <ResultCard result={result} />
        </div>

        {/* RIGHT: phone */}
        <div className="lg:sticky lg:top-4">
          <SimulatedPhone
            screen={phoneScreen}
            txId={txId ?? undefined}
            amount={form.amount}
            ref_={form.ref}
            desc={form.description}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onReset={handleReset}
            polling={polling}
            pollCount={pollCount}
          />
        </div>
      </div>
    </div>
  )
}
