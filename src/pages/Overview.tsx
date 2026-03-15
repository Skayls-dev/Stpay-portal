import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { analyticsApi, transactionsApi, POLL_INTERVAL_TRANSACTIONS } from '../lib/api/modules'
import { Card, Badge, DataTable } from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import type { Transaction } from '../lib/api/modules'

interface StatCardProps {
  label: string
  value: number | string
  color?: string
}

function MetricCard({ label, value, color = 'text-brand' }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </Card>
  )
}

const RECENT_COLS: DataTableColumn<Transaction>[] = [
  {
    key: 'ref',
    header: 'Référence',
    render: (tx) => (
      <span className="font-mono text-xs">{transactionsApi.displayReference(tx)}</span>
    ),
  },
  {
    key: 'provider',
    header: 'Fournisseur',
    render: (tx) => (
      <Badge color="blue">{tx.provider}</Badge>
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    render: (tx) =>
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: tx.currency }).format(tx.amount),
  },
  {
    key: 'status',
    header: 'Statut',
    render: (tx) => (
      <Badge color={transactionsApi.getStatusColor(tx.status) as 'emerald' | 'amber' | 'red' | 'slate'}>
        {transactionsApi.getStatusText(tx.status)}
      </Badge>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    render: (tx) =>
      tx.createdAt
        ? new Date(tx.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—',
  },
]

export default function Overview() {
  const { role, user, isSuperAdmin } = useAuth()
  const escrowPath = isSuperAdmin ? '/admin/escrow' : '/merchant/escrow'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-muted">Aperçu de l'activité de paiement</p>
      </div>

      {/* Metric cards */}
      {statsLoading ? (
        <p className="text-sm text-muted">Chargement des statistiques…</p>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total transactions" value={stats.total} />
          <MetricCard label="Réussies" value={stats.completed} color="text-emerald-600" />
          <MetricCard label="En attente" value={stats.pending} color="text-amber-600" />
          <MetricCard label="Échouées" value={stats.failed} color="text-red-600" />
          <MetricCard
            label="Volume traité (XAF)"
            value={new Intl.NumberFormat('fr-FR').format(stats.totalAmount)}
          />
        </div>
      ) : null}

      {/* Bottom section — role-adaptive */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-slate-900">Transactions récentes</h2>
          {recentLoading ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : (
            <DataTable<Transaction>
              columns={RECENT_COLS}
              data={recent}
              rowKey={(tx) => tx.id}
              emptyText="Aucune transaction récente"
            />
          )}
        </div>

        {/* Right panel: super_admin → top merchants / merchant → escrow summary */}
        <div className="space-y-3">
          {isSuperAdmin ? (
            <>
              <h2 className="font-semibold text-slate-900">Top marchands</h2>
              {topMerchants.length === 0 ? (
                <p className="text-sm text-muted">Aucune donnée disponible.</p>
              ) : (
                <Card className="divide-y divide-slate-100">
                  {topMerchants.map((m) => (
                    <div key={m.merchant} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-slate-700">{m.merchant}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {new Intl.NumberFormat('fr-FR').format(m.amount)} XAF
                      </span>
                    </div>
                  ))}
                </Card>
              )}
            </>
          ) : (
            <>
              <h2 className="font-semibold text-slate-900">Résumé escrow</h2>
              <Card>
                <p className="text-sm text-muted">
                  Consultez la page <strong>{escrowPath}</strong> pour le détail de votre solde.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
