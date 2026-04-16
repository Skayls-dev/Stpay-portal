import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type EscrowMode = 'pickup_code' | 'auto_timeout' | 'dual_confirm'
type EscrowStep = 'held' | 'in_transit' | 'delivered' | 'released'

const ESCROW_ID = 'ESC-2024-00842'
const AMOUNT = 85_000
const fmtXaf = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} XAF`

const ALL_STEPS: EscrowStep[] = ['held', 'in_transit', 'delivered', 'released']

const STEP_LABELS: Record<EscrowStep, string> = {
  held: 'Retenu',
  in_transit: 'En transit',
  delivered: 'Livré',
  released: 'Libéré',
}

const STEP_ICONS: Record<EscrowStep, string> = {
  held: '🔒',
  in_transit: '🚚',
  delivered: '📦',
  released: '✅',
}

type StepConfig = {
  title: string
  description: string
  actionLabel: string | null
  actor: 'Marchand' | 'Acheteur' | null
}

const STEP_CONFIG: Record<EscrowMode, Record<EscrowStep, StepConfig>> = {
  pickup_code: {
    held: {
      title: 'Fonds retenus par ST Pay',
      description: "Les fonds d'Oumar sont bloqués chez ST Pay. TechShop ne peut pas y accéder tant qu'Oumar n'a pas confirmé la réception de sa commande.",
      actionLabel: 'Confirmer expédition',
      actor: 'Marchand',
    },
    in_transit: {
      title: 'Colis en cours de livraison',
      description: "TechShop a confirmé l'expédition. Oumar dispose d'un code de retrait unique pour valider la livraison physique.",
      actionLabel: 'Valider le code',
      actor: 'Acheteur',
    },
    delivered: {
      title: 'Livraison confirmée',
      description: "Oumar a validé le code de retrait et confirmé la réception. Les fonds peuvent maintenant être libérés vers TechShop Douala.",
      actionLabel: 'Libérer les fonds',
      actor: 'Acheteur',
    },
    released: {
      title: 'Transaction clôturée',
      description: "TechShop Douala a été crédité de 85 000 XAF. La transaction escrow est clôturée avec succès.",
      actionLabel: null,
      actor: null,
    },
  },
  auto_timeout: {
    held: {
      title: 'Fonds retenus par ST Pay',
      description: "Les fonds d'Oumar sont bloqués chez ST Pay. Si aucune contestation n'est émise sous 7 jours, les fonds sont libérés automatiquement.",
      actionLabel: 'Confirmer expédition',
      actor: 'Marchand',
    },
    in_transit: {
      title: 'Auto-libération en attente (7 jours)',
      description: "Si Oumar ne conteste pas la livraison avant l'expiration du délai, ST Pay libère automatiquement les fonds vers TechShop Douala.",
      actionLabel: null,
      actor: null,
    },
    delivered: {
      title: 'Timeout atteint',
      description: "Le délai de 7 jours est écoulé sans contestation. ST Pay procède à la libération automatique.",
      actionLabel: null,
      actor: null,
    },
    released: {
      title: 'Fonds libérés automatiquement',
      description: "Délai de 7 jours écoulé sans contestation. TechShop Douala a été crédité de 85 000 XAF par ST Pay.",
      actionLabel: null,
      actor: null,
    },
  },
  dual_confirm: {
    held: {
      title: 'Fonds retenus par ST Pay',
      description: "Les fonds d'Oumar sont bloqués chez ST Pay. TechShop et Oumar doivent tous les deux confirmer pour libérer les fonds.",
      actionLabel: 'Confirmer expédition',
      actor: 'Marchand',
    },
    in_transit: {
      title: 'En attente de confirmation acheteur',
      description: "TechShop a confirmé l'expédition. ST Pay attend maintenant la confirmation de réception par Oumar Diallo.",
      actionLabel: 'Confirmer réception',
      actor: 'Acheteur',
    },
    delivered: {
      title: 'Double confirmation obtenue',
      description: "Marchand et acheteur ont tous les deux confirmé. Les fonds peuvent maintenant être libérés vers TechShop Douala.",
      actionLabel: 'Libérer les fonds',
      actor: 'Acheteur',
    },
    released: {
      title: 'Transaction clôturée',
      description: "Double confirmation reçue. TechShop Douala a été crédité de 85 000 XAF. Escrow clôturé avec succès.",
      actionLabel: null,
      actor: null,
    },
  },
}

type TimelineEntry = {
  time: string
  icon: string
  label: string
}

type WebhookEntry = {
  type: string
  escrowId: string
  amount: number
  currency: string
  timestamp: string
}

function nowHHMMSS() {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function makeWebhook(type: string): WebhookEntry {
  return { type, escrowId: ESCROW_ID, amount: AMOUNT, currency: 'XAF', timestamp: new Date().toISOString() }
}

const MODES = [
  { value: 'pickup_code' as EscrowMode, label: 'Code de retrait' },
  { value: 'auto_timeout' as EscrowMode, label: 'Auto-timeout (7j)' },
  { value: 'dual_confirm' as EscrowMode, label: 'Double confirmation' },
]

export default function EscrowDemo() {
  const [mode, setMode] = useState<EscrowMode>('pickup_code')
  const [step, setStep] = useState<EscrowStep>('held')
  const [timeline, setTimeline] = useState<TimelineEntry[]>([
    { time: nowHHMMSS(), icon: '🔒', label: `🔒 Escrow créé — fonds retenus (${fmtXaf(AMOUNT)})` },
  ])
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([makeWebhook('escrow.created')])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const stepStartRef = useRef(Date.now())

  // Elapsed time since current step became active
  useEffect(() => {
    stepStartRef.current = Date.now()
    setElapsed(0)
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - stepStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  // Auto-timeout countdown
  useEffect(() => {
    if (mode !== 'auto_timeout' || step !== 'in_transit') return
    let count = 10
    setCountdown(count)
    const interval = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        setCountdown(null)
        const now = nowHHMMSS()
        setStep('released')
        setTimeline((prev) => [
          ...prev,
          { time: now, icon: '⏱', label: '⏱ Timeout 7j atteint — libération automatique' },
          { time: now, icon: '✅', label: '✅ Fonds libérés automatiquement — solde TechShop crédité' },
        ])
        setWebhooks((prev) => [...prev, makeWebhook('escrow.auto_released')])
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [step, mode])

  const transitionTo = (newStep: EscrowStep, timelineMsg: string, webhookType: string) => {
    setStep(newStep)
    setTimeline((prev) => [...prev, { time: nowHHMMSS(), icon: STEP_ICONS[newStep], label: timelineMsg }])
    setWebhooks((prev) => [...prev, makeWebhook(webhookType)])
  }

  const advance = () => {
    if (step === 'held') {
      transitionTo('in_transit', '🚚 Expédition confirmée par TechShop Douala', 'escrow.shipped')
    } else if (step === 'in_transit') {
      transitionTo('delivered', '📦 Livraison confirmée par Oumar Diallo', 'escrow.delivered')
    } else if (step === 'delivered') {
      transitionTo('released', '✅ Fonds libérés — solde TechShop crédité', 'escrow.released')
    }
  }

  const reset = (newMode?: EscrowMode) => {
    const m = newMode ?? mode
    setMode(m)
    setStep('held')
    setTimeline([{ time: nowHHMMSS(), icon: '🔒', label: `🔒 Escrow créé — fonds retenus (${fmtXaf(AMOUNT)})` }])
    setWebhooks([makeWebhook('escrow.created')])
    setCountdown(null)
    setElapsed(0)
  }

  const currentIdx = ALL_STEPS.indexOf(step)
  const cfg = STEP_CONFIG[mode][step]
  const webhookJson = webhooks.map((w) => JSON.stringify(w, null, 2)).join('\n\n')

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#FFF1E8_0%,#F5F4F0_35%,#EEF4FF_100%)] px-4 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* ── Header ── */}
        <header className="rounded-[18px] border border-[var(--border)] bg-white/85 backdrop-blur p-6 shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">Public Demo</p>
              <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--text-1)]">Démo Cycle Escrow ST Pay</h1>
              <p className="mt-1 text-[13px] text-[var(--text-2)]">
                Visualisez le cycle complet d'une transaction sécurisée par escrow — aucune API requise.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/choose-portal" className="btn-secondary">← Retour portail</Link>
              <button type="button" className="btn-secondary" onClick={() => reset()}>Reset</button>
              <span className="st-badge st-badge-orange">Sandbox</span>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="mt-4 inline-flex rounded-[10px] border border-[var(--border-med)] bg-[var(--bg-subtle)] p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  mode === m.value
                    ? 'bg-white text-[var(--orange)] shadow-sm'
                    : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                }`}
                onClick={() => reset(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Commande fictive ── */}
        <div className="rounded-[14px] border border-[var(--border)] bg-white/85 backdrop-blur p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center gap-6 text-[12px]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">Commande</p>
              <p className="font-bold text-[var(--text-1)]">Casque audio Sony WH-1000XM5</p>
              <p className="text-[var(--orange)] font-extrabold text-[13px]">{fmtXaf(AMOUNT)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">Acheteur</p>
              <p className="font-semibold text-[var(--text-1)]">Oumar Diallo</p>
              <p className="text-[var(--text-2)]">237 691 234 567 — MTN MoMo</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">Vendeur</p>
              <p className="font-semibold text-[var(--text-1)]">TechShop Douala</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">Escrow ID</p>
              <p className="font-mono text-[11px] font-semibold text-[var(--text-1)]">{ESCROW_ID}</p>
            </div>
            <div className="ml-auto">
              <span className="st-badge st-badge-neutral">Mode: {MODES.find((m) => m.value === mode)?.label}</span>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

          {/* ── Left: Stepper ── */}
          <section className="space-y-4">

            {/* Progress bar */}
            <div className="rounded-[14px] border border-[var(--border)] bg-white/85 backdrop-blur p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">Progression</p>
              <div className="flex gap-1.5">
                {ALL_STEPS.map((s, idx) => (
                  <div key={s} className="flex-1">
                    <div
                      className="h-2 rounded-full transition-colors duration-500"
                      style={{
                        background:
                          idx < currentIdx
                            ? 'var(--green)'
                            : idx === currentIdx
                            ? 'var(--orange)'
                            : 'var(--border)',
                      }}
                    />
                    <p
                      className="mt-1 text-center text-[9px] font-semibold transition-colors"
                      style={{
                        color:
                          idx < currentIdx
                            ? 'var(--green)'
                            : idx === currentIdx
                            ? 'var(--orange)'
                            : 'var(--text-3)',
                      }}
                    >
                      {STEP_ICONS[s]} {STEP_LABELS[s]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Active step card */}
            <div className="rounded-[14px] border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{STEP_ICONS[step]}</span>
                  <span className="text-[14px] font-bold text-[var(--text-1)]">{cfg.title}</span>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--text-3)]">il y a {elapsed}s</span>
              </div>

              <div className="space-y-4 p-4">
                <p className="text-[13px] leading-relaxed text-[var(--text-2)]">{cfg.description}</p>

                {/* pickup_code in_transit: code input */}
                {mode === 'pickup_code' && step === 'in_transit' && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-[var(--text-2)]">Code de retrait acheteur</p>
                    <input
                      readOnly
                      value="482 931"
                      className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-[18px] font-mono tracking-[0.3em] text-[var(--text-1)]"
                    />
                    <p className="text-[10px] text-[var(--text-3)]">
                      Ce code est envoyé automatiquement à Oumar par SMS à l'expédition.
                    </p>
                  </div>
                )}

                {/* auto_timeout in_transit: countdown */}
                {mode === 'auto_timeout' && step === 'in_transit' && (
                  <div className="space-y-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-500"
                      style={{
                        borderColor: countdown !== null && countdown <= 3 ? 'var(--green-border)' : 'var(--amber-border)',
                        background: countdown !== null && countdown <= 3 ? 'var(--green-bg)' : 'var(--amber-bg)',
                        color: countdown !== null && countdown <= 3 ? 'var(--green)' : 'var(--amber)',
                      }}
                    >
                      ⏱ Libération automatique dans {countdown ?? 0}s
                    </span>
                    <div
                      className="overflow-hidden rounded-full bg-[var(--bg-subtle)]"
                      style={{ height: 4 }}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--orange)] transition-all duration-1000 ease-linear"
                        style={{ width: `${((countdown ?? 0) / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-3)]">
                      Simule le timeout de 7 jours en 10 secondes
                    </p>
                  </div>
                )}

                {/* Action button */}
                {cfg.actionLabel && (
                  <button
                    type="button"
                    className="btn-primary w-full justify-center"
                    onClick={advance}
                  >
                    {cfg.actionLabel}
                    {cfg.actor && (
                      <span className="ml-2 text-[10px] font-normal opacity-80">
                        (Action : {cfg.actor})
                      </span>
                    )}
                  </button>
                )}

                {/* Released state */}
                {step === 'released' && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <span className="text-[32px]">✅</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green-border)] bg-[var(--green-bg)] px-4 py-1.5 text-[12px] font-semibold text-[var(--green)]">
                      Fonds libérés — TechShop Douala crédité
                    </span>
                    <button type="button" className="btn-secondary mt-1" onClick={() => reset()}>
                      Rejouer la démo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Completed steps */}
            {currentIdx > 0 && (
              <div className="rounded-[14px] border border-[var(--border)] bg-white/70 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">Étapes complétées</p>
                <div className="space-y-2">
                  {ALL_STEPS.slice(0, currentIdx).map((s) => (
                    <div key={s} className="flex items-center gap-2 text-[12px]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--green-bg)] text-[10px] text-[var(--green)]">✓</span>
                      <span className="font-semibold text-[var(--text-2)]">
                        {STEP_ICONS[s]} {STEP_LABELS[s]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Right: Timeline + Webhooks ── */}
          <aside className="space-y-4">

            {/* Audit timeline */}
            <div className="rounded-[14px] border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="border-b border-[var(--border-soft)] px-4 py-3">
                <span className="text-[13px] font-bold text-[var(--text-1)]">📋 Audit Log</span>
              </div>
              <div className="space-y-2 p-4">
                {timeline.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[12px]"
                  >
                    <span className="shrink-0 font-mono text-[10px] text-[var(--text-3)]">
                      [{entry.time}]
                    </span>
                    <span className="text-[var(--text-1)]">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook events */}
            <div className="rounded-[14px] border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="border-b border-[var(--border-soft)] px-4 py-3">
                <span className="text-[13px] font-bold text-[var(--text-1)]">🔔 Événements webhook simulés</span>
              </div>
              <pre className="max-h-[340px] overflow-auto rounded-b-[14px] bg-[#111827] p-4 text-[11px] leading-relaxed text-[#10B981]">
                {webhookJson}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
