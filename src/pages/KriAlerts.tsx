import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { kriApi, type KriResult, type PrometheusAlert } from '../lib/api/modules'

// ── helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: KriResult['status']) {
  switch (status) {
    case 'ok':          return { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' }
    case 'warning':     return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' }
    case 'critical':    return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' }
    default:            return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' }
  }
}

function statusLabel(status: KriResult['status']) {
  switch (status) {
    case 'ok':          return 'OK'
    case 'warning':     return 'ALERTE'
    case 'critical':    return 'CRITIQUE'
    case 'unavailable': return 'Indisponible'
    default:            return 'Inconnu'
  }
}

function formatValue(value: number | null, unit: KriResult['unit']) {
  if (value === null) return '—'
  switch (unit) {
    case 'percent': return `${(value * 100).toFixed(1)}%`
    case 'seconds': return value >= 1 ? `${value.toFixed(2)}s` : `${(value * 1000).toFixed(0)}ms`
    default:        return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
}

function ThresholdBar({ kri }: { kri: KriResult }) {
  if (kri.value === null) return null
  const { warnThreshold: warn, critThreshold: crit, value, unit } = kri

  // For "below" KRIs (KRI-1: success rate), invert the display
  const isBelow = unit === 'percent'
  const max     = isBelow ? 1     : crit * 1.5
  const pct     = isBelow
    ? Math.min(100, (value / max) * 100)
    : Math.min(100, (value / max) * 100)
  const warnPct = isBelow ? (warn / max) * 100 : (warn / max) * 100
  const critPct = isBelow ? (crit / max) * 100 : (crit / max) * 100

  const barColor = kri.status === 'critical' ? '#ef4444'
                 : kri.status === 'warning'  ? '#f59e0b'
                 : '#10b981'

  return (
    <div className="mt-2">
      <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, background: barColor }} />
        {/* threshold markers */}
        <div className="absolute top-0 h-full w-px bg-amber-400 opacity-70"
             style={{ left: `${warnPct}%` }} />
        <div className="absolute top-0 h-full w-px bg-red-500 opacity-70"
             style={{ left: `${Math.min(critPct, 98)}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-slate-400">
        <span>0</span>
        <span className="text-amber-500">⚠ {formatValue(warn, unit)}</span>
        <span className="text-red-500">🔴 {formatValue(crit, unit)}</span>
      </div>
    </div>
  )
}

function KriCard({ kri }: { kri: KriResult }) {
  const c = statusColor(kri.status)
  const mainValue = kri.series.length > 1 ? null : kri.value

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2 transition-shadow hover:shadow-md"
         style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: c.dot }}>
            {kri.id}
          </span>
          <p className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">{kri.label}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: c.bg, borderColor: c.border, color: c.text }}>
          {statusLabel(kri.status)}
        </span>
      </div>

      {/* Main value (single series) */}
      {mainValue !== null && (
        <p className="text-3xl font-bold tabular-nums" style={{ color: c.text }}>
          {formatValue(mainValue, kri.unit)}
        </p>
      )}

      {/* Multi-series breakdown (e.g. per provider) */}
      {kri.series.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {kri.series.map((s, i) => {
            const label = s.labels.provider ?? s.labels.reason ?? `série ${i + 1}`
            return (
              <div key={i} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                   style={{ background: '#fff', border: `1px solid ${c.border}`, color: c.text }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                {label}: {formatValue(s.value, kri.unit)}
              </div>
            )
          })}
        </div>
      )}

      <ThresholdBar kri={kri} />
    </div>
  )
}

function AlertRow({ alert }: { alert: PrometheusAlert }) {
  const isCritical = alert.labels.severity === 'critical'
  const c = isCritical
    ? { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' }
    : { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' }

  const activeAt = alert.activeAt ? new Date(alert.activeAt) : null
  const duration = activeAt
    ? (() => {
        const mins = Math.floor((Date.now() - activeAt.getTime()) / 60000)
        if (mins < 60) return `${mins} min`
        return `${Math.floor(mins / 60)}h ${mins % 60}min`
      })()
    : null

  return (
    <div className="flex items-start gap-3 rounded-lg border px-4 py-3"
         style={{ background: c.bg, borderColor: c.border }}>
      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c.dot }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: c.text }}>
          {alert.annotations.summary ?? alert.labels.alertname}
        </p>
        {alert.annotations.description && (
          <p className="text-xs mt-0.5 text-slate-500">{alert.annotations.description}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border"
              style={{ background: c.bg, borderColor: c.border, color: c.text }}>
          {isCritical ? 'CRITIQUE' : 'ALERTE'}
        </span>
        {duration && (
          <p className="text-[10px] text-slate-400 mt-1">{duration}</p>
        )}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function KriAlerts() {
  const { data, isFetching, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['kri-dashboard'],
    queryFn: kriApi.dashboard,
    refetchInterval: 60_000,
    retry: 2,
  })

  const kris         = data?.kris         ?? []
  const activeAlerts = data?.activeAlerts ?? []
  const criticalKris = kris.filter(k => k.status === 'critical')
  const warningKris  = kris.filter(k => k.status === 'warning')
  const lastUpdate   = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KRI — Indicateurs de Risque Clés</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFetching ? 'Actualisation en cours…' : `Dernière mise à jour : ${lastUpdate}`}
            {' · '}Rafraîchissement automatique toutes les 60s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <span className={isFetching ? 'animate-spin' : ''}>↻</span>
          Actualiser
        </button>
      </div>

      {/* Summary badges */}
      {kris.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            {criticalKris.length} critique{criticalKris.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            {warningKris.length} alerte{warningKris.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            {kris.filter(k => k.status === 'ok').length} OK
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Impossible de charger les KRI</strong> — Vérifiez que Prometheus est accessible
          ({(error as Error)?.message}).
        </div>
      )}

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
            🔔 Alertes actives ({activeAlerts.length})
          </h2>
          <div className="space-y-2">
            {activeAlerts
              .sort((a, b) => (b.labels.severity === 'critical' ? 1 : 0) - (a.labels.severity === 'critical' ? 1 : 0))
              .map((alert, i) => <AlertRow key={i} alert={alert} />)}
          </div>
        </section>
      )}

      {/* KRI grid */}
      {kris.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
            Tableau de bord KRI
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kris.map(kri => <KriCard key={kri.id} kri={kri} />)}
          </div>
        </section>
      )}

      {/* Empty / loading state */}
      {!isError && kris.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-16 text-slate-400 text-sm">
          {isFetching ? 'Chargement des KRI…' : 'Aucune donnée disponible'}
        </div>
      )}
    </div>
  )
}
