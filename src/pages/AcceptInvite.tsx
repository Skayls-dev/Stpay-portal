import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { merchantsApi } from '../lib/api/modules'
import { useAuthStore } from '../stores/authStore'
import type { PortalRole } from '../stores/authStore'
import { Card, Button, Badge } from '../components/ui'
import toast from 'react-hot-toast'

interface InvitationInfo {
  email: string
  merchantName: string
  role: string
  displayName?: string
  expiresAt: string
}

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const { login } = useAuthStore()

  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoadError("Aucun token d'invitation dans l'URL.")
      setLoading(false)
      return
    }
    merchantsApi
      .getInvitation(token)
      .then((data) => {
        setInfo(data)
        setDisplayName(data.displayName ?? '')
      })
      .catch(() => setLoadError("Ce lien d'invitation est invalide ou a expiré."))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      const result = await merchantsApi.acceptInvitation({
        token,
        password,
        displayName: displayName.trim() || undefined,
      })

      login(
        {
          id: result.user.merchantId,
          name: result.user.name,
          role: 'merchant',
          merchantId: result.user.merchantId,
          portalRole: result.user.portalRole as PortalRole,
        },
        result.token,
      )

      toast.success(`Bienvenue sur STPay ! Vous avez rejoint ${info?.merchantName}.`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'activation'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-muted text-sm">Vérification du lien…</p>
      </div>
    )
  }

  if (loadError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full space-y-4 text-center">
          <div className="text-4xl">🔗</div>
          <h1 className="text-lg font-semibold text-slate-800">Lien invalide</h1>
          <p className="text-sm text-muted">{loadError}</p>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            Retour à la connexion
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">✉️</div>
          <h1 className="text-xl font-bold text-slate-800">Vous êtes invité !</h1>
          <p className="text-sm text-muted">
            Rejoignez <strong>{info.merchantName}</strong> sur STPay en tant que{' '}
            <Badge variant={info.role === 'owner' ? 'warning' : 'default'}>
              {info.role === 'owner' ? 'Propriétaire' : 'Membre'}
            </Badge>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={info.email}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom affiché</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Prénom Nom"
              maxLength={120}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Min. 8 caractères"
              required
              minLength={8}
            />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Répéter le mot de passe"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? 'Activation…' : 'Activer mon compte'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted">
          Lien valide jusqu'au {new Date(info.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </Card>
    </div>
  )
}
