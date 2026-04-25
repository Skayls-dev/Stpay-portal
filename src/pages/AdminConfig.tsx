import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Badge, Button, Card } from '../components/ui'
import { adminConfigApi } from '../lib/api/modules'
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
