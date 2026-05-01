import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { merchantsApi } from '../lib/api/modules'
import type { PortalSession, MerchantMember } from '../lib/api/modules'
import type { PortalRole } from '../stores/authStore'
import { authApi } from '../lib/api/auth'
import { Card, Badge, Button } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface KycProfileForm {
  legalName: string
  businessEmail: string
  phoneNumber: string
  registrationNumber: string
  taxId: string
  addressLine1: string
  city: string
  homeCountryCode: string
  businessSector: string
  websiteUrl: string
}

function maskKey(key: string): string {
  const parts = key.split('_')
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join('_')
    const suffix = key.slice(-4)
    return `${prefix}_${'•'.repeat(Math.max(6, key.length - prefix.length - 4))}${suffix}`
  }
  return `${'•'.repeat(key.length - 4)}${key.slice(-4)}`
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('Clé copiée dans le presse-papiers')
}

function formatIpAddress(ipAddress?: string | null) {
  if (!ipAddress) return '—'

  if (ipAddress === '::1') return '127.0.0.1'
  if (ipAddress.startsWith('::ffff:')) return ipAddress.slice(7)

  return ipAddress
}

const KYC_STATUS_LABELS: Record<string, { label: string; color: 'amber' | 'blue' | 'emerald' | 'red' }> = {
  Pending:     { label: 'En attente',          color: 'amber' },
  UnderReview: { label: 'En cours de vérification', color: 'blue' },
  Approved:    { label: 'Approuvé',            color: 'emerald' },
  Rejected:    { label: 'Rejeté',              color: 'red' },
}

