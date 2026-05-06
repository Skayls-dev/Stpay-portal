import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import { feeConfigApi, adminConfigApi } from '../lib/api/modules'
import type { FeeConfigItem, UpsertFeeConfigPayload } from '../lib/api/modules'

const PROVIDERS = ['MTN', 'ORANGE', 'WAVE', 'STRIPE', '*']

function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)} %`
}

function fmtXaf(v: number) {
  if (!v) return '—'
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(v)
}

const EMPTY_FORM: UpsertFeeConfigPayload = {
  merchantId: '',
  provider: 'MTN',
  percentageFee: 0.02,
  fixedFee: 0,
  minFee: 0,
  maxFee: 0,
  isActive: true,
}

export default function FeeConfig() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined)

  // ── Merchant list for the select ─────────────────────────────────────────
  const { data: merchantsData } = useQuery({
    queryKey: ['admin-merchants-lite'],
    queryFn: () => adminConfigApi.listMerchantsPaginated(1, 200),
    staleTime: 5 * 60 * 1000,
  })
  const merchants: { id: string; name: string }[] = merchantsData?.merchants ?? []

  // ── Fee configs list ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-fees', page, filterActive],
    queryFn: () => feeConfigApi.list({ page, pageSize: 25, isActive: filterActive }),
    staleTime: 30_000,
  })

  const items: FeeConfigItem[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  // ── Form state ────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UpsertFeeConfigPayload>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item: FeeConfigItem) {
    setEditingId(item.id)
    setForm({
      merchantId: item.merchantId,
      provider: item.provider,
      percentageFee: item.percentageFee,
      fixedFee: item.fixedFee,
      minFee: item.minFee,
      maxFee: item.maxFee,
      isActive: item.isActive,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await feeConfigApi.update(editingId, form)
      } else {
        await feeConfigApi.create(form)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fees'] })
      toast.success(editingId ? 'Configuration mise à jour.' : 'Configuration créée.')
      closeForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la sauvegarde.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feeConfigApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fees'] })
      toast.success('Configuration supprimée.')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression.')
    },
  })

  function handleDelete(item: FeeConfigItem) {
    if (!confirm(`Supprimer la configuration ${item.merchantName} / ${item.provider} ?`)) return
    deleteMutation.mutate(item.id)
  }

  function setField<K extends keyof UpsertFeeConfigPayload>(key: K, value: UpsertFeeConfigPayload[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-[var(--text-1)]">Commissions de settlement</h1>
          <p className="text-[12px] text-[var(--text-3)] mt-0.5">
            Configurez les taux de commission prélevés lors des settlements par marchand et provider.
          </p>
        </div>
        <Button onClick={openCreate}>+ Nouvelle configuration</Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Select
          className="h-8 w-44 text-[12px]"
          value={filterActive === undefined ? '' : filterActive ? 'true' : 'false'}
          onChange={e => {
            const v = e.target.value
            setFilterActive(v === '' ? undefined : v === 'true')
            setPage(1)
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </Select>
        <span className="text-[11px] text-[var(--text-4)]">{total} configuration(s)</span>
      </div>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      {showForm && (
        <Card className="border border-[var(--border-soft)] p-4">
          <h2 className="text-[13px] font-semibold text-[var(--text-1)] mb-3">
            {editingId ? 'Modifier la configuration' : 'Nouvelle configuration de commission'}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Marchand</label>
              <Select
                className="h-9 text-[12px]"
                value={form.merchantId}
                onChange={e => setField('merchantId', e.target.value)}
                disabled={!!editingId}
              >
                <option value="">Sélectionner…</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Provider</label>
              <Select
                className="h-9 text-[12px]"
                value={form.provider}
                onChange={e => setField('provider', e.target.value)}
                disabled={!!editingId}
              >
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p === '*' ? '* (tous)' : p}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Taux (%) — ex: 2 pour 2 %</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="h-9 text-[12px]"
                value={(form.percentageFee * 100).toFixed(2)}
                onChange={e => setField('percentageFee', parseFloat(e.target.value || '0') / 100)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Frais fixe (XAF)</label>
              <Input
                type="number"
                min={0}
                step={1}
                className="h-9 text-[12px]"
                value={form.fixedFee}
                onChange={e => setField('fixedFee', parseFloat(e.target.value || '0'))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Commission min (XAF)</label>
              <Input
                type="number"
                min={0}
                step={1}
                className="h-9 text-[12px]"
                value={form.minFee}
                onChange={e => setField('minFee', parseFloat(e.target.value || '0'))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-3)]">Commission max (XAF)</label>
              <Input
                type="number"
                min={0}
                step={1}
                className="h-9 text-[12px]"
                value={form.maxFee}
                onChange={e => setField('maxFee', parseFloat(e.target.value || '0'))}
              />
            </div>
          </div>
          {editingId && (
            <div className="mt-3 flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={e => setField('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-soft)]"
              />
              <label htmlFor="isActive" className="text-[12px] text-[var(--text-2)]">Actif</label>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <Button
              disabled={saveMutation.isPending || !form.merchantId || !form.provider}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Sauvegarde…' : editingId ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button variant="ghost" onClick={closeForm}>Annuler</Button>
          </div>
        </Card>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Marchand</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Provider</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Taux</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Frais fixe</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Min / Max</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Statut</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={7}>Chargement…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-[12px] text-[var(--text-3)]" colSpan={7}>
                    Aucune configuration. Cliquez sur "Nouvelle configuration" pour commencer.
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-3 py-2 text-[12px] text-[var(--text-1)]">{item.merchantName}</td>
                  <td className="px-3 py-2">
                    <Badge color="blue">{item.provider}</Badge>
                  </td>
                  <td className="px-3 py-2 text-[13px] font-semibold text-[var(--orange)]">
                    {fmtPct(item.percentageFee)}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[var(--text-2)]">{fmtXaf(item.fixedFee)}</td>
                  <td className="px-3 py-2 text-[11px] text-[var(--text-3)]">
                    {fmtXaf(item.minFee)} / {fmtXaf(item.maxFee)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={item.isActive ? 'green' : 'gray'} dot>
                      {item.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        className="h-7 text-[11px]"
                        variant="ghost"
                        onClick={() => openEdit(item)}
                      >
                        Modifier
                      </Button>
                      <Button
                        className="h-7 text-[11px]"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(item)}
                        style={{ color: 'var(--red)' }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[var(--border-soft)]">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Précédent
            </Button>
            <span className="text-[12px] text-[var(--text-3)]">Page {page} / {totalPages}</span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Suivant
            </Button>
          </div>
        )}
      </Card>

      {/* ── Info block ─────────────────────────────────────────────────── */}
      <Card className="p-3 text-[11px] text-[var(--text-3)] leading-relaxed bg-[var(--bg-subtle)]">
        <strong className="text-[var(--text-2)]">Comment ça marche ?</strong><br />
        Lors d'un settlement, ST Pay applique la configuration active du marchand pour le provider concerné.
        Si aucune configuration n'existe, le taux par défaut de <strong>2 %</strong> s'applique.<br />
        Le champ <em>* (tous)</em> comme provider agit comme fallback si aucune règle spécifique n'est trouvée.
        <br /><br />
        <strong>Min / Max</strong> : si définis (≠ 0), la commission calculée est bornée entre ces valeurs.<br />
        <strong>Frais fixe</strong> : montant fixe ajouté au taux proportionnel avant application du min/max.
      </Card>
    </div>
  )
}
