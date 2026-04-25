import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminConfigApi } from '../lib/api/modules'
import type {
  AdminMerchant,
  AdminMerchantApp,
  AdminMerchantWithApps,
  IpAllowlistConfig,
  PortalSession,
} from '../lib/api/modules'
import { Badge, Button, Card, Modal } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

const KYC_COLORS: Record<string, 'amber' | 'blue' | 'emerald' | 'red'> = {
  Pending: 'amber',
  UnderReview: 'blue',
  Approved: 'emerald',
  Rejected: 'red',
}

function SessionsModal({
  merchantId,
  onClose,
}: {
  merchantId: string
  onClose: () => void
}) {
  const { data: sessions = [], isLoading } = useQuery<PortalSession[]>({
    queryKey: ['admin-sessions', merchantId],
    queryFn: () => adminConfigApi.getMerchantSessions(merchantId),
  })

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))

  return (
    <Modal open title={`Sessions - ${merchantId}`} onClose={onClose}>
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Aucune session enregistree</p>
              <p className="text-xs text-slate-400 mt-1">Les connexions apparaitront ici</p>
            </div>
          </div>
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
                    <td className="py-1.5 pr-3 text-slate-700 truncate max-w-[160px]">{s.email ?? '-'}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-600">{s.ipAddress ?? '-'}</td>
                    <td className="py-1.5 pr-3">
                      {s.success ? (
                        <span className="text-emerald-600 font-medium">OK</span>
                      ) : (
                        <span className="text-red-600 font-medium">{s.failureReason ?? 'FAIL'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  )
}

function IpAllowlistModal({
  merchantId,
  onClose,
}: {
  merchantId: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  const { isLoading } = useQuery<IpAllowlistConfig>({
    queryKey: ['admin-ip-allowlist', merchantId],
    queryFn: () => adminConfigApi.getIpAllowlist(merchantId),
    onSuccess: (data: IpAllowlistConfig) => {
      if (!loaded) {
        setDraft((data.allowedIps ?? []).join('\n'))
        setLoaded(true)
      }
    },
  } as any)

  const save = useMutation({
    mutationFn: (ips: string[]) => adminConfigApi.setIpAllowlist(merchantId, ips),
    onSuccess: (data: IpAllowlistConfig) => {
      const count = data.allowedIps?.length ?? 0
      toast.success(
        count === 0
          ? 'Restriction IP supprimee - toutes les IPs sont autorisees'
          : `${count} regle(s) IP sauvegardee(s)`,
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
    <Modal open title={`IP Allowlist - ${merchantId}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Entrez une adresse IP ou plage CIDR par ligne (ex.{' '}
          <code className="text-xs">41.202.0.0/16</code> ou{' '}
          <code className="text-xs">10.0.0.1</code>). Laissez vide pour supprimer toute restriction.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
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
            {save.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleClear}
            disabled={save.isPending}
            title="Supprimer toutes les restrictions IP"
          >
            Tout autoriser
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MerchantDetailsModal({
  merchantId,
  merchantName,
  onClose,
}: {
  merchantId: string
  merchantName: string
  onClose: () => void
}) {
  const { data: merchants = [], isLoading } = useQuery<AdminMerchantWithApps[]>({
    queryKey: ['admin-merchant-apps'],
    queryFn: adminConfigApi.listMerchantApps,
  })

  const qc = useQueryClient()

  const revoke = useMutation({
    mutationFn: (appId: string) => adminConfigApi.adminRevokeApp(merchantId, appId),
    onSuccess: () => {
      toast.success('Cle revoquee')
      qc.invalidateQueries({ queryKey: ['admin-merchant-apps'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const merchant = merchants.find((m) => m.id === merchantId)

  return (
    <Modal open title={`Details - ${merchantName}`} onClose={onClose}>
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : !merchant ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Marchand non trouve</p>
              <p className="text-xs text-slate-400 mt-1">Impossible de charger les applications</p>
            </div>
          </div>
        ) : merchant.apps.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Aucune application</p>
              <p className="text-xs text-slate-400 mt-1">Aucune cle API creee pour ce marchand</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {merchant.apps.map((app: AdminMerchantApp) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{app.name}</p>
                  {app.description && (
                    <p className="text-xs text-slate-500 truncate">{app.description}</p>
                  )}
                </div>
                <Badge color={app.mode === 'live' ? 'emerald' : 'amber'}>{app.mode.toUpperCase()}</Badge>
                <Badge color={app.keyStatus === 'Active' ? 'emerald' : 'red'}>{app.keyStatus}</Badge>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Revoquer "${app.name}" ? Action irreversible.`)) {
                      revoke.mutate(app.id)
                    }
                  }}
                >
                  Revoquer
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  )
}

function MerchantCard({
  merchant,
  onShowDetails,
  onShowIp,
  onShowSessions,
}: {
  merchant: AdminMerchant
  onShowDetails: () => void
  onShowIp: () => void
  onShowSessions: () => void
}) {
  const kycColor = KYC_COLORS[merchant.kycStatus] ?? 'amber'
  const created = new Date(merchant.createdAt).toLocaleDateString('fr-FR')

  return (
    <Card className="group relative overflow-hidden border border-slate-200/80 bg-white/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-100/70 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-sky-100/70 blur-2xl" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">{merchant.name}</h3>
            {merchant.email && <p className="mt-0.5 truncate text-xs text-slate-500">{merchant.email}</p>}
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            #{merchant.id.slice(0, 8)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge color={kycColor} className="text-xs">
            KYC {merchant.kycStatus}
          </Badge>
          <Badge color={merchant.isActive ? 'emerald' : 'red'} className="text-xs">
            {merchant.isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs">
          <div>
            <p className="text-slate-400">Applications</p>
            <p className="font-semibold text-slate-700">{merchant.appCount}</p>
          </div>
          <div>
            <p className="text-slate-400">Creation</p>
            <p className="font-semibold text-slate-700">{created}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onShowDetails} className="flex-1 text-xs">
            Détails
          </Button>
          <Button variant="secondary" size="sm" onClick={onShowIp} className="px-3 text-xs" title="IP Allowlist">
            IP
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onShowSessions}
            className="px-3 text-xs"
            title="Sessions"
          >
            Logs
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function MerchantsList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [kycStatus, setKycStatus] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean | undefined>()
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [selectedMerchantName, setSelectedMerchantName] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showIpModal, setShowIpModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-merchants-paginated', page, pageSize, search, kycStatus, isActive, sortBy, sortDir],
    queryFn: () =>
      adminConfigApi.listMerchantsPaginated(
        page,
        pageSize,
        search || undefined,
        kycStatus || undefined,
        isActive,
        sortBy,
        sortDir,
      ),
  })

  const merchants = data?.merchants ?? []
  const pagination = data?.pagination
  const totalMerchants = pagination?.total ?? merchants.length
  const activeCount = merchants.filter((m) => m.isActive).length
  const inactiveCount = merchants.filter((m) => !m.isActive).length
  const pendingKycCount = merchants.filter((m) => m.kycStatus === 'Pending').length

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortDir('asc')
    }
    setPage(1)
  }

  const renderSortArrow = (column: string) => {
    if (sortBy !== column) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <RequirePermission permission="merchants.view_all">
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600">Administration</p>
          <h1 className="text-3xl font-bold text-slate-900">Marchands</h1>
          <p className="text-sm text-slate-500">
            {totalMerchants.toLocaleString()} marchands au total — filtrage et supervision en temps réel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Page actuelle</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{merchants.length}</p>
            <p className="mt-0.5 text-xs text-blue-400">marchands affichés</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Actifs</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{activeCount}</p>
            <p className="mt-0.5 text-xs text-emerald-500">sur cette page</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">KYC Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{pendingKycCount}</p>
            <p className="mt-0.5 text-xs text-amber-500">en attente de validation</p>
          </div>
        </div>

        <Card className="border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Filtres</h2>
            {(search || kycStatus || isActive !== undefined) && (
              <button
                onClick={() => {
                  setSearch('')
                  setKycStatus('')
                  setIsActive(undefined)
                  setPage(1)
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rechercher</label>
              <input
                type="search"
                placeholder="Nom ou email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Statut KYC</label>
              <select
                value={kycStatus}
                onChange={(e) => {
                  setKycStatus(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Tous</option>
                <option value="Pending">Pending</option>
                <option value="UnderReview">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Statut</label>
              <select
                value={isActive === undefined ? 'all' : isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'all') setIsActive(undefined)
                  if (value === 'active') setIsActive(true)
                  if (value === 'inactive') setIsActive(false)
                  setPage(1)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="all">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Par page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-700">Tri:</span>
            <Button variant="secondary" size="sm" onClick={() => handleSort('name')}>
              Nom{renderSortArrow('name')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleSort('created')}>
              Creation{renderSortArrow('created')}
            </Button>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              Inactifs: {inactiveCount}
            </span>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">Chargement des marchands</p>
              <p className="text-xs text-slate-400 mt-1">Veuillez patienter...</p>
            </div>
          </div>
        ) : merchants.length === 0 ? (
          <Card className="p-10">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-base font-medium text-slate-700">Aucun marchand trouve</p>
                <p className="text-sm text-slate-500 mt-1">Essayez d'ajuster les filtres ou la recherche.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {merchants.map((merchant: AdminMerchant) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                onShowDetails={() => {
                  setSelectedMerchantId(merchant.id)
                  setSelectedMerchantName(merchant.name)
                  setShowDetailsModal(true)
                }}
                onShowIp={() => {
                  setSelectedMerchantId(merchant.id)
                  setSelectedMerchantName(merchant.name)
                  setShowIpModal(true)
                }}
                onShowSessions={() => {
                  setSelectedMerchantId(merchant.id)
                  setSelectedMerchantName(merchant.name)
                  setShowSessionsModal(true)
                }}
              />
            ))}
          </div>
        )}

        {pagination && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-3">
            <p className="text-sm text-slate-600">
              Page {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page === 1 || isFetching}
                onClick={() => setPage(page - 1)}
              >
                {'<- Precedent'}
              </Button>
              <Button
                variant="secondary"
                disabled={page >= pagination.totalPages || isFetching}
                onClick={() => setPage(page + 1)}
              >
                {'Suivant ->'}
              </Button>
            </div>
          </div>
        )}

        {showDetailsModal && selectedMerchantId && (
          <MerchantDetailsModal
            merchantId={selectedMerchantId}
            merchantName={selectedMerchantName}
            onClose={() => setShowDetailsModal(false)}
          />
        )}

        {showIpModal && selectedMerchantId && (
          <IpAllowlistModal merchantId={selectedMerchantId} onClose={() => setShowIpModal(false)} />
        )}

        {showSessionsModal && selectedMerchantId && (
          <SessionsModal merchantId={selectedMerchantId} onClose={() => setShowSessionsModal(false)} />
        )}
      </div>
    </RequirePermission>
  )
}
