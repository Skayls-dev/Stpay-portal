import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantsApi } from '../lib/api/modules'
import { Card, Badge, DataTable, Button, Modal, Select } from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import type { Merchant } from '../lib/api/modules'
import RequirePermission from '../components/auth/RequirePermission'

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
  toast.success('Copié dans le presse-papiers')
}

function CreateMerchantModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'test' | 'live'>('test')
  const [newKey, setNewKey] = useState('')

  const create = useMutation({
    mutationFn: () => merchantsApi.create({ isTestMode: mode === 'test' }),
    onSuccess: (data) => {
      setNewKey(data.apiKey)
      qc.invalidateQueries({ queryKey: ['merchants'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open title="Créer une clé marchande" onClose={onClose}>
      {!newKey ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type de clé</label>
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'test' | 'live')}>
              <option value="test">Test (sk_test_…)</option>
              <option value="live">Live (sk_live_…)</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? 'Génération…' : 'Générer la clé'}
            </Button>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-emerald-700">Clé générée avec succès !</p>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <code className="flex-1 break-all text-xs text-slate-800">{newKey}</code>
            <Button variant="secondary" onClick={() => copy(newKey)}>Copier</Button>
          </div>
          <p className="text-xs text-amber-700 font-medium">
            Sauvegardez cette clé maintenant — elle ne sera plus affichée en clair.
          </p>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  )
}

function RotateKeyModal({ keyToRotate, onClose }: { keyToRotate: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [newKey, setNewKey] = useState('')

  const rotate = useMutation({
    mutationFn: () =>
      merchantsApi.rotateKey({ currentApiKey: keyToRotate, isTestMode: keyToRotate.includes('test') }),
    onSuccess: (data) => {
      setNewKey(data.apiKey)
      qc.invalidateQueries({ queryKey: ['merchants'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open title="Rotation de clé" onClose={onClose}>
      {!newKey ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            La clé <code className="text-xs">{maskKey(keyToRotate)}</code> sera révoquée et remplacée. Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
              {rotate.isPending ? 'Rotation…' : 'Confirmer la rotation'}
            </Button>
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-emerald-700">Rotation effectuée !</p>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <code className="flex-1 break-all text-xs text-slate-800">{newKey}</code>
            <Button variant="secondary" onClick={() => copy(newKey)}>Copier</Button>
          </div>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  )
}

export default function Merchants() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [rotatingKey, setRotatingKey] = useState<string | null>(null)

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: merchantsApi.list,
  })

  const revoke = useMutation({
    mutationFn: merchantsApi.revokeKey,
    onSuccess: () => {
      toast.success('Clé révoquée')
      qc.invalidateQueries({ queryKey: ['merchants'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: DataTableColumn<Merchant>[] = [
    {
      key: 'merchant',
      header: 'Marchand',
      render: (m) => <span className="text-sm text-slate-700">{m.merchantName || m.merchantId || 'Mon compte'}</span>,
    },
    {
      key: 'mode',
      header: 'Type',
      render: (m) => (
        <Badge color={m.mode === 'live' ? 'emerald' : 'amber'}>{m.mode.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'key',
      header: 'Clé',
      render: (m) => <code className="text-xs text-slate-700">{maskKey(m.key)}</code>,
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => copy(m.key)}>Copier</Button>
          <Button variant="secondary" onClick={() => setRotatingKey(m.key)}>Rotation</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Révoquer cette clé ? Action irréversible.')) revoke.mutate(m.key)
            }}
          >
            Révoquer
          </Button>
        </div>
      ),
    },
  ]

  return (
    <RequirePermission permission="merchants.view_all">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Marchands</h1>
            <p className="text-sm text-muted">Gestion des clés d'API marchandes</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ Nouvelle clé</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <DataTable<Merchant>
            columns={columns}
            data={merchants}
            rowKey={(m) => m.key}
            emptyText="Aucune clé marchande active"
          />
        )}
      </div>

      {showCreate && <CreateMerchantModal onClose={() => setShowCreate(false)} />}
      {rotatingKey && <RotateKeyModal keyToRotate={rotatingKey} onClose={() => setRotatingKey(null)} />}
    </RequirePermission>
  )
}
