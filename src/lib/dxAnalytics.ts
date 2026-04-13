type DxStep =
  | 'portal_opened'
  | 'api_key_generated'
  | 'postman_minimal_downloaded'
  | 'first_api_call'
  | 'first_success_payment'

export interface DxActorContext {
  userId?: string
  userName?: string
  role?: 'super_admin' | 'merchant'
  merchantId?: string
}

interface DxSession {
  id: string
  startedAt: number
  lastStep: DxStep
  actor?: DxActorContext
  firstApiCallAt?: number
  firstSuccessPaymentAt?: number
  completedAt?: number
}

interface DxAnalyticsStore {
  version: 1
  currentSessionId?: string
  sessions: DxSession[]
}

export interface DxAnalyticsSummary {
  totalSessions: number
  completedSessions: number
  activeSessions: number
  conversionRate: number
  avgTimeToFirstApiCallMs: number | null
  avgTimeToFirstSuccessPaymentMs: number | null
  dropOffByStep: Array<{ step: DxStep; count: number; label: string }>
  daily: Array<{ date: string; label: string; sessions: number; apiCalls: number; successes: number }>
  actorBreakdown: Array<{ actorKey: string; label: string; role: string; merchantId?: string; sessions: number; completed: number; conversionRate: number }>
}

const STORAGE_KEY = 'stpay_dx_analytics_v1'
const STORAGE_EVENT = 'stpay-dx-analytics-updated'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const SESSION_LIMIT = 100
const DX_SYNC_ENABLED = import.meta.env.VITE_ENABLE_DX_EVENT_SYNC !== 'false'
const DX_SYNC_ENDPOINT = import.meta.env.VITE_DX_ANALYTICS_ENDPOINT || `${import.meta.env.VITE_API_BASE || 'http://localhost:5169'}/api/analytics/dx-events`

const STEP_ORDER: DxStep[] = [
  'portal_opened',
  'api_key_generated',
  'postman_minimal_downloaded',
  'first_api_call',
  'first_success_payment',
]

const STEP_LABELS: Record<DxStep, string> = {
  portal_opened: 'Portail ouvert',
  api_key_generated: 'Clé API générée',
  postman_minimal_downloaded: 'Collection minimale téléchargée',
  first_api_call: 'Premier appel API',
  first_success_payment: 'Premier paiement réussi',
}

function createEmptyStore(): DxAnalyticsStore {
  return { version: 1, sessions: [] }
}

function isBrowserReady() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readStore(): DxAnalyticsStore {
  if (!isBrowserReady()) return createEmptyStore()

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyStore()
    const parsed = JSON.parse(raw) as DxAnalyticsStore
    if (!Array.isArray(parsed.sessions)) return createEmptyStore()
    return {
      version: 1,
      currentSessionId: parsed.currentSessionId,
      sessions: parsed.sessions.filter((session) => typeof session?.id === 'string'),
    }
  } catch {
    return createEmptyStore()
  }
}

function writeStore(store: DxAnalyticsStore) {
  if (!isBrowserReady()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT))
}

