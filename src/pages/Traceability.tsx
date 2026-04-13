import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import {
  merchantsApi,
  settlementsApi,
  type BalanceLedgerEntryItem,
  type TransactionStatusHistoryItem,
} from '../lib/api/modules'

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

function fmtDelta(amount: number) {
  if (amount > 0) return `+${amount.toFixed(2)}`
  return amount.toFixed(2)
}

function actorColor(actorType: string): 'emerald' | 'blue' | 'amber' | 'slate' {
  const t = (actorType || '').toUpperCase()
  if (t === 'MERCHANT') return 'emerald'
  if (t === 'ADMIN') return 'blue'
  if (t === 'SYSTEM') return 'amber'
  return 'slate'
}

export default function Traceability() {
  const [searchParams] = useSearchParams()
  const [merchantId, setMerchantId] = useState('all')
  const [currency, setCurrency] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)

  const [transactionIdInput, setTransactionIdInput] = useState('')
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [historySourceFilter, setHistorySourceFilter] = useState('all')
  const [historyActorFilter, setHistoryActorFilter] = useState('all')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')

  useEffect(() => {
    const tx = searchParams.get('tx')?.trim()
    if (!tx) return
    setTransactionIdInput(tx)
    setSelectedTransactionId(tx)
  }, [searchParams])

  const merchantsQuery = useQuery({
    queryKey: ['traceability-merchants'],
    queryFn: merchantsApi.list,
  })

  const merchantOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of merchantsQuery.data ?? []) {
      if (item.merchantId && item.merchantName && !map.has(item.merchantId)) {
        map.set(item.merchantId, item.merchantName)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [merchantsQuery.data])

  const ledgerQuery = useQuery({
    queryKey: ['traceability-ledger', merchantId, currency, page, pageSize],
    queryFn: () => settlementsApi.ledger({
      merchantId: merchantId === 'all' ? undefined : merchantId,
      currency: currency === 'all' ? undefined : currency,
      page,
      pageSize,
    }),
  })

  const historyQuery = useQuery({
    queryKey: ['traceability-status-history', selectedTransactionId],
    queryFn: () => settlementsApi.transactionStatusHistory(selectedTransactionId as string),
    enabled: !!selectedTransactionId,
  })

  const ledgerItems = ledgerQuery.data?.items ?? []
  const totalCount = ledgerQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const historyItems = historyQuery.data ?? []

  const filteredHistoryItems = useMemo(() => {
    const from = historyDateFrom ? new Date(`${historyDateFrom}T00:00:00`).getTime() : null
    const to = historyDateTo ? new Date(`${historyDateTo}T23:59:59`).getTime() : null

    return historyItems.filter((item) => {
      if (historySourceFilter !== 'all' && item.source !== historySourceFilter) return false
      if (historyActorFilter !== 'all' && item.actorType !== historyActorFilter) return false

      const at = new Date(item.createdAt).getTime()
      if (from !== null && at < from) return false
      if (to !== null && at > to) return false

      return true
    })
  }, [historyActorFilter, historyDateFrom, historyDateTo, historyItems, historySourceFilter])

  const historySourceOptions = useMemo(() => {
    return Array.from(new Set(historyItems.map((i) => i.source))).filter(Boolean)
  }, [historyItems])

  const historyActorOptions = useMemo(() => {
    return Array.from(new Set(historyItems.map((i) => i.actorType))).filter(Boolean)
  }, [historyItems])

  const submitHistoryLookup = (event: React.FormEvent) => {
    event.preventDefault()
    const value = transactionIdInput.trim()
    if (!value) return
    setSelectedTransactionId(value)
  }

  const resetHistoryFilters = () => {
    setHistorySourceFilter('all')
    setHistoryActorFilter('all')
    setHistoryDateFrom('')
    setHistoryDateTo('')
  }

  const exportLedgerCsv = () => {
    if (ledgerItems.length === 0) return

    const header = [
      'createdAt',
      'entryType',
      'actorType',
      'actorId',
      'currency',
      'availableDelta',
      'pendingDelta',
      'reservedDelta',
      'availableBalanceAfter',
      'pendingBalanceAfter',
      'reservedBalanceAfter',
      'reference',
      'merchantId',
      'transactionId',
      'settlementId',
      'notes',
    ]

    const rows = ledgerItems.map((item) => [
      item.createdAt ?? '',
      item.entryType ?? '',
      item.actorType ?? '',
      item.actorId ?? '',
      item.currency ?? '',
      String(item.availableDelta ?? ''),
      String(item.pendingDelta ?? ''),
      String(item.reservedDelta ?? ''),
      String(item.availableBalanceAfter ?? ''),
      String(item.pendingBalanceAfter ?? ''),
      String(item.reservedBalanceAfter ?? ''),
      item.reference ?? '',
      item.merchantId ?? '',
      item.transactionId ?? '',
      item.settlementId ?? '',
      item.notes ?? '',
    ])

    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`
    const csv = [header, ...rows].map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceability-ledger-${merchantId}-${currency}-p${page}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportHistoryCsv = () => {
    if (filteredHistoryItems.length === 0) return

    const header = ['createdAt', 'previousStatus', 'newStatus', 'source', 'actorType', 'actorId', 'notes']
    const rows = filteredHistoryItems.map((item) => [
      item.createdAt ?? '',
      item.previousStatus ?? '',
      item.newStatus ?? '',
      item.source ?? '',
      item.actorType ?? '',
      item.actorId ?? '',
      item.notes ?? '',
    ])

    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`
    const csv = [header, ...rows].map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traceability-history-${selectedTransactionId ?? 'unknown'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[var(--text-1)]">Ledger des balances</h2>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-3)]">{totalCount} mouvement(s)</span>
            <Button
              className="h-8 text-[11px]"
              variant="secondary"
              onClick={exportLedgerCsv}
              disabled={ledgerItems.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Select value={merchantId} onChange={(e) => { setMerchantId(e.target.value); setPage(1) }}>
            <option value="all">Tous marchands</option>
            {merchantOptions.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
            ))}
          </Select>

          <Select value={currency} onChange={(e) => { setCurrency(e.target.value); setPage(1) }}>
            <option value="all">Toutes devises</option>
            <option value="XAF">XAF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>

          <div className="text-[12px] text-[var(--text-3)] flex items-center">
            Détection live des mouvements comptables (append-only)
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Date</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Type</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Acteur</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Disponible Δ</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Pending Δ</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Solde après</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Référence</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Trace statut</th>
              </tr>
            </thead>
            <tbody>
              {ledgerQuery.isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={8}>Chargement...</td>
                </tr>
              ) : ledgerItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={8}>Aucun mouvement trouvé.</td>
                </tr>
              ) : (
                ledgerItems.map((entry) => (
                  <LedgerRow
                    key={entry.id}
                    item={entry}
                    onSelectTransaction={(transactionId) => {
                      if (!transactionId) return
                      setSelectedTransactionId(transactionId)
                      setTransactionIdInput(transactionId)
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Précédent
            </Button>
            <span className="text-[12px] text-[var(--text-3)]">Page {page} / {totalPages}</span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Suivant
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-bold text-[var(--text-1)]">Historique des statuts transaction</h2>
          <div className="flex items-center gap-2">
            <Button className="h-8 text-[11px]" variant="ghost" onClick={resetHistoryFilters}>
              Reset filtres
            </Button>
            <Button
              className="h-8 text-[11px]"
              variant="secondary"
              onClick={exportHistoryCsv}
              disabled={filteredHistoryItems.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>
        <form className="mt-3 flex items-center gap-2" onSubmit={submitHistoryLookup}>
          <Input
            className="h-9"
            placeholder="TransactionId (GUID)"
            value={transactionIdInput}
            onChange={(e) => setTransactionIdInput(e.target.value)}
          />
          <Button type="submit" className="h-9">Charger</Button>
        </form>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Select value={historySourceFilter} onChange={(e) => setHistorySourceFilter(e.target.value)}>
            <option value="all">Toutes sources</option>
            {historySourceOptions.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </Select>

          <Select value={historyActorFilter} onChange={(e) => setHistoryActorFilter(e.target.value)}>
            <option value="all">Tous acteurs</option>
            {historyActorOptions.map((actorType) => (
              <option key={actorType} value={actorType}>{actorType}</option>
            ))}
          </Select>

          <Input
            type="date"
            className="h-9"
            value={historyDateFrom}
            onChange={(e) => setHistoryDateFrom(e.target.value)}
          />

          <Input
            type="date"
            className="h-9"
            value={historyDateTo}
            onChange={(e) => setHistoryDateTo(e.target.value)}
          />
        </div>

        {selectedTransactionId && (
          <p className="mt-2 text-[11px] text-[var(--text-3)]">
            Transaction: <span className="font-mono text-[var(--text-2)]">{selectedTransactionId}</span> - {filteredHistoryItems.length} ligne(s) apres filtre
          </p>
        )}

        {!selectedTransactionId ? (
          <p className="mt-3 text-[12px] text-[var(--text-3)]">Sélectionne une transaction depuis le ledger ou entre un TransactionId.</p>
        ) : historyQuery.isLoading ? (
          <p className="mt-3 text-[12px] text-[var(--text-3)]">Chargement de la timeline...</p>
        ) : (
          <StatusHistoryTimeline items={filteredHistoryItems} />
        )}
      </Card>
    </div>
  )
}

function LedgerRow({ item, onSelectTransaction }: {
  item: BalanceLedgerEntryItem
  onSelectTransaction: (transactionId?: string) => void
}) {
  return (
    <tr className="border-t border-[var(--border-soft)]">
      <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">{fmtDate(item.createdAt)}</td>
      <td className="px-3 py-2 text-[11px] font-mono text-[var(--text-2)]">{item.entryType}</td>
      <td className="px-3 py-2">
        <Badge color={actorColor(item.actorType)} dot>{item.actorType}</Badge>
      </td>
      <td className="px-3 py-2 text-[11px] font-mono text-[var(--text-2)]">{fmtDelta(item.availableDelta)}</td>
      <td className="px-3 py-2 text-[11px] font-mono text-[var(--text-2)]">{fmtDelta(item.pendingDelta)}</td>
      <td className="px-3 py-2 text-[11px] font-mono text-[var(--text-1)]">
        {fmtMoney(item.availableBalanceAfter, item.currency)} · P:{item.pendingBalanceAfter.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-[11px] font-mono text-[var(--text-3)]">{item.reference || '—'}</td>
      <td className="px-3 py-2">
        {item.transactionId ? (
          <Button className="h-7 text-[10px]" variant="secondary" onClick={() => onSelectTransaction(item.transactionId)}>
            Voir statut
          </Button>
        ) : (
          <span className="text-[11px] text-[var(--text-4)]">—</span>
        )}
      </td>
    </tr>
  )
}

function StatusHistoryTimeline({ items }: { items: TransactionStatusHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-[12px] text-[var(--text-3)]">Aucune entrée d'historique.</p>
  }

  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-2)]">
            <span className="font-mono text-[var(--text-4)]">{fmtDate(item.createdAt)}</span>
            <span className="font-semibold">{item.previousStatus || '—'} → {item.newStatus}</span>
            <span className="text-[var(--text-4)]">[{item.source}]</span>
            <Badge color={actorColor(item.actorType)}>{item.actorType}</Badge>
          </div>
          {item.notes && <p className="mt-1 text-[11px] text-[var(--text-3)]">{item.notes}</p>}
        </div>
      ))}
    </div>
  )
}
