import { useEffect, useState } from 'react'
import type { ApiClientError } from '../../lib/api/client'
import { escrowApi, type EscrowReleaseMode } from '../../lib/api/modules'

export type DemoEscrowStatus = 'held' | 'in_transit' | 'delivered' | 'released' | 'refunded' | 'disputed'

export interface DemoEscrowEvent {
  id: string
  at: string
  actor: 'merchant' | 'client' | 'system'
  message: string
}

export interface DemoEscrowRecord {
  escrowId: string
  txId: string
  orderRef: string
  merchantName: string
  customerName: string
  customerPhone: string
  provider: string
  amount: number
  description: string
  releaseMode: EscrowReleaseMode
  status: DemoEscrowStatus
  pickupCode?: string
  autoReleaseAt?: string
  createdAt: string
  updatedAt: string
  source: 'backend' | 'local'
  events: DemoEscrowEvent[]
}

interface DemoEscrowState {
  activeEscrowId: string | null
  records: DemoEscrowRecord[]
}

interface PublishEscrowInput {
  escrowId: string
  txId: string
  orderRef: string
  merchantName: string
  customerName: string
  customerPhone: string
  provider: string
  amount: number
  description: string
  releaseMode: EscrowReleaseMode
  status?: string
  pickupCode?: string
  autoReleaseAt?: string
  source?: 'backend' | 'local'
}

interface BackendEscrowResponse {
  id?: string
  transactionId?: string
  releaseMode?: string
  status?: string
  pickupCode?: string | null
  autoReleaseAt?: string | null
  createdAt?: string
  updatedAt?: string
}

const STORAGE_KEY = 'stpay_demo_escrow_state'
const EVENT_NAME = 'stpay:demo-escrow-updated'

const EMPTY_STATE: DemoEscrowState = { activeEscrowId: null, records: [] }

function nowIso() {
  return new Date().toISOString()
}

function makeEvent(actor: DemoEscrowEvent['actor'], message: string): DemoEscrowEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: nowIso(),
    actor,
    message,
  }
}

function normalizeStatus(status?: string): DemoEscrowStatus {
  switch ((status || '').toLowerCase()) {
    case 'held':
      return 'held'
    case 'intransit':
    case 'in_transit':
      return 'in_transit'
    case 'delivered':
      return 'delivered'
    case 'released':
      return 'released'
    case 'refunded':
      return 'refunded'
    case 'disputed':
      return 'disputed'
    default:
      return 'held'
  }
}

function readState(): DemoEscrowState {
  if (typeof window === 'undefined') {
    return EMPTY_STATE
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return EMPTY_STATE
    }

    const parsed = JSON.parse(raw) as Partial<DemoEscrowState>
    if (!parsed || typeof parsed !== 'object') {
      return EMPTY_STATE
    }

    return {
      activeEscrowId: typeof parsed.activeEscrowId === 'string' ? parsed.activeEscrowId : parsed.records?.[0]?.escrowId ?? null,
      records: Array.isArray(parsed.records) ? parsed.records : [],
    }
  } catch {
    return EMPTY_STATE
  }
}

