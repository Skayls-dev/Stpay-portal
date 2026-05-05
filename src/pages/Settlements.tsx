import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import {
  merchantsApi,
  payoutAccountsApi,
  settlementsApi,
  type SettlementItem,
  type SettlementTransactionItem,
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

function statusColor(status: string): 'amber' | 'emerald' | 'red' | 'slate' {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'pending' || normalized === 'processing') return 'amber'
  if (normalized === 'completed') return 'emerald'
  if (normalized === 'failed') return 'red'
  return 'slate'
}

function statusLabel(status: string) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'pending') return 'En attente'
  if (normalized === 'processing') return 'En cours'
  if (normalized === 'completed') return 'Traité'
  if (normalized === 'failed') return 'Echec'
  return status || 'Inconnu'
}

function formatOrigin(item: SettlementItem) {
  if (item.origins?.length) {
    return item.origins
      .slice(0, 2)
      .map((origin) => `${origin.provider} ${origin.transactionCount}`)
      .join(' · ')
  }

  return 'Origine indisponible'
}

export default function Settlements() {
  const { isSuperAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const [merchantId, setMerchantId] = useState('')
  const [currency, setCurrency] = useState('XAF')
  const [triggerNotes, setTriggerNotes] = useState('')
  const [selectedPayoutAccountId, setSelectedPayoutAccountId] = useState<string>('')

  // Merchant per-provider payout editing
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editHolderName, setEditHolderName] = useState('')

  const [processNotes, setProcessNotes] = useState<Record<string, string>>({})
  const [expandedSettlementId, setExpandedSettlementId] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [merchantFilter, setMerchantFilter] = useState('all')

  const settlementsKey = isSuperAdmin
    ? ['settlements', 'all', page, pageSize]
    : ['settlements', 'mine']

  const settlementsQuery = useQuery({
    queryKey: settlementsKey,
    queryFn: async () => {
      if (isSuperAdmin) {
        const response = await settlementsApi.listAll(page, pageSize)
        return { items: response.items, totalCount: response.totalCount }
      }
      const mine = await settlementsApi.listMine()
      return { items: mine, totalCount: mine.length }
    },
  })

  const merchantsQuery = useQuery({
    queryKey: ['settlement-merchants'],
    queryFn: merchantsApi.list,
    enabled: isSuperAdmin,
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

  const payoutAccountQuery = useQuery({
    queryKey: ['merchant-payout-account', merchantId],
    queryFn: () => settlementsApi.getPayoutAccount(merchantId),
    enabled: isSuperAdmin && !!merchantId,
  })

  // Reset selection when merchant changes
  React.useEffect(() => {
    setSelectedPayoutAccountId('')
  }, [merchantId])

  // Auto-select first account when accounts load
  React.useEffect(() => {
    const accounts = payoutAccountQuery.data?.accounts
    if (accounts?.length && !selectedPayoutAccountId) {
      setSelectedPayoutAccountId(accounts[0].id)
    }
  }, [payoutAccountQuery.data])

  const triggerMutation = useMutation({
    mutationFn: settlementsApi.trigger,
    onSuccess: () => {
      toast.success('Settlement déclenché')
      setTriggerNotes('')
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Echec du déclenchement'
      toast.error(message)
    },
  })

  const forceCompleteMutation = useMutation({
    mutationFn: ({ merchantId, provider }: { merchantId: string; provider?: string }) =>
      settlementsApi.forceCompletePending({ merchantId, provider: provider || undefined, limit: 100 }),
    onSuccess: (data) => {
      toast.success(`${data.forced} transaction(s) confirmée(s) — le solde marchand a été mis à jour`)
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlement-merchants'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Echec de la confirmation'
      toast.error(message)
    },
  })

  // Merchant own payout accounts (per provider)
  const ownPayoutAccountsQuery = useQuery({
    queryKey: ['own-payout-accounts'],
    queryFn: payoutAccountsApi.list,
    enabled: !isSuperAdmin,
  })

  const payoutUpsertMutation = useMutation({
    mutationFn: async (input: { provider: string; accountNumber: string; accountHolderName: string }) => {
      const existing = ownPayoutAccountsQuery.data?.find((a) => a.provider === input.provider)
      if (existing) {
        return payoutAccountsApi.update(existing.id, {
          provider: input.provider,
          accountNumber: input.accountNumber,
          accountHolderName: input.accountHolderName,
          currency: 'XAF',
          isDefault: existing.isDefault,
        })
      }
      return payoutAccountsApi.create({
        provider: input.provider,
        accountNumber: input.accountNumber,
        accountHolderName: input.accountHolderName,
        currency: 'XAF',
        isDefault: false,
      })
    },
    onSuccess: () => {
      toast.success('Compte de payout enregistré')
      setEditingProvider(null)
      queryClient.invalidateQueries({ queryKey: ['own-payout-accounts'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Echec de la mise à jour'
      toast.error(message)
    },
  })

  const markProcessedMutation = useMutation({
    mutationFn: ({ settlementId, notes }: { settlementId: string; notes?: string }) =>
      settlementsApi.markProcessed(settlementId, notes),
    onSuccess: () => {
      toast.success('Settlement marqué comme traité')
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Echec de validation'
      toast.error(message)
    },
  })

  const items = settlementsQuery.data?.items ?? []
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && (item.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      if (currencyFilter !== 'all' && (item.currency || '').toUpperCase() !== currencyFilter.toUpperCase()) {
        return false
      }

      if (isSuperAdmin && merchantFilter !== 'all' && item.merchantId !== merchantFilter) {
        return false
      }

      return true
    })
  }, [items, statusFilter, currencyFilter, merchantFilter, isSuperAdmin])

  const totalCount = settlementsQuery.data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const submitTrigger = (event: React.FormEvent) => {
    event.preventDefault()
    if (!merchantId) {
      toast.error('Sélectionne un marchand')
      return
    }

    triggerMutation.mutate({
      merchantId,
      currency,
      notes: triggerNotes.trim() || undefined,
      payoutAccountId: selectedPayoutAccountId || undefined,
    })
  }

  const submitPayoutEdit = (providerKey: string) => {
    if (!editAccountNumber.trim() || !editHolderName.trim()) {
      toast.error('Numéro et nom du titulaire requis')
      return
    }
    payoutUpsertMutation.mutate({
      provider: providerKey,
      accountNumber: editAccountNumber.trim(),
      accountHolderName: editHolderName.trim(),
    })
  }

  const startEdit = (providerKey: string) => {
    const existing = ownPayoutAccountsQuery.data?.find((a) => a.provider === providerKey)
    setEditingProvider(providerKey)
    setEditAccountNumber(existing?.accountNumber ?? '')
    setEditHolderName(existing?.accountHolderName ?? '')
  }

  const handleExport = async (settlementId: string) => {
    setExporting(settlementId)
    try {
      await settlementsApi.exportCsv(settlementId)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <Card>
          <h2 className="text-[14px] font-bold text-[var(--text-1)]">Déclencher un settlement</h2>
          <form className="mt-3 space-y-2.5" onSubmit={submitTrigger}>
            <Select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
              <option value="">Choisir un marchand</option>
              {merchantOptions.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
              ))}
            </Select>

            {merchantId && (
              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-4)]">Compte payout du marchand</p>
                {payoutAccountQuery.isLoading ? (
                  <p className="text-[12px] text-[var(--text-3)]">Chargement…</p>
                ) : !payoutAccountQuery.data?.accounts?.length ? (
                  <p className="text-[12px] text-amber-600">⚠ Aucun compte payout configuré par ce marchand</p>
                ) : (
                  <div className="divide-y divide-[var(--border-soft)]">
                    {payoutAccountQuery.data.accounts.map((acc) => (
                      <label
                        key={acc.id}
                        className={`flex items-center gap-3 py-2 cursor-pointer rounded transition-colors px-1 ${
                          selectedPayoutAccountId === acc.id
                            ? 'bg-[var(--bg-active)] ring-1 ring-[var(--accent)]'
                            : 'hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payoutAccount"
                          value={acc.id}
                          checked={selectedPayoutAccountId === acc.id}
                          onChange={() => setSelectedPayoutAccountId(acc.id)}
                          className="accent-[var(--accent)]"
                        />
                        <span className="w-16 text-[11px] font-semibold text-[var(--text-1)]">{acc.provider}</span>
                        <span className="font-mono text-[12px] text-[var(--text-2)]">{acc.accountNumber}</span>
                        <span className="text-[11px] text-[var(--text-3)]">· {acc.accountHolderName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
              <Input
                placeholder="Note (optionnel)"
                value={triggerNotes}
                onChange={(e) => setTriggerNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="submit" disabled={triggerMutation.isPending}>
                {triggerMutation.isPending ? 'Traitement…' : 'Déclencher'}
              </Button>
              {merchantId && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={forceCompleteMutation.isPending}
                  onClick={() => {
                    const provider = selectedPayoutAccountId
                      ? payoutAccountQuery.data?.accounts?.find(a => a.id === selectedPayoutAccountId)?.provider
                      : undefined
                    forceCompleteMutation.mutate({ merchantId, provider })
                  }}
                  title="Marque les transactions PENDING comme SUCCESS pour pouvoir déclencher un settlement (test uniquement)"
                >
                  {forceCompleteMutation.isPending ? 'Confirmation…' : '⚡ Confirmer transactions PENDING'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card>
          <h2 className="text-[14px] font-bold text-[var(--text-1)]">Mes comptes de payout</h2>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            Configurez un compte par opérateur. ST Pay versera les fonds MTN sur votre numéro MTN, et les fonds Orange sur votre numéro Orange.
          </p>
          <div className="mt-3 divide-y divide-[var(--border-soft)]">
            {(['MTN', 'ORANGE'] as const).map((prov) => {
              const existing = ownPayoutAccountsQuery.data?.find((a) => a.provider === prov)
              const isEditing = editingProvider === prov
              return (
                <div key={prov} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-[13px] font-semibold text-[var(--text-1)]">{prov}</span>
                      {existing ? (
                        <span className="font-mono text-[12px] text-[var(--text-2)]">{existing.accountNumber}</span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-4)] italic">Non configuré</span>
                      )}
                    </div>
                    {!isEditing && (
                      <Button variant="ghost" onClick={() => startEdit(prov)}>
                        {existing ? 'Modifier' : '+ Ajouter'}
                      </Button>
                    )}
                  </div>
                  {isEditing && (
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder="Numéro mobile (ex: 6XXXXXXXX)"
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                      />
                      <Input
                        placeholder="Nom du titulaire du compte"
                        value={editHolderName}
                        onChange={(e) => setEditHolderName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={payoutUpsertMutation.isPending}
                          onClick={() => submitPayoutEdit(prov)}
                        >
                          {payoutUpsertMutation.isPending ? 'Sauvegarde…' : 'Enregistrer'}
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingProvider(null)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[var(--text-1)]">
            {isSuperAdmin ? 'Settlements marchands' : 'Mes settlements'}
          </h2>
          {isSuperAdmin && (
            <span className="text-[12px] text-[var(--text-3)]">{totalCount} au total</span>
          )}
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="processing">En cours</option>
            <option value="completed">Traité</option>
            <option value="failed">Echec</option>
          </Select>

          <Select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            <option value="all">Toutes devises</option>
            <option value="XAF">XAF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>

          {isSuperAdmin ? (
            <Select value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)}>
              <option value="all">Tous marchands</option>
              {merchantOptions.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
              ))}
            </Select>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                {isSuperAdmin && (
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Marchand</th>
                )}
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Origine</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Montant</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Transactions</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Période</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Payout</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Statut</th>
                {isSuperAdmin && (
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {settlementsQuery.isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={isSuperAdmin ? 8 : 6}>
                    Chargement…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={isSuperAdmin ? 8 : 6}>
                    Aucun settlement pour ces filtres.
                  </td>
                </tr>
              ) : (
                filteredItems.map((settlement) => (
                  <React.Fragment key={settlement.id}>
                    <SettlementRow
                      item={settlement}
                      isSuperAdmin={isSuperAdmin}
                      processNote={processNotes[settlement.id] ?? ''}
                      onProcessNote={(value) => setProcessNotes((prev) => ({ ...prev, [settlement.id]: value }))}
                      onMarkProcessed={() => {
                        markProcessedMutation.mutate({
                          settlementId: settlement.id,
                          notes: processNotes[settlement.id]?.trim() || undefined,
                        })
                      }}
                      onToggleDetails={() => setExpandedSettlementId((prev) => (prev === settlement.id ? null : settlement.id))}
                      isExpanded={expandedSettlementId === settlement.id}
                      isUpdating={markProcessedMutation.isPending}
                      onExport={() => handleExport(settlement.id)}
                      isExporting={exporting === settlement.id}
                    />
                    {expandedSettlementId === settlement.id && (
                      <tr className="border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                        <td className="px-3 py-3" colSpan={isSuperAdmin ? 8 : 6}>
                          <SettlementTransactionsPanel settlementId={settlement.id} isSuperAdmin={isSuperAdmin} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isSuperAdmin && totalPages > 1 && (
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
    </div>
  )
}

function SettlementRow({
  item,
  isSuperAdmin,
  processNote,
  onProcessNote,
  onMarkProcessed,
  onToggleDetails,
  isExpanded,
  isUpdating,
  onExport,
  isExporting,
}: {
  item: SettlementItem
  isSuperAdmin: boolean
  processNote: string
  onProcessNote: (value: string) => void
  onMarkProcessed: () => void
  onToggleDetails: () => void
  isExpanded: boolean
  isUpdating: boolean
  onExport: () => void
  isExporting: boolean
}) {
  const isPending = (item.status || '').toLowerCase() === 'pending'
  const isCompleted = (item.status || '').toLowerCase() === 'completed'

  return (
    <tr className="border-t border-[var(--border-soft)]">
      {isSuperAdmin && (
        <td className="px-3 py-2 text-[12px] text-[var(--text-1)]">{item.merchantName || item.merchantId}</td>
      )}
      <td className="px-3 py-2 text-[11px] text-[var(--text-2)]">{formatOrigin(item)}</td>
      <td className="px-3 py-2 text-[12px] font-semibold text-[var(--text-1)]">{fmtMoney(item.amount, item.currency)}</td>
      <td className="px-3 py-2 text-[12px] text-[var(--text-2)]">{item.transactionCount}</td>
      <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">
        {fmtDate(item.periodFrom)} → {fmtDate(item.periodTo)}
      </td>
      <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">
        {item.payoutAccountType || '—'} {item.payoutProvider ? `· ${item.payoutProvider}` : ''}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge color={statusColor(item.status)} dot>{statusLabel(item.status)}</Badge>
          {isCompleted && !isSuperAdmin && (
            <button
              onClick={onExport}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--orange)] hover:text-[var(--orange)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <span className="animate-spin text-[10px]">⟳</span>
              ) : (
                <span>↓</span>
              )}
              Export CSV
            </button>
          )}
          {!isSuperAdmin && (
            <Button className="h-7 text-[10px]" variant="ghost" onClick={onToggleDetails}>
              {isExpanded ? 'Masquer détail' : 'Voir détail'}
            </Button>
          )}
        </div>
      </td>
      {isSuperAdmin && (
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Button className="h-8 text-[11px]" variant="ghost" onClick={onToggleDetails}>
              {isExpanded ? 'Masquer détail' : 'Voir détail'}
            </Button>
            {isPending ? (
              <>
              <Input
                className="h-8 text-[11px]"
                placeholder="Note traitement"
                value={processNote}
                onChange={(e) => onProcessNote(e.target.value)}
              />
              <Button className="h-8 text-[11px]" disabled={isUpdating} onClick={onMarkProcessed}>
                Traiter
              </Button>
              </>
            ) : (
              <>
                {isCompleted && (
                  <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--orange)] hover:text-[var(--orange)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isExporting ? (
                      <span className="animate-spin text-[10px]">⟳</span>
                    ) : (
                      <span>↓</span>
                    )}
                    Export CSV
                  </button>
                )}
                <span className="text-[11px] text-[var(--text-3)]">Traité le {fmtDate(item.processedAt)}</span>
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

function SettlementTransactionsPanel({ settlementId, isSuperAdmin }: { settlementId: string; isSuperAdmin: boolean }) {
  const navigate = useNavigate()
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  const txQuery = useQuery({
    queryKey: ['settlement-transactions', settlementId],
    queryFn: () => settlementsApi.getTransactions(settlementId),
  })

  const historyQuery = useQuery({
    queryKey: ['transaction-status-history', selectedTransactionId],
    queryFn: () => settlementsApi.transactionStatusHistory(selectedTransactionId as string),
    enabled: isSuperAdmin && !!selectedTransactionId,
  })

  const rows = txQuery.data ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[var(--text-1)]">Transactions incluses</h3>
        <span className="text-[11px] text-[var(--text-3)]">{rows.length} ligne(s)</span>
      </div>

      {txQuery.isLoading ? (
        <p className="text-[12px] text-[var(--text-3)]">Chargement des transactions...</p>
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-[var(--text-3)]">Aucune transaction trouvée pour ce settlement.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Réf</th>
                <th className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Provider</th>
                <th className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Montant</th>
                <th className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Complétée le</th>
                {isSuperAdmin && (
                  <th className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Traçabilité</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-2 text-[11px] font-mono text-[var(--text-2)]">{row.transactionRef}</td>
                  <td className="px-2 py-2 text-[11px] text-[var(--text-2)]">{row.provider}</td>
                  <td className="px-2 py-2 text-[11px] text-[var(--text-1)]">{fmtMoney(row.amount, row.currency)}</td>
                  <td className="px-2 py-2 text-[11px] text-[var(--text-3)]">{fmtDate(row.completedAt)}</td>
                  {isSuperAdmin && (
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          className="h-7 text-[10px]"
                          variant="secondary"
                          onClick={() => setSelectedTransactionId((prev) => (prev === row.transactionId ? null : row.transactionId))}
                        >
                          {selectedTransactionId === row.transactionId ? 'Masquer historique' : 'Voir historique'}
                        </Button>
                        <Button
                          className="h-7 text-[10px]"
                          variant="ghost"
                          onClick={() => navigate(`/admin/traceability?tx=${encodeURIComponent(row.transactionId)}`)}
                        >
                          Ouvrir trace
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isSuperAdmin && selectedTransactionId && (
        <div className="rounded-[var(--r-sm)] border border-[var(--border)] bg-white p-3">
          <p className="text-[11px] font-semibold text-[var(--text-2)]">Historique de statut</p>
          {historyQuery.isLoading ? (
            <p className="mt-2 text-[11px] text-[var(--text-3)]">Chargement...</p>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--text-3)]">Aucune entrée d'historique.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {(historyQuery.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-[11px] text-[var(--text-2)]">
                  <span className="font-mono text-[var(--text-4)]">{fmtDate(item.createdAt)}</span>
                  <span>{item.previousStatus || '—'} → {item.newStatus}</span>
                  <span className="text-[var(--text-4)]">[{item.source}]</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
