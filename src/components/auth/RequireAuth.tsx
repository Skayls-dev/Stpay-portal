import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Accepts children (layout wrapper pattern) or acts as nested-route guard via <Outlet>
export default function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/merchant/login" state={{ from: location.pathname }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
