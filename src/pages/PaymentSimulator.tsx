// src/pages/PaymentSimulator.tsx
// Simulateur de paiement MTN MoMo USSD
// Flow : Formulaire → Téléphone simulé (USSD) → Polling statut → Résultat
// L'utilisateur contrôle manuellement la réponse téléphone (confirmer / refuser / timeout)

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import client from '../lib/api/client'
import { publishEscrowDemo } from '../features/escrow-demo/store'
import {
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_MAX_ATTEMPTS,
  buildEscrowPayload,
  buildPaymentInitiationPayload,
  isFailedPaymentStatus,
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
  providersHealthApi,
  type EscrowReleaseMode,
} from '../lib/api/modules'

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
  provider: string
  orangePin: string
  scenario: 'success' | 'failure' | 'timeout'
  escrowEnabled: boolean
  escrowMode: EscrowReleaseMode
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
  provider?: string
  phone?: string
  escrow?: {
    escrowId?: string
    status?: string
    releaseMode?: string
    pickupCode?: string
    autoReleaseAt?: string
  }
}

interface HistoryEntry {
  txId: string
  status: string
  amount: number
  provider: string
  at: string
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

async function initiatePayment(form: PaymentForm) {
  const escrow = buildEscrowPayload({
    enabled: form.escrowEnabled,
    releaseMode: form.escrowMode,
    autoTimeoutDays: 7,
  })

  const metadata: Record<string, unknown> = {
    simulatorMode: true,
    scenario: form.scenario,
  }

  if (form.provider === 'ORANGE') {
    metadata.pin = form.orangePin
  }

  const payload = buildPaymentInitiationPayload({
    amount: form.amount,
    currency: 'XAF',
    provider: form.provider,
    customer: {
      phoneNumber: form.phone,
      name: form.name,
      email: 'test@stpay.local',
    },
    merchant: {
      reference: form.ref,
      callbackUrl: `${window.location.origin}/callback`,
      name: 'ST Pay Simulator',
    },
    description: form.description,
    metadata,
    escrow,
  })

  const res = await client.post('/api/Payment', payload)
  return res.data as {
    transactionId?: string
    id?: string
    providerReference?: string
    escrow?: {
      escrowId?: string
      status?: string
      releaseMode?: string
      pickupCode?: string
      autoReleaseAt?: string
    }
  }
}

async function fetchStatus(txId: string) {
  const res = await client.get(`/api/Payment/${txId}`)
  return res.data as { status?: string; Status?: string; providerReference?: string }
}

async function cancelPayment(txId: string) {
  try {
    await client.delete(`/api/Payment/${txId}`)
  } catch {
    // Ignore — transaction may already be terminated
  }
}

async function pushOrangePayment(txId: string) {
  const res = await client.post(`/api/Payment/${txId}/push`, {})
  return res.data as { pushed?: boolean }
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
  provider:  string
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
  screen, provider, txId, amount, ref_, desc,
  onConfirm, onCancel, onReset,
  polling, pollCount,
}: PhoneProps) {
  const providerKey = String(provider || 'MTN').toUpperCase()
  const brand = {
    MTN: {
      networkLabel: 'MTN CM',
      walletLabel: 'MTN MoMo',
      promptTitle: 'MTN Mobile Money',
      ussdCode: '*126#',
      primary: '#FFD700',
      panel: '#FFFDE7',
      amountBorder: '#E0D800',
      chassisBg: '#1C1C12',
      chassisBorder: '#5D5312',
      notchBg: '#4A4210',
      keypadBg: '#19180F',
      keypadKeyBg: '#2D2B1D',
      keypadKeyText: '#FFF8CC',
      delKeyBg: '#3B2F11',
      delKeyText: '#FFCB4D',
      hashKeyBg: '#1A2740',
      hashKeyText: '#7CB8FF',
      okKeyBg: '#1E5B1E',
      okKeyText: '#8DFF8D',
    },
    ORANGE: {
      networkLabel: 'ORANGE CM',
      walletLabel: 'Orange Money',
      promptTitle: 'Orange Money',
      ussdCode: '#150#',
      primary: '#FF7900',
      panel: '#FFF3E8',
      amountBorder: '#F6A95B',
      chassisBg: '#1D1712',
      chassisBorder: '#6E3D16',
      notchBg: '#5B3212',
      keypadBg: '#1D1510',
      keypadKeyBg: '#352218',
      keypadKeyText: '#FFE2CC',
      delKeyBg: '#4A2313',
      delKeyText: '#FFB385',
      hashKeyBg: '#2D1F12',
      hashKeyText: '#FFC085',
      okKeyBg: '#6B2F06',
      okKeyText: '#FFD2A8',
    },
  }[providerKey] ?? {
    networkLabel: `${providerKey} CM`,
    walletLabel: providerKey,
    promptTitle: providerKey,
    ussdCode: '*000#',
    primary: '#9CA3AF',
    panel: '#F3F4F6',
    amountBorder: '#D1D5DB',
    chassisBg: '#1A1A1A',
    chassisBorder: '#333333',
    notchBg: '#333333',
    keypadBg: '#111111',
    keypadKeyBg: '#2A2A2A',
    keypadKeyText: '#FFFFFF',
    delKeyBg: '#3A2A1A',
    delKeyText: '#F59E0B',
    hashKeyBg: '#0A1A3A',
    hashKeyText: '#3B82F6',
    okKeyBg: '#0A3A0A',
    okKeyText: '#22C55E',
  }

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
        background: brand.chassisBg,
        borderRadius: 36,
        padding: '14px 10px',
        border: `3px solid ${brand.chassisBorder}`,
        boxShadow: `0 0 0 1px ${brand.primary}33, 0 14px 30px rgba(0, 0, 0, 0.45)`,
      }}>
        {/* Notch */}
        <div style={{ width: 70, height: 8, background: brand.notchBg, borderRadius: 4, margin: '0 auto 10px' }} />

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
            <span style={{ letterSpacing: 1 }}>{brand.networkLabel}</span>
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
              <div style={{ marginTop: 20, background: brand.primary, color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{brand.walletLabel}</div>
              <div style={{ marginTop: 8, fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>En attente d'une requête USSD...</div>
            </div>
          )}

          {/* USSD prompt */}
          {screen === 'ussd' && (
            <div style={{ display: 'flex', flexDirection: 'column', background: '#000', padding: '8px 8px 10px' }}>
              <div style={{ background: brand.primary, padding: '6px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#000', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
                {brand.promptTitle} — {brand.ussdCode}
              </div>
              <div style={{ background: brand.panel, padding: '10px', borderRadius: '0 0 4px 4px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#000', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>PAIEMENT MOBILE MONEY</div>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>Transaction ID:</div>
                <div style={{ fontSize: 9, wordBreak: 'break-all', marginBottom: 6, color: '#333' }}>
                  {txId?.slice(0, 28)}...
                </div>
                <div style={{ fontSize: 10, color: '#555' }}>Marchand:</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{ref_}</div>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, borderTop: `1px solid ${brand.amountBorder}`, borderBottom: `1px solid ${brand.amountBorder}`, padding: '5px 0', margin: '6px 0' }}>
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
              <div style={{ width: 44, height: 44, border: `3px solid ${brand.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ color: brand.primary, fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700 }}>TRAITEMENT...</div>
              <div style={{ color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 6 }}>
                {polling ? `Poll #${pollCount} en cours...` : `Validation ${brand.walletLabel}`}
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
              <div style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 9, marginTop: 8 }}>{`débités sur votre compte ${brand.walletLabel}`}</div>
              <div style={{ marginTop: 12, background: brand.primary, color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 2, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>{brand.walletLabel}</div>
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
        <div style={{ background: brand.keypadBg, padding: 8, borderRadius: '0 0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginTop: 0 }}>
          {['1','2','3','4','5','6','7','8','9'].map((k) => (
            <button key={k} onClick={() => dialKey(k)}
                    style={{ background: brand.keypadKeyBg, border: 'none', borderRadius: 6, color: brand.keypadKeyText, fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
              {k}
            </button>
          ))}
          <button onClick={handleDel}
                  style={{ background: brand.delKeyBg, border: 'none', borderRadius: 6, color: brand.delKeyText, fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            ⌫
          </button>
          <button onClick={() => dialKey('0')}
                  style={{ background: brand.keypadKeyBg, border: 'none', borderRadius: 6, color: brand.keypadKeyText, fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            0
          </button>
          <button onClick={screen === 'ussd' ? handleConfirm : onReset}
                  style={{ background: screen === 'ussd' ? brand.okKeyBg : '#1A1A1A', border: 'none', borderRadius: 6, color: screen === 'ussd' ? brand.okKeyText : '#555', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
            OK
          </button>
          <button onClick={screen === 'ussd' ? onCancel : onReset}
                  style={{ background: '#3A0A0A', border: 'none', borderRadius: 6, color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer', gridColumn: '1 / span 2' }}>
            ✕
          </button>
          <button
                  style={{ background: brand.hashKeyBg, border: 'none', borderRadius: 6, color: brand.hashKeyText, fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>
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

// ─── Webhook payload preview ─────────────────────────────────────────────────

function WebhookPayloadBlock({ result }: { result: TxResult }) {
  const [open, setOpen] = React.useState(false)
  const isTerminal = isSuccessfulPaymentStatus(result.status) || isFailedPaymentStatus(result.status)
  if (!isTerminal || result.status === 'PENDING') return null

  const event = isSuccessfulPaymentStatus(result.status) ? 'payment.completed' : 'payment.failed'
  const payload = {
    event,
    transactionId: result.txId,
    providerRef: result.providerRef ?? null,
    status: result.status,
    amount: result.amount,
    currency: 'XAF',
    provider: result.provider ?? 'MTN',
    customer: { phoneNumber: result.phone ?? '—' },
    merchant: { reference: 'TEST_SIM_001' },
    timestamp: new Date().toISOString(),
  }
  const json = JSON.stringify(payload, null, 2)

  const copyJson = async () => {
    try { await navigator.clipboard.writeText(json); toast.success('Payload copié') }
    catch { toast.error('Impossible de copier') }
  }

  return (
    <div className="panel">
      <button
        type="button"
        className="panel-header w-full text-left hover:bg-[var(--bg-subtle)] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="panel-title">Payload webhook simulé <span className="text-[10px] font-mono text-[var(--text-3)]">{event}</span></span>
        <span className="text-[10px] text-[var(--text-3)] ml-auto">{open ? '▲ Masquer' : '▼ Afficher'}</span>
      </button>
      {open && (
        <div className="relative">
          <pre className="p-3 text-[10px] font-mono leading-relaxed bg-[var(--bg-subtle)] overflow-x-auto text-[var(--text-1)] whitespace-pre-wrap">
            {json}
          </pre>
          <button
            type="button"
            className="absolute top-2 right-2 btn-secondary text-[10px]"
            onClick={copyJson}
          >
            Copier
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Session history ──────────────────────────────────────────────────────────

function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null
  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Historique de session</span></div>
      <div className="divide-y divide-[var(--border-soft)]">
        {entries.map((e, i) => {
          const ok  = isSuccessfulPaymentStatus(e.status)
          const err = isFailedPaymentStatus(e.status)
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0
                ${ok  ? 'bg-[var(--green-bg)] text-[var(--green)]'
                : err ? 'bg-[var(--red-bg)] text-[var(--red)]'
                :        'bg-[var(--amber-bg)] text-[var(--amber)]'}`}>
                {e.status}
              </span>
              <span className="font-mono text-[10px] text-[var(--text-3)] flex-1 truncate">{e.txId}</span>
              <span className="text-[11px] text-[var(--text-2)] flex-shrink-0">{new Intl.NumberFormat('fr-FR').format(e.amount)} XAF</span>
              <span className="text-[10px] text-[var(--text-3)] flex-shrink-0">{e.provider}</span>
              <span className="text-[10px] text-[var(--text-4)] flex-shrink-0">{e.at}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: TxResult | null }) {
  if (!result) return null
  const ok = isSuccessfulPaymentStatus(result.status)
  const copyPickupCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Code copié')
    } catch {
      toast.error('Impossible de copier le code')
    }
  }

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
      <WebhookPayloadBlock result={result} />
      <div className="divide-y divide-[var(--border-soft)]">
        {rows.map(([k, v]) => (
          <div key={k as string} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">{k}</span>
            <span className="text-[12px] text-[var(--text-1)] text-right">{v}</span>
          </div>
        ))}

        {result.escrow && (
          <>
            <div className="px-4 py-2.5 bg-[var(--bg-subtle)]">
              <span className="text-[11px] font-semibold text-[var(--text-2)]">Escrow</span>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">Escrow ID</span>
              <span className="text-[12px] text-[var(--text-1)] text-right font-mono break-all">{result.escrow.escrowId || '—'}</span>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">Statut escrow</span>
              <span className="text-[12px] text-[var(--text-1)] text-right">{result.escrow.status || '—'}</span>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">Mode</span>
              <span className="text-[12px] text-[var(--text-1)] text-right">{result.escrow.releaseMode || '—'}</span>
            </div>

            {result.escrow.pickupCode && (
              <>
                <div className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">Code de retrait</span>
                  <div className="text-right space-y-2">
                    <span className="font-mono text-gold text-lg tracking-widest">{result.escrow.pickupCode}</span>
                    <div>
                      <button
                        type="button"
                        className="btn-secondary text-[11px]"
                        onClick={() => copyPickupCode(result.escrow!.pickupCode!)}
                      >
                        Copier le code
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5 text-[11px] text-[var(--amber)] bg-[var(--amber-bg)] border-t border-[var(--amber-border)]">
                  Ce code ne sera plus affiché. Transmettez-le à l'acheteur.
                </div>
              </>
            )}
          </>
        )}
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

// Phone suffixes that trigger each scenario in MtnAdapter / OrangeAdapter (TestMode)
// suffix 002 → fail, suffix 003 → timeout, any other → success
const SCENARIO_PHONE_MAP: Record<string, string> = {
  success: '237677123456',
  failure: '237677123002',
  timeout: '237677123003',
}

const SCENARIOS = [
  { value: 'success', label: 'Succès attendu',  sub: 'Le MockAdapter retournera SUCCESSFUL' },
  { value: 'failure', label: 'Échec attendu',   sub: 'Le MockAdapter retournera FAILED' },
  { value: 'timeout', label: 'Timeout (60s)',   sub: 'Simule une absence de réponse' },
] as const

const PROVIDER_LABELS: Record<string, string> = {
  MTN: 'MTN Mobile Money',
  ORANGE: 'Orange Money',
}

const DEFAULT_PROVIDER_OPTIONS = [
  { name: 'MTN', supportedFeatures: [] },
  { name: 'ORANGE', supportedFeatures: [] },
]

function providerLabel(name: string) {
  return PROVIDER_LABELS[name] ?? name
}

function canPublishEscrowFromResult(result: TxResult | null) {
  return Boolean(result?.escrow?.escrowId)
}

export default function PaymentSimulator() {
  const [state, setState] = useState<SimState>('idle')
  const [form, setForm] = useState<PaymentForm>({
    amount: 5000, phone: '237677123456', name: 'Jean Dupont',
    ref: 'TEST_SIM_001', description: 'Paiement test ST Pay', provider: 'MTN', orangePin: '1234', scenario: 'success',
    escrowEnabled: false, escrowMode: 'pickup_code',
  })
  const [txId,      setTxId]      = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number>(0)
  const [logs,      setLogs]      = useState<LogEntry[]>([
    { time: '--:--:--', message: 'Simulateur prêt — configurez et initiez un paiement.', type: 'info' },
  ])
  const [result,    setResult]    = useState<TxResult | null>(null)
  const [polling,   setPolling]   = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [history,   setHistory]   = useState<HistoryEntry[]>([])

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 5))
  }, [])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: _dynamicProviders } = useQuery({
    queryKey: ['simulator-providers'],
    queryFn: () => providersHealthApi.listProviders(),
    staleTime: 5 * 60_000,
  })
  const providerOptions = React.useMemo(() => {
    const merged = [...DEFAULT_PROVIDER_OPTIONS, ...(_dynamicProviders ?? [])]
    const unique = new Map<string, { name: string; supportedFeatures: string[] }>()
    merged.forEach((item) => {
      const key = String(item.name || '').toUpperCase()
      if (!key) return
      if (!unique.has(key)) {
        unique.set(key, {
          name: key,
          supportedFeatures: Array.isArray(item.supportedFeatures) ? item.supportedFeatures : [],
        })
      }
    })
    return Array.from(unique.values())
  }, [_dynamicProviders])

  useEffect(() => {
    if (!providerOptions.some((option) => option.name === form.provider)) {
      setForm((prev) => ({
        ...prev,
        provider: providerOptions[0]?.name ?? 'MTN',
      }))
    }
  }, [providerOptions, form.provider])

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { time: nowTime(), message, type }])
  }, [])

  const publishEscrowScenario = useCallback((escrow: TxResult['escrow'] | undefined, txIdentifier: string) => {
    if (!escrow?.escrowId) {
      return
    }

    publishEscrowDemo({
      escrowId: escrow.escrowId,
      txId: txIdentifier,
      orderRef: form.ref,
      merchantName: 'ST Pay Simulator',
      customerName: form.name,
      customerPhone: form.phone,
      provider: form.provider,
      amount: form.amount,
      description: form.description,
      releaseMode: form.escrowMode,
      status: escrow.status,
      pickupCode: escrow.pickupCode,
      autoReleaseAt: escrow.autoReleaseAt,
      source: 'backend',
    })
    addLog('Scénario escrow synchronisé vers la démo webshop.', 'ok')
  }, [addLog, form.amount, form.description, form.escrowMode, form.name, form.phone, form.provider, form.ref])

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
        const st = normalizePaymentStatus(data.status || data.Status)
        addLog(`Statut reçu: ${st}`, isSuccessfulPaymentStatus(st) ? 'ok' : 'info')

        if (isSuccessfulPaymentStatus(st)) {
          stopPolling()
          setState('success')
          setResult({ txId: tid, providerRef: data.providerReference, status: st, amount: form.amount, duration: Date.now() - startedAt, provider: form.provider, phone: form.phone })
          pushHistory({ txId: tid, status: st, amount: form.amount, provider: form.provider, at: nowTime() })
          addLog('Webhook payment.completed déclenché — voir payload ↓', 'ok')
          addLog('Transaction terminée avec succès !', 'ok')
          toast.success('Paiement confirmé !')
        } else if (isFailedPaymentStatus(st)) {
          stopPolling()
          setState('failed')
          setResult({ txId: tid, status: st, amount: form.amount, duration: Date.now() - startedAt, provider: form.provider, phone: form.phone })
          pushHistory({ txId: tid, status: st, amount: form.amount, provider: form.provider, at: nowTime() })
          addLog('Webhook payment.failed déclenché — voir payload ↓', 'err')
          toast.error('Transaction échouée')
        } else if (count >= PAYMENT_POLL_MAX_ATTEMPTS) {
          stopPolling()
          setState('timeout')
          pushHistory({ txId: tid, status: 'TIMEOUT', amount: form.amount, provider: form.provider, at: nowTime() })
          addLog('Timeout — 60s sans réponse définitive', 'warn')
          toast('Timeout de la simulation', { icon: '⏱' })
        }
      } catch (e: unknown) {
        addLog(`Erreur polling: ${e instanceof Error ? e.message : String(e)}`, 'err')
      }
    }, PAYMENT_POLL_INTERVAL_MS)
  }

  // Initiate payment
  const initMutation = useMutation({
    mutationFn: () => initiatePayment(form),
    onMutate: () => {
      setState('initiating')
      setStartedAt(Date.now())
      addLog(`Initiation paiement — ${fmtXAF(form.amount)} → ${form.phone}`, 'info')
      addLog(`POST /api/Payment — provider: ${form.provider}`, 'info')
      if (form.provider === 'ORANGE') {
        addLog('PIN Orange inclus dans metadata pour l’initiation serveur', 'info')
      }
    },
    onSuccess: (data) => {
      const id = data.transactionId || data.id || `SIM-${Date.now()}`
      setTxId(id)
      addLog(`Transaction créée: ${id}`, 'ok')
      addLog('Statut initial: PENDING', 'warn')
      if (form.escrowEnabled) {
        addLog(`Escrow créé — mode: ${form.escrowMode}`, 'ok')
      }
      if (data.escrow?.pickupCode) {
        addLog('Code de retrait généré (transmis à l\'acheteur)', 'ok')
      }
      addLog(`Prompt USSD envoyé au ${form.phone} — Vérifiez le téléphone →`, 'ok')

      setResult({
        txId: id,
        providerRef: data.providerReference,
        status: 'PENDING',
        amount: form.amount,
        duration: Date.now() - startedAt,
        escrow: data.escrow,
      })

      if (form.escrowEnabled && data.escrow?.escrowId) {
        publishEscrowScenario(data.escrow, id)
      }

      setState('waiting_phone')
    },
    onError: (e: Error) => {
      addLog(`Erreur API: ${e.message}`, 'err')
      addLog('Vérifiez que le backend tourne sur localhost:5169', 'warn')
      setState('idle')
      toast.error(e.message)
    },
  })

  const handleConfirm = async (pin: string) => {
    if (!txId) return
    addLog(`PIN saisi (${pin.length} chiffres) — Confirmation envoyée`, 'ok')
    setState('confirming')

    if (form.provider === 'ORANGE') {
      addLog('Orange Money — envoi MP push au serveur…', 'info')
      try {
        await pushOrangePayment(txId)
        addLog('POST /api/Payment/{id}/push — OK, push déclenché', 'ok')
      } catch (e: unknown) {
        addLog(`Erreur push Orange: ${e instanceof Error ? e.message : String(e)}`, 'warn')
        addLog('Polling démarre quand même — le statut sera mis à jour par le provider', 'info')
      }
    }

    addLog('Démarrage du polling statut (toutes les 5s, max 60s)', 'info')
    startPolling(txId)
  }

  const handleCancel = async () => {
    addLog('Paiement refusé par l\'utilisateur (bouton Annuler)', 'err')
    stopPolling()
    setState('cancelled')
    if (txId) {
      addLog(`DELETE /api/Payment/${txId.slice(-8)}… — annulation backend`, 'info')
      await cancelPayment(txId)
      addLog('Transaction annulée en base', 'err')
      setResult({ txId, status: 'CANCELLED', amount: form.amount, duration: Date.now() - startedAt, provider: form.provider, phone: form.phone })
      pushHistory({ txId, status: 'CANCELLED', amount: form.amount, provider: form.provider, at: nowTime() })
    }
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

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="rounded-[10px] border border-[var(--orange-border)] bg-[var(--orange-bg)] px-3 py-2 text-[12px] text-[var(--orange-dark)]">
          <span className="font-semibold">Espace marchand</span>
          <span className="ml-2 text-[var(--text-2)]">Configure et initie le paiement depuis ce panneau.</span>
        </div>
        <div className="rounded-[10px] border border-[var(--blue-border)] bg-[var(--blue-bg)] px-3 py-2 text-[12px] text-[var(--blue)]">
          <span className="font-semibold">Téléphone client simulé</span>
          <span className="ml-2">Utilisé uniquement pour répondre à la requête USSD.</span>
        </div>
      </div>

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
                {form.provider} TEST
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">
                    Provider
                  </label>
                  <select
                    value={form.provider}
                    disabled={!canInitiate}
                    onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2
                               text-[13px] bg-white text-[var(--text-1)] outline-none transition
                               focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]
                               disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]"
                  >
                    {providerOptions.map((option) => (
                      <option key={option.name} value={option.name}>{providerLabel(option.name)}</option>
                    ))}
                  </select>
                </div>

                {form.provider === 'ORANGE' && (
                  <div>
                    <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">
                      PIN Orange
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={form.orangePin}
                      disabled={!canInitiate}
                      onChange={(e) => setForm((f) => ({ ...f, orangePin: e.target.value }))}
                      className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2
                                 text-[13px] bg-white text-[var(--text-1)] outline-none transition
                                 focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]
                                 disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]"
                      placeholder="1234"
                    />
                  </div>
                )}
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

              {/* Escrow toggle */}
              <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--text-2)]">
                    Activer l'escrow
                  </label>
                  <button
                    type="button"
                    disabled={!canInitiate}
                    onClick={() => canInitiate && setForm((f) => ({ ...f, escrowEnabled: !f.escrowEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.escrowEnabled ? 'bg-[var(--orange)]' : 'bg-[var(--border-med)]'
                    } ${!canInitiate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        form.escrowEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {form.escrowEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'pickup_code', label: 'Code de retrait' },
                      { value: 'auto_timeout', label: 'Timeout auto 7j' },
                      { value: 'dual_confirm', label: 'Double confirmation' },
                    ].map((mode) => (
                      <label
                        key={mode.value}
                        className={`flex items-center gap-2 p-2 rounded-[6px] border text-[11px] ${
                          form.escrowMode === mode.value
                            ? 'border-[var(--orange-border)] bg-[var(--orange-bg)] text-[var(--orange-dark)]'
                            : 'border-[var(--border)] bg-white text-[var(--text-2)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="escrowMode"
                          value={mode.value}
                          checked={form.escrowMode === mode.value}
                          onChange={() => setForm((f) => ({ ...f, escrowMode: mode.value as PaymentForm['escrowMode'] }))}
                          disabled={!canInitiate}
                        />
                        <span>{mode.label}</span>
                      </label>
                    ))}
                  </div>
                )}
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
                             onChange={() => {
                               if (!canInitiate) return
                               setForm((f) => ({
                                 ...f,
                                 scenario: value,
                                 phone: SCENARIO_PHONE_MAP[value] ?? f.phone,
                               }))
                             }} />
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
                  Appel réel vers <code className="font-mono">POST /api/Payment</code> avec provider {form.provider}.
                  Si le backend est en mock mode, le registre provider redirigera vers l’adapter simulé sans casser le contrat API.
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
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-[12px] text-[var(--text-2)]">
            Le parcours client est disponible sur une page séparée dans <Link to="/demo/webshop" className="font-semibold text-[var(--blue)] underline">le webshop public</Link>.
          </div>
          <HistoryPanel entries={history} />
        </div>

        {/* RIGHT: phone */}
        <div className="panel lg:sticky lg:top-4">
          <div className="panel-header">
            <span className="panel-title">Téléphone client simulé</span>
          </div>
          <div className="p-3">
            <p className="mb-3 rounded-[10px] border border-[var(--blue-border)] bg-[var(--blue-bg)] px-3 py-2 text-[11px] text-[var(--blue)]">
              Cette zone ne représente pas un second tableau de bord: elle sert uniquement à valider ou refuser la requête USSD du client.
            </p>
            <SimulatedPhone
              screen={phoneScreen}
              provider={form.provider}
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
    </div>
  )
}
