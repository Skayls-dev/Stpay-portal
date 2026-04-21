import client from './client'
import type { UserRole } from '../../hooks/useAuth'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  apiKey?: string
  user: {
    id: string
    name: string
    role: UserRole
    merchantId?: string
    portalRole?: string
  }
  /** true when the email belongs to multiple merchant accounts */
  ambiguous?: boolean
  accounts?: { merchantId: string; merchantName: string }[]
}

export type LoginPortal = 'admin' | 'merchant' | 'auto'

export interface MerchantRegisterPayload {
  name: string
  email: string
  password: string
  webhookUrl?: string
  isTestMode?: boolean
}

export interface MerchantRegisterResponse {
  merchantId: string
  merchantName: string
  email: string
  createdAt: string
}

export const authApi = {
  login: async (
    credentials: LoginCredentials,
    options: { portal?: LoginPortal } = {},
  ): Promise<LoginResponse> => {
    const portal = options.portal ?? 'auto'

    if (portal === 'admin') {
      const response = await client.post<LoginResponse>('/api/admin/login', credentials)
      return response.data
    }

    if (portal === 'merchant') {
      const response = await client.post<LoginResponse>('/api/merchant/login', credentials)
      return response.data
    }

    try {
      const adminResponse = await client.post<LoginResponse>('/api/admin/login', credentials)
      return adminResponse.data
    } catch {
      const merchantResponse = await client.post<LoginResponse>('/api/merchant/login', credentials)
      return merchantResponse.data
    }
  },

  registerMerchant: async (payload: MerchantRegisterPayload): Promise<MerchantRegisterResponse> => {
    const response = await client.post<MerchantRegisterResponse>('/api/merchant/register', payload)
    return response.data
  },

  loginSelect: async (credentials: LoginCredentials, merchantId: string): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/api/merchant/login/select', { ...credentials, merchantId })
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await client.put('/api/merchant/me/password', { currentPassword, newPassword })
  },
}
