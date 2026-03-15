// src/pages/DeveloperPortal.tsx
// Developer Portal — intégré dans le portail marchand.
// Sections : clés API · playground · docs endpoints · snippets · statut providers · simulateur USSD

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantsApi, providersHealthApi } from '../lib/api/modules'
import { Badge } from '../components/ui'
import client, { type ApiClientError } from '../lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'keys' | 'playground' | 'docs' | 'snippets' | 'status' | 'simulator'
type ApiKey = { key: string; mode: 'test' | 'live'; createdAt?: string }
type PlaygroundEndpoint = { id: string; method: 'GET' | 'POST' | 'DELETE'; path: string; label: string; body?: object; params?: Record<string, string> }
type Lang = 'curl' | 'js' | 'python'
type SimState = 'idle' | 'initiating' | 'waiting_phone' | 'confirming' | 'success' | 'failed' | 'cancelled' | 'timeout'
type PhoneScreen = 'idle' | 'ussd' | 'processing' | 'success' | 'failed' | 'cancelled'

interface PaymentForm {
  amount: number; phone: string; name: string; ref: string; description: string
  scenario: 'success' | 'failure' | 'timeout'
}

interface LogEntry { time: string; message: string; type: 'info' | 'ok' | 'err' | 'warn' }

interface TxResult { txId: string; providerRef?: string; status: string; amount: number; duration: number }

interface ApiErrorDetails {
  message: string
  hint?: string
  status?: number
  body?: unknown
  url?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'keys',       label: 'Clés API',    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5a3 3 0 010 6H8l-1 1H5.5v1.5H4V11.5H2.5V10L6.8 5.7A3 3 0 019.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="9.5" cy="4.5" r=".8" fill="currentColor"/></svg> },
  { id: 'playground', label: 'Playground',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4l4 3-4 3V4zM8 9h4M8 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'docs',       label: 'Endpoints',   icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { id: 'snippets',   label: 'Code',        icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 4.5L2 7l2.5 2.5M9.5 4.5L12 7l-2.5 2.5M7.5 3l-1 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'status',     label: 'Statut',      icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 7h1.5l1-2 2 4 1-2H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'simulator',  label: 'Simulateur',  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3h4M5 10h4M6.5 7.5l1.5-1.5L6.5 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg> },
]

const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  { id: 'list-payments',  method: 'GET',    path: '/api/Payment',                label: 'Lister les paiements' },
  { id: 'create-payment', method: 'POST',   path: '/api/Payment',                label: 'Créer un paiement',
    body: { amount: 5000, currency: 'XAF', provider: 'MTN', customer: { phoneNumber: '237677123456', name: 'Test User', email: 'test@example.com' }, merchant: { reference: 'MERCHANT_REF', callbackUrl: 'https://example.com/callback', name: 'Ma Boutique' }, description: 'Test paiement ST Pay' } },
  { id: 'get-payment',    method: 'GET',    path: '/api/Payment/{paymentId}',     label: 'Statut paiement',    params: { paymentId: '' } },
  { id: 'cancel-payment', method: 'DELETE', path: '/api/Payment/{paymentId}',     label: 'Annuler paiement',   params: { paymentId: '' } },
  { id: 'health',         method: 'GET',    path: '/api/Payment/health',           label: 'Santé API' },
  { id: 'list-webhooks',  method: 'GET',    path: '/api/webhooks',                label: 'Lister webhooks' },
]

const DOCS_ENDPOINTS = [
  { tag: 'Paiements', color: 'blue', routes: [
    { method: 'POST',   path: '/api/Payment',                    desc: 'Initier un paiement mobile money',    auth: true },
    { method: 'GET',    path: '/api/Payment/{paymentId}',         desc: "Récupérer le statut d'un paiement",  auth: true },
    { method: 'DELETE', path: '/api/Payment/{paymentId}',         desc: 'Annuler un paiement en cours',        auth: true },
    { method: 'POST',   path: '/api/Payment/{paymentId}/refund',  desc: 'Rembourser un paiement',              auth: true },
    { method: 'GET',    path: '/api/Payment/health',              desc: "Vérifier la santé de l'API",          auth: false },
    { method: 'GET',    path: '/api/Payment/providers/{name}/health', desc: "Santé d'un provider spécifique", auth: true },
  ]},
  { tag: 'Clés API', color: 'orange', routes: [
    { method: 'GET',    path: '/api/keys',          desc: 'Lister les clés actives',            auth: true },
    { method: 'POST',   path: '/api/keys/generate', desc: 'Générer une nouvelle clé',           auth: true },
    { method: 'POST',   path: '/api/keys/rotate',   desc: 'Rotation de clé (révoke + nouvelle)', auth: true },
    { method: 'DELETE', path: '/api/keys/revoke',   desc: 'Révoquer une clé',                   auth: true },
  ]},
  { tag: 'Webhooks', color: 'amber', routes: [
    { method: 'GET',  path: '/api/webhooks',                  desc: 'Lister les webhooks',          auth: true },
    { method: 'POST', path: '/api/webhooks/{id}/replay',       desc: 'Rejouer un webhook',           auth: true },
    { method: 'GET',  path: '/api/webhooks/pending-retries',   desc: 'Webhooks en attente de retry', auth: true },
  ]},
  { tag: 'Escrow', color: 'green', routes: [
    { method: 'GET',  path: '/api/escrow',              desc: 'Lister les séquestres actifs', auth: true },
    { method: 'POST', path: '/api/escrow/{id}/release', desc: 'Libérer un séquestre',         auth: true },
  ]},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  const parts = key.split('_')
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join('_')
    const suffix = key.slice(-4)
    return `${prefix}_${'•'.repeat(Math.max(8, key.length - prefix.length - 4))}${suffix}`
  }
  return `${'•'.repeat(key.length - 4)}${key.slice(-4)}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function methodColor(m: string) {
  if (m === 'GET')    return 'bg-[var(--blue-bg)] text-[var(--blue)]'
  if (m === 'POST')   return 'bg-[var(--green-bg)] text-[var(--green)]'
  if (m === 'DELETE') return 'bg-[var(--red-bg)] text-[var(--red)]'
  return 'bg-[var(--amber-bg)] text-[var(--amber)]'
}

function fmtXAF(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' XAF' }
function nowTime() { return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }

function extractApiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' && body.trim() ? body : undefined

  const record = body as Record<string, unknown>
  const direct = record.message || record.Message || record.error || record.Error || record.detail || record.title
  if (typeof direct === 'string' && direct.trim()) return direct

  if (record.errors && typeof record.errors === 'object') {
    const entries = Object.entries(record.errors as Record<string, unknown>)
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${String(item)}`)
        }
        return `${field}: ${String(value)}`
      })
      .filter(Boolean)

    if (entries.length > 0) {
      return entries.join(' | ')
    }
  }

  return undefined
}

