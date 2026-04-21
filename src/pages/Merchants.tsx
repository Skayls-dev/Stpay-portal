import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminConfigApi } from '../lib/api/modules'
import type { AdminMerchantWithApps, AdminMerchantApp, IpAllowlistConfig, PortalSession } from '../lib/api/modules'
import { Card, Badge, Button, Modal } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

const KYC_COLORS: Record<string, 'amber' | 'blue' | 'emerald' | 'red'> = {
  Pending:     'amber',
  UnderReview: 'blue',
  Approved:    'emerald',
  Rejected:    'red',
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('Copié dans le presse-papiers')
}

// ── Sessions modal (admin view) ──────────────────────────────────────────────────
function SessionsModal({
  merchant, onClose,
}: { merchant: AdminMerchantWithApps; onClose: () => void }) {
  const { data: sessions = [], isLoading } = useQuery<PortalSession[]>({
    queryKey: ['admin-sessions', merchant.id],
    queryFn: () => adminConfigApi.getMerchantSessions(merchant.id),
  })

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))

  return (
    <Modal open title={`Sessions — ${merchant.name}`} onClose={onClose}>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucune session enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1.5 pr-3 text-left font-medium">Date</th>
                  <th className="py-1.5 pr-3 text-left font-medium">Email</th>
                  <th className="py-1.5 pr-3 text-left font-medium">IP</th>
                  <th className="py-1.5 pr-3 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap">{fmt(s.createdAt)}</td>
                    <td className="py-1.5 pr-3 text-slate-700 truncate max-w-[160px]">{s.email ?? '—'}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-600">{s.ipAddress ?? '—'}</td>
                    <td className="py-1.5 pr-3">
                      {s.success ? (
                        <span className="text-emerald-600 font-medium">✓ OK</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ {s.failureReason ?? 'FAIL'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  )
}

// ── IP Allowlist modal ────────────────────────────────────────────────────────
function IpAllowlistModal({
  merchant, onClose,
}: { merchant: AdminMerchantWithApps; onClose: () => void }) {
  const [draft, setDraft] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  const { isLoading } = useQuery<IpAllowlistConfig>({
    queryKey: ['admin-ip-allowlist', merchant.id],
    queryFn: () => adminConfigApi.getIpAllowlist(merchant.id),
    onSuccess: (data: IpAllowlistConfig) => {
      if (!loaded) {
        setDraft((data.allowedIps ?? []).join('\n'))
        setLoaded(true)
      }
    },
  } as any)

  const save = useMutation({
    mutationFn: (ips: string[]) => adminConfigApi.setIpAllowlist(merchant.id, ips),
    onSuccess: (data: IpAllowlistConfig) => {
      const count = data.allowedIps?.length ?? 0
      toast.success(
        count === 0
          ? 'Restriction IP supprimée — toutes les IPs sont autorisées'
          : `${count} règle(s) IP sauvegardée(s)`,
      )
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSave = () => {
    const ips = draft
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    save.mutate(ips)
  }

  const handleClear = () => {
    save.mutate([])
  }

  return (
    <Modal open title={`IP Allowlist — ${merchant.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Entrez une adresse IP ou plage CIDR par ligne (ex.{' '}
          <code className="text-xs">41.202.0.0/16</code> ou{' '}
          <code className="text-xs">10.0.0.1</code>).{' '}
          Laissez vide pour supprimer toute restriction.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : (
          <textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="41.202.0.0/16&#10;10.0.0.1"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={save.isPending || isLoading}>
            {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleClear}
            disabled={save.isPending}
            title="Supprimer toutes les restrictions IP"
          >
            Tout autoriser
          </Button>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Rotate modal ──────────────────────────────────────────────────────────────
function RotateAppModal({
  merchantId, app, onClose,
}: { merchantId: string; app: AdminMerchantApp; onClose: () => void }) {
  const qc = useQueryClient()
  const [newKey, setNewKey] = useState('')

  const rotate = useMutation({
    mutationFn: () => adminConfigApi.adminRotateApp(merchantId, app.id),
    onSuccess: (data) => {
      setNewKey(data.newKey)
      qc.invalidateQueries({ queryKey: ['admin-merchant-apps'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open title={`Rotation — ${app.name}`} onClose={onClose}>
      {!newKey ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            La clé <code className="text-xs">{app.keyPrefix}</code> sera révoquée et remplacée.
            Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
              {rotate.isPending ? 'Rotation…' : 'Confirmer'}
            </Button>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-emerald-700">Rotation effectuée !</p>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <code className="flex-1 break-all text-xs text-slate-800">{newKey}</code>
            <Button variant="secondary" onClick={() => copy(newKey)}>Copier</Button>
          </div>
          <p className="text-xs text-amber-700 font-medium">
            Transmettez cette clé au marchand — elle ne sera plus visible.
          </p>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  )
}

// ── Merchant row (accordéon) ──────────────────────────────────────────────────
function MerchantRow({ merchant }: { merchant: AdminMerchantWithApps }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rotatingApp, setRotatingApp] = useState<AdminMerchantApp | null>(null)
  const [showIpModal, setShowIpModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)

  const revoke = useMutation({
    mutationFn: (appId: string) => adminConfigApi.adminRevokeApp(merchant.id, appId),
    onSuccess: () => {
      toast.success('Clé révoquée')
      qc.invalidateQueries({ queryKey: ['admin-merchant-apps'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const kycColor = KYC_COLORS[merchant.kycStatus] ?? 'amber'

  return (
    <>
      <Card className="p-0 overflow-hidden">
        {/* Header row */}
        <div className="flex w-full items-center gap-3 px-4 py-3">
          <button
            className="flex flex-1 items-center gap-3 text-left"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="flex-1 font-medium text-slate-900 text-sm">{merchant.name}</span>
            <Badge color={kycColor}>{merchant.kycStatus}</Badge>
            <span className="text-xs text-slate-500">
              {merchant.apps.length} application{merchant.apps.length !== 1 ? 's' : ''}
            </span>
            <span className="ml-2 text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
          </button>
          <Button
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); setShowIpModal(true) }}
            title="Gérer l'allowlist IP"
          >
            🔒 IP
          </Button>
          <Button
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); setShowSessionsModal(true) }}
            title="Voir les sessions"
          >
            📜 Sessions
          </Button>
        </div>

        {/* App rows */}
        {open && (
          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {merchant.apps.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400 italic">Aucune application.</p>
            ) : (
              merchant.apps.map((app) => (
                <div key={app.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{app.name}</p>
                    {app.description && (
                      <p className="text-xs text-slate-500 truncate">{app.description}</p>
                    )}
                  </div>
                  <Badge color={app.mode === 'live' ? 'emerald' : 'amber'}>
                    {app.mode.toUpperCase()}
                  </Badge>
                  <Badge color={app.keyStatus === 'Active' ? 'emerald' : 'red'}>
                    {app.keyStatus}
                  </Badge>
                  <code className="text-xs text-slate-600 hidden sm:block">{app.keyPrefix}</code>
                  {app.lastUsedAt && (
                    <span className="text-xs text-slate-400 hidden md:block">
                      Utilisée {new Date(app.lastUsedAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="secondary" onClick={() => setRotatingApp(app)}>
                      Rotation
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Révoquer "${app.name}" ? Action irréversible.`))
                          revoke.mutate(app.id)
                      }}
                    >
                      Révoquer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {rotatingApp && (
        <RotateAppModal
          merchantId={merchant.id}
          app={rotatingApp}
          onClose={() => setRotatingApp(null)}
        />
      )}

      {showIpModal && (
        <IpAllowlistModal
          merchant={merchant}
          onClose={() => setShowIpModal(false)}
        />
      )}

      {showSessionsModal && (
        <SessionsModal
          merchant={merchant}
          onClose={() => setShowSessionsModal(false)}
        />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Merchants() {
  const [search, setSearch] = useState('')

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['admin-merchant-apps'],
    queryFn: adminConfigApi.listMerchantApps,
  })

  const filtered = merchants.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <RequirePermission permission="merchants.view_all">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Marchands</h1>
            <p className="text-sm text-muted">Applications et clés API par marchand</p>
          </div>
          <input
            type="search"
            placeholder="Rechercher un marchand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-56"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">Aucun marchand trouvé.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MerchantRow key={m.id} merchant={m} />
            ))}
          </div>
        )}
      </div>
    </RequirePermission>
  )
}
