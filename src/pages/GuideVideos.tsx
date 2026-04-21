// src/pages/GuideVideos.tsx
// Super-admin page — configure the YouTube video ID for each integration guide.
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { guideVideosApi, type GuideVideoConfig } from '../lib/api/modules'
import { Card } from '../components/ui'

// ── Static guide metadata (mirrors GUIDES array in IntegrationGuides.tsx) ────
const GUIDES_META = [
  { id: 'first-payment',   num: 1,  label: 'Premier paiement en 10 min',       tag: 'Démarrage' },
  { id: 'webhooks',        num: 2,  label: 'Webhooks de production',            tag: 'Production' },
  { id: 'error-handling',  num: 3,  label: 'Gestion des erreurs et reprise',    tag: 'Résilience' },
  { id: 'api-security',    num: 4,  label: 'Sécurité API pour marchands',       tag: 'Sécurité' },
  { id: 'multi-operator',  num: 5,  label: 'Mobile money multi-opérateurs',     tag: 'Paiement' },
  { id: 'go-live',         num: 6,  label: 'Go-live checklist',                 tag: 'Release' },
  { id: 'observability',   num: 7,  label: 'Observabilité et analytics',        tag: 'Pilotage' },
  { id: 'automated-tests', num: 8,  label: 'Tests automatisés d\'intégration',  tag: 'Qualité' },
  { id: 'api-migration',   num: 9,  label: 'Migration de version API',          tag: 'Évolution' },
  { id: 'l1-support',      num: 10, label: 'Support L1 pour juniors',           tag: 'Support' },
] as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function youtubeThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}

function youtubeUrl(id: string) {
  return `https://youtu.be/${id}`
}

const PLACEHOLDER_ID = 'dQw4w9WgXcQ'

// ── Row component ─────────────────────────────────────────────────────────────

interface GuideRowProps {
  meta: (typeof GUIDES_META)[number]
  config: GuideVideoConfig | undefined
  onSave: (guideId: string, data: { youtubeId: string; title: string; description: string }) => void
  saving: boolean
}

