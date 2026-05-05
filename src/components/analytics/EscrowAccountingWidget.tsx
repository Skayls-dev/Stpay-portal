import { useQuery } from '@tanstack/react-query'
import { escrowAccountingApi } from '../../lib/api/modules'

function formatXaf(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function formatDays(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)]/60 ${className}`} />
}

export default function EscrowAccountingWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['escrow-accounting'],
    queryFn: () => escrowAccountingApi.summary(),
    staleTime: 30_000,
    retry: 1,
  })

  if (isError) return null

  const dominantMode = data
    ? `PickupCode ${data.pickupCodeCount} / Auto ${data.autoTimeoutCount} / Dual ${data.dualConfirmCount}`
    : 'PickupCode 0 / Auto 0 / Dual 0'

  if (isLoading || !data) {
    return (
      <section className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4 md:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Comptabilité escrow
        </p>

        <div className="space-y-3">
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-16" />
        </div>
      </section>
    )
  }

  const treasuryTone = data.fundsHeld > 0
    ? 'border-[var(--orange)] bg-[var(--bg-raised)] text-[var(--orange)]'
    : 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700'

  const disputesTone = data.openDisputeCount > 0
    ? 'border-red-300/60 bg-red-500/10 text-red-700'
    : 'border-slate-300/60 bg-slate-500/10 text-slate-600'

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4 md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
        Comptabilité escrow
      </p>

      <div className="space-y-3">
        <div className={`rounded-[var(--radius-md)] border px-3.5 py-3 ${treasuryTone}`}>
          <p className="text-sm font-medium">
            <span className="mr-1">🔒</span>
            <span className="font-display font-bold">{formatXaf(data.fundsHeld)}</span>
            <span className="mx-2">bloques</span>
            <span className="opacity-70">•</span>
            <span className="mx-2">{data.activeEscrowCount} escrows actifs</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-3.5">
            <p className="text-[12px] text-[var(--text-muted)]">💚 Liberes ce mois</p>
            <p className="mt-1 font-display text-xl font-bold text-emerald-600">+{formatXaf(data.releasedThisMonth)}</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">{data.releasedCountMonth} liberations</p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-3.5">
            <p className="text-[12px] text-[var(--text-muted)]">🔴 Rembourses ce mois</p>
            <p className="mt-1 font-display text-xl font-bold text-red-500">-{formatXaf(data.refundedThisMonth)}</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">{data.refundedCountMonth} remboursements</p>
          </div>
        </div>

        <div className={`rounded-[var(--radius-md)] border px-3.5 py-3 text-sm ${disputesTone}`}>
          <span className="mr-1">⚠️</span>
          <span>{data.openDisputeCount} litige(s) ouvert(s)</span>
          <span className="mx-2 opacity-70">•</span>
          <span>{formatXaf(data.disputedAmount)} concernes</span>
          <span className="mx-2 opacity-70">•</span>
          <span>Taux : {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(data.disputeRate)}%</span>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-raised)] px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">🚚 Cycle moyen liberation</p>
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">{formatDays(data.avgCycleDaysReleased)} jours</p>
          </div>

          <div className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-raised)] px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">⚡ Cycle moyen litige</p>
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">{formatDays(data.avgCycleDaysDisputed)} jours</p>
          </div>

          <div className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-raised)] px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">📊 Mode dominant</p>
            <p className="font-display text-sm font-semibold text-[var(--text-primary)]">{dominantMode}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
