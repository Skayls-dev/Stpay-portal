import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Badge, Button, Card } from '../components/ui'
import { adminConfigApi } from '../lib/api/modules'
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
    </div>
  )
}
