import client from './client'
import type { UserRole } from '../../hooks/useAuth'

export const POLL_INTERVAL_TRANSACTIONS = 15_000
export const POLL_INTERVAL_PROVIDERS = 60_000
export const PAYMENT_POLL_INTERVAL_MS = 5_000
export const PAYMENT_POLL_MAX_ATTEMPTS = 12

const PAYMENT_SUCCESS_MARKERS = ['SUCCESSFUL', 'SUCCESS', 'COMPLETED']
const PAYMENT_FAILURE_MARKERS = ['FAILED', 'ERROR', 'REJECTED', 'CANCELLED']

export type EscrowReleaseMode = 'pickup_code' | 'auto_timeout' | 'dual_confirm'

export function buildEscrowPayload(input: {
  enabled: boolean
  releaseMode: EscrowReleaseMode
  autoTimeoutDays?: number
}): PaymentRequest['escrow'] | undefined {
  if (!input.enabled) {
    return undefined
  }

  return {
    enabled: true,
    releaseMode: input.releaseMode,
    ...(typeof input.autoTimeoutDays === 'number' ? { autoTimeoutDays: input.autoTimeoutDays } : {}),
  }
}

export function buildPaymentInitiationPayload(input: {
  amount: number
  currency: string
  provider: string
  customer: {
    phoneNumber: string
    email?: string
    name?: string
  }
  merchant: {
    reference: string
    callbackUrl?: string
    name?: string
  }
  description?: string
  metadata?: Record<string, unknown>
  escrow?: PaymentRequest['escrow']
}): PaymentRequest {
  return {
    amount: input.amount,
    currency: input.currency,
    provider: input.provider,
    customer: input.customer,
    merchant: input.merchant,
    ...(input.description ? { description: input.description } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.escrow ? { escrow: input.escrow } : {}),
  }
}

export function normalizePaymentStatus(status?: string): string {
  return (status || '').toUpperCase()
}

export function isSuccessfulPaymentStatus(status?: string): boolean {
  const normalized = normalizePaymentStatus(status)
  return PAYMENT_SUCCESS_MARKERS.some((marker) => normalized.includes(marker))
}

export function isFailedPaymentStatus(status?: string): boolean {
  const normalized = normalizePaymentStatus(status)
  return PAYMENT_FAILURE_MARKERS.some((marker) => normalized.includes(marker))
}

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
  escrow?: {
    escrowId: string
    status: string
    releaseMode: string
    autoReleaseAt?: string
  }
}

export interface Merchant {
  merchantId?: string
  merchantName?: string
  key: string
  mode: 'test' | 'live'
  createdAt?: string
}

export interface PaymentRequest {
  amount: number
  currency: string
  provider: string
  customer: {
    phoneNumber: string
    email?: string
    name?: string
  }
  merchant: {
    reference: string
    callbackUrl?: string
    name?: string
  }
  description?: string
  metadata?: Record<string, unknown>
  merchantApiKey?: string
  escrow?: {
    enabled: boolean
    releaseMode: EscrowReleaseMode
    autoTimeoutDays?: number
  }
}

export interface PaymentResponse {
  transactionId?: string
  id?: string
  status?: string
  provider?: string
  providerReference?: string
  amount?: number
  currency?: string
  createdAt?: string
  expiresAt?: string
  paymentUrl?: string
  escrow?: {
    escrowId: string
    status: string
    releaseMode: string
    pickupCode?: string
    autoReleaseAt?: string
  }
  [key: string]: unknown
}

export interface MerchantPortalBlockedEmailsConfig {
  defaultBlockedEmails: string[]
  environmentBlockedEmails: string[]
  customBlockedEmails: string[]
  effectiveBlockedEmails: string[]
}

export interface ProviderSummary {
  name: string
  supportedFeatures: string[]
}

export interface DxAnalyticsSummaryDto {
  totalSessions: number
  completedSessions: number
  activeSessions: number
  conversionRate: number
  avgTimeToFirstApiCallMs: number | null
  avgTimeToFirstSuccessPaymentMs: number | null
  dropOffByStep: Array<{ step: string; count: number; label: string }>
  daily: Array<{ date: string; label: string; sessions: number; apiCalls: number; successes: number }>
  actorBreakdown: Array<{ actorKey: string; label: string; role: string; merchantId?: string; sessions: number; completed: number; conversionRate: number }>
}

