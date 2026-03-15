// src/pages/Analytics.tsx
import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { transactionsApi } from '../lib/api/modules'
import type { Transaction } from '../lib/api/modules'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtXAF(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function getDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Build chart data from transactions ───────────────────────────────────────

function buildDailyData(txs: Transaction[], days = 14) {
  const buckets: Record<string, { volume: number; success: number; failed: number; total: number }> = {}

  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = { volume: 0, success: 0, failed: 0, total: 0 }
  }

  txs.forEach((tx) => {
    if (!tx.createdAt) return
    const key = tx.createdAt.slice(0, 10)
    if (!buckets[key]) return
    buckets[key].volume += tx.amount
    buckets[key].total  += 1
    const s = tx.status.toLowerCase()
    if (['completed', 'success', 'successful'].includes(s)) buckets[key].success += 1
    if (['failed', 'error', 'rejected', 'cancelled'].includes(s)) buckets[key].failed += 1
  })

  return Object.entries(buckets).map(([date, d]) => ({
    date,
    label: getDayLabel(date + 'T00:00:00'),
    volume: d.volume,
    success: d.success,
    failed: d.failed,
    total: d.total,
    rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0,
  }))
}

function buildProviderData(txs: Transaction[]) {
  const map: Record<string, { volume: number; count: number }> = {}
  txs.forEach((tx) => {
    const p = tx.provider?.toUpperCase() || 'OTHER'
    if (!map[p]) map[p] = { volume: 0, count: 0 }
    map[p].volume += tx.amount
    map[p].count  += 1
  })
  return Object.entries(map)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.volume - a.volume)
}

const PROVIDER_COLORS: Record<string, string> = {
  MTN:    '#FFCC00',
  ORANGE: '#FF6600',
  WAVE:   '#60A5FA',
  MOOV:   '#7EC96A',
  OTHER:  '#5A5E78',
}

// ─── Recharts shared theme ────────────────────────────────────────────────────

