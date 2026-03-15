// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { healthApi } from '../../lib/api/modules'
import {
  IconGrid, IconList, IconCard, IconChart, IconWebhook,
  IconUser, IconHealth, IconProfile, IconLogout,
} from '../icons/NavIcons'

interface NavItem {
  to: string; label: string; icon: React.ReactNode
  badge?: { text: string; variant: 'red' | 'green' | 'amber' }; end?: boolean
}

function NavBadge({ text, variant }: { text: string; variant: 'red' | 'green' | 'amber' }) {
  const s = {
    red:   'bg-[var(--red-bg)]   text-[var(--red)]',
    green: 'bg-[var(--green-bg)] text-[var(--green)]',
    amber: 'bg-[var(--amber-bg)] text-[var(--amber)]',
  }
  return (
    <span className={`ml-auto px-1.5 py-px rounded-full text-[10px] font-semibold font-mono ${s[variant]}`}>
      {text}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.7px]
                  text-[var(--text-4)]">
      {children}
    </p>
  )
}

export default function Sidebar() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const basePath = isSuperAdmin ? '/admin' : '/merchant'

  const { data: health } = useQuery({
    queryKey: ['backend-status'],
    queryFn: healthApi.backendStatus,
    refetchInterval: 15_000,
  })

  const adminSections = [
    {
      label: 'Principal',
      items: [
        { to: basePath, label: "Vue d'ensemble", icon: <IconGrid />, end: true },
        { to: `${basePath}/transactions`, label: 'Transactions', icon: <IconList />,
          badge: { text: '247', variant: 'green' as const } },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: `${basePath}/escrow`, label: 'Escrow', icon: <IconCard />,
          badge: { text: '3', variant: 'amber' as const } },
        { to: `${basePath}/analytics`, label: 'Analytics', icon: <IconChart /> },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { to: `${basePath}/webhooks`, label: 'Webhooks', icon: <IconWebhook />,
          badge: { text: '2', variant: 'red' as const } },
        { to: `${basePath}/merchants`, label: 'Marchands', icon: <IconUser /> },
        { to: `${basePath}/providers`, label: 'Santé API', icon: <IconHealth /> },
      ],
    },
  ]

  const merchantSections = [
    {
      label: 'Principal',
      items: [
        { to: basePath, label: "Vue d'ensemble", icon: <IconGrid />, end: true },
        { to: `${basePath}/transactions`, label: 'Transactions', icon: <IconList /> },
      ],
    },
    {
      label: 'Outils',
      items: [
        { to: `${basePath}/escrow`,    label: 'Escrow',    icon: <IconCard /> },
        { to: `${basePath}/analytics`, label: 'Analytics', icon: <IconChart /> },
        { to: `${basePath}/webhooks`,  label: 'Webhooks',  icon: <IconWebhook /> },
        { to: `${basePath}/profile`,   label: 'Mon profil',icon: <IconProfile /> },
      ],
    },
  ]

  const sections = isSuperAdmin ? adminSections : merchantSections
  const initials = (user.name || user.email || 'U')
    .split(' ').map((w: string) => w[0]?.toUpperCase()).slice(0, 2).join('')

  const handleLogout = () => {
    logout()
    navigate(isSuperAdmin ? '/admin/login' : '/merchant/login', { replace: true })
  }

  return (
    <aside className="flex flex-col w-[210px] min-w-[210px] bg-[var(--bg-card)]
                      border-r border-[var(--border)] h-full select-none">

      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center
                          text-white font-extrabold text-[12px] flex-shrink-0"
               style={{ background: 'var(--orange)' }}>
            ST
          </div>
          <div>
            <p className="font-extrabold text-[14px] text-[var(--text-1)] leading-none tracking-tight">
              ST Pay
            </p>
            <p className="text-[10px] text-[var(--text-4)] mt-0.5 tracking-wide">
              Payment Gateway
            </p>
          </div>
        </div>

        {/* Env pill */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full
                        text-[10px] font-semibold font-mono border"
             style={{
               background: 'var(--orange-bg)',
               borderColor: 'var(--orange-border)',
               color: 'var(--orange-dark)',
             }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow"
                style={{ background: 'var(--orange)' }} />
          LIVE
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {sections.map((section) => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="w-[14px] h-[14px] flex-shrink-0 opacity-60
                                  [.active_&]:opacity-100">
                  {item.icon}
                </span>
                {item.label}
                {item.badge && (
                  <NavBadge text={item.badge.text} variant={item.badge.variant} />
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 border-t border-[var(--border-soft)] pt-3 space-y-1">
        {/* Backend status */}
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-slow
            ${health?.connected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
          <span className="text-[11px] text-[var(--text-3)]">
            {health?.connected ? 'Backend connecté' : 'Backend hors ligne'}
          </span>
        </div>

        {/* User */}
        <div
          onClick={handleLogout}
          title="Se déconnecter"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] cursor-pointer
                     transition-colors hover:bg-[var(--bg-hover)] group"
        >
          <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center
                          flex-shrink-0 text-[11px] font-bold text-white"
               style={{ background: 'var(--orange)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[var(--text-1)] truncate leading-none">
              {user.name || 'Utilisateur'}
            </p>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5">
              {isSuperAdmin ? 'Super Admin' : 'Marchand'}
            </p>
          </div>
          <IconLogout className="text-[var(--text-4)] group-hover:text-[var(--text-2)]
                                  transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