function generateSessionId() {
  return `dx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function getDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function actorKey(actor?: DxActorContext) {
  if (actor?.merchantId) return `merchant:${actor.merchantId}`
  if (actor?.userId) return `user:${actor.userId}`
  return 'anonymous'
}

function actorLabel(actor?: DxActorContext) {
  if (actor?.merchantId) return actor.userName ? `${actor.userName} (${actor.merchantId})` : actor.merchantId
  if (actor?.userName) return actor.userName
  if (actor?.userId) return actor.userId
  return 'Anonyme'
}

function syncDxEvent(step: DxStep, session: DxSession) {
  if (!DX_SYNC_ENABLED || !isBrowserReady()) return

  const payload = JSON.stringify({
    sessionId: session.id,
    step,
    occurredAt: Date.now(),
    actor: session.actor,
    startedAt: session.startedAt,
    firstApiCallAt: session.firstApiCallAt,
    firstSuccessPaymentAt: session.firstSuccessPaymentAt,
  })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(DX_SYNC_ENDPOINT, new Blob([payload], { type: 'application/json' }))
      return
    }
    void fetch(DX_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    })
  } catch {
    // Ignore sync failures: local analytics remains source of truth in fallback mode.
  }
}

function getStepRank(step: DxStep) {
  return STEP_ORDER.indexOf(step)
}

function withStore(update: (store: DxAnalyticsStore) => DxAnalyticsStore) {
  const next = update(readStore())
  writeStore(next)
  return next
}

function ensureActiveSession(store: DxAnalyticsStore, actor?: DxActorContext) {
  const now = Date.now()
  const sessions = store.sessions.filter((session) => now - session.startedAt <= SESSION_TTL_MS)
  let current = sessions.find((session) => session.id === store.currentSessionId)

  if (!current || current.completedAt) {
    current = {
      id: generateSessionId(),
      startedAt: now,
      lastStep: 'portal_opened',
      actor,
    }
    sessions.push(current)
    syncDxEvent('portal_opened', current)
  } else if (actor && JSON.stringify(current.actor) !== JSON.stringify(actor)) {
    current = { ...current, actor }
    const idx = sessions.findIndex((session) => session.id === current?.id)
    if (idx >= 0) sessions[idx] = current
  }

  return {
    version: 1 as const,
    currentSessionId: current.id,
    sessions: sessions.slice(-SESSION_LIMIT),
  }
}

export function startDxSession(actor?: DxActorContext) {
  withStore((store) => ensureActiveSession(store, actor))
}

export function markDxStep(step: DxStep, actor?: DxActorContext) {
  withStore((store) => {
    const ensured = ensureActiveSession(store, actor)
    let syncedSession: DxSession | undefined
    const sessions = ensured.sessions.map((session) => {
      if (session.id !== ensured.currentSessionId) return session
      if (getStepRank(step) <= getStepRank(session.lastStep)) return session
      const updated = { ...session, lastStep: step, actor: actor || session.actor }
      syncedSession = updated
      return updated
    })
    if (syncedSession) syncDxEvent(step, syncedSession)
    return { ...ensured, sessions }
  })
}

export function recordDxFirstApiCall(actor?: DxActorContext) {
  withStore((store) => {
    const ensured = ensureActiveSession(store, actor)
    const now = Date.now()
    let syncedSession: DxSession | undefined
    const sessions = ensured.sessions.map((session) => {
      if (session.id !== ensured.currentSessionId) return session
      const updated = {
        ...session,
        actor: actor || session.actor,
        lastStep: getStepRank('first_api_call') > getStepRank(session.lastStep) ? 'first_api_call' : session.lastStep,
        firstApiCallAt: session.firstApiCallAt ?? now,
      }
      syncedSession = updated
      return updated
    })
    if (syncedSession) syncDxEvent('first_api_call', syncedSession)
    return { ...ensured, sessions }
  })
}

export function recordDxFirstSuccessPayment(actor?: DxActorContext) {
  withStore((store) => {
    const ensured = ensureActiveSession(store, actor)
    const now = Date.now()
    let syncedSession: DxSession | undefined
    const sessions = ensured.sessions.map((session) => {
      if (session.id !== ensured.currentSessionId) return session
      const updated = {
        ...session,
        actor: actor || session.actor,
        lastStep: 'first_success_payment' as DxStep,
        firstApiCallAt: session.firstApiCallAt ?? now,
        firstSuccessPaymentAt: session.firstSuccessPaymentAt ?? now,
        completedAt: session.completedAt ?? now,
      }
      syncedSession = updated
      return updated
    })
    if (syncedSession) syncDxEvent('first_success_payment', syncedSession)
    return { ...ensured, sessions }
  })
}

export function subscribeDxAnalytics(listener: () => void) {
  if (!isBrowserReady()) return () => {}
  const handler = () => listener()
  window.addEventListener(STORAGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function getDxAnalyticsSummary(options?: { days?: number; actor?: DxActorContext }): DxAnalyticsSummary {
  const store = readStore()
  const days = options?.days ?? 14
  const actor = options?.actor
  const sessions = store.sessions.filter((session) => {
    if (!actor) return true
    if (actor.merchantId && session.actor?.merchantId !== actor.merchantId) return false
    if (actor.userId && session.actor?.userId !== actor.userId) return false
    if (actor.role && session.actor?.role !== actor.role) return false
    return true
  })
  const completedSessions = sessions.filter((session) => typeof session.firstSuccessPaymentAt === 'number')
  const apiCallSessions = sessions.filter((session) => typeof session.firstApiCallAt === 'number')
  const activeSessions = sessions.filter((session) => !session.completedAt)

  const avgTimeToFirstApiCallMs = apiCallSessions.length > 0
    ? Math.round(apiCallSessions.reduce((total, session) => total + ((session.firstApiCallAt ?? session.startedAt) - session.startedAt), 0) / apiCallSessions.length)
    : null

  const avgTimeToFirstSuccessPaymentMs = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((total, session) => total + ((session.firstSuccessPaymentAt ?? session.startedAt) - session.startedAt), 0) / completedSessions.length)
    : null

  const dropOffByStep = STEP_ORDER
    .filter((step) => step !== 'first_success_payment')
    .map((step) => ({
      step,
      label: STEP_LABELS[step],
      count: activeSessions.filter((session) => session.lastStep === step).length,
    }))
    .filter((entry) => entry.count > 0)

  const dailyBuckets: Record<string, { sessions: number; apiCalls: number; successes: number }> = {}
  const now = Date.now()
  for (let i = days - 1; i >= 0; i -= 1) {
    const timestamp = now - i * 86_400_000
    dailyBuckets[getDayKey(timestamp)] = { sessions: 0, apiCalls: 0, successes: 0 }
  }
  sessions.forEach((session) => {
    const key = getDayKey(session.startedAt)
    if (!dailyBuckets[key]) return
    dailyBuckets[key].sessions += 1
    if (session.firstApiCallAt) dailyBuckets[key].apiCalls += 1
    if (session.firstSuccessPaymentAt) dailyBuckets[key].successes += 1
  })
  const daily = Object.entries(dailyBuckets).map(([date, value]) => ({
    date,
    label: getDayLabel(date),
    sessions: value.sessions,
    apiCalls: value.apiCalls,
    successes: value.successes,
  }))

  const actors = new Map<string, { label: string; role: string; merchantId?: string; sessions: number; completed: number }>()
  sessions.forEach((session) => {
    const key = actorKey(session.actor)
    const entry = actors.get(key) || {
      label: actorLabel(session.actor),
      role: session.actor?.role || 'unknown',
      merchantId: session.actor?.merchantId,
      sessions: 0,
      completed: 0,
    }
    entry.sessions += 1
    if (session.firstSuccessPaymentAt) entry.completed += 1
    actors.set(key, entry)
  })
  const actorBreakdown = Array.from(actors.entries())
    .map(([key, value]) => ({
      actorKey: key,
      label: value.label,
      role: value.role,
      merchantId: value.merchantId,
      sessions: value.sessions,
      completed: value.completed,
      conversionRate: value.sessions > 0 ? Math.round((value.completed / value.sessions) * 100) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8)

  return {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    activeSessions: activeSessions.length,
    conversionRate: sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0,
    avgTimeToFirstApiCallMs,
    avgTimeToFirstSuccessPaymentMs,
    dropOffByStep,
    daily,
    actorBreakdown,
  }
}

export function formatDxDuration(ms: number | null) {
  if (ms === null) return '—'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}
