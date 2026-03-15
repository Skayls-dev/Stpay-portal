import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface RequirePermissionProps {
  permission: string | string[]
  children: ReactNode
}

export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { hasPermission } = useAuth()

  const required = Array.isArray(permission) ? permission : [permission]
  const allowed = required.some((perm) => hasPermission(perm))

  if (!allowed) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-semibold">Acces refuse</h2>
        <p className="mt-2 text-sm">Vous ne disposez pas de la permission requise pour afficher cette section.</p>
      </div>
    )
  }

  return <>{children}</>
}
