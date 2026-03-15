import { useQuery } from '@tanstack/react-query'
import { NavLink, useNavigate } from 'react-router-dom'
import { healthApi } from '../../lib/api/modules'
import { useAuth } from '../../hooks/useAuth'

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      title={`Backend ST Pay: ${connected ? 'connecte' : 'deconnecte'}`}
      className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
      aria-label={`Backend ST Pay: ${connected ? 'connecte' : 'deconnecte'}`}
    />
  )
}

export default function Topbar() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const basePath = isSuperAdmin ? '/admin' : '/merchant'
  const navItems = isSuperAdmin
    ? [
        { to: `${basePath}`, label: 'Dashboard', end: true },
        { to: `${basePath}/transactions`, label: 'Transactions' },
        { to: `${basePath}/merchants`, label: 'Marchands' },
        { to: `${basePath}/webhooks`, label: 'Webhooks' },
        { to: `${basePath}/analytics`, label: 'Analytics' },
      ]
    : [
        { to: `${basePath}`, label: 'Dashboard', end: true },
        { to: `${basePath}/transactions`, label: 'Transactions' },
        { to: `${basePath}/webhooks`, label: 'Webhooks' },
        { to: `${basePath}/analytics`, label: 'Analytics' },
        { to: `${basePath}/profile`, label: 'Profil' },
      ]

  const { data } = useQuery({
    queryKey: ['backend-status'],
    queryFn: healthApi.backendStatus,
    refetchInterval: 15_000,
  })

  const handleLogout = () => {
    const loginPath = user.role === 'super_admin' ? '/admin/login' : '/merchant/login'
    logout()
    navigate(loginPath, { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {isSuperAdmin ? 'ST Pay Admin' : 'ST Pay Marchand'}
          </h1>
          <p className="text-xs text-slate-500">
            {isSuperAdmin ? 'Pilotage global des transactions et marchands' : 'Suivi de vos paiements et webhooks'}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <StatusDot connected={Boolean(data?.connected)} />
            <span>Etat backend</span>
          </div>
          {/* User badge */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user.name || 'Utilisateur'}</p>
              <p className="text-xs text-muted">{isSuperAdmin ? 'Super Admin' : 'Marchand'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Deconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
