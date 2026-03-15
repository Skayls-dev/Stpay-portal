// src/pages/Escrow.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { transactionsApi } from '../lib/api/modules'
import { Badge, Button } from '../components/ui'
import type { Transaction } from '../lib/api/modules'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EscrowItem {
  id: string
  ref: string
  amount: number
  currency: string
  status: 'held' | 'in_transit' | 'delivered' | 'released' | 'disputed'
  provider: string
  merchantName?: string
  pickupCode?: string
  createdAt?: string
  deliveredAt?: string
  routeLabel?: string  // ex. "BRU → KIN"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtXAF(n: number, currency = 'XAF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Map transactions to escrow items (mock enrichment — replace with real escrow API when available)
function toEscrowItems(txs: Transaction[]): EscrowItem[] {
  const escrowStatuses = ['pending', 'processing', 'completed']
  return txs
    .filter((tx) => escrowStatuses.includes(tx.status.toLowerCase()))
    .map((tx, i) => ({
      id: tx.id,
      ref: `ESC-${tx.transactionId?.slice(-8).toUpperCase() ?? tx.id.slice(-8).toUpperCase()}`,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status.toLowerCase() === 'completed' ? 'delivered'
             : tx.status.toLowerCase() === 'processing' ? 'in_transit'
             : 'held',
      provider: tx.provider,
      merchantName: tx.merchantName,
      pickupCode: tx.status.toLowerCase() !== 'completed' ? '••••••' : undefined,
      createdAt: tx.createdAt,
      routeLabel: ['BRU → KIN', 'CDK → ABJ', 'PAR → DAK', 'AMS → LOS'][i % 4],
    }))
}

const STATUS_CONFIG = {
  held:      { label: 'En attente',  color: 'amber'   as const },
  in_transit:{ label: 'En transit',  color: 'blue'    as const },
  delivered: { label: 'Livré',       color: 'emerald' as const },
  released:  { label: 'Libéré',      color: 'slate'   as const },
  disputed:  { label: 'Litige',      color: 'red'     as const },
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiMini({ label, value, sub, accent = false }:
  { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                    rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5">
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className={`font-display font-bold text-[22px] leading-none tracking-tight
                     ${accent ? 'text-[var(--gold-bright)]' : 'text-[var(--text-primary)]'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}

// ─── Pickup code reveal ───────────────────────────────────────────────────────

function PickupCode({ code, revealed, onReveal }:
  { code?: string; revealed: boolean; onReveal: () => void }) {
  if (!code) return <span className="text-[var(--text-muted)] text-[11px]">—</span>

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] tracking-[0.15em] text-[var(--text-primary)]
                       bg-[var(--bg-subtle)] px-2.5 py-1 rounded-[var(--radius-sm)]
                       border border-[var(--border-soft)]">
        {revealed ? '482 917' : '••• •••'}
      </span>
      <button
        onClick={onReveal}
        className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-bright)]
                   transition-colors font-medium"
      >
        {revealed ? 'Masquer' : 'Afficher'}
      </button>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function EscrowProgress({ status }: { status: EscrowItem['status'] }) {
  const steps = ['held', 'in_transit', 'delivered', 'released']
  const idx = steps.indexOf(status)
  const pct = status === 'disputed' ? 100 : Math.max(0, ((idx + 1) / steps.length) * 100)
  const color = status === 'disputed' ? 'var(--red)' : 'var(--gold)'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between">
        {['Bloqué', 'Transit', 'Livré', 'Libéré'].map((s, i) => (
          <span key={s}
                className={`text-[9px] font-medium
                  ${i <= idx ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Escrow card ──────────────────────────────────────────────────────────────

function EscrowCard({ item, isSuperAdmin }: { item: EscrowItem; isSuperAdmin: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const cfg = STATUS_CONFIG[item.status]

  const handleRelease = async () => {
    setReleasing(true)
    await new Promise((r) => setTimeout(r, 800))
    toast.success(`Fonds libérés pour ${item.ref}`)
    setReleasing(false)
  }

  return (
    <div className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                    rounded-[var(--radius-md)] p-4 flex flex-col gap-4
                    hover:border-[var(--border-medium)] transition-colors">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
              {item.ref}
            </span>
            {item.routeLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full
                               bg-[var(--bg-subtle)] text-[var(--text-muted)]
                               border border-[var(--border-soft)]">
                {item.routeLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {item.merchantName || 'Marchand inconnu'} · {fmtDate(item.createdAt)}
          </p>
        </div>
        <Badge color={cfg.color} dot>{cfg.label}</Badge>
      </div>

      {/* Amount + provider */}
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-[20px] tracking-tight text-[var(--text-primary)]">
          {fmtXAF(item.amount, item.currency)}
        </p>
        <span className={`inline-flex items-center justify-center w-[28px] h-[28px]
                          rounded-[6px] text-[9px] font-bold font-mono
                          ${item.provider?.toUpperCase() === 'MTN'    ? 'prov-mtn'  :
                            item.provider?.toUpperCase() === 'ORANGE' ? 'prov-ora'  :
                            item.provider?.toUpperCase() === 'WAVE'   ? 'prov-wav'  : 'prov-moov'}`}>
          {item.provider?.slice(0, 3).toUpperCase() ?? '???'}
        </span>
      </div>

      {/* Progress */}
      <EscrowProgress status={item.status} />

      {/* Pickup code */}
      {item.pickupCode && (
        <div className="flex items-center justify-between
                        pt-3 border-t border-[var(--border-soft)]">
          <span className="text-[11px] text-[var(--text-muted)]">Code de retrait</span>
          <PickupCode
            code={item.pickupCode}
            revealed={revealed}
            onReveal={() => setRevealed((v) => !v)}
          />
        </div>
      )}

      {/* Admin actions */}
      {isSuperAdmin && item.status !== 'released' && (
        <div className="flex gap-2 pt-3 border-t border-[var(--border-soft)]">
          {item.status === 'delivered' && (
            <Button
              variant="primary"
              className="flex-1 justify-center text-[12px]"
              onClick={handleRelease}
              disabled={releasing}
            >
              {releasing ? 'Libération…' : '→ Libérer les fonds'}
            </Button>
          )}
          {item.status !== 'disputed' && (
            <Button
              variant="danger"
              className="text-[12px]"
              onClick={() => toast('Ouverture d\'un litige bientôt disponible')}
            >
              Litige
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Escrow() {
  const { isSuperAdmin, user, role } = useAuth()
  const [filter, setFilter] = useState<'all' | EscrowItem['status']>('all')

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['escrow-transactions', role, user.merchantId],
    queryFn: () => transactionsApi.list({
      merchantId: role === 'merchant' ? user.merchantId : undefined,
    }),
    refetchInterval: 30_000,
  })

  const items = toEscrowItems(txs)
  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  const heldAmt    = items.filter((i) => i.status === 'held').reduce((s, i) => s + i.amount, 0)
  const transitAmt = items.filter((i) => i.status === 'in_transit').reduce((s, i) => s + i.amount, 0)
  const totalAmt   = items.reduce((s, i) => s + i.amount, 0)

  const FILTERS: { key: 'all' | EscrowItem['status']; label: string }[] = [
    { key: 'all',        label: 'Tous' },
    { key: 'held',       label: 'En attente' },
    { key: 'in_transit', label: 'En transit' },
    { key: 'delivered',  label: 'Livrés' },
    { key: 'released',   label: 'Libérés' },
  ]

  return (
    <div className="space-y-4">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMini
          label="Total séquestré"
          value={`${(totalAmt / 1_000_000).toFixed(1)}M`}
          sub="XAF · tous statuts"
          accent
        />
        <KpiMini
          label="En attente"
          value={items.filter((i) => i.status === 'held').length}
          sub={fmtXAF(heldAmt)}
        />
        <KpiMini
          label="En transit"
          value={items.filter((i) => i.status === 'in_transit').length}
          sub={fmtXAF(transitAmt)}
        />
        <KpiMini
          label="À libérer"
          value={items.filter((i) => i.status === 'delivered').length}
          sub="livraisons confirmées"
        />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 bg-[var(--bg-overlay)] p-1
                      rounded-[var(--radius-sm)] w-fit">
        {FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? items.length
                      : items.filter((i) => i.status === key).length
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px]
                          text-[12px] transition-colors
                          ${filter === key
                            ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-mono px-1 rounded
                                  ${filter === key
                                    ? 'text-[var(--gold)]'
                                    : 'text-[var(--text-muted)]'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Cards grid ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-raised)] border border-[var(--border-soft)]
                                    rounded-[var(--radius-md)] p-4 h-[200px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)]
                          flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="6" width="14" height="10" rx="2"
                    stroke="var(--text-muted)" strokeWidth="1.3"/>
              <path d="M7 6V5a3 3 0 016 0v1"
                    stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="10" cy="11" r="1.5" fill="var(--text-muted)"/>
            </svg>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)]">
            Aucun séquestre dans cette catégorie
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Les fonds apparaîtront ici lors de nouvelles livraisons
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <EscrowCard key={item.id} item={item} isSuperAdmin={isSuperAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}
