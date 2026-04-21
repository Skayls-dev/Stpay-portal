import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import client from '../lib/api/client'

// ── types ────────────────────────────────────────────────────────────────────

interface CompliancePolicy {
  id: string
  policyCode: string
  policyName: string
  regulator: 'ANTIC' | 'COBAC' | 'INTERNAL'
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'EXPIRED'
  version: string | null
  validatedAt: string | null
  expiresAt: string | null
  documentUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ComplianceSummary {
  total: number
  validated: number
  draft: number
  pending: number
  expired: number
  expiringWithin30Days: number
  completionPercent: number
  anticCertificationReadiness: 'READY' | 'IN_PROGRESS' | 'NOT_READY'
}

// ── API calls ────────────────────────────────────────────────────────────────

const api = {
  getPolicies:  () => client.get<CompliancePolicy[]>('/api/compliance').then(r => r.data),
  getSummary:   () => client.get<ComplianceSummary>('/api/compliance/summary').then(r => r.data),
  getExpiring:  () => client.get<CompliancePolicy[]>('/api/compliance/expiring').then(r => r.data),
  updatePolicy: (policyCode: string, body: Record<string, unknown>) =>
    client.put(`/api/compliance/${policyCode}`, body).then(r => r.data),
}

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  VALIDATED: { label: 'Validé',    bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' },
  PENDING:   { label: 'En attente',bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },
  DRAFT:     { label: 'Brouillon', bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' },
  EXPIRED:   { label: 'Expiré',   bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
}

const REGULATOR_META: Record<string, { bg: string; text: string }> = {
  ANTIC:    { bg: '#eff6ff', text: '#1d4ed8' },
  COBAC:    { bg: '#fdf4ff', text: '#7e22ce' },
  INTERNAL: { bg: '#f8fafc', text: '#475569' },
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function daysLeft(iso: string | null) {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  return diff
}

// ── sub-components ───────────────────────────────────────────────────────────

function ReadinessBadge({ value }: { value: ComplianceSummary['anticCertificationReadiness'] }) {
  const meta = {
    READY:       { label: 'PRÊT ANTIC',   bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' },
    IN_PROGRESS: { label: 'EN COURS',     bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },
    NOT_READY:   { label: 'NON PRÊT',     bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
  }[value]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
          style={{ background: meta.bg, borderColor: meta.border, color: meta.text }}>
      <span className="w-2 h-2 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.DRAFT
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
          style={{ background: m.bg, borderColor: m.border, color: m.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

function RegulatorBadge({ regulator }: { regulator: string }) {
  const m = REGULATOR_META[regulator] ?? REGULATOR_META.INTERNAL
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
          style={{ background: m.bg, color: m.text }}>
      {regulator}
    </span>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ policy, onClose }: { policy: CompliancePolicy; onClose: () => void }) {
  const qc = useQueryClient()
  const [status,      setStatus]      = useState(policy.status)
  const [version,     setVersion]     = useState(policy.version ?? '')
  const [validatedAt, setValidatedAt] = useState(policy.validatedAt ? policy.validatedAt.slice(0, 10) : '')
  const [expiresAt,   setExpiresAt]   = useState(policy.expiresAt   ? policy.expiresAt.slice(0, 10)   : '')
  const [documentUrl, setDocumentUrl] = useState(policy.documentUrl ?? '')
  const [notes,       setNotes]       = useState(policy.notes ?? '')

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.updatePolicy(policy.policyCode, {
      status,
      version:     version     || null,
      validatedAt: validatedAt || null,
      expiresAt:   expiresAt   || null,
      documentUrl: documentUrl || null,
      notes:       notes       || null,
    }),
    onSuccess: () => {
      toast.success(`Politique ${policy.policyCode} mise à jour.`)
      qc.invalidateQueries({ queryKey: ['compliance'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la mise à jour.'),
  })

  const inputCls = `w-full border border-[var(--border)] rounded-[8px] px-3 py-2
    text-[13px] text-[var(--text-1)] bg-[var(--bg-input,#fff)]
    focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[var(--bg-card)] rounded-[14px] border border-[var(--border)]
                      shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-soft)] flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-[var(--text-1)]">{policy.policyCode}</p>
            <p className="text-[11px] text-[var(--text-4)] mt-0.5">{policy.policyName}</p>
          </div>
          <button onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center
                             text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors text-[16px]">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value as CompliancePolicy['status'])}
                    className={inputCls + ' mt-1'}>
              {['DRAFT', 'PENDING', 'VALIDATED', 'EXPIRED'].map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Version</label>
              <input value={version} onChange={e => setVersion(e.target.value)}
                     placeholder="ex: 2.1" className={inputCls + ' mt-1'} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Validé le</label>
              <input type="date" value={validatedAt} onChange={e => setValidatedAt(e.target.value)}
                     className={inputCls + ' mt-1'} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Expiration</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                   className={inputCls + ' mt-1'} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">URL Document</label>
            <input value={documentUrl} onChange={e => setDocumentUrl(e.target.value)}
                   placeholder="https://…" className={inputCls + ' mt-1'} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      rows={2} className={inputCls + ' mt-1 resize-none'} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border-soft)] flex justify-end gap-2">
          <button onClick={onClose}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold
                             text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">
            Annuler
          </button>
          <button onClick={() => mutate()} disabled={isPending}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold
                             text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--orange)' }}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────

export default function Compliance() {
  const [editing, setEditing] = useState<CompliancePolicy | null>(null)
  const [regFilter, setRegFilter] = useState<string>('ALL')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['compliance', 'summary'],
    queryFn:  api.getSummary,
    refetchInterval: 60_000,
  })

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ['compliance', 'policies'],
    queryFn:  api.getPolicies,
    refetchInterval: 60_000,
  })

  const { data: expiring = [] } = useQuery({
    queryKey: ['compliance', 'expiring'],
    queryFn:  api.getExpiring,
    refetchInterval: 60_000,
  })

  const filtered = regFilter === 'ALL' ? policies : policies.filter(p => p.regulator === regFilter)

  const progressPct = summary?.completionPercent ?? 0
  const progressColor = progressPct >= 100 ? '#10b981' : progressPct >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[var(--text-1)] tracking-tight leading-none">
            Conformité Réglementaire
          </h1>
          <p className="text-[13px] text-[var(--text-3)] mt-1">
            Suivi des politiques ANTIC · COBAC · Internes
          </p>
        </div>
        {summary && <ReadinessBadge value={summary.anticCertificationReadiness} />}
      </div>

      {/* Expiring alert banner */}
      {expiring.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] border"
             style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
          <span className="text-[16px] mt-0.5">⚠️</span>
          <div>
            <p className="text-[13px] font-bold" style={{ color: '#991b1b' }}>
              {expiring.length} politique{expiring.length > 1 ? 's' : ''} expire{expiring.length === 1 ? '' : 'nt'} dans moins de 30 jours
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#b91c1c' }}>
              {expiring.map(p => p.policyCode).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] p-4 animate-pulse h-20" />
          ))
        ) : summary ? (
          [
            { label: 'Total',      value: summary.total,                unit: '',   color: '#64748b' },
            { label: 'Validées',   value: summary.validated,            unit: '',   color: '#10b981' },
            { label: 'En attente', value: summary.pending,              unit: '',   color: '#f59e0b' },
            { label: 'Brouillons', value: summary.draft,                unit: '',   color: '#94a3b8' },
            { label: 'Expirées',   value: summary.expired,              unit: '',   color: '#ef4444' },
          ].map(kpi => (
            <div key={kpi.label}
                 className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-4)]">{kpi.label}</p>
              <p className="text-[26px] font-extrabold mt-1 leading-none" style={{ color: kpi.color }}>
                {kpi.value}
              </p>
            </div>
          ))
        ) : null}
      </div>

      {/* Progress bar */}
      {summary && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-[var(--text-2)]">Taux de validation ANTIC</p>
            <p className="text-[13px] font-extrabold" style={{ color: progressColor }}>
              {progressPct.toFixed(1)}%
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${progressPct}%`, background: progressColor }} />
          </div>
          <p className="text-[11px] text-[var(--text-4)] mt-1.5">
            {summary.validated} / {summary.total} politiques validées
            {summary.expiringWithin30Days > 0 && (
              <span style={{ color: '#f59e0b' }}> · {summary.expiringWithin30Days} expirent sous 30j</span>
            )}
          </p>
        </div>
      )}

      {/* Policies table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between">
          <p className="text-[13px] font-bold text-[var(--text-1)]">Registre des politiques</p>
          <div className="flex gap-1.5">
            {['ALL', 'ANTIC', 'COBAC', 'INTERNAL'].map(r => (
              <button key={r}
                      onClick={() => setRegFilter(r)}
                      className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors"
                      style={regFilter === r
                        ? { background: 'var(--orange)', color: '#fff' }
                        : { background: 'var(--bg-hover)', color: 'var(--text-3)' }}>
                {r === 'ALL' ? 'Tous' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border-soft)]"
                  style={{ background: 'var(--bg-subtle, #fafaf9)' }}>
                {['Code', 'Politique', 'Régulateur', 'Statut', 'Version', 'Validé le', 'Expire le', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-4)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policiesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-soft)]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded bg-[var(--border)] animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(policy => {
                const left = daysLeft(policy.expiresAt)
                const expiringSoon = left !== null && left <= 30 && left > 0 && policy.status !== 'EXPIRED'
                return (
                  <tr key={policy.id}
                      className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-2)] whitespace-nowrap">
                      {policy.policyCode}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-1)] max-w-[220px]">
                      <p className="font-medium leading-snug">{policy.policyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RegulatorBadge regulator={policy.regulator} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={policy.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-3)] font-mono">
                      {policy.version ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-3)] whitespace-nowrap">
                      {formatDate(policy.validatedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {policy.expiresAt ? (
                        <span style={{ color: expiringSoon ? '#f59e0b' : policy.status === 'EXPIRED' ? '#ef4444' : 'var(--text-3)' }}>
                          {formatDate(policy.expiresAt)}
                          {expiringSoon && <span className="ml-1 text-[10px]">({left}j)</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditing(policy)}
                              className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold
                                         text-[var(--text-2)] hover:bg-[var(--border)] transition-colors border border-[var(--border)]">
                        Éditer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!policiesLoading && filtered.length === 0 && (
            <p className="text-center text-[13px] text-[var(--text-4)] py-10">Aucune politique trouvée.</p>
          )}
        </div>
      </div>

      {editing && <EditModal policy={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
