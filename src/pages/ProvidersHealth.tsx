import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { providersHealthApi, POLL_INTERVAL_PROVIDERS } from '../lib/api/modules'
import { Card, Badge } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

const PROVIDER_LABELS: Record<string, string> = {
  MTN: 'MTN Mobile Money',
  ORANGE: 'Orange Money',
}

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  MTN: "Cameroun, Côte d'Ivoire, Ghana",
  ORANGE: 'Orange Money multi-pays',
}

function HealthDot({ status }: { status: 'up' | 'down' | 'unknown' }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${
        status === 'up' ? 'bg-emerald-500' : status === 'down' ? 'bg-red-500' : 'bg-slate-400'
      }`}
    />
  )
}

function ObsBadge({ label, status }: { label: string; status: 'up' | 'down' }) {
  return (
    <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
      style={{ borderColor: status === 'up' ? '#6ee7b7' : '#fca5a5', background: status === 'up' ? '#ecfdf5' : '#fef2f2', color: status === 'up' ? '#065f46' : '#991b1b' }}
    >
      <HealthDot status={status} />
      {label}
    </div>
  )
}

export default function ProvidersHealth() {
  const { data: providers = [], isFetching: provFetching } = useQuery({
    queryKey: ['providers-health'],
    queryFn: providersHealthApi.allProviders,
    refetchInterval: POLL_INTERVAL_PROVIDERS,
  })

  const { data: obs } = useQuery({
    queryKey: ['observability'],
    queryFn: providersHealthApi.observability,
    refetchInterval: POLL_INTERVAL_PROVIDERS,
  })

  return (
    <RequirePermission permission="providers.view_health">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Santé des fournisseurs</h1>
            <p className="text-sm text-muted">
              {provFetching ? 'Actualisation…' : `Mise à jour toutes les ${POLL_INTERVAL_PROVIDERS / 1000}s`}
            </p>
          </div>
        </div>

        {/* Observability quick check */}
        {obs && (
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Observabilité backend</h2>
            <div className="flex flex-wrap gap-2">
              <ObsBadge label="/health" status={obs.health} />
              <ObsBadge label="/health/ready" status={obs.ready} />
              <ObsBadge label="/health/live" status={obs.live} />
              <ObsBadge label="/metrics" status={obs.metrics} />
            </div>
            <p className="mt-3 text-xs text-muted">Dernière vérification : {obs.lastChecked}</p>
          </Card>
        )}

        {/* Per-provider cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {providers.map((provider) => {
            const name = provider.name.toUpperCase()
            const status = provider.status ?? 'unknown'
            return (
              <Card key={name} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{PROVIDER_LABELS[name] || name}</h3>
                    <p className="text-xs text-muted">{PROVIDER_DESCRIPTIONS[name] || 'Provider configuré côté backend'}</p>
                  </div>
                  <HealthDot status={status as 'up' | 'down' | 'unknown'} />
                </div>
                <Badge color={status === 'up' ? 'emerald' : status === 'down' ? 'red' : 'slate'}>
                  {status === 'up' ? 'Opérationnel' : status === 'down' ? 'Hors service' : 'Inconnu'}
                </Badge>
                {Array.isArray(provider.supportedFeatures) && provider.supportedFeatures.length > 0 && (
                  <p className="text-xs text-muted">Features: {provider.supportedFeatures.join(', ')}</p>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </RequirePermission>
  )
}