export interface SettlementItem {
  id: string
  merchantId: string
  merchantName: string
  currency: string
  amount: number
  transactionCount: number
  status: string
  periodFrom: string
  periodTo: string
  createdAt: string
  processedAt?: string
  payoutAccountType?: string
  payoutAccountNumber?: string
  payoutProvider?: string
  origins: SettlementOriginItem[]
  transactions: SettlementTransactionItem[]
  notes?: string
}

export interface SettlementOriginItem {
  provider: string
  transactionCount: number
  amount: number
}

export interface SettlementTransactionItem {
  id: string
  transactionId: string
  transactionRef: string
  provider: string
  currency: string
  amount: number
  completedAt?: string
  createdAt: string
}

export interface BalanceLedgerEntryItem {
  id: string
  merchantId: string
  transactionId?: string
  settlementId?: string
  currency: string
  entryType: string
  availableDelta: number
  pendingDelta: number
  reservedDelta: number
  availableBalanceAfter: number
  pendingBalanceAfter: number
  reservedBalanceAfter: number
  actorType: string
  actorId: string
  reference?: string
  notes?: string
  createdAt: string
}

export interface TransactionStatusHistoryItem {
  id: string
  transactionId: string
  previousStatus?: string
  newStatus: string
  source: string
  actorType: string
  actorId: string
  notes?: string
  createdAt: string
}

interface LedgerListResponse {
  items: BalanceLedgerEntryItem[]
  page: number
  pageSize: number
  totalCount: number
}

interface SettlementListResponse {
  items: SettlementItem[]
  page: number
  pageSize: number
  totalCount: number
}

interface TransactionSummaryDto {
  transactionRef: string
  provider: string
  amount?: number
  currency: string
  status: string
  merchantId?: string
  merchantName?: string
  merchantRef?: string
  createdAt?: string
  completedAt?: string
}

