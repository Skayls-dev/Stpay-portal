// src/pages/Overview.tsx
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { analyticsApi, transactionsApi, POLL_INTERVAL_TRANSACTIONS } from '../lib/api/modules'
import { Badge, DataTable } from '../components/ui'
import { IconArrowUp, IconArrowDown } from '../components/icons/NavIcons'
import type { DataTableColumn } from '../components/ui'
import type { Transaction } from '../lib/api/modules'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Provider badge ───────────────────────────────────────────────────────────
const PROV_CLS: Record<string, string> = {
  MTN: 'prov-mtn', ORANGE: 'prov-ora',
}

function ProviderBadge({ name }: { name: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-[24px] h-[24px]
                      rounded-[5px] text-[8px] font-extrabold font-mono flex-shrink-0
                      ${PROV_CLS[name?.toUpperCase()] ?? 'prov-ora'}`}>
      {name?.slice(0, 3).toUpperCase() ?? '???'}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, iconBg, icon, accentColor }: {
  label: string; value: string; iconBg: string; icon: React.ReactNode
  delta?: { text: string; up: boolean | null }; accentColor?: string
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-3)]">{label}</span>
        <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="font-extrabold text-[22px] leading-none tracking-tight"
         style={{ color: accentColor || 'var(--text-1)' }}>
        {value}
      </p>
      {delta && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold
          ${delta.up === true  ? 'text-[var(--green)]'  : ''}
          ${delta.up === false ? 'text-[var(--red)]'    : ''}
          ${delta.up === null  ? 'text-[var(--text-3)]' : ''}`}>
          {delta.up === true  && <IconArrowUp />}
          {delta.up === false && <IconArrowDown />}
          {delta.text}
        </div>
      )}
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
const SPARK = [35, 55, 42, 68, 80, 100]
const SPARK_LABELS = ['10 mar','11 mar','12 mar','13 mar','14 mar','Auj.']

