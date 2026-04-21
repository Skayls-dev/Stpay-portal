import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { payoutAccountsApi } from '../lib/api/modules'
import type { PayoutAccount } from '../lib/api/modules'
import { Card, Badge, Button, Modal } from '../components/ui'
import RequirePermission from '../components/auth/RequirePermission'

const PROVIDERS = [
  { value: 'MTN',    label: 'MTN Mobile Money',    flag: '🟡' },
  { value: 'ORANGE', label: 'Orange Money',         flag: '🟠' },
  { value: 'AIRTEL', label: 'Airtel Money',         flag: '🔴' },
  { value: 'MOOV',   label: 'Moov Money',           flag: '🔵' },
  { value: 'WAVE',   label: 'Wave',                 flag: '💙' },
  { value: 'BANK',   label: 'Virement bancaire',    flag: '🏦' },
  { value: 'OTHER',  label: 'Autre',                flag: '💳' },
]

const PROVIDER_COLORS: Record<string, 'amber' | 'red' | 'blue' | 'emerald' | 'slate'> = {
  MTN:    'amber',
  ORANGE: 'red',
  AIRTEL: 'red',
  MOOV:   'blue',
  WAVE:   'blue',
  BANK:   'emerald',
  OTHER:  'slate',
}

interface FormData {
  provider: string
  accountNumber: string
  accountHolderName: string
  currency: string
  isDefault: boolean
}

function AccountForm({
  initial,
  usedProviders,
  onSave,
  onClose,
  saving,
}: {
  initial?: PayoutAccount
  usedProviders: string[]
  onSave: (data: FormData) => void
  onClose: () => void
  saving: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: initial
      ? {
          provider: initial.provider,
          accountNumber: initial.accountNumber,
          accountHolderName: initial.accountHolderName,
          currency: initial.currency,
          isDefault: initial.isDefault,
        }
      : { currency: 'XAF', isDefault: false },
  })

  const availableProviders = PROVIDERS.filter(
    (p) => !usedProviders.includes(p.value) || initial?.provider === p.value,
  )

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Opérateur <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          {...register('provider', { required: 'Requis' })}
          disabled={!!initial}
        >
          <option value="">— Choisir un opérateur —</option>
          {availableProviders.map((p) => (
            <option key={p.value} value={p.value}>
              {p.flag} {p.label}
            </option>
          ))}
        </select>
        {errors.provider && <p className="mt-1 text-xs text-red-600">{errors.provider.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Numéro de compte / MSISDN <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="+237612345678"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          {...register('accountNumber', {
            required: 'Requis',
            minLength: { value: 6, message: 'Minimum 6 caractères' },
            maxLength: { value: 64, message: 'Maximum 64 caractères' },
          })}
        />
        <p className="mt-0.5 text-xs text-slate-400">Format E.164 recommandé (+237XXXXXXXXX) pour Mobile Money</p>
        {errors.accountNumber && <p className="mt-1 text-xs text-red-600">{errors.accountNumber.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nom du titulaire du compte <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Jean Dupont"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          {...register('accountHolderName', {
            required: 'Requis',
            minLength: { value: 2, message: 'Minimum 2 caractères' },
          })}
        />
        <p className="mt-0.5 text-xs text-slate-400">Doit correspondre exactement au nom enregistré chez l'opérateur</p>
        {errors.accountHolderName && <p className="mt-1 text-xs text-red-600">{errors.accountHolderName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          {...register('currency')}
        >
          <option value="XAF">XAF — Franc CFA (CEMAC)</option>
          <option value="XOF">XOF — Franc CFA (UEMOA)</option>
          <option value="NGN">NGN — Naira nigérian</option>
          <option value="GHS">GHS — Cedi ghanéen</option>
          <option value="KES">KES — Shilling kényan</option>
          <option value="USD">USD — Dollar américain</option>
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="rounded" {...register('isDefault')} />
        <span className="text-sm text-slate-700">Compte par défaut pour les virements</span>
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Ajouter'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  )
}

export default function PayoutAccounts() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<PayoutAccount | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['payout-accounts'],
    queryFn: payoutAccountsApi.list,
  })

  const create = useMutation({
    mutationFn: payoutAccountsApi.create,
    onSuccess: () => {
      toast.success('Compte ajouté')
      setShowAdd(false)
      qc.invalidateQueries({ queryKey: ['payout-accounts'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      payoutAccountsApi.update(id, data),
    onSuccess: () => {
      toast.success('Compte mis à jour')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['payout-accounts'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const remove = useMutation({
    mutationFn: payoutAccountsApi.remove,
    onSuccess: () => {
      toast.success('Compte supprimé')
      qc.invalidateQueries({ queryKey: ['payout-accounts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const usedProviders = accounts.map((a) => a.provider)
  const allUsed = usedProviders.length >= PROVIDERS.length

  const providerMeta = (p: string) =>
    PROVIDERS.find((x) => x.value === p) ?? { label: p, flag: '💳' }

  return (
    <RequirePermission permission="merchants.view_own">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Comptes de paiement</h1>
            <p className="text-sm text-muted">
              Les virements de règlement seront effectués vers ces comptes. Un compte par opérateur.
            </p>
          </div>
          {!allUsed && (
            <Button onClick={() => setShowAdd(true)}>+ Ajouter un compte</Button>
          )}
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Assurez-vous que le nom du titulaire correspond <strong>exactement</strong> au nom
          enregistré chez l'opérateur, afin d'éviter les rejets de virement.
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="text-center py-6 space-y-2">
              <p className="text-slate-500 text-sm">Aucun compte de paiement enregistré.</p>
              <p className="text-xs text-slate-400">
                Ajoutez vos comptes MTN, Orange Money ou bancaires pour recevoir vos règlements.
              </p>
              <Button className="mt-2" onClick={() => setShowAdd(true)}>
                + Ajouter un compte
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const meta = providerMeta(acc.provider)
              return (
                <Card key={acc.id} className="flex flex-wrap items-center gap-4">
                  <div className="text-2xl shrink-0">{meta.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{meta.label}</span>
                      <Badge color={PROVIDER_COLORS[acc.provider] ?? 'slate'}>
                        {acc.provider}
                      </Badge>
                      {acc.isDefault && (
                        <Badge color="emerald">Par défaut</Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-slate-700 mt-0.5">{acc.accountNumber}</p>
                    <p className="text-xs text-slate-500">{acc.accountHolderName} · {acc.currency}</p>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="secondary" onClick={() => setEditing(acc)}>Modifier</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Supprimer le compte ${meta.label} ? Action irréversible.`))
                          remove.mutate(acc.id)
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal open title="Ajouter un compte de paiement" onClose={() => setShowAdd(false)}>
          <AccountForm
            usedProviders={usedProviders}
            onSave={(data) => create.mutate(data)}
            onClose={() => setShowAdd(false)}
            saving={create.isPending}
          />
        </Modal>
      )}

      {editing && (
        <Modal open title={`Modifier — ${providerMeta(editing.provider).label}`} onClose={() => setEditing(null)}>
          <AccountForm
            initial={editing}
            usedProviders={usedProviders}
            onSave={(data) => update.mutate({ id: editing.id, data })}
            onClose={() => setEditing(null)}
            saving={update.isPending}
          />
        </Modal>
      )}
    </RequirePermission>
  )
}
