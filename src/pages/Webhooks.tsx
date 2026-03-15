// src/pages/Webhooks.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import client from '../lib/api/client'
import { Badge, Button, Input } from '../components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookItem {
  id: string
  eventType: string
  status: string
  retryCount: number
  createdAt: string
  deliveredAt?: string | null
  nextRetryAt?: string | null
  lastError?: string | null
  lastHttpStatusCode?: number | null
}

interface WebhookListResponse {
  items: WebhookItem[]
  page: number
  pageSize: number
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchWebhooks(merchantId?: string, page = 1): Promise<WebhookListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: '50' })
  if (merchantId) params.set('merchantId', merchantId)
  const res = await client.get(`/api/webhooks?${params}`)
  const data = res.data
  // Handle both { items, page, pageSize } and direct array
  if (Array.isArray(data)) return { items: data, page: 1, pageSize: data.length }
  return data
}

async function replayWebhook(id: string): Promise<{ success: boolean; durationMs: number }> {
  const res = await client.post(`/api/webhooks/${id}/replay`)
  return res.data
}

async function fetchPendingRetries(): Promise<{ count: number; items: WebhookItem[] }> {
  const res = await client.get('/api/webhooks/pending-retries')
  return res.data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function httpCodeColor(code?: number | null): string {
  if (!code)           return 'text-[var(--text-muted)]'
  if (code < 300)      return 'text-[var(--green)]'
  if (code < 500)      return 'text-[var(--amber)]'
  return 'text-[var(--red)]'
}

function statusBadgeColor(status: string): 'emerald' | 'amber' | 'red' | 'slate' {
  const s = status?.toLowerCase()
  if (s === 'delivered')  return 'emerald'
  if (s === 'pending')    return 'amber'
  if (s === 'failed' || s === 'abandoned') return 'red'
  return 'slate'
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'payment.completed':  'Paiement réussi',
    'payment.failed':     'Paiement échoué',
    'payment.pending':    'Paiement en attente',
    'escrow.held':        'Escrow bloqué',
    'escrow.released':    'Escrow libéré',
    'escrow.delivered':   'Livraison confirmée',
  }
  return map[type] ?? type
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-t border-[var(--border-soft)]">
      {[180, 80, 60, 80, 120, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded animate-pulse bg-[var(--bg-subtle)]" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Retry badge ──────────────────────────────────────────────────────────────

function RetryBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-[var(--text-muted)] text-[11px]">—</span>
  const color = count >= 3 ? 'var(--red)' : count >= 1 ? 'var(--amber)' : 'var(--green)'
  return (
    <span className="font-mono text-[11px] font-semibold" style={{ color }}>
      ×{count}
    </span>
  )
}

// ─── Detail slide-over ────────────────────────────────────────────────────────

function WebhookDetail({ item, onClose, onReplay }:
  { item: WebhookItem | null; onClose: () => void; onReplay: (id: string) => void }) {

  const [visible, setVisible] = useState(false)
  React.useEffect(() => {
    if (item) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [item])

  const handleClose = () => { setVisible(false); setTimeout(onClose, 220) }

  if (!item && !visible) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0, backdropFilter: 'blur(2px)' }}
        onClick={handleClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[420px]
                   bg-[var(--bg-raised)] border-l border-[var(--border-medium)]
                   flex flex-col overflow-hidden transition-transform duration-[220ms] ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-[var(--border-soft)] flex-shrink-0">
          <div>
            <h3 className="font-display font-semibold text-[15px] text-[var(--text-primary)]">
              Détail webhook
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] font-mono truncate">
              {item?.id?.slice(0, 24)}…
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center
                       text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Event hero */}
        {item && (
          <div className="px-5 py-5 border-b border-[var(--border-soft)] bg-[var(--bg-overlay)] flex-shrink-0">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Type d'événement</p>
            <p className="font-display font-semibold text-[16px] text-[var(--text-primary)]">
              {eventTypeLabel(item.eventType)}
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">{item.eventType}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge color={statusBadgeColor(item.status)} dot>
                {item.status}
              </Badge>
              {item.lastHttpStatusCode && (
                <span className={`text-[11px] font-mono font-semibold ${httpCodeColor(item.lastHttpStatusCode)}`}>
                  HTTP {item.lastHttpStatusCode}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {item && (
            <dl className="space-y-0">
              {([
                ['Créé le',       fmtDate(item.createdAt)],
                ['Livré le',      fmtDate(item.deliveredAt)],
                ['Prochain retry', fmtDate(item.nextRetryAt)],
                ['Tentatives',    item.retryCount > 0 ? `${item.retryCount} retry(s)` : 'Aucun'],
                ['Dernière erreur', item.lastError || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}
                     className="flex items-start justify-between gap-4 py-2.5
                                border-b border-[var(--border-soft)] last:border-0">
                  <dt className="text-[11px] text-[var(--text-muted)] flex-shrink-0 w-32 pt-0.5">
                    {label}
                  </dt>
                  <dd className={`text-[12px] text-right break-all
                    ${label === 'Dernière erreur' ? 'text-[var(--red)] font-mono text-[11px]' : 'text-[var(--text-primary)]'}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border-soft)] flex-shrink-0 flex gap-2">
          <Button
            variant="primary"
            className="flex-1 justify-center text-[12px]"
            onClick={() => item && onReplay(item.id)}
          >
            ↻ Rejouer
          </Button>
          <Button variant="ghost" className="flex-1 justify-center text-[12px]" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </aside>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'DELIVERED', 'PENDING', 'FAILED', 'ABANDONED']

export default function Webhooks() {
  const { isSuperAdmin, user, role } = useAuth()
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<WebhookItem | null>(null)

  const merchantId = role === 'merchant' ? user.merchantId : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks', merchantId],
    queryFn: () => fetchWebhooks(merchantId),
    refetchInterval: 20_000,
  })

  const { data: pending } = useQuery({
    queryKey: ['webhooks-pending'],
    queryFn: fetchPendingRetries,
    enabled: isSuperAdmin,
    refetchInterval: 30_000,
  })

  const replay = useMutation({
    mutationFn: (id: string) => replayWebhook(id),
    onSuccess: (result, id) => {
      const msg = result.success
        ? `Webhook rejoué avec succès (${Math.round(result.durationMs)}ms)`
        : 'Replay envoyé, vérifiez le statut'
      result.success ? toast.success(msg) : toast(msg)
      qc.invalidateQueries({ queryKey: ['webhooks'] })
      setSelected(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const items = data?.items ?? []

  const filtered = items
    .filter((w) => statusFilter === 'all' || w.status?.toUpperCase() === statusFilter)
    .filter((w) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        w.id.toLowerCase().includes(q) ||
        (w.eventType || '').toLowerCase().includes(q) ||
        (w.lastError  || '').toLowerCase().includes(q)
      )
    })

  const counts = {
    delivered: items.filter((w) => w.status?.toUpperCase() === 'DELIVERED').length,
    pending:   items.filter((w) => w.status?.toUpperCase() === 'PENDING').length,
    failed:    items.filter((w) => ['FAILED','ABANDONED'].includes(w.status?.toUpperCase())).length,
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: items.length,      color: '' },
          { label: 'Livrés',      value: counts.delivered,  color: 'text-[var(--green)]' },
          { label: 'En attente',  value: counts.pending,    color: 'text-[var(--amber)]' },
          { label: 'Échoués',     value: counts.failed,     color: 'text-[var(--red)]' },
        ].map(({ label, value, color }) => (
          <div key={label}
               className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                          rounded-[var(--radius-md)] px-4 py-3">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
            <p className={`font-display font-bold text-[20px] leading-none ${color || 'text-[var(--text-primary)]'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Pending retries banner (admin) */}
      {isSuperAdmin && (pending?.count ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]
                        bg-[var(--amber-bg)] border border-[rgba(245,158,11,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse-slow flex-shrink-0" />
          <p className="text-[12px] text-[var(--amber)] font-medium flex-1">
            {pending?.count} webhook{(pending?.count ?? 0) > 1 ? 's' : ''} en attente de retry
          </p>
          <button
            className="text-[11px] text-[var(--amber)] font-semibold hover:underline"
            onClick={() => setStatusFilter('PENDING')}
          >
            Voir →
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                      rounded-[var(--radius-md)] p-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
               width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <Input
            className="pl-8 h-8 text-[12px]"
            placeholder="Rechercher un événement, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 bg-[var(--bg-overlay)] p-0.5 rounded-[var(--radius-sm)]">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-[3px] text-[11px] transition-colors capitalize
                ${statusFilter === s
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {s === 'all' ? 'Tous' : s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="panel flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left min-w-[680px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-overlay)]">
              <tr>
                {['Événement', 'Statut', 'HTTP', 'Retries', 'Créé le', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-medium uppercase
                                         tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="w-11 h-11 rounded-full bg-[var(--bg-subtle)]
                                      flex items-center justify-center mb-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M2 4h14M4 8h10M6 12h6" stroke="var(--text-muted)"
                                strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)]">Aucun webhook trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className={`border-t border-[var(--border-soft)] cursor-pointer
                                transition-colors duration-100
                                ${selected?.id === w.id
                                  ? 'bg-[var(--gold-bg)]'
                                  : 'hover:bg-[var(--bg-overlay)]'}`}
                  >
                    {/* Event type */}
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-medium text-[var(--text-primary)]">
                        {eventTypeLabel(w.eventType)}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                        {w.id.slice(0, 18)}…
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge color={statusBadgeColor(w.status)} dot>
                        {w.status?.toLowerCase()}
                      </Badge>
                    </td>

                    {/* HTTP code */}
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[11px] font-semibold ${httpCodeColor(w.lastHttpStatusCode)}`}>
                        {w.lastHttpStatusCode ?? '—'}
                      </span>
                    </td>

                    {/* Retries */}
                    <td className="px-4 py-3">
                      <RetryBadge count={w.retryCount} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {fmtDate(w.createdAt)}
                      </span>
                    </td>

                    {/* Replay action */}
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          replay.mutate(w.id)
                        }}
                        disabled={replay.isPending}
                        className="text-[11px] font-medium text-[var(--gold)]
                                   hover:text-[var(--gold-bright)] transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ↻ Rejouer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5
                          border-t border-[var(--border-soft)] flex-shrink-0">
            <span className="text-[11px] text-[var(--text-muted)]">
              {filtered.length} webhook{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Cliquez pour voir le détail · rejouer depuis la table ou le panel
            </span>
          </div>
        )}
      </div>

      {/* ── Slide-over ── */}
      <WebhookDetail
        item={selected}
        onClose={() => setSelected(null)}
        onReplay={(id) => replay.mutate(id)}
      />
    </div>
  )
}
