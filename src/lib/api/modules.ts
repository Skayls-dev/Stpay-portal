import client from './client'
import type { UserRole } from '../../hooks/useAuth'

export const POLL_INTERVAL_TRANSACTIONS = 15_000
export const POLL_INTERVAL_PROVIDERS = 60_000

export interface Transaction {
  id: string
  transactionId: string
  provider: string
  amount: number
  currency: string
  status: string
  merchantId?: string
  merchantName?: string
  createdAt?: string
  updatedAt?: string
  description?: string
  paymentUrl?: string
}

export interface Merchant {
  key: string
  mode: 'test' | 'live'
  createdAt?: string
}

const parseTransactions = (payload: unknown): Transaction[] => {
  const asRecord = payload as Record<string, unknown>
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(asRecord?.items)
      ? asRecord.items
      : Array.isArray(asRecord?.data)
        ? asRecord.data
        : []

  return (list as Array<Record<string, unknown>>).map((item, index) => ({
    id: String(item.id || item.transactionId || index),
    transactionId: String(item.transactionId || item.id || ''),
    provider: String(item.provider || 'N/A'),
    amount: Number(item.amount || 0),
    currency: String(item.currency || 'XAF'),
    status: String(item.status || 'unknown'),
    merchantId: item.merchant && typeof item.merchant === 'object' ? String((item.merchant as Record<string, unknown>).id || '') : undefined,
    merchantName: item.merchant && typeof item.merchant === 'object' ? String((item.merchant as Record<string, unknown>).name || '') : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    description: typeof item.description === 'string' ? item.description : undefined,
    paymentUrl: typeof item.paymentUrl === 'string' ? item.paymentUrl : undefined,
  }))
}

const isOk = (value: unknown): 'up' | 'down' => (value ? 'up' : 'down')

const statusTextMap: Record<string, string> = {
  completed: 'Termine',
  success: 'Reussi',
  successful: 'Reussi',
  pending: 'En attente',
  processing: 'En cours',
  initiated: 'Initie',
  failed: 'Echec',
  error: 'Erreur',
  rejected: 'Rejete',
  cancelled: 'Annule',
  canceled: 'Annule',
}

export const transactionsApi = {
  async list(filters?: { status?: string; provider?: string; merchantId?: string }): Promise<Transaction[]> {
    const response = await client.get('/api/payment')
    let txs = parseTransactions(response.data)

    if (filters?.status && filters.status !== 'all') {
      txs = txs.filter((t) => t.status.toLowerCase() === filters.status?.toLowerCase())
    }

    if (filters?.provider && filters.provider !== 'all') {
      txs = txs.filter((t) => t.provider.toLowerCase() === filters.provider?.toLowerCase())
    }

    if (filters?.merchantId && filters.merchantId !== 'all') {
      txs = txs.filter((t) => t.merchantId === filters.merchantId)
    }

    return txs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  },

  async status(transactionId: string): Promise<Transaction | null> {
    if (!transactionId) return null
    const response = await client.get(`/api/payment/${transactionId}`)
    return parseTransactions([response.data])[0] || null
  },

  getStatusText(status: string): string {
    return statusTextMap[status.toLowerCase()] || status
  },

  getStatusColor(status: string): string {
    const normalized = status.toLowerCase()
    if (['completed', 'success', 'successful'].includes(normalized)) return 'emerald'
    if (['pending', 'processing', 'initiated'].includes(normalized)) return 'amber'
    if (['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(normalized)) return 'red'
    return 'slate'
  },

  displayReference(transaction: Transaction): string {
    const reference = transaction.transactionId || transaction.id
    if (reference.length <= 16) return reference
    return `${reference.slice(0, 8)}...${reference.slice(-6)}`
  },
}

export const analyticsApi = {
  async stats(role: UserRole, merchantId?: string) {
    const transactions = await transactionsApi.list({ merchantId: role === 'merchant' ? merchantId : undefined })

    const base = {
      total: transactions.length,
      completed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0,
    }

    const aggregate = transactions.reduce((acc, tx) => {
      const status = tx.status.toLowerCase()
      if (['completed', 'success', 'successful'].includes(status)) {
        acc.completed += 1
        acc.totalAmount += tx.amount
      } else if (['pending', 'processing', 'initiated'].includes(status)) {
        acc.pending += 1
      } else if (['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(status)) {
        acc.failed += 1
      }
      return acc
    }, base)

    return aggregate
  },

  async recentTransactions(role: UserRole, merchantId?: string) {
    const transactions = await transactionsApi.list({ merchantId: role === 'merchant' ? merchantId : undefined })
    return transactions.slice(0, 8)
  },

  async topMerchants() {
    const transactions = await transactionsApi.list()
    const totals = new Map<string, number>()

    transactions.forEach((tx) => {
      const key = tx.merchantName || tx.merchantId || 'Marchand inconnu'
      totals.set(key, (totals.get(key) || 0) + tx.amount)
    })

    return Array.from(totals.entries())
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  },
}

export const merchantsApi = {
  async list(): Promise<Merchant[]> {
    const response = await client.get('/api/keys')
    const keys = Array.isArray(response.data?.keys) ? response.data.keys : []
    return keys.map((item: Record<string, unknown>) => ({
      key: String(item.key || ''),
      mode: (String(item.mode || 'test') as 'test' | 'live'),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    }))
  },

  async create(input: { isTestMode: boolean }) {
    const response = await client.post(`/api/keys/generate?isTestMode=${input.isTestMode}`)
    return response.data as { apiKey: string; mode: 'test' | 'live'; createdAt?: string }
  },

  async revokeKey(apiKey: string) {
    const response = await client.delete(`/api/keys/revoke?apiKey=${encodeURIComponent(apiKey)}`)
    return response.data
  },

  async rotateKey(input: { currentApiKey: string; isTestMode: boolean }) {
    const response = await client.post(
      `/api/keys/rotate?currentApiKey=${encodeURIComponent(input.currentApiKey)}&isTestMode=${input.isTestMode}`,
    )
    return response.data as { apiKey: string; mode: 'test' | 'live'; createdAt?: string }
  },
}

export const providersHealthApi = {
  async observability() {
    const [health, ready, live, metrics] = await Promise.allSettled([
      client.get('/health'),
      client.get('/health/ready'),
      client.get('/health/live'),
      client.get('/metrics'),
    ])

    return {
      health: isOk(health.status === 'fulfilled'),
      ready: isOk(ready.status === 'fulfilled'),
      live: isOk(live.status === 'fulfilled'),
      metrics: isOk(metrics.status === 'fulfilled'),
      lastChecked: new Date().toLocaleTimeString('fr-FR'),
    }
  },

  async provider(name: string) {
    try {
      await client.get(`/api/payment/providers/${name}/health`)
      return { name, status: 'up' as const }
    } catch {
      return { name, status: 'down' as const }
    }
  },

  async allProviders() {
    const providers = ['MTN', 'ORANGE', 'WAVE', 'MOOV']
    const checks = await Promise.all(providers.map((name) => this.provider(name)))
    return checks
  },
}

export const healthApi = {
  async backendStatus() {
    try {
      await client.get('/api/payment/health')
      return { connected: true }
    } catch {
      return { connected: false }
    }
  },
}
