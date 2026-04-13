import { create } from 'zustand'

export type UserRole = 'super_admin' | 'merchant'

export interface AuthUser {
  id: string
  name: string
  role: UserRole
  merchantId?: string
  permissions: string[]
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    // Marchands
    'merchants.create',
    'merchants.view_all',
    'merchants.rotate_all',
    // Settlements
    'settlements.view_all',
    'settlements.trigger',
    // Transactions
    'transactions.view_all',
    'transactions.refund_all',
    // Webhooks
    'webhooks.view_all',
    'webhooks.replay_all',
    // Escrow
    'escrow.release_manual',
    'escrow.manage_disputes',
    // Système
    'analytics.view_all',
    'providers.view_health',
    'fees.configure',
  ],
  merchant: [
    // Marchands — données propres uniquement
    'merchants.view_own',
    'merchants.view_own_keys',
    // Settlements
    'settlements.view_own',
    // Transactions
    'transactions.view_own',
    'transactions.refund_own',
    // Webhooks
    'webhooks.view_own',
    'webhooks.replay_own',
    // Escrow
    'escrow.view_own',
    // Système
    'analytics.view_own',
    'providers.view_health',
  ],
}

const STORAGE = {
  token: 'stpay_token',
  apiKey: 'stpay_api_key',
  userId: 'stpay_user_id',
  userName: 'stpay_user_name',
  userRole: 'stpay_user_role',
  merchantId: 'stpay_merchant_id',
}

function loadFromStorage(): AuthUser | null {
  try {
    const userId = localStorage.getItem(STORAGE.userId)
    const token = localStorage.getItem(STORAGE.token)
    if (!userId || !token) return null

    const storedRole = localStorage.getItem(STORAGE.userRole) as UserRole
    const role: UserRole =
      storedRole === 'merchant' || storedRole === 'super_admin' ? storedRole : 'super_admin'

    return {
      id: userId,
      name: localStorage.getItem(STORAGE.userName) || '',
      role,
      merchantId: localStorage.getItem(STORAGE.merchantId) || undefined,
      permissions: ROLE_PERMISSIONS[role],
    }
  } catch {
    return null
  }
}

interface AuthStore {
  user: AuthUser | null
  login: (user: Omit<AuthUser, 'permissions'>, token: string, apiKey?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: loadFromStorage(),

  login: (userData, token, apiKey) => {
    localStorage.setItem(STORAGE.token, token)
    if (apiKey) {
      localStorage.setItem(STORAGE.apiKey, apiKey)
    }
    localStorage.setItem(STORAGE.userId, userData.id)
    localStorage.setItem(STORAGE.userName, userData.name)
    localStorage.setItem(STORAGE.userRole, userData.role)
    if (userData.merchantId) {
      localStorage.setItem(STORAGE.merchantId, userData.merchantId)
    } else {
      localStorage.removeItem(STORAGE.merchantId)
    }
    set({ user: { ...userData, permissions: ROLE_PERMISSIONS[userData.role] } })
  },

  logout: () => {
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key))
    set({ user: null })
  },
}))
