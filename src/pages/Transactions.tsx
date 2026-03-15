import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { transactionsApi, POLL_INTERVAL_TRANSACTIONS } from '../lib/api/modules'
import { Card, Badge, DataTable, Input, Select, Button } from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import type { Transaction } from '../lib/api/modules'

const PROVIDERS = ['all', 'MTN', 'ORANGE', 'WAVE', 'MOOV']
const STATUSES = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled']

function DetailPanel({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ['Référence', <span className="font-mono text-xs">{tx.transactionId}</span>],
    ['Fournisseur', <Badge color="blue">{tx.provider}</Badge>],
    [
      'Montant',
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: tx.currency }).format(tx.amount),
    ],
    ['Statut', <Badge color={transactionsApi.getStatusColor(tx.status) as 'emerald' | 'amber' | 'red' | 'slate'}>{transactionsApi.getStatusText(tx.status)}</Badge>],
    ['Marchand', tx.merchantName || tx.merchantId || '—'],
    ['Date création', tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : '—'],
    ['Dernière MAJ', tx.updatedAt ? new Date(tx.updatedAt).toLocaleString('fr-FR') : '—'],
    ['Description', tx.description || '—'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Détail transaction</h3>
          <Button variant="ghost" onClick={onClose}>✕ Fermer</Button>
        </div>
        <dl className="space-y-4">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}

export default function Transactions() {
  const { isSuperAdmin } = useAuth()

  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [merchantFilter, setMerchantFilter] = useState('')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const { data: transactions = [], isFetching } = useQuery({
    queryKey: ['transactions', statusFilter, providerFilter, merchantFilter],
    queryFn: () =>
      transactionsApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        provider: providerFilter !== 'all' ? providerFilter : undefined,
        merchantId: merchantFilter || undefined,
      }),
    refetchInterval: POLL_INTERVAL_TRANSACTIONS,
  })

  const columns: DataTableColumn<Transaction>[] = [
    {
      key: 'ref',
      header: 'Référence',
      render: (tx) => (
        <span className="font-mono text-xs text-slate-600">{transactionsApi.displayReference(tx)}</span>
      ),
    },
    {
      key: 'provider',
      header: 'Fournisseur',
      render: (tx) => <Badge color="blue">{tx.provider}</Badge>,
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
    ...(isSuperAdmin
      ? [
          {
            key: 'merchant',
            header: 'Marchand',
            render: (tx: Transaction) => <span className="text-xs">{tx.merchantName || tx.merchantId || '—'}</span>,
          } as DataTableColumn<Transaction>,
        ]
      : []),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-muted">
            {isFetching ? 'Actualisation…' : `${transactions.length} transaction(s)`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="flex flex-wrap gap-3">
        <Select
          className="w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Tous les statuts' : transactionsApi.getStatusText(s)}</option>
          ))}
        </Select>

        <Select
          className="w-40"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>{p === 'all' ? 'Tous les opérateurs' : p}</option>
          ))}
        </Select>

        {isSuperAdmin && (
          <Input
            className="w-48"
            placeholder="ID marchand…"
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
          />
        )}
      </Card>

      <DataTable<Transaction>
        columns={columns}
        data={transactions}
        rowKey={(tx) => tx.id}
        onRowClick={setSelected}
        emptyText="Aucune transaction trouvée"
      />

      {selected && <DetailPanel tx={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
