import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiClientError } from '../../lib/api/client'
import { merchantScoreApi } from '../../lib/api/modules'
import type { MerchantScoreDto } from '../../lib/api/modules'

function fmtXaf(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtShortRetryLabel(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtCountdown(iso: string) {
  const remainingMs = new Date(iso).getTime() - Date.now()
  if (remainingMs <= 0) return 'bientot'

  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function tierColor(tier: string) {
  switch (tier) {
    case 'Elite':
      return '#FFD700'
    case 'Premium':
      return '#10b981'
    case 'Fiable':
      return 'var(--orange)'
    case 'En croissance':
      return '#f59e0b'
    default:
      return '#ef4444'
  }
}

function tierGradient(tier: string) {
  switch (tier) {
    case 'Elite':
      return ['#FFD700', '#FF6600']
    case 'Premium':
      return ['#34d399', '#10b981']
    case 'Fiable':
      return ['#ff8a00', '#FF6600']
    case 'En croissance':
      return ['#fbbf24', '#f59e0b']
    default:
      return ['#f87171', '#ef4444']
  }
}

function barColor(score: number) {
  if (score >= 70) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-5">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-[200px] w-[200px] rounded-full border-8 border-[var(--border-soft)]/50" />
          <div className="h-8 w-28 rounded-full bg-[var(--bg-subtle)]" />
          <div className="h-3 w-40 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="space-y-5">
          <div className="h-14 rounded-xl bg-[var(--bg-subtle)]" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
                <div className="h-1.5 flex-1 rounded bg-[var(--bg-subtle)]" />
                <div className="h-4 w-12 rounded bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-40 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-8 w-32 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-8 w-28 rounded-full bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DimensionRow({ icon, label, score }: { icon: string; label: string; score: number }) {
  const color = barColor(score)
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 w-44 text-[13px] text-[var(--text-secondary)]">
        <span className="mr-1">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="h-1 w-full flex-1 rounded-full bg-[var(--bg-subtle)]">
        <div
          className="h-1 rounded-full"
          style={{ width: `${clamp(score, 0, 100)}%`, background: color }}
        />
      </div>
      <div className="w-16 text-right text-[12px] font-medium tabular-nums" style={{ color }}>
        {score.toFixed(0)}/100
      </div>
    </div>
  )
}

export default function MerchantScoreWidget() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['merchant-score'],
    queryFn: () => merchantScoreApi.get(),
    staleTime: 300_000,
  })

  const refreshMutation = useMutation({
    mutationFn: () => merchantScoreApi.refresh(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-score'] })
    },
  })

  const refreshError = refreshMutation.error as ApiClientError | null
  const refreshRateLimited = refreshError?.status === 429
  const refreshMessage = refreshRateLimited
    ? (refreshError.message || 'Recalcul déjà effectué aujourd’hui. Réessayez demain.')
    : null
  const refreshRetryAt = refreshRateLimited && data ? fmtDate(data.nextComputeAt) : null
  const refreshRetryIn = refreshRateLimited && data ? fmtCountdown(data.nextComputeAt) : null
  const refreshButtonLabel = refreshMutation.isPending
    ? 'Recalcul…'
    : refreshRateLimited && data
      ? `Recalculer ${fmtShortRetryLabel(data.nextComputeAt)}`
      : 'Recalculer'

  if (isLoading) return <Skeleton />

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-5">
        <p className="text-sm text-[var(--text-muted)]">Impossible de charger le score marchand.</p>
      </div>
    )
  }

  return (
    <MerchantScoreCard
      data={data}
      onRefresh={() => refreshMutation.mutate()}
      refreshing={refreshMutation.isPending}
      refreshMessage={refreshMessage}
      refreshRetryAt={refreshRetryAt}
      refreshRetryIn={refreshRetryIn}
      refreshButtonLabel={refreshButtonLabel}
    />
  )
}

function MerchantScoreCard({
  data,
  onRefresh,
  refreshing,
  refreshMessage,
  refreshRetryAt,
  refreshRetryIn,
  refreshButtonLabel,
}: {
  data: MerchantScoreDto
  onRefresh: () => void
  refreshing: boolean
  refreshMessage: string | null
  refreshRetryAt: string | null
  refreshRetryIn: string | null
  refreshButtonLabel: string
}) {
  const radius = 80
  const fullCircumference = 2 * Math.PI * radius
  const circumference = fullCircumference * 0.75
  const dashArray = `${circumference} ${fullCircumference}`
  const offset = circumference * (1 - clamp(data.score, 0, 1000) / 1000)
  const [start, end] = tierGradient(data.tier)
  const progressPercent = data.nextTier
    ? clamp(((1000 - data.pointsToNextTier) / 1000) * 100, 0, 100)
    : 100
  const badgeColor = tierColor(data.tier)

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-5">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
        <div className="flex flex-col items-center justify-center gap-3">
          <svg width="200" height="200" viewBox="0 0 200 200" className="overflow-visible">
            <defs>
              <linearGradient id="merchant-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={start} />
                <stop offset="100%" stopColor={end} />
              </linearGradient>
            </defs>

            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="var(--border-soft)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              transform="rotate(135 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#merchant-score-gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
              transform="rotate(135 100 100)"
              style={{ transition: 'stroke-dashoffset 600ms ease' }}
            />

            <text x="100" y="96" textAnchor="middle" className="fill-[var(--text-primary)] text-[48px] font-bold">
              {data.score}
            </text>
            <text x="100" y="118" textAnchor="middle" className="fill-[var(--text-muted)] text-[14px] font-medium">
              /1000
            </text>
          </svg>

          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            style={{ color: badgeColor, background: `${badgeColor}20` }}
          >
            {data.tier}
          </span>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-overlay)] p-4">
            {data.nextTier ? (
              <>
                <p className="text-sm text-[var(--text-secondary)]">
                  Encore <span className="font-semibold text-[var(--text-primary)]">{data.pointsToNextTier} pts</span> → {data.nextTier}
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${progressPercent}%`, background: 'var(--orange)' }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm font-medium text-[var(--text-primary)]">Palier maximal atteint.</p>
            )}
          </div>

          <div className="space-y-3">
            <DimensionRow icon="📈" label="Volume TPV" score={data.tpvScore} />
            <DimensionRow icon="✅" label="Taux de succès" score={data.successRateScore} />
            <DimensionRow icon="🕐" label="Ancienneté" score={data.seniorityScore} />
            <DimensionRow icon="⚖️" label="Litiges (inverse)" score={data.disputeScore} />
            <DimensionRow icon="📊" label="Régularité" score={data.regularityScore} />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
              💳 Limite : {fmtXaf(data.transactionLimitXaf)}/tx
            </span>
            <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
              {data.bnplEligible ? '✅ BNPL éligible' : '🔒 BNPL non éligible'}
            </span>
            <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
              Commission : {data.commissionTier}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4">
            <div className="space-y-1">
              <p className="text-[12px] text-[var(--text-muted)]">
                Calculé le {fmtDate(data.computedAt)} • Prochain calcul : {fmtDate(data.nextComputeAt)}
              </p>
              {refreshMessage && (
                <div className="space-y-0.5">
                  <p className="text-[12px] font-medium" style={{ color: '#f59e0b' }}>
                    {refreshMessage}
                  </p>
                  {refreshRetryAt && refreshRetryIn && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Réessayez après {refreshRetryAt} • dans environ {refreshRetryIn}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onRefresh}
               disabled={refreshing || !!refreshMessage}
              className="rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--orange)', color: '#fff' }}
            >
              {refreshButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}