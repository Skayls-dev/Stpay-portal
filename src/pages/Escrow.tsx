// src/pages/Escrow.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { escrowApi, appsApi } from '../lib/api/modules'
import type { MerchantApp } from '../lib/api/modules'
import { Badge, Button } from '../components/ui'
import EscrowAccountingWidget from '../components/analytics/EscrowAccountingWidget'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EscrowItem {
  id: string
  transactionId: string
  merchantId: string
  ref: string
  amount: number
  currency: string
  status: 'held' | 'in_transit' | 'delivered' | 'released' | 'disputed'
  releaseMode: 'PickupCode' | 'AutoTimeout' | 'DualConfirm'
  provider: string
  merchantName?: string
  pickupCode?: string
  autoReleaseAt?: string
  merchantShippedAt?: string
  buyerConfirmedAt?: string
  releasedAt?: string
  disputeReason?: string
  createdAt?: string
  routeLabel?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtXAF(n: number, currency = 'XAF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function normalizeStatus(status: string): EscrowItem['status'] {
  const s = (status || '').toLowerCase()
  if (s === 'in_transit' || s === 'intransit') return 'in_transit'
  if (s === 'delivered') return 'delivered'
  if (s === 'released') return 'released'
  if (s === 'disputed') return 'disputed'
  return 'held'
}

function normalizeReleaseMode(mode: string): EscrowItem['releaseMode'] {
  if (mode === 'AutoTimeout') return 'AutoTimeout'
  if (mode === 'DualConfirm') return 'DualConfirm'
  return 'PickupCode'
}

function daysUntil(iso?: string) {
  if (!iso) return 0
  const target = new Date(iso).getTime()
  const now = Date.now()
  const ms = Math.max(0, target - now)
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const STATUS_CONFIG = {
  held:      { label: 'En attente',  color: 'amber'   as const },
  in_transit:{ label: 'En transit',  color: 'blue'    as const },
  delivered: { label: 'Livré',       color: 'emerald' as const },
  released:  { label: 'Libéré',      color: 'slate'   as const },
  disputed:  { label: 'Litige',      color: 'red'     as const },
}

// ─── Simulate modal ───────────────────────────────────────────────────────────

interface SimulateFormState {
  amount: string
  currency: string
  customerPhone: string
  description: string
  releaseMode: string
  autoTimeoutDays: string
}

const DEFAULT_SIM: SimulateFormState = {
  amount: '50000',
  currency: 'XAF',
  customerPhone: '+237600000000',
  description: '',
  releaseMode: 'pickup_code',
  autoTimeoutDays: '7',
}

function SimulateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<SimulateFormState>(DEFAULT_SIM)
  const [loading, setLoading] = useState(false)

  const field = (key: keyof SimulateFormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return }
    setLoading(true)
    try {
      await escrowApi.simulate({
        amount,
        currency: form.currency,
        customerPhone: form.customerPhone || '+237000000000',
        description: form.description || undefined,
        releaseMode: form.releaseMode,
        autoTimeoutDays: form.releaseMode === 'auto_timeout' ? parseInt(form.autoTimeoutDays) || 7 : undefined,
      })
      toast.success('Simulation créée avec succès')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la simulation')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full h-9 px-3 text-[13px] border border-[var(--border)] rounded-[6px]
    bg-white text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)/30]
    focus:border-[var(--primary)] transition-colors`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[var(--radius-lg)] shadow-2xl w-full max-w-md mx-4
                      border border-[var(--border)] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--amber-bg)] flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="var(--amber)" strokeWidth="1.4"/>
                <path d="M5 5V4a3 3 0 016 0v1" stroke="var(--amber)" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="8" cy="9" r="1.5" fill="var(--amber)"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[var(--text-1)]">Simuler un séquestre</p>
              <p className="text-[11px] text-[var(--text-4)]">Crée une transaction de test en mode séquestre</p>
            </div>
          </div>
          <button onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center
                             text-[var(--text-4)] hover:bg-[var(--bg-hover)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Montant</label>
              <input type="number" min="1" step="1" required className={inputCls} placeholder="50000" {...field('amount')}/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Devise</label>
              <select className={inputCls} {...field('currency')}>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Téléphone acheteur</label>
            <input type="tel" className={inputCls} placeholder="+237600000000" {...field('customerPhone')}/>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Mode de libération</label>
            <select className={inputCls} {...field('releaseMode')}>
              <option value="pickup_code">Code de retrait (PickupCode)</option>
              <option value="auto_timeout">Délai automatique (AutoTimeout)</option>
              <option value="dual_confirm">Double confirmation (DualConfirm)</option>
            </select>
          </div>

          {form.releaseMode === 'auto_timeout' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Délai (jours)</label>
              <input type="number" min="1" max="90" className={inputCls} placeholder="7" {...field('autoTimeoutDays')}/>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wide">Description (optionnel)</label>
            <input type="text" maxLength={200} className={inputCls} placeholder="Ex: Achat téléphone…" {...field('description')}/>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button type="button" onClick={onClose}
                    className="flex-1 h-9 text-[13px] font-medium rounded-[6px] border border-[var(--border)]
                               text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
                    className="flex-1 h-9 text-[13px] font-semibold rounded-[6px]
                               bg-[var(--amber)] text-white hover:opacity-90 transition-opacity
                               disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Création…' : 'Créer la simulation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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

function EscrowCard({ item, role, isSuperAdmin }: { item: EscrowItem; role: 'merchant' | 'super_admin'; isSuperAdmin: boolean }) {
  const queryClient = useQueryClient()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [pickupOpen, setPickupOpen] = useState(false)
  const [pickupCodeInput, setPickupCodeInput] = useState('')
  const cfg = STATUS_CONFIG[item.status]

  const shipMutation = useMutation({
    mutationFn: () => escrowApi.ship(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] })
      toast.success('Expédition confirmée')
    },
    onError: () => toast.error('Erreur lors de la confirmation'),
  })

  const releaseMutation = useMutation({
    mutationFn: () => escrowApi.release(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] })
      toast.success(`Fonds libérés pour ${item.ref}`)
    },
    onError: () => toast.error('Impossible de libérer les fonds'),
  })

  const disputeMutation = useMutation({
    mutationFn: (reason: string) => escrowApi.openDispute(item.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] })
      toast('Litige ouvert')
      setDisputeOpen(false)
      setDisputeReason('')
    },
    onError: () => toast.error('Erreur ouverture litige'),
  })

  const buyerConfirmMutation = useMutation({
    mutationFn: () => escrowApi.buyerConfirm(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] })
      toast.success('Livraison confirmée')
    },
    onError: () => toast.error('Erreur lors de la confirmation de livraison'),
  })

  const pickupMutation = useMutation({
    mutationFn: (code: string) => escrowApi.confirmPickup(item.id, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-balance'] })
      toast.success('Livraison confirmée !')
      setPickupOpen(false)
      setPickupCodeInput('')
    },
    onError: () => toast.error('Code invalide — vérifiez et réessayez'),
  })

  const releaseModeBadge = item.releaseMode === 'PickupCode'
    ? { label: 'Code retrait', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' }
    : item.releaseMode === 'AutoTimeout'
      ? { label: 'Auto 7j', className: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
      : { label: 'Double conf.', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }

  const submitPickup = () => {
    const clean = pickupCodeInput.replace(/\D/g, '').slice(0, 6)
    if (clean.length !== 6) {
      toast.error('Entrez un code à 6 chiffres')
      return
    }
    pickupMutation.mutate(clean)
  }

  return (
    <div className="bg-white border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                    rounded-[var(--radius-md)] p-4 flex flex-col gap-4
                    hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:border-[var(--border-medium)] transition-all">

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
        <div className="flex items-center gap-2">
          <Badge color={cfg.color} dot>{cfg.label}</Badge>
          <span className={`inline-flex items-center px-[7px] py-[2px] rounded-full text-[10px] font-semibold border ${releaseModeBadge.className}`}>
            {releaseModeBadge.label}
          </span>
        </div>
      </div>

      {/* Amount + provider */}
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-[20px] tracking-tight text-[var(--text-primary)]">
          {fmtXAF(item.amount, item.currency)}
        </p>
        <span className={`inline-flex items-center justify-center w-[28px] h-[28px]
                          rounded-[6px] text-[9px] font-bold font-mono
                          ${item.provider?.toUpperCase() === 'MTN' ? 'prov-mtn' : 'prov-ora'}`}>
          {item.provider?.slice(0, 3).toUpperCase() ?? '???'}
        </span>
      </div>

      {/* Progress */}
      <EscrowProgress status={item.status} />

      {item.releaseMode === 'AutoTimeout' && item.status !== 'released' && item.autoReleaseAt && (
        <div className="text-[11px] text-[var(--text-muted)]">
          <span>Libération auto dans {daysUntil(item.autoReleaseAt)}j</span>
        </div>
      )}

      {/* Pickup code */}
      {item.pickupCode && (
        <div className="flex items-center justify-between
                        pt-3 border-t border-[var(--border-soft)]">
          <span className="text-[11px] text-[var(--text-muted)]">Code de retrait</span>
          <PickupCode
            code={item.pickupCode}
            revealed={false}
            onReveal={() => null}
          />
        </div>
      )}

      {item.releaseMode === 'PickupCode' && item.status === 'in_transit' && (
        <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
          {!pickupOpen ? (
            <Button
              variant="secondary"
              className="text-[12px]"
              onClick={() => setPickupOpen(true)}
            >
              Saisir le code de retrait
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={pickupCodeInput}
                onChange={(e) => setPickupCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 chiffres"
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-[12px]"
              />
              <Button
                variant="primary"
                className="text-[12px]"
                onClick={submitPickup}
                disabled={pickupMutation.isPending}
              >
                {pickupMutation.isPending ? '...' : 'Confirmer'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Merchant actions */}
      {role === 'merchant' && (
        <div className="flex gap-2 pt-3 border-t border-[var(--border-soft)]">
          {item.status === 'held' && (
            <Button
              variant="secondary"
              className="flex-1 justify-center text-[12px]"
              onClick={() => shipMutation.mutate()}
              disabled={shipMutation.isPending}
            >
              {shipMutation.isPending ? '...' : 'Confirmer expédition'}
            </Button>
          )}
          {item.status === 'in_transit' && item.releaseMode === 'DualConfirm' && (
            <Button
              variant="primary"
              className="flex-1 justify-center text-[12px]"
              onClick={() => buyerConfirmMutation.mutate()}
              disabled={buyerConfirmMutation.isPending}
            >
              {buyerConfirmMutation.isPending ? '...' : 'Confirmer livraison'}
            </Button>
          )}
        </div>
      )}

      {/* Admin actions */}
      {isSuperAdmin && item.status !== 'released' && (
        <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-soft)]">
          <div className="flex gap-2">
            {item.status === 'delivered' && (
              <Button
                variant="primary"
                className="flex-1 justify-center text-[12px]"
                onClick={() => releaseMutation.mutate()}
                disabled={releaseMutation.isPending}
              >
                {releaseMutation.isPending ? 'Libération…' : 'Libérer les fonds'}
              </Button>
            )}
            {item.status !== 'disputed' && (
              <Button
                variant="danger"
                className="text-[12px]"
                onClick={() => setDisputeOpen((v) => !v)}
              >
                Litige
              </Button>
            )}
          </div>

          {disputeOpen && (
            <div className="flex gap-2">
              <input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Raison du litige"
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-[12px]"
              />
              <Button
                variant="danger"
                className="text-[12px]"
                onClick={() => {
                  if (!disputeReason.trim()) {
                    toast.error('Saisissez une raison')
                    return
                  }
                  disputeMutation.mutate(disputeReason.trim())
                }}
                disabled={disputeMutation.isPending}
              >
                {disputeMutation.isPending ? '...' : 'Envoyer'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Escrow() {
  const navigate = useNavigate()
  const { isSuperAdmin, user, role } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | EscrowItem['status']>('all')
  const [appFilter, setAppFilter] = useState('')
  const [simOpen, setSimOpen] = useState(false)
  const merchantApiKey = typeof window !== 'undefined' ? localStorage.getItem('stpay_api_key') : null
  const missingApiKey = role === 'merchant' && !merchantApiKey

  const { data: apps = [] } = useQuery<MerchantApp[]>({
    queryKey: ['merchant-apps'],
    queryFn: () => appsApi.list(),
    enabled: !isSuperAdmin,
  })

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['escrow', role, user.merchantId, filter, appFilter],
    queryFn: () => escrowApi.list(
      role === 'merchant' ? user.merchantId : undefined,
      filter !== 'all' ? filter : undefined,
      appFilter || undefined,
    ),
    enabled: !missingApiKey,
    refetchInterval: 30_000,
  })

  const items: EscrowItem[] = (Array.isArray(data) ? data : []).map((raw) => {
    const item = raw as Partial<EscrowItem> & Record<string, unknown>
    const id = String(item.id || '')
    const status = normalizeStatus(String(item.status || 'held'))

    return {
      id,
      transactionId: String(item.transactionId || ''),
      merchantId: String(item.merchantId || ''),
      ref: `ESC-${id.slice(-8).toUpperCase()}`,
      amount: Number(item.amount || 0),
      currency: String(item.currency || 'XAF'),
      status,
      releaseMode: normalizeReleaseMode(String(item.releaseMode || 'PickupCode')),
      provider: String(item.provider || 'N/A'),
      merchantName: typeof item.merchantName === 'string' ? item.merchantName : undefined,
      pickupCode: typeof item.pickupCode === 'string' ? item.pickupCode : undefined,
      autoReleaseAt: typeof item.autoReleaseAt === 'string' ? item.autoReleaseAt : undefined,
      merchantShippedAt: typeof item.merchantShippedAt === 'string' ? item.merchantShippedAt : undefined,
      buyerConfirmedAt: typeof item.buyerConfirmedAt === 'string' ? item.buyerConfirmedAt : undefined,
      releasedAt: typeof item.releasedAt === 'string' ? item.releasedAt : undefined,
      disputeReason: typeof item.disputeReason === 'string' ? item.disputeReason : undefined,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
      routeLabel: typeof item.routeLabel === 'string' ? item.routeLabel : undefined,
    }
  })

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
      {simOpen && (
        <SimulateModal
          onClose={() => setSimOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['escrow'] })}
        />
      )}

      {missingApiKey && (
        <div className="rounded-[var(--radius-md)] border border-[var(--amber-border)] bg-[var(--amber-bg)] p-4">
          <p className="text-[13px] font-semibold text-[var(--amber)]">Clé API manquante</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            La section Escrow nécessite une clé API marchande active (X-Api-Key).
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              className="text-[12px]"
              onClick={() => navigate('/merchant/developer')}
            >
              Ouvrir Developer Portal
            </Button>
          </div>
        </div>
      )}

      {!missingApiKey && error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--red-border)] bg-[var(--red-bg)] p-4">
          <p className="text-[13px] font-semibold text-[var(--red)]">Impossible de charger les escrows</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            {error instanceof Error ? error.message : 'Erreur inconnue'}
          </p>
        </div>
      )}

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[var(--bg-overlay)] p-1
                        rounded-[var(--radius-sm)]">
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
        {!isSuperAdmin && apps.length > 0 && (
          <select
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            className="h-8 px-2 text-[12px] border border-[var(--border)] rounded-[6px]
                       bg-white text-[var(--text-2)] focus:outline-none focus:ring-1
                       focus:ring-[var(--primary)] min-w-[160px]"
          >
            <option value="">Toutes les apps</option>
            {apps.map((a: MerchantApp) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        {!isSuperAdmin && !missingApiKey && (
          <button
            onClick={() => setSimOpen(true)}
            className="ml-auto h-8 px-3.5 flex items-center gap-1.5 rounded-[6px]
                       bg-[var(--amber-bg)] border border-[var(--amber-border)]
                       text-[var(--amber)] text-[12px] font-semibold
                       hover:bg-[var(--amber)]/15 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Simuler
          </button>
        )}
      </div>

      {/* ── Cards grid ── */}
      {role === 'merchant' && (
        <div className="mb-6">
          <EscrowAccountingWidget />
        </div>
      )}

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
            <EscrowCard key={item.id} item={item} role={role} isSuperAdmin={isSuperAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}
