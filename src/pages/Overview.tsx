// src/pages/Overview.tsx
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { analyticsApi, transactionsApi, POLL_INTERVAL_TRANSACTIONS } from '../lib/api/modules'
import { Card, Badge, DataTable } from '../components/ui'
import { IconArrowUp, IconArrowDown } from '../components/icons/NavIcons'
import type { DataTableColumn } from '../components/ui'
import type { Transaction } from '../lib/api/modules'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtXAF(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

// ─── Provider colour map ──────────────────────────────────────────────────────

const PROV_STYLE: Record<string, string> = {
  MTN:   'prov-mtn',
  ORANGE:'prov-ora',
  WAVE:  'prov-wav',
  MOOV:  'prov-moov',
}

function ProviderBadge({ name }: { name: string }) {
  const cls = PROV_STYLE[name?.toUpperCase()] ?? 'prov-moov'
  return (
    <span
      className={`inline-flex items-center justify-center w-[26px] h-[26px]
                  rounded-[6px] text-[9px] font-bold font-mono flex-shrink-0 ${cls}`}
    >
      {name?.slice(0, 3).toUpperCase() ?? '???'}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string
  value: string | number
  delta?: { text: string; up: boolean | null }
  accent?: 'gold' | 'green' | 'blue' | 'amber'
  icon?: React.ReactNode
}

const ACCENT_ICON_BG: Record<string, string> = {
  gold:  'bg-[var(--gold-bg)]',
  green: 'bg-[var(--green-bg)]',
  blue:  'bg-[var(--blue-bg)]',
  amber: 'bg-[var(--amber-bg)]',
}

const ACCENT_VALUE: Record<string, string> = {
  gold:  'text-[var(--gold-bright)]',
  green: 'text-[var(--green)]',
  blue:  'text-[var(--text-primary)]',
  amber: 'text-[var(--text-primary)]',
}

function KpiCard({ label, value, delta, accent = 'blue', icon }: KpiProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
        {icon && (
          <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${ACCENT_ICON_BG[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`font-display font-bold text-[22px] leading-none tracking-tight ${ACCENT_VALUE[accent]}`}>
        {value}
      </p>
      {delta && (
        <div className={`flex items-center gap-1 text-[11px] font-medium
          ${delta.up === true  ? 'text-[var(--green)]'  : ''}
          ${delta.up === false ? 'text-[var(--red)]'    : ''}
          ${delta.up === null  ? 'text-[var(--text-muted)]' : ''}`}
        >
          {delta.up === true  && <IconArrowUp className="flex-shrink-0" />}
          {delta.up === false && <IconArrowDown className="flex-shrink-0" />}
          {delta.text}
        </div>
      )}
    </div>
  )
}

// ─── Sparkline bars ───────────────────────────────────────────────────────────

const SPARK_DATA = [35, 55, 42, 68, 80, 100]
const SPARK_LABELS = ['10 mar', '11 mar', '12 mar', '13 mar', '14 mar', 'Auj.']

function Sparkline() {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-soft)]">
      <div className="flex items-end gap-1 h-10">
        {SPARK_DATA.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-colors
              ${i === SPARK_DATA.length - 1
                ? 'bg-[var(--gold)]'
                : 'bg-[var(--bg-subtle)] hover:bg-[rgba(245,166,35,0.25)]'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {SPARK_LABELS.map((l) => (
          <span key={l} className="text-[9px] text-[var(--text-muted)] font-mono">{l}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Provider breakdown ───────────────────────────────────────────────────────

const PROVIDERS = [
  { name: 'MTN MoMo',      short: 'MTN', pct: 63, vol: 89_200_000, barColor: '#FFCC00' },
  { name: 'Orange Money',  short: 'ORA', pct: 25, vol: 35_800_000, barColor: '#FF6600' },
  { name: 'Wave',          short: 'WAV', pct: 12, vol: 17_800_000, barColor: '#60A5FA' },
]

function ProvidersPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Fournisseurs</span>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {PROVIDERS.map((p) => (
          <div key={p.short} className="flex items-center gap-2.5 px-4 py-2.5
                                        hover:bg-[var(--bg-overlay)] transition-colors">
            <ProviderBadge name={p.short} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--text-primary)]">{p.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                {fmtXAF(p.vol)} XAF
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-16 h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${p.pct}%`, background: p.barColor }}
              />
            </div>
            <span className="text-[11px] font-semibold font-mono text-[var(--text-secondary)] w-8 text-right">
              {p.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Escrow summary (merchant) ────────────────────────────────────────────────

function EscrowPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Escrow actif</span>
        <a className="text-[11px] text-[var(--gold)] cursor-pointer
                      px-2 py-0.5 rounded border border-[var(--gold-border)]
                      bg-[var(--gold-bg)] hover:bg-[rgba(245,166,35,0.15)] transition-colors font-medium">
          Détail →
        </a>
      </div>
      <div className="p-4 space-y-3">
        {/* Amount */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-0.5">
            Fonds séquestrés
          </p>
          <p className="font-display font-bold text-[24px] text-[var(--gold-bright)] tracking-tight leading-none">
            12 450 000
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            XAF · 3 livraisons en attente
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[var(--text-muted)]">Libéré ce mois</span>
            <span className="text-[var(--gold)] font-medium">68 %</span>
          </div>
          <div className="h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: '68%', background: 'linear-gradient(90deg, var(--gold), var(--gold-bright))' }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {[
            { ref: 'ESC-BRU-KIN-0042', amt: '85 000 XAF', status: 'pending', label: 'En transit' },
            { ref: 'ESC-CDK-ABJ-0018', amt: '42 500 XAF', status: 'success', label: 'Livré' },
          ].map((item) => (
            <div key={item.ref}
                 className="flex items-center justify-between px-3 py-2
                            bg-[var(--bg-overlay)] rounded-[var(--radius-sm)]
                            border border-[var(--border-soft)]">
              <div>
                <p className="text-[10px] font-mono text-[var(--text-secondary)]">{item.ref}</p>
                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Code : ●●●●●●</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold font-mono text-[var(--text-primary)]">
                  {item.amt}
                </p>
                <Badge
                  color={item.status === 'success' ? 'emerald' : 'amber'}
                  dot
                  className="mt-0.5"
                >
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

// ─── Top merchants (admin) ────────────────────────────────────────────────────

function TopMerchantsPanel({ merchants }: { merchants: { merchant: string; amount: number }[] }) {
  if (merchants.length === 0) return null

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Top marchands</span>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {merchants.map((m, i) => (
          <div key={m.merchant}
               className="flex items-center gap-3 px-4 py-2.5
                          hover:bg-[var(--bg-overlay)] transition-colors">
            <span className="text-[11px] font-mono text-[var(--text-muted)] w-4">{i + 1}</span>
            <span className="flex-1 text-[12px] text-[var(--text-primary)] truncate">
              {m.merchant}
            </span>
            <span className="text-[12px] font-semibold font-mono text-[var(--text-primary)]">
              {fmtXAF(m.amount)} XAF
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recent transactions table columns ───────────────────────────────────────

const RECENT_COLS: DataTableColumn<Transaction>[] = [
  {
    key: 'prov',
    header: '',
    className: 'w-10',
    render: (tx) => <ProviderBadge name={tx.provider} />,
  },
  {
    key: 'ref',
    header: 'Référence',
    render: (tx) => (
      <span className="font-mono text-[11px] text-[var(--text-secondary)]">
        {transactionsApi.displayReference(tx)}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    className: 'text-right',
    render: (tx) => (
      <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: tx.currency }).format(tx.amount)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Statut',
    className: 'text-center',
    render: (tx) => (
      <Badge
        color={transactionsApi.getStatusColor(tx.status) as 'emerald' | 'amber' | 'red' | 'slate'}
        dot
      >
        {transactionsApi.getStatusText(tx.status)}
      </Badge>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    className: 'text-right',
    render: (tx) => (
      <span className="text-[11px] text-[var(--text-muted)]">{fmtDate(tx.createdAt)}</span>
    ),
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

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

  // ── KPI data ──
  const kpis = useMemo(() => {
    if (!stats) return null
    const total = stats.totalAmount ?? 0
    const rate  = stats.total > 0 ? Math.round((stats.completed / stats.total) * 1000) / 10 : 0
    return { total, rate }
  }, [stats])

  return (
    <div className="space-y-4">
      {/* ── Period tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[var(--bg-overlay)] p-0.5 rounded-[var(--radius-sm)]">
          {['Aperçu', '7 jours', '30 jours', 'Tout'].map((t, i) => (
            <button
              key={t}
              className={`px-3.5 py-1.5 rounded-[4px] text-[12px] transition-colors
                ${i === 0
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">Mis à jour il y a 30s</span>
      </div>

      {/* ── KPI cards ── */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
              <div className="h-7 w-16 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCard
            label="Volume traité"
            value={kpis ? `${(kpis.total / 1_000_000).toFixed(1)}M` : '—'}
            delta={{ text: '+12.4% XAF', up: true }}
            accent="gold"
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5v10M3.5 4.5l3-3 3 3M3.5 8.5l3 3 3-3"
                      stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <KpiCard
            label="Transactions"
            value={new Intl.NumberFormat('fr-FR').format(stats.total)}
            delta={{ text: '+8.2% ce mois', up: true }}
            accent="blue"
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1.5" y="3.5" width="10" height="6" rx="1.5" stroke="var(--blue)" strokeWidth="1.2" />
                <path d="M4 6.5h5M4 8.5h2" stroke="var(--blue)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
          />
          <KpiCard
            label="Taux de succès"
            value={kpis ? `${kpis.rate}%` : '—'}
            delta={{ text: '+1.3 pts vs hier', up: true }}
            accent="green"
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2.5 7L5 9.5l5.5-5.5" stroke="var(--green)" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <KpiCard
            label="Escrow actif"
            value="12.4M"
            delta={{ text: '3 livraisons en attente', up: null }}
            accent="amber"
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5L8.5 5.5h4l-3.2 2.3 1.2 4-4-2.8-4 2.8 1.2-4L1 5.5h4z"
                      stroke="var(--amber)" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* ── Main content grid ── */}
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        {/* Left: transactions panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Transactions récentes</span>
            <a className="text-[11px] text-[var(--gold)] cursor-pointer
                          px-2 py-0.5 rounded border border-[var(--gold-border)]
                          bg-[var(--gold-bg)] hover:bg-[rgba(245,166,35,0.15)] transition-colors font-medium">
              Voir tout →
            </a>
          </div>

          <Sparkline />

          {recentLoading ? (
            <p className="p-4 text-sm text-[var(--text-muted)]">Chargement…</p>
          ) : (
            <DataTable<Transaction>
              columns={RECENT_COLS}
              data={recent}
              rowKey={(tx) => tx.id}
              emptyText="Aucune transaction récente"
            />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <ProvidersPanel />
          {isSuperAdmin
            ? <TopMerchantsPanel merchants={topMerchants} />
            : <EscrowPanel />
          }
        </div>
      </div>
    </div>
  )
}
