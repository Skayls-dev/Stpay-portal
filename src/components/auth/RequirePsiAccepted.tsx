import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RequirePsiAccepted({ children }: { children?: ReactNode }) {
  const { isMerchant, psiAccepted } = useAuth()
  const location = useLocation()

  if (isMerchant && !psiAccepted) {
    return <Navigate to="/merchant/psi" state={{ from: location.pathname }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
