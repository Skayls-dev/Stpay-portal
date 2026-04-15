// src/pages/Transactions.tsx
import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { transactionsApi, POLL_INTERVAL_TRANSACTIONS } from '../lib/api/modules'
import { Badge, Input, Select, Button } from '../components/ui'
import { IconClose, IconCopy } from '../components/icons/NavIcons'
import type { Transaction } from '../lib/api/modules'

const PROVIDERS = ['all','MTN','ORANGE']
const STATUSES  = ['all','pending','processing','completed','failed','cancelled']

const PROV_CLS: Record<string, string> = {
  MTN:'prov-mtn', ORANGE:'prov-ora',
}

function ProvBadge({ name }: { name: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-[24px] h-[24px]
                      rounded-[5px] text-[8px] font-extrabold font-mono flex-shrink-0
                      ${PROV_CLS[name?.toUpperCase()] ?? 'prov-ora'}`}>
      {name?.slice(0,3).toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge color={transactionsApi.getStatusColor(status) as any} dot>
      {transactionsApi.getStatusText(status)}
    </Badge>
  )
}

function escrowStatusLabel(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'delivered') return 'livre'
  if (s === 'released') return 'libere'
  if (s === 'in_transit' || s === 'intransit') return 'en transit'
  if (s === 'disputed') return 'litige'
  if (s === 'held') return 'bloque'
  return s || 'actif'
}

function EscrowBadge({
  escrow,
  onClick,
}: {
  escrow?: Transaction['escrow']
  onClick?: () => void
}) {
  if (!escrow?.escrowId) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
      title="Ouvrir le détail escrow"
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 7V5.8a2.5 2.5 0 115 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Escrow · {escrowStatusLabel(escrow.status)}
    </button>
  )
}

function fmtCur(n: number, cur: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur }).format(n)
}

function fmtLong(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function fmtShort(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
}

function canTriggerOrangePush(tx: Transaction | null): boolean {
  if (!tx) return false
  if ((tx.provider || '').toUpperCase() !== 'ORANGE') return false

  const status = (tx.status || '').toUpperCase()
  return status === 'PENDING' || status === 'PROCESSING' || status === 'INITIATED'
}

function DetailPanel({
  tx,
  onClose,
  onPushPayment,
  isPushing,
}: {
  tx: Transaction|null
  onClose: () => void
  onPushPayment: (tx: Transaction) => void
  isPushing: boolean
}) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (tx) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [tx])
  const close = () => { setVisible(false); setTimeout(onClose, 200) }
  if (!tx && !visible) return null

  const rows: [string, React.ReactNode][] = [
    ['Référence', <span className="font-mono text-[11px] break-all text-[var(--text-2)]">{tx?.transactionId||tx?.id||'—'}</span>],
    ['Fournisseur', tx ? <ProvBadge name={tx.provider}/> : '—'],
    ['Montant', tx ? <span className="font-mono font-bold">{fmtCur(tx.amount,tx.currency)}</span> : '—'],
    ['Statut', tx ? <StatusBadge status={tx.status}/> : '—'],
    ['Marchand', tx?.merchantName||tx?.merchantId||'—'],
    ['Description', tx?.description||'—'],
    ['Créé le', fmtLong(tx?.createdAt)],
    ['Dernière MAJ', fmtLong(tx?.updatedAt)],
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity duration-200"
           style={{ background:'rgba(0,0,0,0.3)', opacity: visible?1:0 }}
           onClick={close} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-[400px]
                         bg-white border-l border-[var(--border-med)] flex flex-col
                         transition-transform duration-200 ease-out"
             style={{ transform: visible?'translateX(0)':'translateX(100%)' }}
             onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4
                        border-b border-[var(--border-soft)] flex-shrink-0">
          <div>
            <h3 className="font-bold text-[15px] text-[var(--text-1)]">Détail transaction</h3>
            <p className="text-[11px] font-mono text-[var(--text-3)] mt-0.5">
              {tx ? transactionsApi.displayReference(tx) : ''}
            </p>
          </div>
          <button onClick={close}
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center
                             text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors">
            <IconClose />
          </button>
        </div>

        {tx && (
          <div className="px-5 py-5 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] flex-shrink-0">
            <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide mb-1">Montant</p>
            <p className="font-extrabold text-[30px] tracking-tight leading-none text-[var(--text-1)]">
              {fmtCur(tx.amount, tx.currency)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={tx.status}/>
              <EscrowBadge
                escrow={tx.escrow}
                onClick={() => navigate(`/escrow?highlight=${encodeURIComponent(tx.escrow!.escrowId)}`)}
              />
              <ProvBadge name={tx.provider}/>
              <span className="text-[11px] text-[var(--text-3)]">{fmtShort(tx.createdAt)}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}
                   className="flex items-start justify-between gap-4 py-2.5
                              border-b border-[var(--border-soft)] last:border-0">
                <dt className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28 pt-0.5">{label}</dt>
                <dd className="text-[12px] text-[var(--text-1)] text-right break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border-soft)] flex gap-2 flex-shrink-0">
          {canTriggerOrangePush(tx) && (
            <Button
              variant="primary"
              className="flex-1 justify-center text-[12px]"
              onClick={() => tx && onPushPayment(tx)}
              disabled={isPushing}
            >
              {isPushing ? 'Relance en cours…' : 'Relancer la demande mobile'}
            </Button>
          )}
          <Button variant="secondary" className="flex-1 justify-center text-[12px]"
                  onClick={() => tx && navigator.clipboard.writeText(tx.transactionId||tx.id)}>
            <IconCopy/> Copier l'ID
          </Button>
          <Button variant="ghost" className="flex-1 justify-center text-[12px]" onClick={close}>
            Fermer
          </Button>
        </div>
      </aside>
    </>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-[var(--border-soft)]">
      {[28,120,90,70,80,60].map((w,i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded animate-pulse bg-[var(--border)]" style={{width:w}}/>
        </td>
      ))}
    </tr>
  )
}

export default function Transactions() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [statusFilter, setStatusFilter]   = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [merchantFilter, setMerchantFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Transaction|null>(null)
  const isFiltered = statusFilter!=='all'||providerFilter!=='all'||!!merchantFilter||!!search

  const pushMutation = useMutation({
    mutationFn: (transactionId: string) => transactionsApi.pushPayment(transactionId),
    onSuccess: () => {
      toast.success('Demande mobile relancee avec succes')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Echec de la relance mobile'
      toast.error(message)
    },
  })

  const handlePushPayment = (tx: Transaction) => {
    const paymentId = tx.transactionId || tx.id
    if (!paymentId) {
      toast.error('Transaction invalide')
      return
    }

    pushMutation.mutate(paymentId)
  }

  const { data: txs=[], isFetching, isLoading } = useQuery({
    queryKey: ['transactions', statusFilter, providerFilter, merchantFilter],
    queryFn: () => transactionsApi.list({
      status:     statusFilter   !== 'all' ? statusFilter   : undefined,
      provider:   providerFilter !== 'all' ? providerFilter : undefined,
      merchantId: merchantFilter || undefined,
    }),
    refetchInterval: POLL_INTERVAL_TRANSACTIONS,
  })

  const filtered = search.trim()
    ? txs.filter(tx => {
        const q = search.toLowerCase()
        return (tx.transactionId||'').toLowerCase().includes(q) ||
               (tx.id||'').toLowerCase().includes(q) ||
               (tx.merchantName||'').toLowerCase().includes(q)
      })
    : txs

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--text-3)]">
          {isLoading ? 'Chargement…' : isFetching ? 'Actualisation…'
           : `${filtered.length} transaction${filtered.length!==1?'s':''}`}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
          <span className={`w-1.5 h-1.5 rounded-full
            ${isFetching ? 'bg-[var(--amber)] animate-pulse' : 'bg-[var(--green)] animate-pulse-slow'}`}/>
          {isFetching ? 'Sync…' : 'Live'}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--r-md)]
                      p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
               width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <Input className="pl-8 h-8 text-[12px]" placeholder="Rechercher un ID, marchand…"
                 value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <Select className="w-40 h-8 text-[12px]" value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s==='all'?'Tous les statuts':transactionsApi.getStatusText(s)}
            </option>
          ))}
        </Select>
        <Select className="w-40 h-8 text-[12px]" value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}>
          {PROVIDERS.map(p => (
            <option key={p} value={p}>{p==='all'?'Tous les opérateurs':p}</option>
          ))}
        </Select>
        {isSuperAdmin && (
          <Input className="w-44 h-8 text-[12px]" placeholder="ID marchand…"
                 value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)}/>
        )}
        {isFiltered && (
          <button onClick={() => { setStatusFilter('all'); setProviderFilter('all'); setMerchantFilter(''); setSearch('') }}
                  className="h-8 px-3 rounded-[6px] text-[11px] font-semibold flex items-center gap-1.5
                             bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red-border)]
                             hover:bg-red-100 transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left min-w-[640px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-4 py-2.5 w-10"/>
                {['Référence','Montant','Statut', ...(isSuperAdmin?['Marchand']:[]), 'Date'].map((h,i) => (
                  <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase
                                          tracking-wider text-[var(--text-4)]
                                          ${i>=1&&i<=2?'text-right':''}
                                          ${i===2?'text-center':''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({length:8}).map((_,i) => <SkeletonRow key={i}/>)
                : filtered.length === 0
                ? (
                  <tr><td colSpan={isSuperAdmin?6:5}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-11 h-11 rounded-full bg-[var(--bg-hover)]
                                      flex items-center justify-center mb-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <rect x="2" y="4" width="14" height="11" rx="2"
                                stroke="var(--text-4)" strokeWidth="1.3"/>
                          <path d="M6 8h5M6 11h3" stroke="var(--text-4)"
                                strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--text-2)]">
                        {isFiltered?'Aucun résultat pour ces filtres':'Aucune transaction'}
                      </p>
                    </div>
                  </td></tr>
                )
                : filtered.map(tx => (
                  <tr key={tx.id} onClick={() => setSelected(tx)}
                      className={`border-t border-[var(--border-soft)] cursor-pointer
                                  transition-colors duration-100
                                  ${selected?.id===tx.id
                                    ? 'bg-[var(--orange-bg)]'
                                    : 'hover:bg-[var(--bg-subtle)]'}`}>
                    <td className="px-4 py-3 w-10"><ProvBadge name={tx.provider}/></td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-[var(--text-2)]">
                        {transactionsApi.displayReference(tx)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[12px] font-bold text-[var(--text-1)]">
                        {fmtCur(tx.amount, tx.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <StatusBadge status={tx.status}/>
                        <EscrowBadge
                          escrow={tx.escrow}
                          onClick={() => navigate(`/escrow?highlight=${encodeURIComponent(tx.escrow!.escrowId)}`)}
                        />
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-[var(--text-2)] truncate max-w-[130px] block">
                          {tx.merchantName||tx.merchantId||'—'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className="text-[11px] text-[var(--text-4)]">{fmtShort(tx.createdAt)}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length>0 && (
          <div className="flex items-center justify-between px-4 py-2.5
                          border-t border-[var(--border-soft)] flex-shrink-0">
            <span className="text-[11px] text-[var(--text-3)]">
              {filtered.length} résultat{filtered.length!==1?'s':''}
            </span>
            <span className="text-[11px] text-[var(--text-4)]">Cliquez sur une ligne pour le détail</span>
          </div>
        )}
      </div>

      <DetailPanel
        tx={selected}
        onClose={() => setSelected(null)}
        onPushPayment={handlePushPayment}
        isPushing={pushMutation.isPending}
      />
    </div>
  )
}
