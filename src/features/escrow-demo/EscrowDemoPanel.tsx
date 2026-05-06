import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EscrowReleaseMode } from '../../lib/api/modules'
import {
  buyerConfirmEscrow,
  clearEscrowDemo,
  confirmEscrowPickup,
  disputeEscrow,
  getEscrowModeLabel,
  getEscrowStatusLabel,
  markEscrowShipped,
  removeActiveEscrowDemo,
  refundEscrow,
  releaseEscrowFunds,
  setActiveEscrow,
  useEscrowDemoState,
} from './store'

type EscrowDemoRole = 'merchant' | 'client'

interface EscrowDemoPanelProps {
  role: EscrowDemoRole
  onPublish?: () => void
  canPublish?: boolean
  onSwitchToMerchant?: () => void
}

function fmtXaf(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} XAF`
}

function statusTone(status?: string) {
  switch (status) {
    case 'released':
      return 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-border)]'
    case 'disputed':
      return 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red-border)]'
    case 'refunded':
      return 'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue-border)]'
    case 'delivered':
      return 'bg-[var(--orange-bg)] text-[var(--orange-dark)] border-[var(--orange-border)]'
    default:
      return 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber-border)]'
  }
}

function sourceTone(source?: 'backend' | 'local') {
  return source === 'backend'
    ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-border)]'
    : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber-border)]'
}

function sourceLabel(source?: 'backend' | 'local') {
  return source === 'backend' ? 'Backend sync' : 'Fallback local'
}

function canBuyerConfirm(releaseMode: EscrowReleaseMode, status?: string) {
  if (!(status === 'held' || status === 'in_transit')) {
    return false
  }

  return releaseMode === 'pickup_code' || releaseMode === 'dual_confirm'
}

export default function EscrowDemoPanel({ role, onPublish, canPublish = false, onSwitchToMerchant }: EscrowDemoPanelProps) {
  const { activeEscrowId, records } = useEscrowDemoState()
  const [pickupCode, setPickupCode] = useState('')
  const [clientMessage, setClientMessage] = useState('')

  const active = useMemo(
    () => records.find((record) => record.escrowId === activeEscrowId) ?? records[0] ?? null,
    [activeEscrowId, records],
  )

  const timeline = useMemo(() => (active?.events ?? []).slice().reverse(), [active])

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Simulation escrow end-to-end</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${role === 'merchant' ? 'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue-border)]' : 'bg-[var(--orange-bg)] text-[var(--orange-dark)] border-[var(--orange-border)]'}`}>
          {role === 'merchant' ? 'Vue marchand' : 'Vue client'}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {!active && (
          <>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-[12px] text-[var(--text-2)]">
              {role === 'merchant'
                ? 'Crée un paiement escrow dans le simulateur pour publier automatiquement une commande de démonstration visible côté client.'
                : 'Aucune commande escrow active. Lance un paiement escrow depuis le simulateur marchand pour voir le parcours client ici.'}
            </div>

            {role === 'merchant' && canPublish && onPublish && (
              <button type="button" className="btn-primary w-full justify-center" onClick={onPublish}>
                Publier l'escrow courant
              </button>
            )}

            {role === 'client' && (
              onSwitchToMerchant
                ? <button type="button" className="btn-secondary w-full justify-center" onClick={onSwitchToMerchant}>Ouvrir l'espace marchand</button>
                : <Link to="/demo/escrow" className="btn-secondary w-full justify-center">Ouvrir l'espace marchand</Link>
            )}
          </>
        )}

        {active && (
          <>
            {records.length > 1 && (
              <div className="rounded-[12px] border border-[var(--border)] bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold text-[var(--text-1)]">Historique multi-commandes</p>
                <div className="space-y-2">
                  {records.map((record) => (
                    <button
                      key={record.escrowId}
                      type="button"
                      onClick={() => setActiveEscrow(record.escrowId)}
                      className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left ${record.escrowId === active?.escrowId ? 'border-[var(--orange-border)] bg-[var(--orange-bg)]' : 'border-[var(--border-soft)] bg-[var(--bg-subtle)]'}`}
                    >
                      <span>
                        <span className="block text-[12px] font-semibold text-[var(--text-1)]">{record.orderRef}</span>
                        <span className="block text-[10px] text-[var(--text-3)]">{record.customerName} · {new Date(record.updatedAt).toLocaleString('fr-FR')}</span>
                      </span>
                      <span className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(record.status)}`}>
                          {getEscrowStatusLabel(record.status)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceTone(record.source)}`}>
                          {sourceLabel(record.source)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-[12px] sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Commande</p>
                <p className="font-semibold text-[var(--text-1)]">{active.orderRef}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Montant</p>
                <p className="font-semibold text-[var(--text-1)]">{fmtXaf(active.amount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Mode</p>
                <p className="font-semibold text-[var(--text-1)]">{getEscrowModeLabel(active.releaseMode)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Statut</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(active.status)}`}>
                    {getEscrowStatusLabel(active.status)}
                  </span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceTone(active.source)}`}>
                    {sourceLabel(active.source)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Client</p>
                <p className="font-semibold text-[var(--text-1)]">{active.customerName}</p>
                <p className="text-[11px] text-[var(--text-3)]">{active.customerPhone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">Marchand</p>
                <p className="font-semibold text-[var(--text-1)]">{active.merchantName}</p>
                <p className="text-[11px] text-[var(--text-3)]">{active.provider}</p>
              </div>
            </div>

            {role === 'merchant' && (
              <div className="space-y-2 rounded-[12px] border border-[var(--border)] bg-white p-3">
                <p className="text-[11px] font-semibold text-[var(--text-1)]">Actions marchand</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { void markEscrowShipped() }} disabled={active.status !== 'held'}>
                    Marquer expédié
                  </button>
                  <button type="button" className="btn-primary" onClick={() => { void releaseEscrowFunds() }} disabled={active.status !== 'delivered'}>
                    Libérer les fonds
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { void disputeEscrow('Litige ouvert par le marchand dans la démo.') }} disabled={active.status === 'released' || active.status === 'refunded'}>
                    Ouvrir un litige
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { void refundEscrow() }} disabled={active.status !== 'disputed'}>
                    Rembourser client
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPublish && onPublish && (
                    <button type="button" className="btn-secondary" onClick={onPublish}>
                      Remplacer par l'escrow courant
                    </button>
                  )}
                  <Link to="/demo/webshop" className="btn-secondary">
                    Voir côté client
                  </Link>
                  <button type="button" className="btn-ghost" onClick={() => removeActiveEscrowDemo()}>
                    Retirer l'escrow actif
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => clearEscrowDemo()}>
                    Vider l'historique
                  </button>
                </div>
              </div>
            )}

            {role === 'client' && (
              <div className="space-y-3 rounded-[12px] border border-[var(--border)] bg-white p-3">
                <p className="text-[11px] font-semibold text-[var(--text-1)]">Actions client</p>

                {active.releaseMode === 'pickup_code' && canBuyerConfirm(active.releaseMode, active.status) && (
                  <div className="space-y-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-[var(--text-2)]">Saisir le code de retrait</span>
                      <input
                        className="sp-input"
                        inputMode="numeric"
                        value={pickupCode}
                        onChange={(event) => setPickupCode(event.target.value)}
                        placeholder="Ex: 123456"
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-primary w-full justify-center"
                      onClick={async () => {
                        const updated = await confirmEscrowPickup(pickupCode)
                        setClientMessage(updated?.status === 'delivered' ? 'Réception confirmée.' : 'Code invalide ou état non compatible.')
                      }}
                    >
                      Confirmer avec le code
                    </button>
                  </div>
                )}

                {active.releaseMode === 'dual_confirm' && canBuyerConfirm(active.releaseMode, active.status) && (
                  <button type="button" className="btn-primary w-full justify-center" onClick={() => { void buyerConfirmEscrow() }}>
                    Confirmer la réception
                  </button>
                )}

                {active.releaseMode === 'auto_timeout' && (active.status === 'held' || active.status === 'in_transit') && (
                  <div className="rounded-[10px] border border-[var(--blue-border)] bg-[var(--blue-bg)] p-3 text-[11px] text-[var(--blue)]">
                    Libération automatique prévue {active.autoReleaseAt ? `le ${new Date(active.autoReleaseAt).toLocaleString('fr-FR')}` : 'après le délai configuré'}.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { void disputeEscrow('Litige ouvert par le client depuis le webshop.') }} disabled={active.status === 'released' || active.status === 'refunded'}>
                    Signaler un litige
                  </button>
                  {onSwitchToMerchant
                    ? <button type="button" className="btn-secondary" onClick={onSwitchToMerchant}>Espace marchand</button>
                    : <Link to="/demo/escrow" className="btn-secondary">Espace marchand</Link>}
                </div>

                {clientMessage && (
                  <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--text-2)]">
                    {clientMessage}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
              <p className="mb-2 text-[11px] font-semibold text-[var(--text-1)]">Timeline partagée</p>
              <div className="space-y-2 text-[11px]">
                {timeline.map((event) => (
                  <div key={event.id} className="rounded-[8px] border border-[var(--border-soft)] bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--text-1)]">{event.message}</span>
                      <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">{event.actor}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--text-3)]">{new Date(event.at).toLocaleString('fr-FR')}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}