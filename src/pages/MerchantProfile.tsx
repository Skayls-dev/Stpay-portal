import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { merchantsApi } from '../lib/api/modules'
import { authApi } from '../lib/api/auth'
import { Card, Badge, Button } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
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

export default function MerchantProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const {
    register: regPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors },
  } = useForm<ChangePasswordForm>()

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
          </dl>
        </Card>

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
      </div>
    </RequirePermission>
  )
}
