import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { providerIntelligenceApi } from '../../lib/api/modules'
import type { ProviderStats, ProviderHourlyBucket } from '../../lib/api/modules'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtXaf(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function fmtDuration(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function successColor(rate: number): string {
  if (rate >= 95) return '#10b981'   // emerald-500
  if (rate >= 85) return '#f59e0b'   // amber-400
  return '#ef4444'                   // red-500
}

function heatBg(count: number, rate: number): string {
  if (count === 0) return 'var(--bg-subtle, #2a2a2a)'
  if (rate >= 95)  return 'rgba(16,185,129,0.70)'
  if (rate >= 80)  return 'rgba(251,191,36,0.60)'
  return 'rgba(248,113,113,0.60)'
}

const PERIODS = [30, 60, 90] as const

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3">
        <div className="h-8 w-48 rounded-full bg-[var(--bg-raised)] opacity-60" />
        <div className="h-8 w-48 rounded-full bg-[var(--bg-raised)] opacity-60" />
      </div>
      <div className="h-40 rounded-xl bg-[var(--bg-raised)] opacity-40" />
      <div className="h-32 rounded-xl bg-[var(--bg-raised)] opacity-40" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProviderIntelligenceWidget() {
  const [days, setDays] = useState<30 | 60 | 90>(30)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['provider-intelligence', days],
    queryFn: () => providerIntelligenceApi.get(days),
    staleTime: 60_000,
  })

  return (
    <div
      className="rounded-2xl border p-5 space-y-5"
      style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-soft)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Intelligence provider
        </h2>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={
                days === p
                  ? { background: 'var(--orange)', color: '#fff' }
                  : { background: 'var(--bg-subtle, #2a2a2a)', color: 'var(--text-muted)' }
              }
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Impossible de charger les données.
        </p>
      )}

      {data && (
        <>
          {/* Zone 1 — Insight pills */}
          <div className="flex flex-wrap gap-3">
            <InsightPill
              icon="🏆"
              label="Provider dominant"
              value={data.dominantProvider || '—'}
              accent="var(--orange)"
            />
            <InsightPill
              icon="✅"
              label="Plus fiable"
              value={data.mostReliableProvider || '—'}
              accent="#10b981"
            />
          </div>

          {/* Zone 2 — Comparison table */}
          {data.providers.length > 0 && (
            <ProviderTable providers={data.providers} />
          )}

          {/* Zone 3 — Hourly heatmap */}
          {data.hourlyHeatmap.length > 0 && (
            <HourlyHeatmap
              heatmap={data.hourlyHeatmap}
              providers={data.providers.map((p) => p.provider)}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── InsightPill ──────────────────────────────────────────────────────────────

function InsightPill({ icon, label, value, accent }: {
  icon: string
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
      style={{ borderColor: accent, color: accent, background: `${accent}18` }}
    >
      <span>{icon}</span>
      <span style={{ color: 'var(--text-muted)' }} className="font-normal">{label} :</span>
      <span>{value}</span>
    </div>
  )
}

// ─── ProviderTable ────────────────────────────────────────────────────────────

function ProviderTable({ providers }: { providers: ProviderStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="border-b" style2={{ borderColor: 'var(--border-soft)' }}>
            {['Provider', 'Transactions', 'Succès %', 'Volume XAF', 'Panier moy.', 'Durée moy.', 'Part volume'].map((h) => (
              <th key={h} className="pb-2 pr-4 text-left font-medium whitespace-nowrap last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <ProviderRow key={p.provider} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProviderRow({ p }: { p: ProviderStats }) {
  return (
    <tr
      className="border-b last:border-0 hover:bg-[var(--bg-subtle)] transition-colors"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      {/* Provider */}
      <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
        {p.provider}
      </td>

      {/* Transactions */}
      <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {p.totalTransactions.toLocaleString('fr-FR')}
      </td>

      {/* Succès % */}
      <td className="py-2.5 pr-4">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: `${successColor(p.successRate)}22`, color: successColor(p.successRate) }}
        >
          {p.successRate.toFixed(1)} %
        </span>
      </td>

      {/* Volume XAF */}
      <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {fmtXaf(p.totalVolume)}
      </td>

      {/* Panier moyen */}
      <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {fmtXaf(p.avgTransactionAmount)}
      </td>

      {/* Durée moy. */}
      <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {fmtDuration(p.avgDurationSeconds)}
      </td>

      {/* Part volume */}
      <td className="py-2.5">
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle, #2a2a2a)' }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${Math.min(100, p.volumeShare)}%`, background: 'var(--orange)' }}
            />
          </div>
          <span className="text-xs tabular-nums w-9 text-right" style={{ color: 'var(--text-muted)' }}>
            {p.volumeShare.toFixed(1)} %
          </span>
        </div>
      </td>
    </tr>
  )
}

// ─── HourlyHeatmap ────────────────────────────────────────────────────────────

function HourlyHeatmap({
  heatmap,
  providers,
}: {
  heatmap: ProviderHourlyBucket[]
  providers: string[]
}) {
  // Build lookup: map[provider][hour] = bucket
  const lookup = new Map<string, Map<number, ProviderHourlyBucket>>()
  for (const b of heatmap) {
    if (!lookup.has(b.provider)) lookup.set(b.provider, new Map())
    lookup.get(b.provider)!.set(b.hour, b)
  }

  const HOURS = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        Activité par heure (30 derniers jours)
      </p>

      <div className="overflow-x-auto">
        <table className="text-xs border-separate" style={{ borderSpacing: '2px' }}>
          <thead>
            <tr>
              {/* Provider label column spacer */}
              <th className="w-24" />
              {HOURS.map((h) => (
                <th
                  key={h}
                  className="w-5 text-center font-normal"
                  style={{ color: h % 4 === 0 ? 'var(--text-muted)' : 'transparent', fontSize: '10px' }}
                >
                  {h % 4 === 0 ? `${h}h` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider}>
                <td
                  className="pr-2 text-right font-medium truncate max-w-[88px]"
                  style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                  title={provider}
                >
                  {provider}
                </td>
                {HOURS.map((h) => {
                  const b = lookup.get(provider)?.get(h)
                  const count = b?.count ?? 0
                  const rate  = b?.successRate ?? 0
                  const bg    = heatBg(count, rate)
                  const tip   = count > 0
                    ? `${provider} ${h}h — ${count} tx — ${rate.toFixed(1)}%`
                    : `${provider} ${h}h — 0 tx`
                  return (
                    <td key={h} title={tip}>
                      <div
                        className="rounded-sm"
                        style={{ width: '20px', height: '20px', background: bg }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