function Sparkline() {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-soft)]">
      <div className="flex items-end gap-[3px] h-9">
        {SPARK.map((h, i) => (
          <div key={i}
               className={`flex-1 rounded-t-[2px] transition-colors
                 ${i === SPARK.length - 1
                   ? 'bg-[var(--orange)]'
                   : 'bg-[var(--border-soft)] hover:bg-[var(--orange-border)]'}`}
               style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {SPARK_LABELS.map((l) => (
          <span key={l} className="text-[9px] text-[var(--text-4)] font-mono">{l}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Providers panel ──────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: 'MTN MoMo',     short: 'MTN', pct: 63, vol: 89_200_000, bar: '#FFC700' },
  { name: 'Orange Money', short: 'ORA', pct: 25, vol: 35_800_000, bar: '#FF6600' },
]

function ProvidersPanel() {
  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Fournisseurs</span></div>
      <div className="divide-y divide-[var(--border-soft)]">
        {PROVIDERS.map((p) => (
          <div key={p.short}
               className="flex items-center gap-2.5 px-4 py-2.5
                          hover:bg-[var(--bg-subtle)] transition-colors">
            <ProviderBadge name={p.short} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text-1)]">{p.name}</p>
              <p className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                {new Intl.NumberFormat('fr-FR').format(p.vol)} XAF
              </p>
            </div>
            <div className="w-14 h-[3px] bg-[var(--border-soft)] rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                   style={{ width: `${p.pct}%`, background: p.bar }} />
            </div>
            <span className="text-[11px] font-bold font-mono text-[var(--text-2)] w-7 text-right">
              {p.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Escrow panel ─────────────────────────────────────────────────────────────
function EscrowPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Escrow actif</span>
        <span className="panel-link">Détail →</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-3)] mb-1">
            Fonds séquestrés
          </p>
          <p className="font-extrabold text-[22px] tracking-tight leading-none"
             style={{ color: 'var(--orange)' }}>
            12 450 000
          </p>
          <p className="text-[11px] text-[var(--text-3)] mt-1">
            XAF · 3 livraisons en attente
          </p>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[var(--text-3)]">Libéré ce mois</span>
            <span className="font-semibold" style={{ color: 'var(--orange)' }}>68 %</span>
          </div>
          <div className="h-[3px] bg-[var(--border-soft)] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '68%', background: 'var(--orange)' }} />
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { ref: 'ESC-BRU-KIN-0042', amt: '85 000 XAF', status: 'pending', label: 'En transit' },
            { ref: 'ESC-CDK-ABJ-0018', amt: '42 500 XAF', status: 'success', label: 'Livré' },
          ].map((item) => (
            <div key={item.ref}
                 className="flex items-center justify-between px-3 py-2
                            bg-[var(--bg-subtle)] rounded-[var(--r-sm)]
                            border border-[var(--border-soft)]">
              <div>
                <p className="text-[10px] font-mono text-[var(--text-2)]">{item.ref}</p>
                <p className="text-[9px] text-[var(--text-4)] mt-0.5">Code : ●●●●●●</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold font-mono text-[var(--text-1)]">{item.amt}</p>
                <Badge color={item.status === 'success' ? 'emerald' : 'amber'} dot className="mt-0.5">
                  {item.label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Top Merchants ────────────────────────────────────────────────────────────
function TopMerchantsPanel({ merchants }: { merchants: { merchant: string; amount: number }[] }) {
  if (!merchants.length) return null
  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Top marchands</span></div>
      <div className="divide-y divide-[var(--border-soft)]">
        {merchants.map((m, i) => (
          <div key={m.merchant}
               className="flex items-center gap-3 px-4 py-2.5
                          hover:bg-[var(--bg-subtle)] transition-colors">
            <span className="text-[11px] font-mono text-[var(--text-4)] w-4">{i + 1}</span>
            <span className="flex-1 text-[12px] text-[var(--text-1)] truncate font-medium">
              {m.merchant}
            </span>
            <span className="text-[12px] font-bold font-mono text-[var(--text-1)]">
              {new Intl.NumberFormat('fr-FR').format(m.amount)} XAF
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminIncidentsPanel({ recent }: { recent: Transaction[] }) {
  const failedCount = recent.filter((tx) => ['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(tx.status.toLowerCase())).length
  const pendingCount = recent.filter((tx) => ['pending', 'processing', 'initiated'].includes(tx.status.toLowerCase())).length

  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Incidents & surveillance</span></div>
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2">
          <span className="text-[11px] text-[var(--text-2)]">Transactions en echec</span>
          <Badge color={failedCount > 0 ? 'red' : 'emerald'} dot>{failedCount}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2">
          <span className="text-[11px] text-[var(--text-2)]">Transactions en attente</span>
          <Badge color={pendingCount > 0 ? 'amber' : 'emerald'} dot>{pendingCount}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2">
          <span className="text-[11px] text-[var(--text-2)]">Etat connectivite backend</span>
          <Badge color="emerald" dot>OK</Badge>
        </div>
      </div>
    </div>
  )
}

function AdminOpsPanel() {
  const links = [
    { to: '/admin/traceability', label: 'Traceability financiere' },
    { to: '/admin/settlements', label: 'Validation settlements' },
    { to: '/admin/webhooks', label: 'Supervision webhooks' },
    { to: '/admin/providers', label: 'Sante operateurs' },
  ]

  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Operations admin</span></div>
      <div className="p-3 space-y-2">
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="block rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[11px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--orange-border)] hover:text-[var(--orange)]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Table columns ────────────────────────────────────────────────────────────
const RECENT_COLS: DataTableColumn<Transaction>[] = [
  {
    key: 'prov', header: '', className: 'w-10',
    render: (tx) => <ProviderBadge name={tx.provider} />,
  },
  {
    key: 'ref', header: 'Référence',
    render: (tx) => (
      <span className="font-mono text-[11px] text-[var(--text-2)]">
        {transactionsApi.displayReference(tx)}
      </span>
    ),
  },
  {
    key: 'amount', header: 'Montant', className: 'text-right',
    render: (tx) => (
      <span className="font-mono text-[12px] font-bold text-[var(--text-1)]">
        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: tx.currency }).format(tx.amount)}
      </span>
    ),
  },
  {
    key: 'status', header: 'Statut', className: 'text-center',
    render: (tx) => (
      <Badge color={transactionsApi.getStatusColor(tx.status) as any} dot>
        {transactionsApi.getStatusText(tx.status)}
      </Badge>
    ),
  },
  {
    key: 'date', header: 'Date', className: 'text-right',
    render: (tx) => (
      <span className="text-[11px] text-[var(--text-4)]">{fmtDate(tx.createdAt)}</span>
    ),
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Overview() {
  const { role, user, isSuperAdmin } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', role, user.merchantId],
    queryFn: () => analyticsApi.stats(role, user.merchantId),
  })

  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: ['recent-transactions', role, user.merchantId],
    queryFn: () => analyticsApi.recentTransactions(role, user.merchantId),
    refetchInterval: POLL_INTERVAL_TRANSACTIONS,
  })

  const { data: topMerchants = [] } = useQuery({
    queryKey: ['top-merchants'],
    queryFn: analyticsApi.topMerchants,
    enabled: isSuperAdmin,
  })

  const kpis = useMemo(() => {
    if (!stats) return null
    const total = stats.totalAmount ?? 0
    const rate  = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 1000) / 10 : 0
    return { total, rate }
  }, [stats])

  return (
    <div className="space-y-4">

      {isSuperAdmin && (
        <div className="rounded-[var(--r-md)] border border-[var(--orange-border)] bg-[var(--orange-bg)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[var(--orange-dark)]">Cockpit Super Admin</p>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                Supervision globale des operations, risques et performance plateforme
              </p>
            </div>
            <Badge color="amber" dot>Mode admin</Badge>
          </div>
        </div>
      )}

      {/* Period tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[var(--border)] p-[3px] rounded-[7px]">
          {['Aperçu', '7 jours', '30 jours', 'Tout'].map((t, i) => (
            <button key={t}
                    className={`px-3.5 py-1.5 rounded-[5px] text-[12px] transition-colors
                      ${i === 0
                        ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
              {t}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-4)]">Mis à jour il y a 30s</span>
      </div>

      {/* KPI grid */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-3 w-20 rounded bg-[var(--border)]" />
              <div className="h-6 w-14 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCard label="Volume traité"
            value={kpis ? `${(kpis.total / 1_000_000).toFixed(1)}M` : '—'}
            delta={{ text: '+12.4% XAF', up: true }}
            accentColor="var(--orange)"
            iconBg="bg-[var(--orange-bg)]"
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v10M3.5 4.5l3-3 3 3M3.5 8.5l3 3 3-3" stroke="var(--orange)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <KpiCard label="Transactions"
            value={new Intl.NumberFormat('fr-FR').format(stats.total)}
            delta={{ text: '+8.2% ce mois', up: true }}
            iconBg="bg-[var(--blue-bg)]"
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="3.5" width="10" height="6" rx="1.5" stroke="var(--blue)" strokeWidth="1.2"/><path d="M4 6.5h5M4 8.5h2" stroke="var(--blue)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          />
          <KpiCard label="Taux de succès"
            value={kpis ? `${kpis.rate}%` : '—'}
            delta={{ text: '+1.3pts vs hier', up: true }}
            accentColor="var(--green)"
            iconBg="bg-[var(--green-bg)]"
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 7L5 9.5l5.5-5.5" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <KpiCard label="Escrow actif"
            value="12.4M"
            delta={{ text: '3 en attente', up: null }}
            iconBg="bg-[var(--amber-bg)]"
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="4" width="10" height="8" rx="1.5" stroke="var(--amber)" strokeWidth="1.2"/><path d="M4.5 4V3a2.5 2.5 0 015 0v1" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          />
        </div>
      ) : null}

      {/* Content grid */}
      <div className="grid gap-3 lg:grid-cols-[1fr_250px]">
        {/* Transactions panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">{isSuperAdmin ? 'Transactions globales' : 'Transactions récentes'}</span>
            <span className="panel-link">{isSuperAdmin ? 'Analyse globale →' : 'Voir tout →'}</span>
          </div>
          <Sparkline />
          {recentLoading ? (
            <p className="p-4 text-[13px] text-[var(--text-3)]">Chargement…</p>
          ) : (
            <DataTable<Transaction>
              columns={RECENT_COLS}
              data={recent}
              rowKey={(tx) => tx.id}
              emptyText="Aucune transaction récente"
            />
          )}
        </div>

        {/* Right */}
        <div className="space-y-3">
          <ProvidersPanel />
          {isSuperAdmin ? (
            <>
              <TopMerchantsPanel merchants={topMerchants} />
              <AdminIncidentsPanel recent={recent} />
              <AdminOpsPanel />
            </>
          ) : (
            <EscrowPanel />
          )}
        </div>
      </div>
    </div>
  )
}