interface PagedTransactionSummaryDto {
  data: TransactionSummaryDto[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface PaymentStatusDto {
  transactionId: string
  provider: string
  amount?: number
  currency: string
  status: string
  createdAt?: string
  completedAt?: string
  additionalData?: {
    paymentUrl?: string
    escrow?: {
      escrowId?: string
      status?: string
      releaseMode?: string
      autoReleaseAt?: string
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toTransactionFromSummary = (item: TransactionSummaryDto): Transaction => ({
  id: item.transactionRef,
  transactionId: item.transactionRef,
  provider: item.provider,
  amount: Number(item.amount ?? 0),
  currency: item.currency,
  status: item.status,
  merchantId: item.merchantId ?? item.merchantRef,
  merchantName: item.merchantName,
  createdAt: item.createdAt,
  updatedAt: item.completedAt,
})

const parseTransactionListPayload = (payload: unknown): Transaction[] => {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('Invalid /api/payment contract: expected paged payload with data[]')
  }

  return (payload as PagedTransactionSummaryDto).data.map((item) => toTransactionFromSummary(item))
}

const parseTransactionStatusPayload = (payload: unknown): Transaction | null => {
  if (!isRecord(payload) || typeof payload.transactionId !== 'string') {
    throw new Error('Invalid /api/payment/{id} contract: expected payment status object')
  }

  const dto = payload as PaymentStatusDto
  const escrowSource = dto.additionalData?.escrow

  return {
    id: dto.transactionId,
    transactionId: dto.transactionId,
    provider: dto.provider,
    amount: Number(dto.amount ?? 0),
    currency: dto.currency,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.completedAt,
    paymentUrl: typeof dto.additionalData?.paymentUrl === 'string' ? dto.additionalData.paymentUrl : undefined,
    escrow:
      escrowSource && escrowSource.escrowId && escrowSource.status && escrowSource.releaseMode
        ? {
            escrowId: escrowSource.escrowId,
            status: escrowSource.status,
            releaseMode: escrowSource.releaseMode,
            autoReleaseAt: escrowSource.autoReleaseAt,
          }
        : undefined,
  }
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
    let txs = parseTransactionListPayload(response.data)

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
    return parseTransactionStatusPayload(response.data)
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

  async dxSummary(days = 14) {
    const response = await client.get(`/api/analytics/dx-summary?days=${days}`)
    return response.data as DxAnalyticsSummaryDto
  },
}

export const merchantsApi = {
  async list(): Promise<Merchant[]> {
    const response = await client.get('/api/keys')
    if (!isRecord(response.data) || !Array.isArray(response.data.keys)) {
      throw new Error('Invalid /api/keys contract: expected keys[]')
    }

    return (response.data.keys as Array<Record<string, unknown>>).map((item) => ({
      merchantId: typeof item.merchantId === 'string' ? item.merchantId : undefined,
      merchantName: typeof item.merchantName === 'string' ? item.merchantName : undefined,
      key: String(item.key || ''),
      mode: (String(item.mode || 'test') as 'test' | 'live'),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    }))
  },

  async getProfile() {
    const response = await client.get('/api/merchant/me')
    return response.data as {
      merchantId: string
      merchantName: string
      kycStatus: string
      legalName?: string
      businessEmail?: string
      phoneNumber?: string
      registrationNumber?: string
      taxId?: string
      addressLine1?: string
      city?: string
      homeCountryCode?: string
      businessSector?: string
      websiteUrl?: string
      webhookUrl?: string
      updatedAt?: string
    }
  },

  async updateProfile(data: {
    name?: string
    legalName?: string
    businessEmail?: string
    phoneNumber?: string
    registrationNumber?: string
    taxId?: string
    addressLine1?: string
    city?: string
    homeCountryCode?: string
    businessSector?: string
    websiteUrl?: string
    webhookUrl?: string
  }) {
    const response = await client.put('/api/merchant/me', data)
    return response.data
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

  async getSessions(): Promise<PortalSession[]> {
    const response = await client.get('/api/merchant/me/sessions')
    return (response.data?.sessions ?? []) as PortalSession[]
  },

  async getMembers(): Promise<MerchantMember[]> {
    const response = await client.get('/api/merchant/me/members')
    return (response.data?.members ?? []) as MerchantMember[]
  },

  async inviteMember(data: {
    email: string
    password: string
    role?: 'owner' | 'developer' | 'member'
    displayName?: string
  }): Promise<MerchantMember> {
    const response = await client.post('/api/merchant/me/members', data)
    return response.data as MerchantMember
  },

  async sendInvitation(data: {
    email: string
    role?: 'owner' | 'developer' | 'member'
    displayName?: string
  }): Promise<{ message: string }> {
    const response = await client.post('/api/merchant/me/invitations', data)
    return response.data
  },

  async getInvitation(token: string): Promise<{
    email: string
    merchantName: string
    role: string
    displayName?: string
    expiresAt: string
  }> {
    const response = await client.get(`/api/merchant/invite/info?token=${encodeURIComponent(token)}`)
    return response.data
  },

  async acceptInvitation(data: {
    token: string
    password: string
    displayName?: string
  }): Promise<{
    token: string
    user: { id: string; name: string; role: string; merchantId: string; portalRole: string; psiAccepted?: boolean }
    email: string
  }> {
    const response = await client.post('/api/merchant/invite/accept', data)
    return response.data
  },

  async removeMember(userId: string): Promise<void> {
    await client.delete(`/api/merchant/me/members/${userId}`)
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

  async listProviders(): Promise<ProviderSummary[]> {
    try {
      const response = await client.get('/api/payment/providers')
      const payload = response.data as { items?: Array<{ name?: string; supportedFeatures?: string[] }> }
      if (!Array.isArray(payload?.items)) {
        throw new Error('Invalid /api/payment/providers contract: expected items[]')
      }

      return payload.items
        .filter((item) => typeof item?.name === 'string' && item.name.trim().length > 0)
        .map((item) => ({
          name: String(item.name).toUpperCase(),
          supportedFeatures: Array.isArray(item.supportedFeatures)
            ? item.supportedFeatures.map((feature) => String(feature))
            : [],
        }))
    } catch {
      return [
        { name: 'MTN', supportedFeatures: [] },
        { name: 'ORANGE', supportedFeatures: [] },
        { name: 'WAVE', supportedFeatures: [] },
        { name: 'MOOV', supportedFeatures: [] },
      ]
    }
  },

  async provider(name: string) {
    try {
      const response = await client.get(`/api/payment/providers/${name}/health`)
      const providerStatus = String(response.data?.status || response.data?.Status || '').toLowerCase()
      return {
        name,
        status: providerStatus === 'available' || providerStatus === 'healthy' || providerStatus === 'up'
          ? ('up' as const)
          : ('down' as const),
      }
    } catch {
      return { name, status: 'down' as const }
    }
  },

  async allProviders() {
    const providers = await this.listProviders()
    const checks = await Promise.all(providers.map((provider) => this.provider(provider.name)))
    return checks.map((check) => ({
      ...check,
      supportedFeatures: providers.find((provider) => provider.name === check.name)?.supportedFeatures ?? [],
    }))
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

export const escrowApi = {
  async list(merchantId?: string, status?: string) {
    const response = await client.get('/api/escrow', {
      params: { merchantId, status },
    })
    return response.data
  },

  async getById(id: string) {
    const response = await client.get(`/api/escrow/${id}`)
    return response.data
  },

  async ship(id: string) {
    const response = await client.post(`/api/escrow/${id}/ship`)
    return response.data
  },

  async confirmPickup(id: string, pickupCode: string) {
    const response = await client.post(`/api/escrow/${id}/confirm-pickup`, { pickupCode })
    return response.data
  },

  async buyerConfirm(id: string) {
    const response = await client.post(`/api/escrow/${id}/buyer-confirm`)
    return response.data
  },

  async release(id: string) {
    const response = await client.post(`/api/escrow/${id}/release`)
    return response.data
  },

  async openDispute(id: string, reason: string) {
    const response = await client.post(`/api/escrow/${id}/dispute`, { reason })
    return response.data
  },
}

export interface AdminMerchantApp {
  id: string
  name: string
  description?: string
  mode: 'live' | 'test'
  keyStatus: string
  keyPrefix: string
  lastUsedAt?: string
  createdAt: string
}

export interface AdminMerchantWithApps {
  id: string
  name: string
  kycStatus: string
  apps: AdminMerchantApp[]
}

export interface AdminMerchant {
  id: string
  name: string
  kycStatus: string
  isActive: boolean
  email?: string
  createdAt: string
  updatedAt: string
  appCount: number
  sessionCount: number
}

export interface MerchantsPaginationResponse {
  merchants: AdminMerchant[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface IpAllowlistConfig {
  merchantId: string
  merchantName: string
  restricted: boolean
  allowedIps: string[] | null
}

export interface PortalSession {
  id: string
  email?: string          // present in admin view, absent in merchant own view
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  failureReason: string | null
  createdAt: string
}

export interface MerchantMember {
  userId: string
  email: string
  role: 'owner' | 'developer' | 'member'
  displayName: string | null
  createdAt: string
}

export const adminConfigApi = {
  async getMerchantPortalBlockedEmails(): Promise<MerchantPortalBlockedEmailsConfig> {
    const response = await client.get('/api/admin/config/merchant-portal-blocked-emails')
    return response.data as MerchantPortalBlockedEmailsConfig
  },

  async saveMerchantPortalBlockedEmails(blockedEmails: string[]): Promise<MerchantPortalBlockedEmailsConfig> {
    const response = await client.put('/api/admin/config/merchant-portal-blocked-emails', {
      blockedEmails,
    })
    return response.data as MerchantPortalBlockedEmailsConfig
  },

  async listMerchantApps(): Promise<AdminMerchantWithApps[]> {
    const response = await client.get('/api/admin/config/merchants/apps')
    return (response.data?.merchants ?? response.data) as AdminMerchantWithApps[]
  },

  async listMerchantsPaginated(
    page = 1,
    pageSize = 25,
    search?: string,
    kycStatus?: string,
    isActive?: boolean,
    sortBy = 'name',
    sortDir = 'asc',
  ): Promise<MerchantsPaginationResponse> {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('pageSize', String(pageSize))
    if (search) params.append('search', search)
    if (kycStatus) params.append('kycStatus', kycStatus)
    if (isActive !== undefined) params.append('isActive', String(isActive))
    params.append('sortBy', sortBy)
    params.append('sortDir', sortDir)

    const response = await client.get(`/api/admin/config/merchants?${params.toString()}`)
    return response.data as MerchantsPaginationResponse
  },

  async adminRotateApp(merchantId: string, appId: string): Promise<{ appId: string; newKey: string }> {
    const response = await client.post(`/api/admin/config/merchants/${merchantId}/apps/${appId}/rotate`)
    return response.data
  },

  async adminRevokeApp(merchantId: string, appId: string): Promise<{ revoked: boolean }> {
    const response = await client.delete(`/api/admin/config/merchants/${merchantId}/apps/${appId}`)
    return response.data
  },

  async getIpAllowlist(merchantId: string): Promise<IpAllowlistConfig> {
    const response = await client.get(`/api/admin/config/merchants/${merchantId}/ip-allowlist`)
    return response.data as IpAllowlistConfig
  },

  async setIpAllowlist(merchantId: string, allowedIps: string[]): Promise<IpAllowlistConfig> {
    const response = await client.put(`/api/admin/config/merchants/${merchantId}/ip-allowlist`, {
      allowedIps,
    })
    return response.data as IpAllowlistConfig
  },

  async getMerchantSessions(merchantId: string): Promise<PortalSession[]> {
    const response = await client.get(`/api/admin/config/merchants/${merchantId}/sessions`)
    return (response.data?.sessions ?? []) as PortalSession[]
  },
}

export const settlementsApi = {
  async listAll(page = 1, pageSize = 20) {
    const response = await client.get('/api/settlements', {
      params: { page, pageSize },
    })
    return response.data as SettlementListResponse
  },

  async listMine() {
    const response = await client.get('/api/settlements/me')
    return response.data as SettlementItem[]
  },

  async getTransactions(settlementId: string) {
    const response = await client.get(`/api/settlements/${settlementId}/transactions`)
    return response.data as SettlementTransactionItem[]
  },

  async trigger(input: { merchantId: string; currency: string; notes?: string; payoutAccountId?: string }) {
    const response = await client.post('/api/settlements/trigger', input)
    return response.data as {
      settlementId: string
      amount: number
      currency: string
      transactionCount: number
      status: string
      createdAt: string
    }
  },

  async getPayoutAccount(merchantId: string) {
    const response = await client.get(`/api/settlements/merchants/${merchantId}/payout-account`)
    return response.data as {
      merchantId: string
      accounts: Array<{
        id: string
        provider: string
        accountNumber: string
        accountHolderName: string
        currency: string
        isDefault: boolean
      }>
    }
  },

  async markProcessed(settlementId: string, notes?: string) {
    const response = await client.patch(`/api/settlements/${settlementId}/mark-processed`, { notes })
    return response.data as { settlementId: string; processedAt?: string; notes?: string }
  },

  async forceCompletePending(input: { merchantId: string; provider?: string; limit?: number }) {
    const response = await client.post('/api/settlements/dev/force-complete-pending', input)
    return response.data as { forced: number; refs: string[] }
  },

  async updatePayoutAccount(input: {
    merchantId: string
    accountType: 'MOBILE_MONEY' | 'BANK'
    accountNumber: string
    provider: string
  }) {
    const response = await client.put(
      `/api/settlements/merchants/${input.merchantId}/payout-account`,
      {
        accountType: input.accountType,
        accountNumber: input.accountNumber,
        provider: input.provider,
      },
    )
    return response.data as {
      merchantId: string
      accountType: string
      accountNumber: string
      provider: string
    }
  },

  async ledger(input?: { merchantId?: string; currency?: string; page?: number; pageSize?: number }) {
    const response = await client.get('/api/settlements/ledger', {
      params: {
        merchantId: input?.merchantId,
        currency: input?.currency,
        page: input?.page ?? 1,
        pageSize: input?.pageSize ?? 50,
      },
    })
    return response.data as LedgerListResponse
  },

  async transactionStatusHistory(transactionId: string) {
    const response = await client.get(`/api/settlements/transactions/${transactionId}/status-history`)
    return response.data as TransactionStatusHistoryItem[]
  },
}

export interface PayoutAccount {
  id: string
  provider: string
  accountNumber: string
  accountHolderName: string
  currency: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export const payoutAccountsApi = {
  async list(): Promise<PayoutAccount[]> {
    const response = await client.get('/api/merchant/payout-accounts')
    return (response.data?.accounts ?? response.data) as PayoutAccount[]
  },

  async create(payload: Omit<PayoutAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayoutAccount> {
    const response = await client.post('/api/merchant/payout-accounts', payload)
    return response.data as PayoutAccount
  },

  async update(id: string, payload: Omit<PayoutAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayoutAccount> {
    const response = await client.put(`/api/merchant/payout-accounts/${id}`, payload)
    return response.data as PayoutAccount
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/api/merchant/payout-accounts/${id}`)
  },
}

// ── KRI types ────────────────────────────────────────────────────────────────

export interface KriSeries {
  labels: Record<string, string>
  value: number | null
}

export interface KriResult {
  id: string
  label: string
  unit: 'percent' | 'count' | 'seconds'
  value: number | null
  status: 'ok' | 'warning' | 'critical' | 'unknown' | 'unavailable'
  warnThreshold: number
  critThreshold: number
  series: KriSeries[]
}

export interface PrometheusAlert {
  labels: Record<string, string>
  annotations: Record<string, string>
  state: string
  activeAt?: string
}

export interface KriDashboardResponse {
  kris: KriResult[]
  activeAlerts: PrometheusAlert[]
}

export const kriApi = {
  async dashboard(): Promise<KriDashboardResponse> {
    const response = await client.get('/api/admin/kri')
    return response.data as KriDashboardResponse
  },
}

export const balanceApi = {
  async get(): Promise<{ availableBalance: number; reservedBalance: number; currency: string }> {
    const response = await client.get('/api/merchant/balance')
    return response.data
  },
}

export interface MerchantApp {
  id: string
  name: string
  description?: string
  mode: 'live' | 'test'
  keyStatus: string
  keyPrefix: string
  lastUsedAt?: string
  createdAt: string
  updatedAt?: string
}

export const appsApi = {
  async list(): Promise<MerchantApp[]> {
    const response = await client.get('/api/apps')
    return (response.data?.apps ?? response.data) as MerchantApp[]
  },

  async create(payload: { name: string; description?: string; isTestMode: boolean }) {
    const response = await client.post('/api/apps', payload)
    return response.data as MerchantApp & { apiKey: string }
  },

  async rotate(id: string, isTestMode = true) {
    const response = await client.post(`/api/apps/${id}/rotate`, null, { params: { isTestMode } })
    return response.data as { id: string; apiKey: string }
  },

  async revoke(id: string) {
    const response = await client.delete(`/api/apps/${id}`)
    return response.data as { revoked: boolean; id: string }
  },
}

// ── Guide Videos ─────────────────────────────────────────────────────────────

export interface GuideVideoConfig {
  guideId: string
  youtubeId: string
  title: string
  description?: string | null
  updatedAt: string
  updatedByAdminId: string
}

export const guideVideosApi = {
  async list(): Promise<GuideVideoConfig[]> {
    try {
      const response = await client.get('/api/guide-videos')
      return (response.data ?? []) as GuideVideoConfig[]
    } catch {
      // Endpoint not yet available (backend not started or old build)
      return []
    }
  },

  async upsert(
    guideId: string,
    payload: { youtubeId: string; title: string; description?: string },
  ): Promise<GuideVideoConfig> {
    const response = await client.put(`/api/guide-videos/${guideId}`, payload)
    return response.data as GuideVideoConfig
  },
}