function writeState(state: DemoEscrowState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function generatePickupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getEscrowDemoState() {
  return readState()
}

function sortRecords(records: DemoEscrowRecord[]) {
  return records.slice().sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function withActiveState(records: DemoEscrowRecord[], activeEscrowId?: string | null): DemoEscrowState {
  const nextRecords = sortRecords(records)
  const preferredId = activeEscrowId ?? nextRecords[0]?.escrowId ?? null
  const nextActiveId = nextRecords.some((record) => record.escrowId === preferredId)
    ? preferredId
    : nextRecords[0]?.escrowId ?? null

  return {
    activeEscrowId: nextActiveId,
    records: nextRecords,
  }
}

function getActiveRecord(state: DemoEscrowState) {
  return state.records.find((record) => record.escrowId === state.activeEscrowId) ?? state.records[0] ?? null
}

function upsertRecord(record: DemoEscrowRecord, makeActive = true) {
  const state = readState()
  const remaining = state.records.filter((item) => item.escrowId !== record.escrowId)
  const nextState = withActiveState([record, ...remaining], makeActive ? record.escrowId : state.activeEscrowId)
  writeState(nextState)
  return record
}

function replaceActiveRecord(nextRecord: DemoEscrowRecord | null) {
  const state = readState()
  const active = getActiveRecord(state)
  if (!active || !nextRecord) {
    return null
  }

  const remaining = state.records.filter((record) => record.escrowId !== active.escrowId)
  const nextState = withActiveState([nextRecord, ...remaining], nextRecord.escrowId)
  writeState(nextState)
  return nextRecord
}

function appendEvent(record: DemoEscrowRecord, actor: DemoEscrowEvent['actor'], message: string) {
  return {
    ...record,
    updatedAt: nowIso(),
    events: [...record.events, makeEvent(actor, message)],
  }
}

function toReleaseMode(value?: string): EscrowReleaseMode {
  if (value === 'auto_timeout' || value === 'dual_confirm' || value === 'pickup_code') {
    return value
  }

  return 'pickup_code'
}

function mergeBackendResponse(record: DemoEscrowRecord, payload: BackendEscrowResponse, actor: DemoEscrowEvent['actor'], message: string) {
  return appendEvent(
    {
      ...record,
      escrowId: payload.id || record.escrowId,
      txId: payload.transactionId || record.txId,
      releaseMode: toReleaseMode(payload.releaseMode) || record.releaseMode,
      status: normalizeStatus(payload.status || record.status),
      pickupCode: typeof payload.pickupCode === 'string' ? payload.pickupCode : record.pickupCode,
      autoReleaseAt: payload.autoReleaseAt ?? record.autoReleaseAt,
      createdAt: payload.createdAt || record.createdAt,
      updatedAt: payload.updatedAt || nowIso(),
      source: 'backend',
    },
    actor,
    message,
  )
}

function getErrorMessage(error: unknown) {
  const apiError = error as ApiClientError | undefined
  return apiError?.message || 'Action escrow indisponible'
}

export function publishEscrowDemo(input: PublishEscrowInput) {
  const createdAt = nowIso()
  const releaseMode = input.releaseMode
  const record: DemoEscrowRecord = {
    escrowId: input.escrowId,
    txId: input.txId,
    orderRef: input.orderRef,
    merchantName: input.merchantName,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    provider: input.provider,
    amount: input.amount,
    description: input.description,
    releaseMode,
    status: normalizeStatus(input.status),
    pickupCode: releaseMode === 'pickup_code' ? (input.pickupCode || generatePickupCode()) : undefined,
    autoReleaseAt: input.autoReleaseAt,
    createdAt,
    updatedAt: createdAt,
    source: input.source ?? 'local',
    events: [
      makeEvent('system', `Escrow ${input.escrowId.slice(0, 8)} publié dans la démo ${releaseMode}.`),
    ],
  }

  return upsertRecord(record, true)
}

function updateRecord(mutator: (record: DemoEscrowRecord) => DemoEscrowRecord | null) {
  const state = readState()
  const active = getActiveRecord(state)
  if (!active) {
    return null
  }

  const nextRecord = mutator(active)
  return replaceActiveRecord(nextRecord)
}

export function setActiveEscrow(escrowId: string) {
  const state = readState()
  if (!state.records.some((record) => record.escrowId === escrowId)) {
    return
  }

  writeState(withActiveState(state.records, escrowId))
}

async function runBackendFirst(
  actor: DemoEscrowEvent['actor'],
  backendAction: (record: DemoEscrowRecord) => Promise<BackendEscrowResponse>,
  successMessage: string,
  fallback: (record: DemoEscrowRecord) => DemoEscrowRecord,
  backendFailureMessage: (message: string) => string,
) {
  const state = readState()
  const active = getActiveRecord(state)
  if (!active) {
    return null
  }

  if (active.source === 'backend') {
    try {
      const payload = await backendAction(active)
      return replaceActiveRecord(mergeBackendResponse(active, payload, actor, successMessage))
    } catch (error) {
      const localFallback = appendEvent(fallback(active), 'system', backendFailureMessage(getErrorMessage(error)))
      return replaceActiveRecord(localFallback)
    }
  }

  return replaceActiveRecord(fallback(active))
}

export async function markEscrowShipped() {
  return runBackendFirst(
    'merchant',
    (record) => escrowApi.ship(record.escrowId),
    'Colis expédié, synchronisé avec le backend.',
    (record) => ({
      ...record,
      status: record.status === 'held' ? 'in_transit' : record.status,
      updatedAt: nowIso(),
      events: [...record.events, makeEvent('merchant', 'Colis expédié, escrow en transit.')],
    }),
    (message) => `Backend indisponible, fallback local après ship: ${message}`,
  )
}

export async function confirmEscrowPickup(code: string) {
  const normalizedCode = code.trim()
  return runBackendFirst(
    'client',
    (record) => escrowApi.confirmPickup(record.escrowId, normalizedCode),
    'Code validé et livraison confirmée par le backend.',
    (record) => {
      if (!(record.status === 'held' || record.status === 'in_transit')) {
        return record
      }

      if (record.releaseMode !== 'pickup_code' || !record.pickupCode || record.pickupCode !== normalizedCode) {
        return appendEvent(record, 'client', 'Tentative de confirmation avec un code invalide.')
      }

      return {
        ...record,
        status: 'delivered',
        updatedAt: nowIso(),
        events: [...record.events, makeEvent('client', 'Code de retrait validé, livraison confirmée.')],
      }
    },
    (message) => `Backend indisponible, fallback local après code client: ${message}`,
  )
}

export async function buyerConfirmEscrow() {
  return runBackendFirst(
    'client',
    (record) => escrowApi.buyerConfirm(record.escrowId),
    'Réception confirmée via le backend.',
    (record) => {
      if (!(record.status === 'held' || record.status === 'in_transit')) {
        return record
      }

      return {
        ...record,
        status: 'delivered',
        updatedAt: nowIso(),
        events: [...record.events, makeEvent('client', 'Réception confirmée par le client.')],
      }
    },
    (message) => `Backend indisponible, fallback local après confirmation client: ${message}`,
  )
}

export async function releaseEscrowFunds() {
  return runBackendFirst(
    'merchant',
    (record) => escrowApi.release(record.escrowId),
    'Fonds libérés via le backend.',
    (record) => {
      if (record.status !== 'delivered') {
        return record
      }

      return {
        ...record,
        status: 'released',
        updatedAt: nowIso(),
        events: [...record.events, makeEvent('merchant', 'Fonds libérés vers le marchand.')],
      }
    },
    (message) => `Backend indisponible, fallback local après release: ${message}`,
  )
}

export async function disputeEscrow(reason: string) {
  const message = reason.trim() || 'Litige ouvert dans la démo.'
  return runBackendFirst(
    'client',
    (record) => escrowApi.openDispute(record.escrowId, message),
    message,
    (record) => {
      if (record.status === 'released' || record.status === 'refunded') {
        return record
      }

      return {
        ...record,
        status: 'disputed',
        updatedAt: nowIso(),
        events: [...record.events, makeEvent('client', message)],
      }
    },
    (errorMessage) => `Backend indisponible, fallback local après litige: ${errorMessage}`,
  )
}

export async function refundEscrow() {
  return runBackendFirst(
    'system',
    (record) => escrowApi.resolveDispute(record.escrowId, 'refund_buyer'),
    'Litige résolu en remboursement acheteur via le backend.',
    (record) => {
      if (record.status !== 'disputed') {
        return record
      }

      return {
        ...record,
        status: 'refunded',
        updatedAt: nowIso(),
        events: [...record.events, makeEvent('system', 'Litige résolu en remboursement acheteur.')],
      }
    },
    (message) => `Backend indisponible, fallback local après remboursement: ${message}`,
  )
}

export function removeActiveEscrowDemo() {
  const state = readState()
  const active = getActiveRecord(state)
  if (!active) {
    return
  }

  const remaining = state.records.filter((record) => record.escrowId !== active.escrowId)
  writeState(withActiveState(remaining, remaining[0]?.escrowId ?? null))
}

export function clearEscrowDemo() {
  writeState(EMPTY_STATE)
}

export function useEscrowDemoState() {
  const [state, setState] = useState<DemoEscrowState>(() => readState())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const sync = () => setState(readState())
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        sync()
      }
    }

    window.addEventListener(EVENT_NAME, sync)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(EVENT_NAME, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return state
}

export async function publishSimulatedEscrowDemo(input: Omit<PublishEscrowInput, 'escrowId' | 'txId' | 'source'>) {
  try {
    const response = await escrowApi.simulate({
      amount: input.amount,
      currency: 'XAF',
      customerPhone: input.customerPhone,
      description: input.description,
      releaseMode: input.releaseMode,
      autoTimeoutDays: input.releaseMode === 'auto_timeout' ? 7 : undefined,
    }) as BackendEscrowResponse

    if (response.id) {
      return publishEscrowDemo({
        ...input,
        escrowId: response.id,
        txId: response.transactionId || `SIM-${Date.now()}`,
        status: response.status,
        pickupCode: response.pickupCode ?? undefined,
        autoReleaseAt: response.autoReleaseAt ?? undefined,
        source: 'backend',
      })
    }
  } catch {
    // Fall back to local-only demo publication.
  }

  return publishEscrowDemo({
    ...input,
    escrowId: crypto.randomUUID(),
    txId: `SIM-${Date.now()}`,
    status: 'held',
    source: 'local',
  })
}

export function useActiveEscrowRecord() {
  const state = useEscrowDemoState()
  return getActiveRecord(state)
}

export function getEscrowStatusLabel(status: DemoEscrowStatus) {
  switch (status) {
    case 'held':
      return 'Held'
    case 'in_transit':
      return 'In transit'
    case 'delivered':
      return 'Delivered'
    case 'released':
      return 'Released'
    case 'refunded':
      return 'Refunded'
    case 'disputed':
      return 'Disputed'
  }
}

export function getEscrowModeLabel(mode: EscrowReleaseMode) {
  switch (mode) {
    case 'pickup_code':
      return 'Code de retrait'
    case 'auto_timeout':
      return 'Auto-timeout'
    case 'dual_confirm':
      return 'Double confirmation'
  }
}