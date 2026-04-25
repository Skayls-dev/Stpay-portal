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
    psiAccepted?: boolean
  }
  /** true when the email belongs to multiple merchant accounts */
  ambiguous?: boolean
  accounts?: { merchantId: string; merchantName: string }[]
  /** "totp_required" when the admin has 2FA enabled — challengeToken must be used */
  status?: 'totp_required'
  challengeToken?: string
  totpEnrolled?: boolean
  totpDeadline?: string | null
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

  getMerchantPsiStatus: async (): Promise<{ psiAccepted: boolean; policyFormat?: string; policyVersion?: string }> => {
    const response = await client.get('/api/merchant/me/psi')
    return response.data
  },

  acceptMerchantPsi: async (): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/api/merchant/me/psi/accept')
    return response.data
  },

  adminTotpVerify: async (challengeToken: string, code?: string, recoveryCode?: string): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/api/admin/login/totp-verify', {
      challengeToken,
      code,
      recoveryCode,
    })
    return response.data
  },

  adminSetup2fa: async (): Promise<{ secret: string; uri: string }> => {
    const response = await client.get<{ secret: string; uri: string }>('/api/admin/2fa/setup')
    return response.data
  },

  adminConfirm2fa: async (secret: string, code: string): Promise<{ message: string; recoveryCodes: string[] }> => {
    const response = await client.post<{ message: string; recoveryCodes: string[] }>('/api/admin/2fa/confirm', { secret, code })
    return response.data
  },

  admin2faStatus: async (): Promise<{
    totpEnabled: boolean
    totpDeadline?: string | null
    daysRemaining?: number | null
    recoveryCodesRemaining: number
  }> => {
    const response = await client.get('/api/admin/2fa/status')
    return response.data
  },

  adminReset2fa: async (payload: { targetAdminId: string; actorTotpCode: string; reason: string }): Promise<void> => {
    await client.post('/api/admin/2fa/reset', payload)
  },
}