const CHART_THEME = {
  cartesianGrid: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' },
  axis: { tick: { fill: '#5A5E78', fontSize: 11, fontFamily: 'DM Mono' }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: {
      background: '#1A1D27',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 8,
      fontSize: 12,
      color: '#F0F1F5',
      fontFamily: 'DM Sans',
    },
    cursor: { stroke: 'rgba(245,166,35,0.2)', strokeWidth: 1 },
  },
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_THEME.tooltip.contentStyle} className="px-3 py-2.5">
      <p style={{ color: '#8A8EA6', fontSize: 11, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#F5A623', fontWeight: 600 }}>
        {fmtXAF(payload[0]?.value ?? 0)}
      </p>
    </div>
  )
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_THEME.tooltip.contentStyle} className="px-3 py-2.5">
      <p style={{ color: '#8A8EA6', fontSize: 11, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#22C55E', fontWeight: 600 }}>{payload[0]?.value ?? 0} %</p>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, color = 'text-[var(--text-primary)]' }:
  { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                    rounded-[var(--radius-md)] p-4">
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</p>
      <p className={`font-display font-bold text-[24px] leading-none tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{sub}</p>}
    </div>
  )
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7 jours',  days: 7  },
  { label: '14 jours', days: 14 },
  { label: '30 jours', days: 30 },
]

export default function Analytics() {
  const { role, user } = useAuth()
  const [periodIdx, setPeriodIdx] = useState(1)
  const days = PERIODS[periodIdx].days

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['analytics-transactions', role, user.merchantId],
    queryFn: () => transactionsApi.list({
      merchantId: role === 'merchant' ? user.merchantId : undefined,
    }),
  })

  const daily    = useMemo(() => buildDailyData(txs, days), [txs, days])
  const byProv   = useMemo(() => buildProviderData(txs), [txs])

  const totalVol = txs.reduce((s, tx) => s + tx.amount, 0)
  const totalTx  = txs.length
  const succRate = totalTx > 0
    ? Math.round(txs.filter((tx) => ['completed','success','successful']
        .includes(tx.status.toLowerCase())).length / totalTx * 100)
    : 0
  const avgTx    = totalTx > 0 ? Math.round(totalVol / totalTx) : 0

  const PIE_TOTAL = byProv.reduce((s, p) => s + p.volume, 0)

  return (
    <div className="space-y-4">

      {/* ── Period selector ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[var(--bg-overlay)] p-0.5 rounded-[var(--radius-sm)]">
          {PERIODS.map(({ label }, i) => (
            <button
              key={label}
              onClick={() => setPeriodIdx(i)}
              className={`px-3.5 py-1.5 rounded-[4px] text-[12px] transition-colors
                ${i === periodIdx
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {isLoading ? 'Chargement…' : `${totalTx} transactions analysées`}
        </span>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Volume total"     value={fmtM(totalVol)}        sub="XAF traités"            color="text-[var(--gold-bright)]" />
        <Kpi label="Transactions"     value={totalTx.toLocaleString('fr-FR')} sub="sur la période" />
        <Kpi label="Taux de succès"   value={`${succRate} %`}        sub="transactions réussies"  color="text-[var(--green)]" />
        <Kpi label="Panier moyen"     value={fmtM(avgTx)}           sub="XAF par transaction" />
      </div>

      {/* ── Volume area chart ── */}
      <ChartPanel title="Volume quotidien (XAF)">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F5A623" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_THEME.cartesianGrid} />
            <XAxis dataKey="label" {...CHART_THEME.axis} interval={Math.floor(days / 7)} />
            <YAxis {...CHART_THEME.axis} tickFormatter={fmtM} width={46} />
            <Tooltip content={<VolumeTooltip />} />
            <Area
              type="monotone" dataKey="volume"
              stroke="#F5A623" strokeWidth={2}
              fill="url(#volGrad)" dot={false} activeDot={{ r: 4, fill: '#F5A623' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      {/* ── Bottom row: success rate + provider breakdown ── */}
      <div className="grid lg:grid-cols-2 gap-3">

        {/* Success rate bar chart */}
        <ChartPanel title="Taux de succès par jour (%)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...CHART_THEME.cartesianGrid} />
              <XAxis dataKey="label" {...CHART_THEME.axis} interval={Math.floor(days / 7)} />
              <YAxis {...CHART_THEME.axis} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
              <Tooltip content={<RateTooltip />} />
              <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {daily.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.rate >= 90 ? '#22C55E'
                        : entry.rate >= 70 ? '#F59E0B'
                        : '#EF4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Provider pie + legend */}
        <ChartPanel title="Répartition par opérateur">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={byProv}
                  cx="50%" cy="50%"
                  innerRadius={48} outerRadius={72}
                  paddingAngle={3}
                  dataKey="volume"
                >
                  {byProv.map((p, i) => (
                    <Cell
                      key={i}
                      fill={PROVIDER_COLORS[p.name] ?? '#5A5E78'}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 space-y-2.5 min-w-0">
              {byProv.map((p) => {
                const pct = PIE_TOTAL > 0 ? Math.round((p.volume / PIE_TOTAL) * 100) : 0
                return (
                  <div key={p.name} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PROVIDER_COLORS[p.name] ?? '#5A5E78' }} />
                    <span className="text-[12px] text-[var(--text-secondary)] flex-1 truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">
                      {pct}%
                    </span>
                    <div className="w-16 h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                           style={{
                             width: `${pct}%`,
                             background: PROVIDER_COLORS[p.name] ?? '#5A5E78',
                           }} />
                    </div>
                  </div>
                )
              })}

              {byProv.length === 0 && (
                <p className="text-[12px] text-[var(--text-muted)]">Aucune donnée</p>
              )}
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* ── Transactions per day bar chart ── */}
      <ChartPanel title="Volume de transactions par jour">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_THEME.cartesianGrid} />
            <XAxis dataKey="label" {...CHART_THEME.axis} interval={Math.floor(days / 7)} />
            <YAxis {...CHART_THEME.axis} width={30} />
            <Tooltip
              contentStyle={CHART_THEME.tooltip.contentStyle}
              cursor={{ fill: 'rgba(245,166,35,0.05)' }}
              formatter={(v: number) => [v, 'Transactions']}
            />
            <Bar dataKey="success" stackId="a" fill="#22C55E" fillOpacity={0.8} radius={0} maxBarSize={16} />
            <Bar dataKey="failed"  stackId="a" fill="#EF4444" fillOpacity={0.7} radius={[3,3,0,0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]" />Réussies
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--red)]" />Échouées
          </div>
        </div>
      </ChartPanel>
    </div>
  )
}