export default function MerchantProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [editingKyc, setEditingKyc] = useState(false)

  const {
    register: regPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors },
  } = useForm<ChangePasswordForm>()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: merchantsApi.getProfile,
  })

  const { data: sessions = [] } = useQuery<PortalSession[]>({
    queryKey: ['merchant-sessions'],
    queryFn: merchantsApi.getSessions,
  })

  const { data: members = [] } = useQuery<MerchantMember[]>({
    queryKey: ['merchant-members'],
    queryFn: merchantsApi.getMembers,
  })

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [inviteRole, setInviteRole] = useState<PortalRole>('member')

  const ownerCount = members.filter((m) => m.role === 'owner').length
  const isOwner = user.portalRole === 'owner'

  const canRemove = (m: MerchantMember) => {
    if (!isOwner) return false
    if (m.role === 'owner' && ownerCount <= 1) return false
    return true
  }

  const inviteMember = useMutation({
    mutationFn: () =>
      merchantsApi.sendInvitation({
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteDisplayName || undefined,
      }),
    onSuccess: () => {
      toast.success(`Invitation envoyée à ${inviteEmail}`)
      setShowInviteForm(false)
      setInviteEmail('')
      setInviteDisplayName('')
      setInviteRole('member')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) => merchantsApi.removeMember(userId),
    onSuccess: () => {
      toast.success('Membre supprimé')
      qc.invalidateQueries({ queryKey: ['merchant-members'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const {
    register: regKyc,
    handleSubmit: handleKycSubmit,
    reset: resetKyc,
    formState: { errors: kycErrors },
  } = useForm<KycProfileForm>({
    values: profile
      ? {
          legalName: profile.legalName ?? '',
          businessEmail: profile.businessEmail ?? '',
          phoneNumber: profile.phoneNumber ?? '',
          registrationNumber: profile.registrationNumber ?? '',
          taxId: profile.taxId ?? '',
          addressLine1: profile.addressLine1 ?? '',
          city: profile.city ?? '',
          homeCountryCode: profile.homeCountryCode ?? 'CM',
          businessSector: profile.businessSector ?? '',
          websiteUrl: profile.websiteUrl ?? '',
        }
      : undefined,
  })

  const saveKyc = useMutation({
    mutationFn: (data: KycProfileForm) => merchantsApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Informations enregistrées')
      setEditingKyc(false)
      qc.invalidateQueries({ queryKey: ['merchant-profile'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const changePwd = useMutation({
    mutationFn: (data: ChangePasswordForm) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès')
      resetPwd()
    },
    onError: (e: Error) => {
      if ((e as any)?.response?.status === 422) {
        toast.error('Mot de passe actuel incorrect')
      } else {
        toast.error(e.message)
      }
    },
  })

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['merchant-own-keys'],
    queryFn: merchantsApi.list,
  })

  const revoke = useMutation({
    mutationFn: merchantsApi.revokeKey,
    onSuccess: () => {
      toast.success('Clé révoquée')
      qc.invalidateQueries({ queryKey: ['merchant-own-keys'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const kycInfo = profile?.kycStatus ? KYC_STATUS_LABELS[profile.kycStatus] ?? { label: profile.kycStatus, color: 'amber' as const } : null

  const kycComplete = !!(
    profile?.legalName &&
    profile?.phoneNumber &&
    profile?.registrationNumber &&
    profile?.addressLine1 &&
    profile?.city
  )

  return (
    <RequirePermission permission="merchants.view_own">
      <div className="space-y-6">
        {/* Identity card */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
          <p className="text-sm text-muted">Informations de votre compte marchand</p>
        </div>

        <Card className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">Nom</dt>
              <dd className="font-medium text-slate-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Rôle</dt>
              <dd><Badge color="blue">Marchand</Badge></dd>
            </div>
            {user.merchantId && (
              <div>
                <dt className="text-muted">Merchant ID</dt>
                <dd className="font-mono text-xs text-slate-700">{user.merchantId}</dd>
              </div>
            )}
            {kycInfo && (
              <div>
                <dt className="text-muted">Statut KYC</dt>
                <dd><Badge color={kycInfo.color}>{kycInfo.label}</Badge></dd>
              </div>
            )}
          </dl>
        </Card>

        {/* KYC identification */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Informations d'identification</h2>
              <p className="text-xs text-muted mt-0.5">
                Ces informations sont requises pour activer les clés de production (KYC).
              </p>
            </div>
            {!editingKyc && (
              <Button variant="secondary" onClick={() => setEditingKyc(true)}>
                Modifier
              </Button>
            )}
          </div>

          {!kycComplete && !editingKyc && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Votre profil est incomplet. Renseignez vos informations pour débloquer les clés de production.
            </div>
          )}

          <Card>
            {editingKyc ? (
              <form
                onSubmit={handleKycSubmit((data) => saveKyc.mutate(data))}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {[
                  { field: 'legalName',          label: 'Raison sociale (nom légal)',     required: true },
                  { field: 'businessEmail',       label: 'Email professionnel',            required: false },
                  { field: 'phoneNumber',         label: 'Téléphone (ex: +237612345678)', required: true },
                  { field: 'registrationNumber',  label: 'N° RCCM / Immatriculation',     required: true },
                  { field: 'taxId',               label: 'NIF / Identifiant fiscal',       required: false },
                  { field: 'addressLine1',        label: 'Adresse',                        required: true },
                  { field: 'city',                label: 'Ville',                          required: true },
                  { field: 'homeCountryCode',     label: 'Pays (code ISO: CM, CG…)',       required: false },
                  { field: 'businessSector',      label: 'Secteur d\'activité',            required: false },
                  { field: 'websiteUrl',          label: 'Site web',                       required: false },
                ].map(({ field, label, required }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      {...regKyc(field as keyof KycProfileForm, required ? { required: 'Requis' } : undefined)}
                    />
                    {kycErrors[field as keyof KycProfileForm] && (
                      <p className="mt-1 text-xs text-red-600">{kycErrors[field as keyof KycProfileForm]?.message}</p>
                    )}
                  </div>
                ))}
                <div className="col-span-full flex gap-2 pt-2">
                  <Button type="submit" disabled={saveKyc.isPending}>
                    {saveKyc.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setEditingKyc(false); resetKyc() }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            ) : profileLoading ? (
              <p className="text-sm text-muted">Chargement…</p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  { label: 'Raison sociale',         value: profile?.legalName },
                  { label: 'Email professionnel',    value: profile?.businessEmail },
                  { label: 'Téléphone',              value: profile?.phoneNumber },
                  { label: 'N° RCCM / Immatriculation', value: profile?.registrationNumber },
                  { label: 'NIF / Identifiant fiscal',  value: profile?.taxId },
                  { label: 'Adresse',                value: profile?.addressLine1 },
                  { label: 'Ville',                  value: profile?.city },
                  { label: 'Pays',                   value: profile?.homeCountryCode },
                  { label: 'Secteur d\'activité',    value: profile?.businessSector },
                  { label: 'Site web',               value: profile?.websiteUrl },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium text-slate-900">
                      {value || <span className="text-slate-400 italic">Non renseigné</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>

        {/* Password change */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">Changer le mot de passe</h2>
          <Card>
            <form
              onSubmit={handlePwdSubmit((data) => changePwd.mutate(data))}
              className="space-y-4 max-w-sm"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  {...regPwd('currentPassword', { required: 'Requis' })}
                />
                {pwdErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwdErrors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  {...regPwd('newPassword', {
                    required: 'Requis',
                    minLength: { value: 8, message: 'Minimum 8 caractères' },
                  })}
                />
                {pwdErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwdErrors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  {...regPwd('confirmPassword', {
                    required: 'Requis',
                    validate: (val) =>
                      val === watchPwd('newPassword') || 'Les mots de passe ne correspondent pas',
                  })}
                />
                {pwdErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{pwdErrors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" disabled={changePwd.isPending}>
                {changePwd.isPending ? 'Modification…' : 'Modifier le mot de passe'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Own API keys */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">Mes clés API</h2>
          <RequirePermission permission="merchants.view_own_keys">
            {isLoading ? (
              <p className="text-sm text-muted">Chargement…</p>
            ) : keys.length === 0 ? (
              <Card><p className="text-sm text-muted">Aucune clé active.</p></Card>
            ) : (
              <div className="space-y-3">
                {keys.map((k) => (
                  <Card key={k.key} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge color={k.mode === 'live' ? 'emerald' : 'amber'}>
                        {k.mode.toUpperCase()}
                      </Badge>
                      <code className="text-xs text-slate-700">
                        {revealed.has(k.key) ? k.key : maskKey(k.key)}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => toggleReveal(k.key)}>
                        {revealed.has(k.key) ? 'Masquer' : 'Afficher'}
                      </Button>
                      <Button variant="secondary" onClick={() => copy(k.key)}>
                        Copier
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm('Révoquer cette clé ? Action irréversible.')) {
                            revoke.mutate(k.key)
                          }
                        }}
                      >
                        Révoquer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </RequirePermission>
        </div>

        {/* ── Team members ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Utilisateurs du compte</h2>
              <p className="text-sm text-muted">Les personnes ayant accès au portail marchand.</p>
            </div>
            {isOwner && (
              <Button variant="primary" onClick={() => setShowInviteForm((v) => !v)}>
                {showInviteForm ? 'Annuler' : '+ Inviter'}
              </Button>
            )}
          </div>

          {showInviteForm && (
            <Card className="mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Inviter un nouveau membre</h3>
              <p className="text-xs text-muted">Un email avec un lien d'activation sera envoyé à l'adresse indiquée.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Email *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Nom affiché</label>
                  <input
                    type="text"
                    value={inviteDisplayName}
                    onChange={(e) => setInviteDisplayName(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Prénom Nom"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Rôle</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as PortalRole)}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="member">Membre — transactions, analytics, escrow</option>
                    <option value="developer">Développeur — clés API, webhooks, sandbox</option>
                    <option value="owner">Propriétaire — accès complet</option>
                  </select>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => inviteMember.mutate()}
                disabled={!inviteEmail || inviteMember.isPending}
              >
                {inviteMember.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
              </Button>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-xs">
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Nom</th>
                  <th className="px-4 py-2 text-left font-medium">Rôle</th>
                  <th className="px-4 py-2 text-left font-medium">Depuis</th>
                  {isOwner && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td className="px-4 py-2 text-slate-700">{m.email}</td>
                    <td className="px-4 py-2 text-slate-500">{m.displayName ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge color={m.role === 'owner' ? 'blue' : m.role === 'developer' ? 'violet' : 'slate'}>
                        {m.role === 'owner' ? 'Propriétaire' : m.role === 'developer' ? 'Développeur' : 'Membre'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(m.createdAt))}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        {canRemove(m) && (
                          <Button
                            variant="danger"
                            onClick={() => removeMember.mutate(m.userId)}
                            disabled={removeMember.isPending}
                          >
                            Retirer
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ── Session / connexion history ──────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historique des connexions</h2>
          <p className="text-sm text-muted mb-3">
            Les 100 dernières tentatives de connexion à votre portail marchand.
          </p>
          <Card className="p-0 overflow-hidden">
            {sessions.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 italic">Aucune session enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Adresse IP</th>
                      <th className="px-4 py-2 text-left font-medium">Statut</th>
                      <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Navigateur / Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((s) => (
                      <tr key={s.id} className={s.success ? '' : 'bg-red-50/40'}>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(s.createdAt))}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-700">{formatIpAddress(s.ipAddress)}</td>
                        <td className="px-4 py-2">
                          {s.success ? (
                            <span className="text-emerald-600 font-semibold">✓ Connecté</span>
                          ) : (
                            <span className="text-red-600 font-semibold">✗ {s.failureReason ?? 'Échec'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400 truncate max-w-[260px] hidden md:table-cell">
                          {s.userAgent ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </RequirePermission>
  )
}


