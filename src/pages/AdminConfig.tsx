import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import { adminConfigApi, apiKeyActivityApi, feeConfigApi, merchantGroupsApi } from '../lib/api/modules'
import type { ApiKeyActivityItem, DataRetentionConfig, FeeConfigItem, FeeConditions, MerchantGroupItem, UpsertFeeConfigPayload } from '../lib/api/modules'
import { authApi } from '../lib/api/auth'
import {
  normalizeEmailList,
} from '../lib/security/portalConfig'

const splitPerLine = (emails: string[]) => emails.join('\n')

export default function AdminConfig() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config', 'merchant-portal-blocked-emails'],
    queryFn: adminConfigApi.getMerchantPortalBlockedEmails,
  })

  const [customInput, setCustomInput] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [resetTargetAdminId, setResetTargetAdminId] = useState('')
  const [resetActorTotpCode, setResetActorTotpCode] = useState('')
  const [resetReason, setResetReason] = useState('')

  // ── API key activity dashboard state ─────────────────────────────────────
  const [apiActivityPage, setApiActivityPage] = useState(1)
  const [apiActivityAction, setApiActivityAction] = useState('')
  const [apiActivityStatus, setApiActivityStatus] = useState('')
  const [apiActivityMerchantId, setApiActivityMerchantId] = useState('')
  const [apiActivityFromDate, setApiActivityFromDate] = useState('')
  const [apiActivityToDate, setApiActivityToDate] = useState('')

  const apiActivityFromIso = apiActivityFromDate ? `${apiActivityFromDate}T00:00:00.000Z` : undefined
  const apiActivityToIso = apiActivityToDate ? `${apiActivityToDate}T23:59:59.999Z` : undefined

  const { data: apiActivityData, isLoading: apiActivityLoading } = useQuery({
    queryKey: ['admin-api-key-activity', apiActivityPage, apiActivityAction, apiActivityStatus, apiActivityMerchantId, apiActivityFromIso, apiActivityToIso],
    queryFn: () => apiKeyActivityApi.list({
      page: apiActivityPage,
      pageSize: 20,
      merchantId: apiActivityMerchantId || undefined,
      action: apiActivityAction || undefined,
      status: apiActivityStatus || undefined,
      from: apiActivityFromIso,
      to: apiActivityToIso,
    }),
    staleTime: 15_000,
  })
  const apiActivityItems: ApiKeyActivityItem[] = apiActivityData?.items ?? []
  const apiActivityTotal = apiActivityData?.total ?? 0
  const apiActivityTotalPages = Math.max(1, Math.ceil(apiActivityTotal / 20))

  // ── Fee configurations state ──────────────────────────────────────────────
  type FeeScope = 'merchant' | 'group' | 'global'
  type FeeTab = 'global' | 'group' | 'merchant'

  const EMPTY_FEE_FORM: UpsertFeeConfigPayload = {
    scope: 'merchant', merchantId: undefined, groupId: undefined,
    provider: 'MTN', percentageFee: 0.02, fixedFee: 0, minFee: 0, maxFee: 0,
    isActive: true, priority: 0, conditions: undefined,
  }
  const PROVIDERS = ['MTN', 'ORANGE', 'WAVE', 'STRIPE', '*']

  const [feeTab, setFeeTab] = useState<FeeTab>('merchant')
  const [feePage, setFeePage] = useState(1)
  const [feeFilterActive, setFeeFilterActive] = useState<boolean | undefined>(undefined)
  const [feeEditingId, setFeeEditingId] = useState<string | null>(null)
  const [feeForm, setFeeForm] = useState<UpsertFeeConfigPayload>(EMPTY_FEE_FORM)
  const [showFeeForm, setShowFeeForm] = useState(false)
  const [showConditions, setShowConditions] = useState(false)

  // Group management state
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', description: '', isActive: true })
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [memberMerchantId, setMemberMerchantId] = useState('')

  const activeFeeScope: FeeScope = feeTab === 'global' ? 'global' : feeTab === 'group' ? 'group' : 'merchant'

  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['admin-fees', activeFeeScope, feePage, feeFilterActive],
    queryFn: () => feeConfigApi.list({ scope: activeFeeScope, page: feePage, pageSize: 25, isActive: feeFilterActive }),
    staleTime: 30_000,
  })
  const feeItems: FeeConfigItem[] = feesData?.items ?? []
  const feeTotal = feesData?.total ?? 0
  const feeTotalPages = Math.ceil(feeTotal / 25)

  const { data: merchantsData } = useQuery({
    queryKey: ['admin-merchants-lite'],
    queryFn: () => adminConfigApi.listMerchantsPaginated(1, 200),
    staleTime: 5 * 60 * 1000,
  })
  const feeMerchants: { id: string; name: string }[] = merchantsData?.merchants ?? []

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['admin-merchant-groups'],
    queryFn: merchantGroupsApi.list,
    staleTime: 30_000,
  })
  const merchantGroups: MerchantGroupItem[] = groupsData?.groups ?? []

  const { data: groupMembersData } = useQuery({
    queryKey: ['admin-group-members', expandedGroupId],
    queryFn: () => merchantGroupsApi.listMembers(expandedGroupId!),
    enabled: expandedGroupId != null,
    staleTime: 30_000,
  })
  const groupMembers = groupMembersData?.members ?? []

  function openFeeCreate() {
    setFeeEditingId(null)
    setFeeForm({ ...EMPTY_FEE_FORM, scope: activeFeeScope })
    setShowConditions(false)
    setShowFeeForm(true)
  }
  function openFeeEdit(item: FeeConfigItem) {
    setFeeEditingId(item.id)
    setFeeForm({
      scope: item.scope,
      merchantId: item.merchantId,
      groupId: item.groupId,
      provider: item.provider,
      percentageFee: item.percentageFee,
      fixedFee: item.fixedFee,
      minFee: item.minFee,
      maxFee: item.maxFee,
      isActive: item.isActive,
      priority: item.priority,
      conditions: item.conditions,
    })
    setShowConditions(!!(item.conditions && Object.values(item.conditions).some(v => v != null)))
    setShowFeeForm(true)
  }
  function closeFeeForm() { setShowFeeForm(false); setFeeEditingId(null); setFeeForm(EMPTY_FEE_FORM); setShowConditions(false) }
  function setFeeField<K extends keyof UpsertFeeConfigPayload>(key: K, value: UpsertFeeConfigPayload[K]) {
    setFeeForm(prev => ({ ...prev, [key]: value }))
  }
  function setCondField<K extends keyof FeeConditions>(key: K, value: FeeConditions[K]) {
    setFeeForm(prev => ({ ...prev, conditions: { ...prev.conditions, [key]: value } }))
  }

  const saveFeeMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...feeForm, conditions: showConditions ? feeForm.conditions : undefined }
      if (feeEditingId) await feeConfigApi.update(feeEditingId, payload)
      else await feeConfigApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fees'] })
      toast.success(feeEditingId ? 'Configuration mise à jour.' : 'Configuration créée.')
      closeFeeForm()
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la sauvegarde.'),
  })

  const deleteFeeMutation = useMutation({
    mutationFn: (id: string) => feeConfigApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fees'] })
      toast.success('Configuration supprimée.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la suppression.'),
  })

  function handleFeeDelete(item: FeeConfigItem) {
    const label = item.scope === 'global' ? 'règle globale' : item.scope === 'group' ? `groupe / ${item.provider}` : `${item.merchantName} / ${item.provider}`
    if (!confirm(`Supprimer la configuration ${label} ?`)) return
    deleteFeeMutation.mutate(item.id)
  }

  // Group CRUD mutations
  const saveGroupMutation = useMutation({
    mutationFn: async () => {
      if (groupEditingId) await merchantGroupsApi.update(groupEditingId, { name: groupForm.name, description: groupForm.description || undefined, isActive: groupForm.isActive })
      else await merchantGroupsApi.create({ name: groupForm.name, description: groupForm.description || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-groups'] })
      toast.success(groupEditingId ? 'Groupe mis à jour.' : 'Groupe créé.')
      setShowGroupForm(false); setGroupEditingId(null); setGroupForm({ name: '', description: '', isActive: true })
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur groupe.'),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => merchantGroupsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-merchant-groups'] }),
    onError: (err: Error) => toast.error(err.message || 'Erreur suppression groupe.'),
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, merchantId }: { groupId: string; merchantId: string }) =>
      merchantGroupsApi.addMember(groupId, merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-groups'] })
      setMemberMerchantId('')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur ajout membre.'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, merchantId }: { groupId: string; merchantId: string }) =>
      merchantGroupsApi.removeMember(groupId, merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-groups'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur suppression membre.'),
  })

  function isSaveEnabled() {
    if (activeFeeScope === 'merchant' && !feeForm.merchantId) return false
    if (activeFeeScope === 'group' && !feeForm.groupId) return false
    return !saveFeeMutation.isPending
  }

  // ── Data-retention state ─────────────────────────────────────────────────
  const { data: drData, isLoading: drLoading } = useQuery({
    queryKey: ['admin-config', 'data-retention'],
    queryFn: adminConfigApi.getDataRetentionConfig,
  })

  const [drDraft, setDrDraft] = useState<DataRetentionConfig | null>(null)
  const drCurrent = drDraft ?? drData?.config ?? null

  const setDrField = (field: keyof DataRetentionConfig, value: number) =>
    setDrDraft(prev => ({ ...(prev ?? drData!.config), [field]: value }))

  const saveDrMutation = useMutation({
    mutationFn: (cfg: DataRetentionConfig) => adminConfigApi.saveDataRetentionConfig(cfg),
    onSuccess: (res) => {
      queryClient.setQueryData(['admin-config', 'data-retention'], res)
      setDrDraft(null)
      toast.success('Politique de rétention sauvegardée.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de sauvegarder la politique de rétention.')
    },
  })

  const { data: totpStatus } = useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: authApi.admin2faStatus,
  })

  const defaultBlocked = data?.defaultBlockedEmails ?? ['admin@stpay.local']
  const envBlocked = data?.environmentBlockedEmails ?? []
  const effectiveBlocked = data?.effectiveBlockedEmails ?? defaultBlocked

  const saveMutation = useMutation({
    mutationFn: (emails: string[]) => adminConfigApi.saveMerchantPortalBlockedEmails(emails),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin-config', 'merchant-portal-blocked-emails'], saved)
      setCustomInput(splitPerLine(saved.customBlockedEmails))
      toast.success(`Configuration sauvegardée (${saved.effectiveBlockedEmails.length} email(s) bloqué(s))`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de sauvegarder la configuration')
    },
  })

  const setup2faMutation = useMutation({
    mutationFn: authApi.adminSetup2fa,
    onSuccess: ({ secret, uri }) => {
      setTotpSecret(secret)
      setTotpUri(uri)
      toast.success('Secret 2FA généré. Scannez puis confirmez avec un code TOTP.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de générer le setup 2FA')
    },
  })

  const confirm2faMutation = useMutation({
    mutationFn: () => authApi.adminConfirm2fa(totpSecret, totpCode),
    onSuccess: (res) => {
      toast.success('2FA activé avec succès.')
      setTotpCode('')
      setRecoveryCodes(res.recoveryCodes ?? [])
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Code TOTP invalide')
    },
  })

  const reset2faMutation = useMutation({
    mutationFn: () => authApi.adminReset2fa({
      targetAdminId: resetTargetAdminId,
      actorTotpCode: resetActorTotpCode,
      reason: resetReason,
    }),
    onSuccess: () => {
      toast.success('2FA réinitialisé avec succès.')
      setResetActorTotpCode('')
      setResetReason('')
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de réinitialiser le 2FA')
    },
  })

  useEffect(() => {
    if (data) {
      setCustomInput(splitPerLine(data.customBlockedEmails))
    }
  }, [data])

  const effectivePreview = useMemo(() => {
    const customFromDraft = normalizeEmailList(customInput)
    return Array.from(new Set([...defaultBlocked, ...envBlocked, ...customFromDraft]))
  }, [customInput, defaultBlocked, envBlocked])

  const saveConfig = () => {
    const cleaned = normalizeEmailList(customInput)
    saveMutation.mutate(cleaned)
  }

  const resetCustom = () => {
    saveMutation.mutate([])
  }

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copié.`)
    } catch {
      toast.error(`Impossible de copier ${label.toLowerCase()}.`)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Configuration Admin</h1>
        <p className="text-sm text-muted">Chargement de la configuration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuration Admin</h1>
        <p className="text-sm text-muted">
          Gérez les comptes qui ne peuvent pas se connecter au portail marchand.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Bloquage par défaut</h2>
        <p className="mt-1 text-xs text-muted">
          Ces comptes restent toujours bloqués pour le portail marchand.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {defaultBlocked.map((email) => (
            <Badge key={email} color="red">{email}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Bloquage via environnement</h2>
        <p className="mt-1 text-xs text-muted">
          Source: VITE_BLOCKED_MERCHANT_PORTAL_EMAILS
        </p>
        {envBlocked.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {envBlocked.map((email) => (
              <Badge key={email} color="amber">{email}</Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Aucun email défini côté environnement.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Liste personnalisée</h2>
        <p className="mt-1 text-xs text-muted">
          Un email par ligne. Valeurs acceptées aussi avec virgules ou point-virgules. Cette liste est persistée côté backend.
        </p>

        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          rows={8}
          placeholder="owner@stpay.local\nsecurity@stpay.local"
          className="mt-3 w-full rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2
                     bg-[var(--bg-card)] text-[13px] text-[var(--text-1)]
                     placeholder:text-[var(--text-4)] outline-none transition-all duration-100
                     focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]"
        />

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={saveConfig} disabled={saveMutation.isPending}>Enregistrer</Button>
          <Button variant="secondary" onClick={resetCustom} disabled={saveMutation.isPending}>Réinitialiser</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Aperçu des comptes bloqués</h2>
        <p className="mt-1 text-xs text-muted">Liste effectivement utilisée lors du login marchand.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(effectivePreview.length > 0 ? effectivePreview : effectiveBlocked).map((email) => (
            <Badge key={email} color="blue">{email}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">2FA (TOTP) — Super Admin</h2>
        <p className="mt-1 text-xs text-muted">
          Activez l'authentification à deux facteurs avec une application TOTP (Google Authenticator, Authy...).
        </p>

        <div className="mt-3 rounded-[var(--r-sm)] border border-[var(--border-med)] bg-white p-3 text-[12px] text-[var(--text-2)]">
          <p><span className="font-semibold">Statut:</span> {totpStatus?.totpEnabled ? 'Activé' : 'Non activé'}</p>
          <p><span className="font-semibold">Codes recovery restants:</span> {totpStatus?.recoveryCodesRemaining ?? 0}</p>
          {typeof totpStatus?.daysRemaining === 'number' && !totpStatus?.totpEnabled && (
            <p><span className="font-semibold">Jours restants avant obligation:</span> {totpStatus.daysRemaining}</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => setup2faMutation.mutate()} disabled={setup2faMutation.isPending}>
            Générer un setup 2FA
          </Button>
          {totpSecret && (
            <Button variant="secondary" onClick={() => copyToClipboard(totpSecret, 'Secret')}>Copier le secret</Button>
          )}
          {totpUri && (
            <Button variant="secondary" onClick={() => copyToClipboard(totpUri, 'URI otpauth')}>Copier l'URI</Button>
          )}
        </div>

        {totpSecret && (
          <div className="mt-4 space-y-3 rounded-[var(--r-sm)] border border-[var(--border-med)] bg-white p-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-2)]">Secret TOTP</p>
              <p className="mt-1 break-all rounded bg-slate-50 px-2 py-1 font-mono text-[12px] text-slate-700">{totpSecret}</p>
            </div>

            {totpUri && (
              <div>
                <p className="text-[12px] font-semibold text-[var(--text-2)]">URI otpauth</p>
                <p className="mt-1 break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700">{totpUri}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="Code 6 chiffres"
                className="w-44 rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2 text-[13px]"
              />
              <Button
                onClick={() => confirm2faMutation.mutate()}
                disabled={!totpSecret || totpCode.length !== 6 || confirm2faMutation.isPending}
              >
                Confirmer activation
              </Button>
            </div>

            {recoveryCodes.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-[var(--text-2)]">Recovery codes (à sauvegarder immédiatement)</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code) => (
                    <p key={code} className="rounded bg-slate-50 px-2 py-1 font-mono text-[12px] text-slate-700">{code}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Réinitialisation 2FA (secours)</h2>
        <p className="mt-1 text-xs text-muted">
          Réinitialisation sécurisée avec preuve TOTP de l'admin effectuant l'action et justification (auditée).
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            value={resetTargetAdminId}
            onChange={(e) => setResetTargetAdminId(e.target.value)}
            placeholder="Target Admin ID (UUID)"
            className="rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2 text-[13px]"
          />
          <input
            value={resetActorTotpCode}
            onChange={(e) => setResetActorTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Votre code TOTP (6)"
            className="rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2 text-[13px]"
          />
          <input
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            placeholder="Raison (min 10 caractères)"
            className="rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2 text-[13px]"
          />
        </div>
        <div className="mt-3">
          <Button
            onClick={() => reset2faMutation.mutate()}
            disabled={!resetTargetAdminId || resetActorTotpCode.length !== 6 || resetReason.trim().length < 10 || reset2faMutation.isPending}
          >
            Réinitialiser le 2FA
          </Button>
        </div>
      </Card>

      {/* ── Data-retention policy ─────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-900">Politique de rétention des données</h2>
          {drData?.fromDb && (
            <Badge color="blue">Configuré en DB</Badge>
          )}
        </div>
        <p className="text-xs text-muted mb-4">
          Fenêtres de purge automatique (job Hangfire, 1er du mois à 02:00 UTC).
          La valeur DB écrase <code>appsettings.json</code>. AuditLogs et données financières sont toujours exclus.
        </p>

        {drLoading || !drCurrent ? (
          <p className="text-xs text-muted">Chargement…</p>
        ) : (
          <div className="space-y-0">
            <DrField label="WebhookEvents" description="Événements livrés / échoués / abandonnés" value={drCurrent.webhookEventsDays} min={7} max={3650} onChange={(v) => setDrField('webhookEventsDays', v)} />
            <DrField label="Notifications" description="Notifications envoyées / échouées" value={drCurrent.notificationsDays} min={7} max={3650} onChange={(v) => setDrField('notificationsDays', v)} />
            <DrField label="DxAnalyticsEvents" description="Événements analytics DX" value={drCurrent.dxAnalyticsEventsDays} min={30} max={3650} onChange={(v) => setDrField('dxAnalyticsEventsDays', v)} />
            <DrField label="Sessions portail marchand" description="Historique de connexion" value={drCurrent.sessionsDays} min={7} max={3650} onChange={(v) => setDrField('sessionsDays', v)} />
            <DrField label="TransactionStatusHistories" description="Uniquement pour les transactions terminées" value={drCurrent.transactionStatusHistoryDays} min={30} max={3650} onChange={(v) => setDrField('transactionStatusHistoryDays', v)} />
            <DrField label="FraudChecks" description="Vérifications antifraude des transactions terminées" value={drCurrent.fraudChecksDays} min={30} max={3650} onChange={(v) => setDrField('fraudChecksDays', v)} />
            <DrField label="ReconciliationJobs" description="Jobs de réconciliation terminés / échoués" value={drCurrent.reconciliationJobsDays} min={7} max={3650} onChange={(v) => setDrField('reconciliationJobsDays', v)} />
            <DrField label="Taille de lot (BatchSize)" description="Lignes supprimées par itération (anti-lock)" value={drCurrent.batchSize} unit="lignes" min={100} max={10000} onChange={(v) => setDrField('batchSize', v)} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={() => drCurrent && saveDrMutation.mutate(drCurrent)}
            disabled={!drCurrent || !drDraft || saveDrMutation.isPending}
          >
            Enregistrer
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDrDraft(null)}
            disabled={!drDraft}
          >
            Annuler
          </Button>
        </div>
      </Card>

      {/* ── Journal API keys (super admin) ───────────────────────────────── */}
      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Journal des activités API Keys</h2>
          <p className="mt-1 text-xs text-muted">
            Traçabilité des actions API key (auth, génération, rotation, révocation). Purge automatique après <strong>3 jours</strong>.
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select
            className="h-8 w-56 text-[12px]"
            value={apiActivityMerchantId}
            onChange={e => { setApiActivityMerchantId(e.target.value); setApiActivityPage(1) }}
          >
            <option value="">Tous les marchands</option>
            {feeMerchants.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>

          <Select
            className="h-8 w-48 text-[12px]"
            value={apiActivityAction}
            onChange={e => { setApiActivityAction(e.target.value); setApiActivityPage(1) }}
          >
            <option value="">Toutes les actions</option>
            <option value="AUTHENTICATE">AUTHENTICATE</option>
            <option value="GENERATE">GENERATE</option>
            <option value="REVOKE">REVOKE</option>
            <option value="ROTATE">ROTATE</option>
            <option value="APP_CREATE">APP_CREATE</option>
            <option value="APP_REVOKE">APP_REVOKE</option>
            <option value="APP_ROTATE">APP_ROTATE</option>
          </Select>

          <Select
            className="h-8 w-40 text-[12px]"
            value={apiActivityStatus}
            onChange={e => { setApiActivityStatus(e.target.value); setApiActivityPage(1) }}
          >
            <option value="">Tous les statuts</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="BLOCKED">BLOCKED</option>
          </Select>

          <Input
            type="date"
            className="h-8 w-40 text-[12px]"
            value={apiActivityFromDate}
            onChange={e => { setApiActivityFromDate(e.target.value); setApiActivityPage(1) }}
            title="Date de début"
          />

          <Input
            type="date"
            className="h-8 w-40 text-[12px]"
            value={apiActivityToDate}
            onChange={e => { setApiActivityToDate(e.target.value); setApiActivityPage(1) }}
            title="Date de fin"
          />

          <Button
            variant="secondary"
            className="h-8 text-[11px]"
            onClick={() => {
              setApiActivityMerchantId('')
              setApiActivityAction('')
              setApiActivityStatus('')
              setApiActivityFromDate('')
              setApiActivityToDate('')
              setApiActivityPage(1)
            }}
          >
            Réinitialiser filtres
          </Button>

          <span className="text-[11px] text-[var(--text-4)]">{apiActivityTotal} événement(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                {['Date', 'Marchand', 'Application', 'Action', 'Statut', 'Raison', 'IP', 'Endpoint'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiActivityLoading ? (
                <tr><td className="px-3 py-4 text-[12px] text-[var(--text-3)]" colSpan={8}>Chargement…</td></tr>
              ) : apiActivityItems.length === 0 ? (
                <tr><td className="px-3 py-4 text-[12px] text-[var(--text-3)]" colSpan={8}>Aucune activité API key trouvée.</td></tr>
              ) : apiActivityItems.map(item => (
                <tr key={item.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">{new Date(item.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2 text-[12px] text-[var(--text-1)]">{item.merchantName || '—'}</td>
                  <td className="px-3 py-2 text-[12px] text-[var(--text-2)]">{item.applicationName || '—'}</td>
                  <td className="px-3 py-2"><Badge color="blue">{item.action}</Badge></td>
                  <td className="px-3 py-2">
                    <Badge color={item.status === 'SUCCESS' ? 'green' : item.status === 'FAILED' ? 'red' : 'orange'} dot>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">{item.reason || '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">{item.ipAddress || '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">{item.path || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {apiActivityTotalPages > 1 && (
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" disabled={apiActivityPage <= 1} onClick={() => setApiActivityPage(p => Math.max(1, p - 1))}>Précédent</Button>
            <span className="text-[12px] text-[var(--text-3)]">Page {apiActivityPage} / {apiActivityTotalPages}</span>
            <Button variant="ghost" disabled={apiActivityPage >= apiActivityTotalPages} onClick={() => setApiActivityPage(p => Math.min(apiActivityTotalPages, p + 1))}>Suivant</Button>
          </div>
        )}
      </Card>

      {/* ── Commissions de settlement ──────────────────────────────────────── */}
      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Commissions de settlement</h2>
          <p className="mt-1 text-xs text-muted">
            Taux prélevés par ST Pay lors des settlements. Priorité : marchand &gt; groupe &gt; global. Par défaut <strong>2 %</strong>.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-soft)] mb-4">
          {(['merchant','group','global'] as FeeTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setFeeTab(t); setFeePage(1); closeFeeForm() }}
              className={`px-4 py-1.5 text-[12px] font-medium border-b-2 transition-colors ${
                feeTab === t
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              {t === 'merchant' ? 'Par marchand' : t === 'group' ? 'Par groupe' : 'Global'}
            </button>
          ))}
        </div>

        {/* ── GROUP MANAGEMENT (shown only on "group" tab, above the fee rules) ── */}
        {feeTab === 'group' && (
          <div className="mb-5 rounded-[var(--r-sm)] border border-[var(--border-soft)] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-[var(--text-1)]">Groupes de marchands</p>
              <Button className="h-7 text-[11px]" onClick={() => { setShowGroupForm(true); setGroupEditingId(null); setGroupForm({ name: '', description: '', isActive: true }) }}>
                + Nouveau groupe
              </Button>
            </div>

            {showGroupForm && (
              <div className="mb-3 rounded border border-[var(--border-med)] bg-[var(--bg-subtle)] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[var(--text-3)]">Nom du groupe</label>
                    <Input className="h-8 text-[12px]" value={groupForm.name} onChange={e => setGroupForm(g => ({ ...g, name: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[var(--text-3)]">Description (optionnel)</label>
                    <Input className="h-8 text-[12px]" value={groupForm.description} onChange={e => setGroupForm(g => ({ ...g, description: e.target.value }))} />
                  </div>
                </div>
                {groupEditingId && (
                  <div className="mt-2 flex items-center gap-2">
                    <input id="groupIsActive" type="checkbox" checked={groupForm.isActive} onChange={e => setGroupForm(g => ({ ...g, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                    <label htmlFor="groupIsActive" className="text-[12px] text-[var(--text-2)]">Actif</label>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Button className="h-7 text-[11px]" disabled={!groupForm.name.trim() || saveGroupMutation.isPending} onClick={() => saveGroupMutation.mutate()}>
                    {saveGroupMutation.isPending ? '…' : groupEditingId ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button className="h-7 text-[11px]" variant="secondary" onClick={() => setShowGroupForm(false)}>Annuler</Button>
                </div>
              </div>
            )}

            {groupsLoading ? (
              <p className="text-[12px] text-[var(--text-3)]">Chargement…</p>
            ) : merchantGroups.length === 0 ? (
              <p className="text-[12px] text-[var(--text-3)]">Aucun groupe. Créez-en un pour commencer.</p>
            ) : (
              <div className="space-y-1">
                {merchantGroups.map(g => (
                  <div key={g.id} className="rounded border border-[var(--border-soft)]">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="text-[12px] font-medium text-[var(--text-1)]">{g.name}</span>
                        {g.description && <span className="ml-2 text-[11px] text-[var(--text-4)]">{g.description}</span>}
                        <span className="ml-2 text-[11px] text-[var(--text-4)]">· {g.memberCount} marchand(s)</span>
                        <Badge className="ml-2" color={g.isActive ? 'green' : 'gray'} dot>{g.isActive ? 'Actif' : 'Inactif'}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button className="h-6 text-[10px]" variant="ghost"
                          onClick={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)}>
                          {expandedGroupId === g.id ? 'Masquer' : 'Membres'}
                        </Button>
                        <Button className="h-6 text-[10px]" variant="ghost"
                          onClick={() => { setGroupEditingId(g.id); setGroupForm({ name: g.name, description: g.description ?? '', isActive: g.isActive }); setShowGroupForm(true) }}>
                          Modifier
                        </Button>
                        <Button className="h-6 text-[10px]" variant="ghost" style={{ color: 'var(--red)' }}
                          onClick={() => confirm(`Supprimer le groupe "${g.name}" ?`) && deleteGroupMutation.mutate(g.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {expandedGroupId === g.id && (
                      <div className="border-t border-[var(--border-soft)] px-3 pb-3 pt-2 bg-[var(--bg-subtle)]">
                        <p className="text-[11px] font-semibold text-[var(--text-3)] mb-2">Membres du groupe</p>
                        <div className="flex gap-2 mb-2">
                          <Select className="h-8 text-[11px] flex-1" value={memberMerchantId} onChange={e => setMemberMerchantId(e.target.value)}>
                            <option value="">Ajouter un marchand…</option>
                            {feeMerchants
                              .filter(m => !groupMembers.some(gm => gm.merchantId === m.id))
                              .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </Select>
                          <Button className="h-8 text-[11px]" disabled={!memberMerchantId || addMemberMutation.isPending}
                            onClick={() => addMemberMutation.mutate({ groupId: g.id, merchantId: memberMerchantId })}>
                            Ajouter
                          </Button>
                        </div>
                        {groupMembers.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-4)]">Aucun membre.</p>
                        ) : (
                          <div className="space-y-1">
                            {groupMembers.map(m => (
                              <div key={m.merchantId} className="flex items-center justify-between rounded bg-white px-2 py-1 text-[11px]">
                                <span>{m.merchantName}</span>
                                <button
                                  className="text-[var(--red)] hover:underline"
                                  onClick={() => removeMemberMutation.mutate({ groupId: g.id, merchantId: m.merchantId })}>
                                  Retirer
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Fee rules for this tab ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Select
              className="h-8 w-44 text-[12px]"
              value={feeFilterActive === undefined ? '' : feeFilterActive ? 'true' : 'false'}
              onChange={e => {
                const v = e.target.value
                setFeeFilterActive(v === '' ? undefined : v === 'true')
                setFeePage(1)
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </Select>
            <span className="text-[11px] text-[var(--text-4)]">{feeTotal} règle(s)</span>
          </div>
          <Button onClick={openFeeCreate} className="shrink-0">+ Ajouter une règle</Button>
        </div>

        {showFeeForm && (
          <div className="mt-2 mb-4 rounded-[var(--r-sm)] border border-[var(--border-med)] bg-[var(--bg-subtle)] p-4">
            <p className="text-[13px] font-semibold text-[var(--text-1)] mb-3">
              {feeEditingId ? 'Modifier la règle' : 'Nouvelle règle de commission'}
              {' · '}
              <span className="text-[var(--primary)]">{activeFeeScope === 'global' ? 'Globale' : activeFeeScope === 'group' ? 'Groupe' : 'Marchand'}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {activeFeeScope === 'merchant' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Marchand</label>
                  <Select className="h-9 text-[12px]" value={feeForm.merchantId ?? ''} onChange={e => setFeeField('merchantId', e.target.value || undefined)} disabled={!!feeEditingId}>
                    <option value="">Sélectionner…</option>
                    {feeMerchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                </div>
              )}
              {activeFeeScope === 'group' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Groupe</label>
                  <Select className="h-9 text-[12px]" value={feeForm.groupId ?? ''} onChange={e => setFeeField('groupId', e.target.value || undefined)} disabled={!!feeEditingId}>
                    <option value="">Sélectionner…</option>
                    {merchantGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Provider</label>
                <Select className="h-9 text-[12px]" value={feeForm.provider} onChange={e => setFeeField('provider', e.target.value)}>
                  {PROVIDERS.map(p => <option key={p} value={p}>{p === '*' ? '* (tous providers)' : p}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Taux (%) — ex : 2 pour 2 %</label>
                <Input type="number" min={0} max={100} step={0.01} className="h-9 text-[12px]"
                  value={(feeForm.percentageFee * 100).toFixed(2)}
                  onChange={e => setFeeField('percentageFee', parseFloat(e.target.value || '0') / 100)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Frais fixe (XAF)</label>
                <Input type="number" min={0} step={1} className="h-9 text-[12px]"
                  value={feeForm.fixedFee} onChange={e => setFeeField('fixedFee', parseFloat(e.target.value || '0'))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Commission min (XAF)</label>
                <Input type="number" min={0} step={1} className="h-9 text-[12px]"
                  value={feeForm.minFee} onChange={e => setFeeField('minFee', parseFloat(e.target.value || '0'))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Commission max (XAF)</label>
                <Input type="number" min={0} step={1} className="h-9 text-[12px]"
                  value={feeForm.maxFee} onChange={e => setFeeField('maxFee', parseFloat(e.target.value || '0'))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-3)]">Priorité (plus élevé = prioritaire)</label>
                <Input type="number" step={1} className="h-9 text-[12px]"
                  value={feeForm.priority} onChange={e => setFeeField('priority', parseInt(e.target.value || '0'))} />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              {feeEditingId && (
                <label className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
                  <input type="checkbox" checked={feeForm.isActive} onChange={e => setFeeField('isActive', e.target.checked)} className="h-4 w-4 rounded" />
                  Actif
                </label>
              )}
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-2)]">
                <input type="checkbox" checked={showConditions} onChange={e => setShowConditions(e.target.checked)} className="h-4 w-4 rounded" />
                Conditions dynamiques (montant / date)
              </label>
            </div>

            {showConditions && (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 rounded border border-[var(--border-soft)] p-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Montant min (XAF)</label>
                  <Input type="number" min={0} step={100} className="h-8 text-[12px]"
                    value={feeForm.conditions?.minAmountXaf ?? ''}
                    onChange={e => setCondField('minAmountXaf', e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Montant max (XAF)</label>
                  <Input type="number" min={0} step={100} className="h-8 text-[12px]"
                    value={feeForm.conditions?.maxAmountXaf ?? ''}
                    onChange={e => setCondField('maxAmountXaf', e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Valide du</label>
                  <Input type="date" className="h-8 text-[12px]"
                    value={feeForm.conditions?.validFrom?.slice(0, 10) ?? ''}
                    onChange={e => setCondField('validFrom', e.target.value || undefined)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--text-3)]">Valide au</label>
                  <Input type="date" className="h-8 text-[12px]"
                    value={feeForm.conditions?.validTo?.slice(0, 10) ?? ''}
                    onChange={e => setCondField('validTo', e.target.value || undefined)} />
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <Button disabled={!isSaveEnabled()} onClick={() => saveFeeMutation.mutate()}>
                {saveFeeMutation.isPending ? 'Sauvegarde…' : feeEditingId ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="secondary" onClick={closeFeeForm}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                {(feeTab === 'merchant' ? ['Marchand'] : feeTab === 'group' ? ['Groupe'] : []).concat(
                  ['Provider','Taux','Frais fixe','Min / Max','Prio','Statut','']
                ).map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feesLoading ? (
                <tr><td className="px-3 py-4 text-[12px] text-[var(--text-3)]" colSpan={9}>Chargement…</td></tr>
              ) : feeItems.length === 0 ? (
                <tr><td className="px-3 py-4 text-[12px] text-[var(--text-3)]" colSpan={9}>Aucune règle. Cliquez sur "+ Ajouter une règle".</td></tr>
              ) : feeItems.map(item => (
                <tr key={item.id} className="border-t border-[var(--border-soft)]">
                  {feeTab === 'merchant' && <td className="px-3 py-2 text-[12px] text-[var(--text-1)]">{item.merchantName}</td>}
                  {feeTab === 'group'    && <td className="px-3 py-2 text-[12px] text-[var(--text-1)]">{item.groupName}</td>}
                  <td className="px-3 py-2"><Badge color="blue">{item.provider === '*' ? '* (tous)' : item.provider}</Badge></td>
                  <td className="px-3 py-2 text-[13px] font-semibold" style={{ color: 'var(--orange)' }}>
                    {(item.percentageFee * 100).toFixed(2)} %
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[var(--text-2)]">
                    {item.fixedFee ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(item.fixedFee) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">
                    {item.minFee ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(item.minFee) : '—'}
                    {' / '}
                    {item.maxFee ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(item.maxFee) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[var(--text-3)]">{item.priority}</td>
                  <td className="px-3 py-2">
                    <Badge color={item.isActive ? 'green' : 'gray'} dot>{item.isActive ? 'Actif' : 'Inactif'}</Badge>
                    {item.conditions && <span className="ml-1 text-[10px] text-[var(--text-4)]" title="Conditions dynamiques">⚙</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button className="h-7 text-[11px]" variant="ghost" onClick={() => openFeeEdit(item)}>Modifier</Button>
                      <Button className="h-7 text-[11px]" variant="ghost" disabled={deleteFeeMutation.isPending}
                        onClick={() => handleFeeDelete(item)} style={{ color: 'var(--red)' }}>Supprimer</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {feeTotalPages > 1 && (
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" disabled={feePage <= 1} onClick={() => setFeePage(p => Math.max(1, p - 1))}>Précédent</Button>
            <span className="text-[12px] text-[var(--text-3)]">Page {feePage} / {feeTotalPages}</span>
            <Button variant="ghost" disabled={feePage >= feeTotalPages} onClick={() => setFeePage(p => Math.min(feeTotalPages, p + 1))}>Suivant</Button>
          </div>
        )}
      </Card>

      {/* Mode opératoire support */}
      <Card className="p-4">
        <h3 className="text-[15px] font-semibold mb-3">Mode opératoire — Support 2FA</h3>
        <div className="space-y-4 text-[13px] text-[var(--text-med)]">
          <section>
            <p className="font-semibold text-[var(--text-high)] mb-1">Scénario 1 — L'admin a perdu son application TOTP</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Demander à l'admin s'il possède encore ses <span className="font-medium">recovery codes</span> (fournis à l'activation du 2FA).</li>
              <li>Si oui : l'admin utilise un recovery code depuis l'écran de connexion (bouton «&nbsp;Utiliser un recovery code&nbsp;»). Chaque code n'est valable qu'une seule fois.</li>
              <li>Une fois connecté, il doit immédiatement reconfigurer son 2FA (<strong>Configurer le 2FA</strong> ci-dessus) et sauvegarder les nouveaux codes.</li>
            </ol>
          </section>
          <section>
            <p className="font-semibold text-[var(--text-high)] mb-1">Scénario 2 — L'admin n'a ni app TOTP ni recovery codes</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Un <span className="font-medium">autre super_admin</span> doit utiliser le panneau <strong>Réinitialisation du 2FA</strong> ci-dessus.</li>
              <li>Il saisit l'UUID de l'admin bloqué, son propre code TOTP (preuve step-up) et une raison documentée (min 10 caractères).</li>
              <li>Un super_admin ne peut pas réinitialiser son propre 2FA — contacter un collègue super_admin.</li>
              <li>Après la réinitialisation, l'admin bloqué dispose d'un nouveau délai de 60 jours pour reconfigurer son 2FA.</li>
              <li>L'événement est enregistré dans le journal d'audit (<code>ADMIN_2FA / RESET</code>).</li>
            </ol>
          </section>
          <section>
            <p className="font-semibold text-[var(--text-high)] mb-1">Scénario 3 — L'admin dépasse le délai d'activation</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Le portail retourne <code>deadline_passed</code> à la connexion et bloque l'accès.</li>
              <li>Un autre super_admin doit réinitialiser le 2FA via le panneau ci-dessus pour débloquer l'accès.</li>
            </ol>
          </section>
          <section>
            <p className="font-semibold text-[var(--text-high)] mb-1">Bonnes pratiques</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Conserver les 10 recovery codes dans un gestionnaire de mots de passe sécurisé.</li>
              <li>Ne jamais partager son code TOTP ou ses recovery codes.</li>
              <li>Si le nombre de codes restants est faible, reconfigurer le 2FA pour en générer de nouveaux.</li>
            </ul>
          </section>
        </div>
      </Card>
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────
function DrField({
  label,
  description,
  value,
  unit = 'jours',
  min,
  max,
  onChange,
}: {
  label: string
  description?: string
  value: number
  unit?: string
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border-med)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-1)]">{label}</p>
        {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= min && v <= max) onChange(v)
          }}
          className="w-24 rounded-[var(--r-sm)] border border-[var(--border-med)] px-2 py-1 text-[13px] text-right"
        />
        <span className="text-[12px] text-muted w-10">{unit}</span>
      </div>
    </div>
  )
}