function GuideRow({ meta, config, onSave, saving }: GuideRowProps) {
  const [youtubeId, setYoutubeId]     = useState(config?.youtubeId ?? PLACEHOLDER_ID)
  const [title, setTitle]             = useState(config?.title ?? '')
  const [description, setDescription] = useState(config?.description ?? '')
  const [dirty, setDirty]             = useState(false)

  // Sync when config arrives from API
  useEffect(() => {
    if (config) {
      setYoutubeId(config.youtubeId)
      setTitle(config.title)
      setDescription(config.description ?? '')
      setDirty(false)
    }
  }, [config])

  const markDirty = (cb: () => void) => { cb(); setDirty(true) }
  const isPlaceholder = youtubeId === PLACEHOLDER_ID || !youtubeId.trim()

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-[11px] font-extrabold text-white">
          {meta.num}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--text-1)] truncate">{meta.label}</p>
          <span className="inline-block rounded-full bg-[var(--bg-subtle)] border border-[var(--border-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-3)]">
            {meta.tag}
          </span>
        </div>
        {!isPlaceholder && (
          <a
            href={youtubeUrl(youtubeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[11px] text-[var(--orange)] hover:underline"
          >
            ↗ Voir
          </a>
        )}
      </div>

      {/* Thumbnail preview */}
      {!isPlaceholder ? (
        <div className="relative h-[80px] w-full overflow-hidden rounded-[var(--r-sm)] bg-black">
          <img
            src={youtubeThumbnail(youtubeId)}
            alt="thumbnail"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 shadow">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[80px] items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--border)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-4)]">
          Aucune vidéo — entrez un ID YouTube ci-dessous
        </div>
      )}

      {/* Fields */}
      <div className="space-y-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">ID YouTube</span>
          <input
            type="text"
            value={youtubeId}
            onChange={e => markDirty(() => setYoutubeId(e.target.value.trim()))}
            placeholder="ex: dQw4w9WgXcQ"
            className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--border-med)] bg-[var(--bg-card)]
                       px-2.5 py-1.5 text-[12px] font-mono text-[var(--text-1)]
                       focus:border-[var(--orange)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Titre du tutoriel</span>
          <input
            type="text"
            value={title}
            onChange={e => markDirty(() => setTitle(e.target.value))}
            placeholder={`ST Pay — Tutoriel : ${meta.label}`}
            className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--border-med)] bg-[var(--bg-card)]
                       px-2.5 py-1.5 text-[12px] text-[var(--text-1)]
                       focus:border-[var(--orange)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Description (optionnel)</span>
          <input
            type="text"
            value={description}
            onChange={e => markDirty(() => setDescription(e.target.value))}
            placeholder="Durée : 5 min — description courte…"
            className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--border-med)] bg-[var(--bg-card)]
                       px-2.5 py-1.5 text-[12px] text-[var(--text-1)]
                       focus:border-[var(--orange)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]"
          />
        </label>
      </div>

      {/* Save button */}
      <button
        type="button"
        disabled={!dirty || saving || !youtubeId.trim() || !title.trim()}
        onClick={() => {
          onSave(meta.id, { youtubeId: youtubeId.trim(), title: title.trim(), description: description.trim() })
          setDirty(false)
        }}
        className="rounded-[var(--r-sm)] bg-[var(--orange)] px-3 py-1.5 text-[12px] font-semibold text-white
                   hover:bg-[var(--orange-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      {/* Last updated */}
      {config?.updatedAt && (
        <p className="text-[10px] text-[var(--text-4)]">
          Modifié le {new Date(config.updatedAt).toLocaleString('fr-FR')} · par {config.updatedByAdminId}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuideVideos() {
  const qc = useQueryClient()

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['guide-videos'],
    queryFn: guideVideosApi.list,
    retry: false,
  })

  const [savingId, setSavingId] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ guideId, data }: { guideId: string; data: { youtubeId: string; title: string; description: string } }) =>
      guideVideosApi.upsert(guideId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guide-videos'] })
      toast.success('Vidéo mise à jour !')
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
    onSettled: () => setSavingId(null),
  })

  const handleSave = (guideId: string, data: { youtubeId: string; title: string; description: string }) => {
    setSavingId(guideId)
    mutation.mutate({ guideId, data })
  }

  const configMap = Object.fromEntries(configs.map(c => [c.guideId, c]))
  const configured = configs.filter(c => c.youtubeId !== PLACEHOLDER_ID && c.youtubeId).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[18px] font-extrabold tracking-tight text-[var(--text-1)]">
          Vidéos tutoriels — Guides d'intégration
        </h1>
        <p className="text-[13px] text-[var(--text-3)]">
          Associez un tutoriel YouTube à chaque guide. Les marchands verront la vidéo intégrée directement dans le guide.
        </p>
      </div>

      {/* Progress banner */}
      <Card>
        <div className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-[var(--text-2)]">Couverture vidéo</span>
              <span className="text-[12px] font-mono text-[var(--text-1)]">{configured} / {GUIDES_META.length}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--orange)] transition-all duration-500"
                style={{ width: `${(configured / GUIDES_META.length) * 100}%` }}
              />
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            configured === GUIDES_META.length
              ? 'bg-green-100 text-green-700 border border-green-200'
              : configured > 0
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : 'bg-[var(--bg-subtle)] text-[var(--text-3)] border border-[var(--border)]'
          }`}>
            {configured === GUIDES_META.length ? '✓ Complet' : configured > 0 ? 'En cours' : 'Non configuré'}
          </span>
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="text-[13px] text-[var(--text-3)] py-8 text-center">Chargement…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES_META.map(meta => (
            <GuideRow
              key={meta.id}
              meta={meta}
              config={configMap[meta.id]}
              onSave={handleSave}
              saving={savingId === meta.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