function getApiHint(status?: number, url?: string): string | undefined {
  if (!status) {
    return url?.includes('localhost:5169')
      ? 'Le backend est probablement indisponible ou refuse la connexion sur localhost:5169.'
      : 'La requête a échoué avant de recevoir une réponse du serveur.'
  }

  if (status === 400) return 'La requête est arrivée au backend, mais le payload ou les paramètres ne respectent pas le contrat attendu.'
  if (status === 401) return 'Authentification invalide ou absente. Vérifiez le bearer token ou le header X-Api-Key.'
  if (status === 403) return 'La requête est authentifiée mais interdite pour ce rôle ou cette permission.'
  if (status === 404) return 'Route ou ressource introuvable. Vérifiez le path et les paramètres dynamiques.'
  if (status >= 500) return 'Le backend a échoué pendant le traitement. Il faut consulter les logs serveur.'
  return undefined
}

function buildApiError(input: { message?: string; status?: number; body?: unknown; url?: string }): ApiErrorDetails {
  const providerErrors =
    input.body && typeof input.body === 'object' && 'errors' in (input.body as Record<string, unknown>)
      ? ((input.body as Record<string, unknown>).errors as Record<string, unknown> | undefined)
      : undefined
  const providerInvalid = Array.isArray(providerErrors?.Provider)
    && providerErrors?.Provider.some((v) => String(v).toLowerCase().includes('invalid provider'))

  const message = input.message || extractApiMessage(input.body) || 'Erreur API'
  return {
    message,
    status: input.status,
    body: input.body,
    url: input.url,
    hint: providerInvalid
      ? 'Provider invalide. Utilisez une valeur acceptee par l API: MTN, ORANGE, MOOV ou WAVE.'
      : getApiHint(input.status, input.url),
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-extrabold text-[16px] text-[var(--text-1)] tracking-tight">{title}</h2>
      {sub && <p className="text-[12px] text-[var(--text-3)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── TAB 1 : API Keys ─────────────────────────────────────────────────────────

function KeysTab() {
  const qc = useQueryClient()
  const { data: keys = [], isLoading } = useQuery({ queryKey: ['dev-keys'], queryFn: merchantsApi.list })
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [newKey, setNewKey] = useState<string | null>(null)
  const [genMode, setGenMode] = useState<'test' | 'live'>('test')

  const generate = useMutation({
    mutationFn: () => merchantsApi.create({ isTestMode: genMode === 'test' }),
    onSuccess: (data) => { setNewKey(data.apiKey); qc.invalidateQueries({ queryKey: ['dev-keys'] }); toast.success('Nouvelle clé générée !') },
    onError: (e: Error) => toast.error(e.message),
  })

  const revoke = useMutation({
    mutationFn: (key: string) => merchantsApi.revokeKey(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-keys'] }); toast.success('Clé révoquée') },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleReveal = (k: string) => setRevealed((prev) => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copié !') }

  return (
    <div className="space-y-5">
      <SectionHeader title="Gestion des clés API" sub="Toutes les requêtes doivent inclure votre clé dans le header X-Api-Key" />

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Générer une clé</span></div>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px]">
            {(['test', 'live'] as const).map((m) => (
              <button key={m} onClick={() => setGenMode(m)}
                      className={`px-4 py-1.5 rounded-[5px] text-[12px] font-semibold transition-colors ${genMode === m ? 'bg-white text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
                {m === 'test' ? 'Test  sk_test_…' : 'Live  sk_live_…'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? 'Génération…' : '+ Nouvelle clé'}
          </button>
        </div>
        {newKey && (
          <div className="mx-4 mb-4 p-3 rounded-[var(--r-sm)] bg-[var(--green-bg)] border border-[var(--green-border)]">
            <p className="text-[11px] font-semibold text-[var(--green)] mb-2">Clé générée — copiez-la maintenant, elle ne sera plus affichée en clair.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-[var(--text-1)] bg-white px-3 py-2 rounded-[5px] border border-[var(--green-border)] break-all">{newKey}</code>
              <button className="btn-secondary text-[11px]" onClick={() => copy(newKey)}>Copier</button>
              <button className="btn-ghost text-[11px]" onClick={() => setNewKey(null)}>✕</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Clés actives</span>
          <span className="text-[11px] text-[var(--text-3)]">{keys.length} clé{keys.length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="h-12 rounded animate-pulse bg-[var(--border)]"/>)}</div>
        ) : keys.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-[var(--text-3)]">Aucune clé active</p>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {keys.map((k: ApiKey) => (
              <div key={k.key} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)]">
                <Badge color={k.mode === 'live' ? 'emerald' : 'amber'}>{k.mode.toUpperCase()}</Badge>
                <code className="flex-1 text-[11px] font-mono text-[var(--text-2)] truncate">{revealed.has(k.key) ? k.key : maskKey(k.key)}</code>
                <span className="text-[11px] text-[var(--text-4)]">{fmtDate(k.createdAt)}</span>
                <button className="btn-ghost text-[11px] py-1" onClick={() => toggleReveal(k.key)}>{revealed.has(k.key) ? 'Masquer' : 'Afficher'}</button>
                <button className="btn-secondary text-[11px] py-1" onClick={() => copy(k.key)}>Copier</button>
                <button className="btn-danger text-[11px] py-1" disabled={revoke.isPending}
                        onClick={() => { if (confirm('Révoquer cette clé ? Action irréversible.')) revoke.mutate(k.key) }}>
                  Révoquer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Bonnes pratiques</span></div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {[
            { icon: '🔒', title: 'Ne jamais exposer vos clés', desc: "Ne commitez pas vos clés dans Git. Utilisez des variables d'environnement." },
            { icon: '🧪', title: 'Test vs Live', desc: 'Utilisez sk_test_ en développement. sk_live_ uniquement en production.' },
            { icon: '🔄', title: 'Rotation régulière', desc: 'Faites une rotation de vos clés tous les 90 jours ou en cas de compromission.' },
            { icon: '📋', title: 'Header X-Api-Key', desc: 'Chaque requête doit inclure : X-Api-Key: sk_test_votre_clé' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 bg-[var(--bg-subtle)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
              <span className="text-[18px] flex-shrink-0">{icon}</span>
              <div>
                <p className="text-[12px] font-semibold text-[var(--text-1)]">{title}</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2 : Playground ───────────────────────────────────────────────────────

function PlaygroundTab() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<PlaygroundEndpoint>(PLAYGROUND_ENDPOINTS[0])
  const [params, setParams] = useState<Record<string, string>>({})
  const [bodyStr, setBodyStr] = useState('')
  const [apiKey, setApiKey] = useState(localStorage.getItem('stpay_api_key') || '')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; body: unknown; duration: number } | null>(null)
  const [error, setError] = useState<ApiErrorDetails | null>(null)

  const selectEndpoint = (ep: PlaygroundEndpoint) => {
    setSelectedEndpoint(ep); setParams(ep.params ? { ...ep.params } : {})
    setBodyStr(ep.body ? JSON.stringify(ep.body, null, 2) : ''); setResponse(null); setError(null)
  }

  const buildUrl = () => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5169'
    let path = selectedEndpoint.path
    Object.entries(params).forEach(([k, v]) => { path = path.replace(`{${k}}`, v || `{${k}}`) })
    return base + path
  }

  const run = async () => {
    if (!apiKey.trim()) { toast.error('Entrez votre clé API'); return }
    setLoading(true); setResponse(null); setError(null)
    const t0 = Date.now()
    try {
      const opts: RequestInit = { method: selectedEndpoint.method, headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey.trim() } }
      if (selectedEndpoint.method !== 'GET' && bodyStr.trim()) opts.body = bodyStr
      const res = await fetch(buildUrl(), opts)
      const rawText = await res.text()
      let body: unknown = null
      if (rawText) {
        try {
          body = JSON.parse(rawText)
        } catch {
          body = rawText
        }
      }
      setResponse({ status: res.status, body, duration: Date.now() - t0 })
      if (!res.ok) {
        setError(buildApiError({
          status: res.status,
          body,
          url: buildUrl(),
          message: extractApiMessage(body) || res.statusText || 'Erreur API',
        }))
      }
    } catch (e: unknown) {
      setError(buildApiError({
        message: e instanceof Error ? e.message : 'Erreur réseau',
        url: buildUrl(),
      }))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Playground interactif" sub="Testez les endpoints ST Pay directement depuis votre navigateur" />

      <div className="panel">
        <div className="p-4 flex items-center gap-3">
          <label className="text-[12px] font-semibold text-[var(--text-2)] flex-shrink-0">X-Api-Key</label>
          <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('stpay_api_key', e.target.value) }}
                 placeholder="sk_test_…"
                 className="flex-1 rounded-[6px] border border-[var(--border-med)] px-3 py-1.5 text-[12px] font-mono bg-white text-[var(--text-1)] outline-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${apiKey.startsWith('sk_live') ? 'bg-[var(--green-bg)] text-[var(--green)]' : apiKey.startsWith('sk_test') ? 'bg-[var(--amber-bg)] text-[var(--amber)]' : 'bg-[var(--border)] text-[var(--text-3)]'}`}>
            {apiKey.startsWith('sk_live') ? 'LIVE' : apiKey.startsWith('sk_test') ? 'TEST' : 'NON DÉFINI'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Endpoints</span></div>
          <div className="divide-y divide-[var(--border-soft)]">
            {PLAYGROUND_ENDPOINTS.map((ep) => (
              <button key={ep.id} onClick={() => selectEndpoint(ep)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${selectedEndpoint.id === ep.id ? 'bg-[var(--orange-bg)] border-r-2 border-[var(--orange)]' : 'hover:bg-[var(--bg-subtle)]'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${methodColor(ep.method)}`}>{ep.method}</span>
                </div>
                <p className={`text-[11px] font-medium ${selectedEndpoint.id === ep.id ? 'text-[var(--orange-dark)]' : 'text-[var(--text-1)]'}`}>{ep.label}</p>
                <p className="text-[10px] font-mono text-[var(--text-4)] mt-0.5 truncate">{ep.path}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="panel">
            <div className="p-3 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded font-mono flex-shrink-0 ${methodColor(selectedEndpoint.method)}`}>{selectedEndpoint.method}</span>
              <code className="flex-1 text-[12px] font-mono text-[var(--text-2)] truncate">{buildUrl()}</code>
              <button className="btn-primary text-[12px] flex-shrink-0" onClick={run} disabled={loading}>{loading ? 'Envoi…' : '▶ Envoyer'}</button>
            </div>
          </div>

          {Object.keys(params).length > 0 && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Paramètres</span></div>
              <div className="p-4 space-y-2">
                {Object.entries(params).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <label className="text-[12px] font-mono text-[var(--text-2)] w-28 flex-shrink-0">{k}</label>
                    <input value={v} onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))} placeholder={`{${k}}`}
                           className="flex-1 rounded-[6px] border border-[var(--border-med)] px-3 py-1.5 text-[12px] font-mono bg-white outline-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEndpoint.method !== 'GET' && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Corps (JSON)</span></div>
              <div className="p-3">
                <textarea value={bodyStr} onChange={(e) => setBodyStr(e.target.value)} rows={8}
                          className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[12px] font-mono bg-[var(--bg-subtle)] text-[var(--text-1)] outline-none resize-none focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]" />
              </div>
            </div>
          )}

          {(response || error) && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Réponse</span>
                {response && (
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${response.status < 300 ? 'bg-[var(--green-bg)] text-[var(--green)]' : response.status < 500 ? 'bg-[var(--amber-bg)] text-[var(--amber)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>{response.status}</span>
                    <span className="text-[11px] text-[var(--text-3)]">{response.duration}ms</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                {error ? (
                  <div className="space-y-3">
                    <div className="rounded-[6px] border border-[var(--red-border)] bg-[var(--red-bg)] p-3">
                      <p className="text-[12px] font-semibold text-[var(--red)]">{error.message}</p>
                      {error.hint && <p className="mt-1 text-[11px] text-[var(--text-2)]">{error.hint}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-3)]">
                        {typeof error.status === 'number' && <span>HTTP {error.status}</span>}
                        {error.url && <span>{error.url}</span>}
                      </div>
                    </div>
                    {typeof error.body !== 'undefined' && error.body !== null && (
                      <pre className="text-[11px] font-mono text-[var(--text-1)] bg-[var(--bg-subtle)] p-3 rounded-[6px] border border-[var(--border-soft)] overflow-auto max-h-64">{JSON.stringify(error.body, null, 2)}</pre>
                    )}
                  </div>
                ) : (
                  <pre className="text-[11px] font-mono text-[var(--text-1)] bg-[var(--bg-subtle)] p-3 rounded-[6px] border border-[var(--border-soft)] overflow-auto max-h-64">{JSON.stringify(response?.body, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3 : Docs ─────────────────────────────────────────────────────────────

function DocsTab() {
  const [open, setOpen] = useState<string | null>(null)
  const TAG_COLORS: Record<string, string> = {
    blue:   'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue-border)]',
    orange: 'bg-[var(--orange-bg)] text-[var(--orange-dark)] border-[var(--orange-border)]',
    amber:  'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber-border)]',
    green:  'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-border)]',
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Référence des endpoints" sub="Tous les endpoints disponibles dans l'API ST Pay v1" />

      <div className="flex items-start gap-3 p-4 rounded-[var(--r-md)] bg-[var(--orange-bg)] border border-[var(--orange-border)]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
          <path d="M12 6a4 4 0 00-8 0v1H3a1 1 0 00-1 1v5a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V6z" stroke="var(--orange)" strokeWidth="1.3"/>
          <circle cx="8" cy="11" r="1" fill="var(--orange)"/>
        </svg>
        <div>
          <p className="text-[12px] font-semibold text-[var(--orange-dark)]">Authentification requise</p>
          <p className="text-[11px] text-[var(--text-2)] mt-0.5">
            Toutes les routes marquées 🔒 nécessitent le header{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[var(--orange-border)]">X-Api-Key: sk_test_…</code>
          </p>
        </div>
      </div>

      {DOCS_ENDPOINTS.map((group) => (
        <div key={group.tag} className="panel">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_COLORS[group.color]}`}>{group.tag}</span>
              <span className="text-[11px] text-[var(--text-3)]">{group.routes.length} endpoint{group.routes.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-soft)]">
            {group.routes.map((route) => {
              const id = `${group.tag}-${route.method}-${route.path}`, isOpen = open === id
              return (
                <div key={id}>
                  <button onClick={() => setOpen(isOpen ? null : id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors text-left">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 w-14 text-center ${methodColor(route.method)}`}>{route.method}</span>
                    <code className="text-[12px] font-mono text-[var(--text-1)] flex-1">{route.path}</code>
                    <span className="text-[11px] text-[var(--text-3)] hidden sm:block">{route.desc}</span>
                    {route.auth && <span className="text-[var(--text-4)] text-[12px] flex-shrink-0">🔒</span>}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`flex-shrink-0 text-[var(--text-4)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 bg-[var(--bg-subtle)]">
                      <p className="text-[12px] text-[var(--text-2)] py-3">{route.desc}</p>
                      {route.auth && <div className="text-[11px] font-mono bg-white border border-[var(--border)] rounded-[6px] px-3 py-2 text-[var(--text-2)]"><span className="text-[var(--text-4)]">Header requis : </span>X-Api-Key: sk_test_your_key</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB 4 : Code Snippets ────────────────────────────────────────────────────

function SnippetsTab() {
  const [lang, setLang] = useState<Lang>('curl')
  const [scenario, setScenario] = useState(0)

  const scenarios = [
    { label: 'Initier un paiement MTN', value: 'create' },
    { label: 'Vérifier un statut',      value: 'status' },
    { label: 'Lister les webhooks',     value: 'webhooks' },
    { label: 'Générer une clé API',     value: 'keygen' },
  ]

  const snippets: Record<string, Record<Lang, string>> = {
    create: {
      curl: `curl -X POST https://api.stpay.africa/api/Payment \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_test_votre_cle" \\
  -d '{
    "amount": 5000, "currency": "XAF", "provider": "MTN",
    "customer": { "phoneNumber": "237677123456", "name": "Jean Dupont", "email": "jean@example.com" },
    "merchant": { "reference": "ORDER_001", "callbackUrl": "https://votre-site.com/callback", "name": "Ma Boutique" },
    "description": "Commande #001"
  }'`,
      js: `const response = await fetch('https://api.stpay.africa/api/Payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.STPAY_API_KEY },
  body: JSON.stringify({
    amount: 5000, currency: 'XAF', provider: 'MTN',
    customer: { phoneNumber: '237677123456', name: 'Jean Dupont', email: 'jean@example.com' },
    merchant: { reference: 'ORDER_001', callbackUrl: 'https://votre-site.com/callback', name: 'Ma Boutique' },
    description: 'Commande #001',
  }),
});
const payment = await response.json();
console.log(payment.transactionId); // ST-PAY-2024-XXXXXXXX`,
      python: `import requests, os

response = requests.post(
    'https://api.stpay.africa/api/Payment',
    headers={ 'Content-Type': 'application/json', 'X-Api-Key': os.environ['STPAY_API_KEY'] },
    json={
        'amount': 5000, 'currency': 'XAF', 'provider': 'MTN',
        'customer': { 'phoneNumber': '237677123456', 'name': 'Jean Dupont', 'email': 'jean@example.com' },
        'merchant': { 'reference': 'ORDER_001', 'callbackUrl': 'https://votre-site.com/callback', 'name': 'Ma Boutique' },
        'description': 'Commande #001',
    }
)
print(response.json()['transactionId'])  # ST-PAY-2024-XXXXXXXX`,
    },
    status: {
      curl: `curl https://api.stpay.africa/api/Payment/ST-PAY-2024-XXXXXXXX \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      js: `const res = await fetch(\`https://api.stpay.africa/api/Payment/\${transactionId}\`,
  { headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const status = await res.json();
// status.status → 'pending' | 'processing' | 'completed' | 'failed'`,
      python: `res = requests.get(
    f'https://api.stpay.africa/api/Payment/{transaction_id}',
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
# res.json()['status'] → 'pending' | 'processing' | 'completed' | 'failed'`,
    },
    webhooks: {
      curl: `curl "https://api.stpay.africa/api/webhooks?page=1&pageSize=20" \\
  -H "X-Api-Key: sk_test_votre_cle"`,
      js: `const res = await fetch('https://api.stpay.africa/api/webhooks?page=1&pageSize=20',
  { headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const { items } = await res.json();
items.forEach(w => console.log(w.eventType, w.status));`,
      python: `res = requests.get('https://api.stpay.africa/api/webhooks',
    params={'page': 1, 'pageSize': 20},
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
for webhook in res.json()['items']:
    print(webhook['eventType'], webhook['status'])`,
    },
    keygen: {
      curl: `curl -X POST "https://api.stpay.africa/api/keys/generate?isTestMode=true" \\
  -H "X-Api-Key: sk_test_votre_cle_existante"`,
      js: `const res = await fetch('https://api.stpay.africa/api/keys/generate?isTestMode=true',
  { method: 'POST', headers: { 'X-Api-Key': process.env.STPAY_API_KEY } }
);
const { apiKey, mode } = await res.json();
// Sauvegardez apiKey de façon sécurisée !`,
      python: `res = requests.post('https://api.stpay.africa/api/keys/generate',
    params={'isTestMode': True},
    headers={'X-Api-Key': os.environ['STPAY_API_KEY']}
)
# Sauvegardez res.json()['apiKey'] de façon sécurisée !`,
    },
  }

  const code = snippets[scenarios[scenario].value]?.[lang] ?? ''
  const copy = () => { navigator.clipboard.writeText(code); toast.success('Code copié !') }
  const LANG_LABELS: Record<Lang, string> = { curl: 'cURL', js: 'JavaScript', python: 'Python' }

  return (
    <div className="space-y-4">
      <SectionHeader title="Exemples de code" sub="Copiez ces snippets pour intégrer ST Pay dans votre application" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px]">
          {scenarios.map(({ label }, i) => (
            <button key={i} onClick={() => setScenario(i)}
                    className={`px-3 py-1.5 rounded-[5px] text-[12px] transition-colors ${scenario === i ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[var(--border)] p-[3px] rounded-[7px] ml-auto">
          {(['curl', 'js', 'python'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 rounded-[5px] text-[11px] font-mono transition-colors ${lang === l ? 'bg-white font-semibold text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{scenarios[scenario].label}</span>
          <button className="btn-secondary text-[11px]" onClick={copy}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Copier
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-[12px] font-mono text-[var(--text-1)] leading-relaxed whitespace-pre">{code}</pre>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">Vérification des webhooks</span></div>
        <div className="p-4 space-y-3">
          <p className="text-[12px] text-[var(--text-2)]">Chaque webhook ST Pay inclut un header de signature HMAC-SHA256 pour vérifier son authenticité.</p>
          <pre className="text-[11px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-soft)] rounded-[6px] p-3 text-[var(--text-1)] overflow-x-auto">{`// Node.js — vérifier la signature d'un webhook
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [timestamp, hash] = signature.split(',');
  const t = timestamp.replace('t=', '');
  const expected = 't=' + t + ',v1=' +
    crypto.createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-stpay-signature'];
  if (!verifyWebhook(req.body, sig, process.env.STPAY_WEBHOOK_SECRET))
    return res.status(401).send('Signature invalide');
  res.json({ received: true });
  processWebhookEvent(JSON.parse(req.body)); // traiter en async
});`}</pre>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 5 : Provider Status ──────────────────────────────────────────────────

function StatusTab() {
  const { data: providers = [], isFetching: provFetching, refetch: refetchProv } = useQuery({ queryKey: ['dev-providers-health'], queryFn: providersHealthApi.allProviders, refetchInterval: 30_000 })
  const { data: obs, isFetching: obsFetching, refetch: refetchObs } = useQuery({ queryKey: ['dev-observability'], queryFn: providersHealthApi.observability, refetchInterval: 30_000 })
  const refetch = () => { refetchProv(); refetchObs() }
  const isLoading = provFetching || obsFetching

  const PROVIDER_INFO: Record<string, { name: string; desc: string; color: string }> = {
    MTN:    { name: 'MTN Mobile Money',  desc: "Cameroun, Côte d'Ivoire, Ghana", color: '#FFC700' },
    ORANGE: { name: 'Orange Money',      desc: 'Sénégal, Mali, Burkina Faso',    color: '#FF6600' },
    WAVE:   { name: 'Wave',              desc: "Sénégal, Côte d'Ivoire",         color: '#3B82F6' },
    MOOV:   { name: 'Moov Money',        desc: 'Bénin, Togo, Niger',             color: '#22C55E' },
  }

  const OBS_ENDPOINTS = [
    { key: 'health',  label: '/health',       desc: 'Santé générale' },
    { key: 'ready',   label: '/health/ready', desc: 'Prêt à servir' },
    { key: 'live',    label: '/health/live',  desc: 'Liveness probe' },
    { key: 'metrics', label: '/metrics',      desc: 'Prometheus' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-[16px] text-[var(--text-1)] tracking-tight">Statut des providers</h2>
          <p className="text-[12px] text-[var(--text-3)] mt-0.5">Actualisation toutes les 30 secondes</p>
        </div>
        <button className="btn-secondary" onClick={refetch} disabled={isLoading}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isLoading ? 'animate-spin' : ''}>
            <path d="M10 6A4 4 0 112 6M10 6V3M10 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isLoading ? 'Vérification…' : 'Actualiser'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['MTN', 'ORANGE', 'WAVE', 'MOOV'] as const).map((name) => {
          const check = providers.find((p) => p.name === name)
          const status = check?.status ?? 'unknown'
          const info = PROVIDER_INFO[name]
          return (
            <div key={name} className={`panel transition-all ${status === 'up' ? 'border-[var(--green-border)]' : ''} ${status === 'down' ? 'border-[var(--red-border)]' : ''}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[9px] font-extrabold font-mono text-white flex-shrink-0" style={{ background: info.color }}>{name.slice(0, 3)}</div>
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse-slow ${status === 'up' ? 'bg-[var(--green)]' : status === 'down' ? 'bg-[var(--red)]' : 'bg-[var(--text-4)]'}`} />
                </div>
                <p className="font-bold text-[13px] text-[var(--text-1)]">{info.name}</p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">{info.desc}</p>
                <div className="mt-3">
                  <Badge color={status === 'up' ? 'emerald' : status === 'down' ? 'red' : 'slate'} dot>
                    {status === 'up' ? 'Opérationnel' : status === 'down' ? 'Dégradé' : 'Inconnu'}
                  </Badge>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Observabilité backend</span>
          {obs?.lastChecked && <span className="text-[11px] text-[var(--text-3)]">Vérifié à {obs.lastChecked}</span>}
        </div>
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OBS_ENDPOINTS.map(({ key, label, desc }) => {
            const status = obs?.[key as keyof typeof obs] as 'up' | 'down' | undefined
            return (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-[var(--r-sm)] border ${status === 'up' ? 'bg-[var(--green-bg)] border-[var(--green-border)]' : status === 'down' ? 'bg-[var(--red-bg)] border-[var(--red-border)]' : 'bg-[var(--bg-subtle)] border-[var(--border-soft)]'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'up' ? 'bg-[var(--green)]' : status === 'down' ? 'bg-[var(--red)]' : 'bg-[var(--text-4)]'}`} />
                <div>
                  <p className={`text-[11px] font-mono font-semibold ${status === 'up' ? 'text-[var(--green)]' : status === 'down' ? 'text-[var(--red)]' : 'text-[var(--text-2)]'}`}>{label}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">SLA & disponibilité</span></div>
        <div className="p-4 grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Disponibilité cible', value: '99.9%', sub: 'sur 30 jours glissants' },
            { label: 'Délai moyen',          value: '< 3s',  sub: 'confirmation de paiement' },
            { label: 'Retry webhooks',       value: '5×',    sub: 'avec backoff exponentiel' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="text-center p-3 bg-[var(--bg-subtle)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
              <p className="font-extrabold text-[22px] text-[var(--orange)] tracking-tight">{value}</p>
              <p className="text-[12px] font-semibold text-[var(--text-1)] mt-0.5">{label}</p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 6 : Simulateur USSD MTN ─────────────────────────────────────────────

function SimStepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [{ n: 1, label: 'Configurer' }, { n: 2, label: 'Téléphone' }, { n: 3, label: 'Résultat' }]
  return (
    <div className="flex bg-[var(--bg-page)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden mb-4">
      {steps.map(({ n, label }, i) => {
        const done = n < current, active = n === current
        return (
          <div key={n} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 text-[12px] transition-colors ${i > 0 ? 'border-l border-[var(--border)]' : ''} ${done ? 'bg-[var(--green-bg)] text-[var(--green)]' : ''} ${active ? 'bg-[var(--orange-bg)] text-[var(--orange-dark)] font-bold' : ''} ${!done && !active ? 'text-[var(--text-3)]' : ''}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done ? 'bg-[var(--green)] text-white' : !active ? 'bg-[var(--border)] text-[var(--text-3)]' : 'text-white'}`}
                 style={active ? { background: 'var(--orange)' } : {}}>
              {done ? '✓' : n}
            </div>
            {label}
          </div>
        )
      })}
    </div>
  )
}

function SimEventLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [entries])
  const COLOR: Record<string, string> = { ok: 'text-[var(--green)]', err: 'text-[var(--red)]', warn: 'text-[var(--amber)]', info: 'text-[var(--blue)]' }
  return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Journal d'événements</span></div>
      <div ref={ref} className="p-3 font-mono text-[11px] leading-relaxed bg-[var(--bg-subtle)] overflow-y-auto space-y-0.5" style={{ minHeight: 80, maxHeight: 160 }}>
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[var(--text-4)] flex-shrink-0">{e.time}</span>
            <span className={COLOR[e.type] ?? 'text-[var(--text-2)]'}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimPhone({ screen, txId, amount, ref_, desc, onConfirm, onCancel, onReset, polling, pollCount }:
  { screen: PhoneScreen; txId?: string; amount?: number; ref_?: string; desc?: string; onConfirm: (pin: string) => void; onCancel: () => void; onReset: () => void; polling: boolean; pollCount: number }) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  useEffect(() => { setPin(''); setPinError(false) }, [screen])

  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 10_000)
    return () => clearInterval(id)
  }, [])

  const dialKey = (k: string) => { if (screen === 'ussd' && pin.length < 5) setPin(p => p + k) }
  const handleDel = () => { if (screen === 'ussd') setPin(p => p.slice(0, -1)) }
  const handleConfirm = () => {
    if (screen !== 'ussd') return
    if (pin.length < 4) { setPinError(true); setTimeout(() => setPinError(false), 1200); return }
    onConfirm(pin)
  }

  const ks = (extra?: React.CSSProperties): React.CSSProperties => ({ background: '#2A2A2A', border: 'none', borderRadius: 6, color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, padding: '8px 0', cursor: 'pointer', ...extra })

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: 240, background: '#1A1A1A', borderRadius: 36, padding: '14px 10px', border: '3px solid #333' }}>
        <div style={{ width: 70, height: 8, background: '#333', borderRadius: 4, margin: '0 auto 10px' }} />
        <div style={{ background: '#000', borderRadius: 20, overflow: 'hidden', minHeight: 300 }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 4px', background: '#000', color: 'white', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>{[4,6,8,10].map(h => <div key={h} style={{ width: 3, height: h, background: 'white', borderRadius: 1 }}/>)}</div>
            <span style={{ letterSpacing: 1 }}>MTN CM</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9 }}>
              <span>4G</span>
              <div style={{ width: 18, height: 9, border: '1.5px solid white', borderRadius: 2, display: 'flex', alignItems: 'center', padding: '1px 1.5px' }}><div style={{ width: '70%', height: '100%', background: 'white', borderRadius: 1 }} /></div>
            </div>
          </div>

          {/* IDLE */}
          {screen === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '28px 16px', minHeight: 220 }}>
              <div style={{ fontSize: 30, fontWeight: 300, color: 'white', fontFamily: 'DM Mono, monospace', letterSpacing: 3 }}>{clockTime}</div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: 'DM Mono, monospace', marginTop: 4, textAlign: 'center' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div style={{ marginTop: 20, background: '#FFD700', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>MTN MoMo</div>
              <div style={{ marginTop: 8, fontSize: 9, color: '#444', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>En attente d'une requête USSD...</div>
            </div>
          )}

          {/* USSD */}
          {screen === 'ussd' && (
            <div style={{ display: 'flex', flexDirection: 'column', background: '#000', padding: '8px 8px 10px' }}>
              <div style={{ background: '#FFD700', padding: '6px 10px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: 700, color: '#000', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>MTN Mobile Money — *126#</div>
              <div style={{ background: '#FFFDE7', padding: 10, borderRadius: '0 0 4px 4px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#000', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>PAIEMENT MOBILE MONEY</div>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>Transaction ID:</div>
                <div style={{ fontSize: 9, wordBreak: 'break-all', marginBottom: 6, color: '#333' }}>{txId?.slice(0, 28)}...</div>
                <div style={{ fontSize: 10, color: '#555' }}>Marchand:</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{ref_}</div>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, borderTop: '1px solid #E0D800', borderBottom: '1px solid #E0D800', padding: '5px 0', margin: '6px 0' }}>{amount ? fmtXAF(amount) : '—'}</div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>Motif:</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>{desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>PIN:</span>
                  <div style={{ flex: 1, background: 'white', border: `1px solid ${pinError ? '#C02020' : '#333'}`, borderRadius: 3, padding: '3px 6px', fontFamily: 'DM Mono, monospace', fontSize: 14, letterSpacing: 5, color: '#000', textAlign: 'center', minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border .2s' }}>
                    {pin ? '•'.repeat(pin.length) : <span style={{ color: '#BBB', fontSize: 11 }}>_ _ _ _ _</span>}
                  </div>
                </div>
                {pinError && <p style={{ fontSize: 9, color: '#C02020', textAlign: 'center', margin: '4px 0 0', fontFamily: 'DM Mono, monospace' }}>PIN incomplet (min. 4 chiffres)</p>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 10 }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#0A5A0A', fontWeight: 700 }}>OK → Confirmer</div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#7A1010', fontWeight: 700 }}>✕ → Refuser</div>
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {screen === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, border: '3px solid #FFD700', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ color: '#FFD700', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700 }}>TRAITEMENT...</div>
              <div style={{ color: '#888', fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 6 }}>{polling ? `Poll #${pollCount} en cours...` : 'Validation MTN MoMo'}</div>
            </div>
          )}

          {/* SUCCESS */}
          {screen === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#0A3A0A', border: '2px solid #1A7A40', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11.5l4.5 4.5 8-8" stroke="#1A7A40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>PAIEMENT RÉUSSI</div>
              <div style={{ color: '#22C55E', fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700 }}>{amount ? fmtXAF(amount) : ''}</div>
              <div style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: 9, marginTop: 8 }}>débités sur votre compte MTN MoMo</div>
              <div style={{ marginTop: 12, background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 2, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>MTN MoMo</div>
            </div>
          )}

          {/* FAILED / CANCELLED */}
          {(screen === 'failed' || screen === 'cancelled') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: 20, minHeight: 220, textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#3A0A0A', border: '2px solid #C02020', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 6l10 10M16 6L6 16" stroke="#C02020" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{screen === 'cancelled' ? 'TRANSACTION ANNULÉE' : 'PAIEMENT ÉCHOUÉ'}</div>
              <div style={{ color: '#666', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{screen === 'cancelled' ? "Vous avez refusé le paiement" : 'Une erreur est survenue'}</div>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div style={{ background: '#111', padding: 8, borderRadius: '0 0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
          {['1','2','3','4','5','6','7','8','9'].map(k => <button key={k} onClick={() => dialKey(k)} style={ks()}>{k}</button>)}
          <button onClick={handleDel} style={ks({ background: '#3A2A1A', color: '#F59E0B', fontSize: 11 })}>⌫</button>
          <button onClick={() => dialKey('0')} style={ks()}>0</button>
          <button onClick={screen === 'ussd' ? handleConfirm : onReset} style={ks({ background: screen === 'ussd' ? '#0A3A0A' : '#1A1A1A', color: screen === 'ussd' ? '#22C55E' : '#555', fontSize: 11 })}>OK</button>
          <button onClick={screen === 'ussd' ? onCancel : onReset} style={ks({ background: '#3A0A0A', color: '#EF4444', gridColumn: '1 / span 2' })}>✕</button>
          <button style={ks({ background: '#0A1A3A', color: '#3B82F6', fontSize: 11 })}>#</button>
        </div>
        <div style={{ width: 36, height: 6, background: '#333', borderRadius: 3, margin: '8px auto 2px' }} />
      </div>

      <p className="text-center text-[11px] text-[var(--text-3)] max-w-[220px] leading-relaxed">
        {screen === 'idle'       && "Initiez un paiement pour recevoir le prompt USSD"}
        {screen === 'ussd'       && "Entrez le PIN (ex: 1234) puis OK pour confirmer, ✕ pour refuser"}
        {screen === 'processing' && (polling ? `Polling #${pollCount}/12 — vérification toutes les 5s` : 'Validation en cours...')}
        {screen === 'success'    && "Paiement confirmé. Webhook payment.completed déclenché."}
        {(screen === 'failed' || screen === 'cancelled') && "Transaction terminée. OK ou ✕ pour réinitialiser."}
      </p>
    </div>
  )
}

function SimResultCard({ result }: { result: TxResult | null }) {
  if (!result) return null
  const ok = ['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => result.status.toUpperCase().includes(s))
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Résultat de la transaction</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>{ok ? 'Succès' : 'Échec'}</span>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
        {([
          ['Transaction ID', <span className="font-mono text-[11px] break-all">{result.txId}</span>],
          ['Statut final',   <span className={`font-bold ${ok ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{result.status}</span>],
          ['Provider ref.',  <span className="font-mono text-[11px]">{result.providerRef || '—'}</span>],
          ['Montant',        fmtXAF(result.amount)],
          ['Durée totale',   `${result.duration}ms`],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k as string} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <span className="text-[11px] text-[var(--text-3)] flex-shrink-0 w-28">{k}</span>
            <span className="text-[12px] text-[var(--text-1)] text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SIM_SCENARIOS = [
  { value: 'success', label: 'Succès attendu',  sub: 'MockAdapter → SUCCESSFUL' },
  { value: 'failure', label: 'Échec attendu',   sub: 'MockAdapter → FAILED' },
  { value: 'timeout', label: 'Timeout (60s)',   sub: "Absence de réponse" },
] as const

function SimulatorTab() {
  const [state,     setState]     = useState<SimState>('idle')
  const [form,      setForm]      = useState<PaymentForm>({ amount: 5000, phone: '237677123456', name: 'Jean Dupont', ref: 'TEST_SIM_001', description: 'Paiement test ST Pay', scenario: 'success' })
  const [txId,      setTxId]      = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [logs,      setLogs]      = useState<LogEntry[]>([{ time: '--:--:--', message: 'Simulateur prêt — configurez et initiez un paiement.', type: 'info' }])
  const [result,    setResult]    = useState<TxResult | null>(null)
  const [apiError,  setApiError]  = useState<ApiErrorDetails | null>(null)
  const [polling,   setPolling]   = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: nowTime(), message, type }])
  }, [])

  const step: 1 | 2 | 3 = state === 'idle' || state === 'initiating' ? 1 : state === 'waiting_phone' ? 2 : 3

  const phoneScreen: PhoneScreen =
    state === 'idle' || state === 'initiating' ? 'idle'
    : state === 'waiting_phone' ? 'ussd'
    : state === 'confirming'    ? 'processing'
    : state === 'success'       ? 'success'
    : state === 'failed'        ? 'failed'
    : state === 'cancelled'     ? 'cancelled'
    : 'idle'

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }; setPolling(false) }

  const startPolling = (tid: string) => {
    let count = 0; setPolling(true); setPollCount(0)
    pollRef.current = setInterval(async () => {
      count++; setPollCount(count)
      addLog(`Poll #${count} — GET /api/Payment/${tid.slice(-8)}...`, 'info')
      try {
        const res = await client.get(`/api/Payment/${tid}`)
        const st = (res.data.status || res.data.Status || '').toUpperCase()
        addLog(`Statut reçu: ${st}`, ['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => st.includes(s)) ? 'ok' : 'info')
        if (['SUCCESSFUL','SUCCESS','COMPLETED'].some(s => st.includes(s))) {
          stopPolling(); setState('success')
          setResult({ txId: tid, providerRef: res.data.providerReference, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.completed déclenché', 'ok'); addLog('Transaction terminée avec succès !', 'ok')
          toast.success('Paiement confirmé !')
        } else if (['FAILED','ERROR','REJECTED','CANCELLED'].some(s => st.includes(s))) {
          stopPolling(); setState('failed')
          setResult({ txId: tid, status: st, amount: form.amount, duration: Date.now() - startedAt })
          addLog('Webhook payment.failed déclenché', 'err'); toast.error('Transaction échouée')
        } else if (count >= 12) {
          stopPolling(); setState('timeout')
          addLog('Timeout — 60s sans réponse définitive', 'warn')
          toast('Timeout de la simulation', { icon: '⏱' })
        }
      } catch (e: unknown) {
        const err = e as ApiClientError
        addLog(`Erreur polling: ${err?.message || String(e)}`, 'err')

        if (err?.status === 403) {
          stopPolling()
          setState('failed')

          const detailedError = buildApiError({
            message: err.message,
            status: err.status,
            body: err.data,
            url: err.url,
          })

          setApiError(detailedError)
          addLog('Acces refuse sur le statut de paiement (403).', 'err')
          addLog('La transaction n appartient probablement pas au marchand authentifie.', 'warn')
          toast.error('403: acces refuse au statut de cette transaction')
        }
      }
    }, 5000)
  }

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await client.post('/api/Payment', {
        amount: form.amount, currency: 'XAF', provider: 'MTN',
        customer: { phoneNumber: form.phone, name: form.name, email: 'test@stpay.local' },
        merchant: { reference: form.ref, callbackUrl: `${window.location.origin}/callback`, name: 'ST Pay Simulator' },
        description: form.description, metadata: { simulatorMode: true, scenario: form.scenario },
      })
      return res.data as { transactionId?: string; id?: string; providerReference?: string }
    },
    onMutate: () => {
      setApiError(null)
      setState('initiating'); setStartedAt(Date.now())
      addLog(`Initiation paiement — ${fmtXAF(form.amount)} → ${form.phone}`, 'info')
      addLog('POST /api/Payment — provider: MTN (mock si active cote backend)', 'info')
    },
    onSuccess: (data) => {
      const id = data.transactionId || data.id || `SIM-${Date.now()}`
      setTxId(id); addLog(`Transaction créée: ${id}`, 'ok')
      addLog('Statut initial: PENDING', 'warn')
      addLog(`Prompt USSD envoyé au ${form.phone} — Vérifiez le téléphone →`, 'ok')
      setState('waiting_phone')
    },
    onError: (e: Error) => {
      const detailedError = buildApiError({
        message: e.message,
        status: (e as ApiClientError).status,
        body: (e as ApiClientError).data,
        url: (e as ApiClientError).url,
      })
      setApiError(detailedError)
      addLog(`Erreur API: ${detailedError.message}`, 'err')
      if (detailedError.hint) {
        addLog(detailedError.hint, 'warn')
      }
      setState('idle'); toast.error(detailedError.message)
    },
  })

  const handleConfirm = (pin: string) => {
    if (!txId) return
    addLog(`PIN saisi (${pin.length} chiffres) — Confirmation envoyée`, 'ok')
    addLog('Démarrage polling statut (toutes les 5s, max 60s)', 'info')
    setState('confirming'); startPolling(txId)
  }

  const handleCancel = () => {
    addLog("Paiement refusé par l'utilisateur", 'err')
    stopPolling(); setState('cancelled')
    if (txId) setResult({ txId, status: 'CANCELLED', amount: form.amount, duration: Date.now() - startedAt })
    toast.error('Paiement annulé')
  }

  const handleReset = () => {
    stopPolling(); setState('idle'); setTxId(null); setResult(null); setPollCount(0)
    setLogs([{ time: nowTime(), message: 'Simulateur réinitialisé.', type: 'info' }])
  }

  const canInitiate = state === 'idle'

  return (
    <div className="space-y-4">
      <SimStepBar current={step} />

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Configurer le paiement test</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber-border)]">MTN MoMo TEST</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Montant (XAF)', key: 'amount', type: 'number', ph: '5000' },
                  { label: 'Numéro simulé', key: 'phone',  type: 'text',   ph: '237677123456' },
                  { label: 'Nom client',    key: 'name',   type: 'text',   ph: 'Jean Dupont' },
                  { label: 'Référence',     key: 'ref',    type: 'text',   ph: 'TEST_001' },
                ].map(({ label, key, type, ph }) => (
                  <div key={key}>
                    <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">{label}</label>
                    <input type={type} placeholder={ph} disabled={!canInitiate}
                           value={form[key as keyof PaymentForm] as string}
                           onChange={e => canInitiate && setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                           className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[13px] bg-white text-[var(--text-1)] outline-none transition focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">Description</label>
                <input type="text" disabled={!canInitiate} value={form.description}
                       onChange={e => canInitiate && setForm(f => ({ ...f, description: e.target.value }))}
                       className="w-full rounded-[6px] border border-[var(--border-med)] px-3 py-2 text-[13px] bg-white text-[var(--text-1)] outline-none transition focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-3)]" />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold text-[var(--text-2)]">Scénario MockAdapter</p>
                <div className="grid grid-cols-3 gap-2">
                  {SIM_SCENARIOS.map(({ value, label, sub }) => (
                    <label key={value}
                           className={`flex flex-col gap-0.5 p-2.5 rounded-[6px] border cursor-pointer transition-all text-left ${!canInitiate ? 'opacity-50 cursor-not-allowed' : ''} ${form.scenario === value ? value === 'success' ? 'border-[var(--green-border)] bg-[var(--green-bg)]' : value === 'failure' ? 'border-[var(--red-border)] bg-[var(--red-bg)]' : 'border-[var(--amber-border)] bg-[var(--amber-bg)]' : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'}`}>
                      <input type="radio" className="sr-only" value={value} disabled={!canInitiate}
                             checked={form.scenario === value}
                             onChange={() => canInitiate && setForm(f => ({ ...f, scenario: value }))} />
                      <span className={`text-[11px] font-bold ${form.scenario === value ? value === 'success' ? 'text-[var(--green)]' : value === 'failure' ? 'text-[var(--red)]' : 'text-[var(--amber)]' : 'text-[var(--text-1)]'}`}>{label}</span>
                      <span className="text-[10px] text-[var(--text-3)]">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--orange-bg)] rounded-[6px] border border-[var(--orange-border)]">
                <p className="text-[11px] font-bold text-[var(--orange-dark)] mb-1">Mode simulateur actif</p>
                <p className="text-[10px] text-[var(--text-2)]">
                  Appel reel vers <code className="font-mono">POST /api/Payment</code> avec provider MTN.
                  Si le mode mock backend est actif pour MTN, la reponse reste simulee tout en respectant la validation API.
                </p>
              </div>

              {apiError && (
                <div className="p-3 bg-[var(--red-bg)] rounded-[6px] border border-[var(--red-border)] space-y-2">
                  <p className="text-[11px] font-bold text-[var(--red)]">Erreur API détaillée</p>
                  <p className="text-[11px] text-[var(--text-2)]">{apiError.message}</p>
                  {apiError.hint && <p className="text-[10px] text-[var(--text-3)]">{apiError.hint}</p>}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-3)]">
                    {typeof apiError.status === 'number' && <span>HTTP {apiError.status}</span>}
                    {apiError.url && <span>{apiError.url}</span>}
                  </div>
                  {typeof apiError.body !== 'undefined' && apiError.body !== null && (
                    <pre className="overflow-auto rounded-[6px] border border-[var(--red-border)] bg-white p-3 text-[10px] font-mono text-[var(--text-1)] max-h-44">{JSON.stringify(apiError.body, null, 2)}</pre>
                  )}
                </div>
              )}

              {canInitiate ? (
                <button className="btn-primary w-full justify-center" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                  {initMutation.isPending
                    ? <span className="flex items-center gap-2"><svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin .8s linear infinite' }}><path d="M12 6.5A5.5 5.5 0 112 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>Envoi en cours…</span>
                    : '▶ Initier le paiement'}
                </button>
              ) : (
                <button className="btn-secondary w-full justify-center" onClick={handleReset}>↺ Réinitialiser le simulateur</button>
              )}
            </div>
          </div>

          <SimEventLog entries={logs} />
          <SimResultCard result={result} />
        </div>

        <div className="lg:sticky lg:top-4">
          <SimPhone
            screen={phoneScreen} txId={txId ?? undefined} amount={form.amount}
            ref_={form.ref} desc={form.description}
            onConfirm={handleConfirm} onCancel={handleCancel} onReset={handleReset}
            polling={polling} pollCount={pollCount}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeveloperPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('keys')

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-1 bg-[var(--border)] p-[3px] rounded-[var(--r-sm)] w-fit flex-wrap">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-[12px] transition-colors font-medium ${activeTab === id ? 'bg-white text-[var(--text-1)] shadow-sm font-semibold' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}>
            <span className="opacity-70">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'keys'       && <KeysTab />}
        {activeTab === 'playground' && <PlaygroundTab />}
        {activeTab === 'docs'       && <DocsTab />}
        {activeTab === 'snippets'   && <SnippetsTab />}
        {activeTab === 'status'     && <StatusTab />}
        {activeTab === 'simulator'  && <SimulatorTab />}
      </div>
    </div>
  )
}
