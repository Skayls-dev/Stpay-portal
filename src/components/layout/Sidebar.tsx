// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { healthApi } from '../../lib/api/modules'
import {
  IconGrid, IconList, IconCard, IconChart, IconWebhook,
  IconUser, IconHealth, IconProfile, IconChevronDown, IconLogout,
} from '../icons/NavIcons'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  badge?: { text: string; variant: 'red' | 'green' | 'amber' }
  end?: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBadge({ text, variant }: { text: string; variant: 'red' | 'green' | 'amber' }) {
  const styles = {
    red:   'bg-[var(--red-bg)]   text-[var(--red)]',
    green: 'bg-[var(--green-bg)] text-[var(--green)]',
    amber: 'bg-[var(--amber-bg)] text-[var(--amber)]',
  }
  return (
    <span className={`ml-auto px-1.5 py-px rounded-full text-[10px] font-semibold font-mono ${styles[variant]}`}>
      {text}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-3 pb-1 text-[10px] font-medium uppercase tracking-[0.7px] text-[var(--text-muted)]">
      {children}
    </p>
  )
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      title={`Backend ST Pay : ${connected ? 'connecté' : 'déconnecté'}`}
      className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse-slow
        ${connected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const basePath = isSuperAdmin ? '/admin' : '/merchant'

  const { data: health } = useQuery({
    queryKey: ['backend-status'],
    queryFn: healthApi.backendStatus,
    refetchInterval: 15_000,
  })

  const adminNav: NavItem[] = [
    { to: `${basePath}`, label: 'Vue d\'ensemble', icon: <IconGrid />, end: true },
    { to: `${basePath}/transactions`, label: 'Transactions', icon: <IconList />, badge: { text: '247', variant: 'green' } },
  ]

  const adminFinance: NavItem[] = [
    { to: `${basePath}/escrow`, label: 'Escrow', icon: <IconCard />, badge: { text: '3', variant: 'amber' } },
    { to: `${basePath}/analytics`, label: 'Analytics', icon: <IconChart /> },
  ]

  const adminConfig: NavItem[] = [
    { to: `${basePath}/webhooks`, label: 'Webhooks', icon: <IconWebhook />, badge: { text: '2', variant: 'red' } },
    { to: `${basePath}/merchants`, label: 'Marchands', icon: <IconUser /> },
    { to: `${basePath}/providers`, label: 'Santé API', icon: <IconHealth /> },
  ]

  const merchantNav: NavItem[] = [
    { to: `${basePath}`, label: 'Vue d\'ensemble', icon: <IconGrid />, end: true },
    { to: `${basePath}/transactions`, label: 'Transactions', icon: <IconList /> },
  ]

  const merchantConfig: NavItem[] = [
    { to: `${basePath}/escrow`, label: 'Escrow', icon: <IconCard /> },
    { to: `${basePath}/analytics`, label: 'Analytics', icon: <IconChart /> },
    { to: `${basePath}/webhooks`, label: 'Webhooks', icon: <IconWebhook /> },
    { to: `${basePath}/profile`, label: 'Mon profil', icon: <IconProfile /> },
  ]

  const sections = isSuperAdmin
    ? [
        { label: 'Principal', items: adminNav },
        { label: 'Finance', items: adminFinance },
        { label: 'Configuration', items: adminConfig },
      ]
    : [
        { label: 'Principal', items: merchantNav },
        { label: 'Outils', items: merchantConfig },
      ]

  const handleLogout = () => {
    const loginPath = isSuperAdmin ? '/admin/login' : '/merchant/login'
    logout()
    navigate(loginPath, { replace: true })
  }

  // Initials avatar
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((w: string) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] bg-[var(--bg-raised)]
                      border-r border-[var(--border-soft)] h-full select-none">

      {/* ── Logo zone ── */}
      <div className="px-4 py-5 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center
                          text-[#0E0F14] font-display font-extrabold text-[13px] tracking-tight
                          flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #F5A623, #E8890A)' }}>
            ST
          </div>
          <div>
            <p className="font-display font-bold text-[15px] text-[var(--text-primary)] leading-none tracking-tight">
              ST Pay
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tracking-wide">
              Payment Gateway
            </p>
          </div>
        </div>

        {/* Environment pill */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full
                        border text-[10px] font-medium font-mono"
             style={{
               background: 'var(--gold-bg)',
               borderColor: 'var(--gold-border)',
               color: 'var(--gold)',
             }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse-slow" />
          LIVE
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="w-4 h-4 flex-shrink-0 opacity-70 [.active_&]:opacity-100">
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

      {/* ── Footer: backend status + user ── */}
      <div className="px-2 pb-3 border-t border-[var(--border-soft)] pt-3 space-y-1">
        {/* Backend status */}
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md">
          <StatusDot connected={Boolean(health?.connected)} />
          <span className="text-[11px] text-[var(--text-muted)]">
            {health?.connected ? 'Backend connecté' : 'Backend hors ligne'}
          </span>
        </div>

        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer
                     transition-colors hover:bg-[var(--bg-overlay)] group"
          onClick={handleLogout}
          title="Se déconnecter"
        >
          {/* Avatar */}
          <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center
                          flex-shrink-0 text-[11px] font-semibold text-white"
               style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-none">
              {user.name || 'Utilisateur'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
              {isSuperAdmin ? 'Super Admin' : 'Marchand'}
            </p>
          </div>

          <IconLogout className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]
                                  transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
