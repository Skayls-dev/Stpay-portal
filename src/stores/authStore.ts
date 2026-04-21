import { create } from 'zustand'

export type UserRole = 'super_admin' | 'merchant'
export type PortalRole = 'owner' | 'developer' | 'member'

export interface AuthUser {
  id: string
  name: string
  role: UserRole
  merchantId?: string
  permissions: string[]
  portalRole?: PortalRole  // only for merchant portal users
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

/**
 * Permissions affinées selon le rôle portail (owner / developer / member).
 * Seulement utilisées quand role === 'merchant'.
 */
export const PORTAL_ROLE_PERMISSIONS: Record<PortalRole, string[]> = {
  owner: [
    // Toutes les permissions marchant
    'merchants.view_own',
    'merchants.view_own_keys',
    'settlements.view_own',
    'transactions.view_own',
    'transactions.refund_own',
    'webhooks.view_own',
    'webhooks.replay_own',
    'escrow.view_own',
    'analytics.view_own',
    'providers.view_health',
  ],
  developer: [
    // Technique : clés API, webhooks, transactions, portail dev
    'merchants.view_own',
    'merchants.view_own_keys',
    'transactions.view_own',
    'webhooks.view_own',
    'webhooks.replay_own',
    'analytics.view_own',
    'providers.view_health',
  ],
  member: [
    // Opérationnel : transactions, escrow, règlements
    'merchants.view_own',
    'transactions.view_own',
    'transactions.refund_own',
    'settlements.view_own',
    'escrow.view_own',
    'analytics.view_own',
  ],
}

const STORAGE = {
  token: 'stpay_token',
  apiKey: 'stpay_api_key',
  userId: 'stpay_user_id',
  userName: 'stpay_user_name',
  userRole: 'stpay_user_role',
  merchantId: 'stpay_merchant_id',
  portalRole: 'stpay_portal_role',
}

function loadFromStorage(): AuthUser | null {
  try {
    const userId = localStorage.getItem(STORAGE.userId)
    const token = localStorage.getItem(STORAGE.token)
    if (!userId || !token) return null

    const storedRole = localStorage.getItem(STORAGE.userRole) as UserRole
    const role: UserRole =
      storedRole === 'merchant' || storedRole === 'super_admin' ? storedRole : 'super_admin'

    const portalRole = (localStorage.getItem(STORAGE.portalRole) as PortalRole) || undefined
    const permissions =
      role === 'merchant' && portalRole
        ? PORTAL_ROLE_PERMISSIONS[portalRole]
        : ROLE_PERMISSIONS[role]

    return {
      id: userId,
      name: localStorage.getItem(STORAGE.userName) || '',
      role,
      merchantId: localStorage.getItem(STORAGE.merchantId) || undefined,
      permissions,
      portalRole,
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
    if (userData.portalRole) {
      localStorage.setItem(STORAGE.portalRole, userData.portalRole)
    } else {
      localStorage.removeItem(STORAGE.portalRole)
    }
    set({
      user: {
        ...userData,
        permissions:
          userData.role === 'merchant' && userData.portalRole
            ? PORTAL_ROLE_PERMISSIONS[userData.portalRole]
            : ROLE_PERMISSIONS[userData.role],
      },
    })
  },

  logout: () => {
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key))
    set({ user: null })
  },
}))
