import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { insightsApi } from '../../lib/api/modules'
import type { ProviderAdviceItem } from '../../lib/api/modules'
import { Badge } from '../ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtXaf = (amount: number) =>
  new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount)

// ─── InsightTile ──────────────────────────────────────────────────────────────

function InsightTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
          {label}
        </span>
      </div>
      <p
        className="text-[18px] font-bold leading-tight"
        style={{ color: accent ?? 'var(--text-1)' }}
      >
        {value}
      </p>
      {sub !== undefined && (
        <div className="text-[11px] text-[var(--text-3)]">{sub}</div>
      )}
    </div>
  )
}

// ─── InsightsCard ─────────────────────────────────────────────────────────────

export default function InsightsCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['merchant-insights'],
    queryFn: insightsApi.get,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="panel mb-5">
        <div className="panel-header">
          <span className="panel-title">💡 Insights de la semaine</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-[var(--r-sm)] border border-[var(--border-soft)] p-3 space-y-2">
              <div className="h-2.5 w-28 rounded animate-pulse bg-[var(--bg-raised)]" />
              <div className="h-5 w-20 rounded animate-pulse bg-[var(--bg-raised)]" />
              <div className="h-2 w-36 rounded animate-pulse bg-[var(--bg-raised)]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) return null

  // ── Tile 1: Prochain settlement ───────────────────────────────────────────
  const settlementDate = data.nextSettlement.estimatedDate
    ? format(new Date(data.nextSettlement.estimatedDate), 'EEE d MMM', { locale: fr })
    : '–'

  const settlementSub = (
    <span className="flex flex-wrap items-center gap-1.5">
      <span>{fmtXaf(data.nextSettlement.estimatedAmountXaf)}</span>
      {data.nextSettlement.confidence === 'high' ? (
        <Badge color="emerald">Estimation fiable</Badge>
      ) : (
        <Badge color="amber">Données insuffisantes</Badge>
      )}
    </span>
  )

  // ── Tile 2: Meilleur moment provider ─────────────────────────────────────
  const mtnAdvice = data.providerAdvice.find(
    (p: ProviderAdviceItem) => p.provider?.toUpperCase() === 'MTN',
  ) ?? data.providerAdvice[0]

  const providerSub = 'Basé sur 30 jours de transactions'

  // ── Tile 3: Prévision semaine ─────────────────────────────────────────────
  const forecast = data.weeklyForecast
  const trendUp = forecast.trendPct >= 0
  const trendIcon = trendUp ? '📈' : '📉'
  const trendAccent = trendUp ? 'var(--green)' : 'var(--red)'
  const trendText = trendUp
    ? `+${forecast.trendPct.toFixed(1)} % vs semaine dernière`
    : `−${Math.abs(forecast.trendPct).toFixed(1)} % vs semaine dernière`

  const forecastValue = `${new Intl.NumberFormat('fr-CM').format(
    Math.round(forecast.forecastMinXaf),
  )} – ${new Intl.NumberFormat('fr-CM').format(Math.round(forecast.forecastMaxXaf))} XAF`

  // ── Tile 4: Score ST Pay ──────────────────────────────────────────────────
  const score = data.merchantScore
  const scoreAccent =
    score.score >= 800
      ? 'var(--green)'
      : score.score >= 400
        ? 'var(--orange)'
        : 'var(--red)'

  const scoreSub = `${score.tier}${score.bnplEligible ? ' · BNPL activé' : ''}`

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <span className="panel-title">💡 Insights de la semaine</span>
        <Badge color="amber">Prédictif</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        <InsightTile
          icon="📅"
          label="Prochain settlement"
          value={settlementDate}
          sub={settlementSub}
        />
        <InsightTile
          icon="⚡"
          label={mtnAdvice ? `Conseil ${mtnAdvice.provider}` : 'Conseil provider'}
          value={mtnAdvice?.advice ?? '—'}
          sub={providerSub}
        />
        <InsightTile
          icon={trendIcon}
          label="Prévision semaine"
          value={forecastValue}
          sub={
            <span style={{ color: trendAccent }}>
              {trendText}
            </span>
          }
          accent="var(--text-1)"
        />
        <InsightTile
          icon="✅"
          label="Score ST Pay"
          value={`${score.score} / 1 000`}
          sub={scoreSub}
          accent={scoreAccent}
        />
      </div>
    </div>
  )
}
