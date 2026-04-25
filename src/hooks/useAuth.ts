// Re-export types so existing imports (e.g. modules.ts) keep working
export type { UserRole, AuthUser } from '../stores/authStore'
export { ROLE_PERMISSIONS } from '../stores/authStore'

import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, login, logout, setPsiAccepted } = useAuthStore()

  const hasPermission = (permission: string) =>
    user?.permissions.includes(permission) ?? false

  return {
    user: user ?? { id: '', name: '', role: 'super_admin' as const, permissions: [], merchantId: undefined },
    role: user?.role ?? ('super_admin' as const),
    isSuperAdmin: user?.role === 'super_admin',
    isMerchant: user?.role === 'merchant',
    psiAccepted: user?.psiAccepted ?? false,
    hasPermission,
    isAuthenticated: user !== null,
    login,
    setPsiAccepted,
    logout,
  }
}
