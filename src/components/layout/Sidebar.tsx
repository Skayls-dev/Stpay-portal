// src/components/layout/Sidebar.tsx
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { healthApi } from '../../lib/api/modules'
import { isGuidesBadgeNewVisible } from '../../lib/constants'
import {
  IconGrid, IconList, IconCard, IconChart, IconWebhook,
  IconUser, IconHealth, IconProfile, IconLogout, IconSim,
} from '../icons/NavIcons'

function IconDev({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4.5 4.5L2 7l2.5 2.5M9.5 4.5L12 7l-2.5 2.5M7.5 3l-1 8"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconGuide({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 2.2h6.8a1.2 1.2 0 011.2 1.2v7.4a1.2 1.2 0 01-1.2 1.2H3.8a1.8 1.8 0 01-1.8-1.8V3.8A1.6 1.6 0 013.6 2.2H11"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 4.6h4.2M4.5 6.7h4.2M4.5 8.8h2.7"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 4.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.9 8.2c.06-.4.1-.8.1-1.2s-.04-.8-.1-1.2l1.2-.9-1.2-2.1-1.4.4a5.2 5.2 0 00-2.1-1.2L8.2.6H5.8l-.3 1.4c-.77.2-1.47.6-2.1 1.2L2 2.8.8 4.9l1.2.9C1.94 6.2 1.9 6.6 1.9 7s.04.8.1 1.2l-1.2.9L2 11.2l1.4-.4c.63.54 1.33.96 2.1 1.2l.3 1.4h2.4l.3-1.4c.77-.2 1.47-.6 2.1-1.2l1.4.4 1.2-2.1-1.2-.9z"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

interface NavItem {
  label: string; icon: React.ReactNode
  to?: string; href?: string; target?: string; rel?: string
  badge?: { text: string; variant: 'red' | 'green' | 'amber' }; end?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
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
    <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.7px] text-[var(--text-4)]">
      {children}
    </p>
  )
}

export default function Sidebar() {
  const { user, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const basePath = isSuperAdmin ? '/admin' : '/merchant'
  const showGuidesNewBadge = isGuidesBadgeNewVisible()

  const { data: health } = useQuery({
    queryKey: ['backend-status'],
    queryFn: healthApi.backendStatus,
    refetchInterval: 15_000,
  })

  const adminSections: NavSection[] = [
    {
      label: 'Pilotage',
      items: [
        { to: basePath, label: "Vue d'ensemble", icon: <IconGrid />, end: true },
        { to: `${basePath}/transactions`, label: 'Transactions globales', icon: <IconList />, badge: { text: '247', variant: 'green' as const } },
        { to: `${basePath}/merchants`,  label: 'Marchands',            icon: <IconUser /> },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: `${basePath}/escrow`,       label: 'Escrow',       icon: <IconCard />, badge: { text: '3', variant: 'amber' as const } },
        { to: `${basePath}/settlements`,  label: 'Settlements',  icon: <IconList /> },
        { to: `${basePath}/traceability`, label: 'Traceability', icon: <IconList /> },
        { to: `${basePath}/analytics`,    label: 'Analytics',    icon: <IconChart /> },
      ],
    },
    {
      label: 'Administration',
      items: [
        { to: `${basePath}/webhooks`,   label: 'Webhooks',   icon: <IconWebhook />, badge: { text: '2', variant: 'red' as const } },
        { to: `${basePath}/providers`,  label: 'Santé API',  icon: <IconHealth /> },
        { to: `${basePath}/config`,     label: 'Config Admin', icon: <IconSettings /> },
      ],
    },
  ]

  const merchantSections: NavSection[] = [
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
        { to: `${basePath}/settlements`, label: 'Settlements', icon: <IconList /> },
        { to: `${basePath}/analytics`, label: 'Analytics', icon: <IconChart /> },
        { to: `${basePath}/webhooks`,  label: 'Webhooks',  icon: <IconWebhook /> },
      ],
    },
    {
      label: 'Développeur',
      items: [
        { to: `${basePath}/developer`, label: 'Developer Portal', icon: <IconDev /> },
        {
          to: `${basePath}/guides`,
          label: 'Guides Integration',
          icon: <IconGuide />,
          ...(showGuidesNewBadge ? { badge: { text: 'NEW', variant: 'amber' as const } } : {}),
        },
        { to: `${basePath}/simulator`, label: 'Simulateur USSD', icon: <IconSim /> },
        { to: `${basePath}/profile`,   label: 'Mon profil',       icon: <IconProfile /> },
      ],
    },
  ]

  const sections = isSuperAdmin ? adminSections : merchantSections
  const initials = (user.name || 'Utilisateur')
    .split(' ').map((w: string) => w[0]?.toUpperCase()).slice(0, 2).join('')

  const handleLogout = () => {
    logout()
    navigate(isSuperAdmin ? '/admin/login' : '/merchant/login', { replace: true })
  }

  return (
    <aside className="flex flex-col w-[210px] min-w-[210px] bg-[var(--bg-card)]
                      border-r border-[var(--border)] h-full select-none">

      <div className="px-4 py-[18px] border-b border-[var(--border-soft)]">
        <Link to="/" className="group flex items-center gap-2.5 rounded-[10px] transition-colors hover:bg-[var(--bg-hover)] px-1 py-1">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center
                          text-white font-extrabold text-[12px] flex-shrink-0"
               style={{ background: 'var(--orange)' }}>
            ST
          </div>
          <div>
            <p className="font-extrabold text-[14px] text-[var(--text-1)] leading-none tracking-tight">ST Pay</p>
            <p className="text-[10px] text-[var(--text-4)] mt-0.5 tracking-wide group-hover:text-[var(--text-3)]">Retour a l'accueil</p>
          </div>
        </Link>
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full
                        text-[10px] font-semibold font-mono border"
             style={{ background: 'var(--orange-bg)', borderColor: 'var(--orange-border)', color: 'var(--orange-dark)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: 'var(--orange)' }} />
          LIVE
        </div>
        <div
          className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] font-semibold border"
          style={isSuperAdmin
            ? { background: 'var(--blue-bg)', borderColor: 'var(--blue-border)', color: 'var(--blue)' }
            : { background: 'var(--green-bg)', borderColor: 'var(--green-border)', color: 'var(--green)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isSuperAdmin ? 'var(--blue)' : 'var(--green)' }}
          />
          {isSuperAdmin ? 'SUPER ADMIN' : 'MARCHAND'}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {sections.map((section) => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.items.map((item) => (
              item.href ? (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.target}
                  rel={item.rel}
                  className="nav-item"
                >
                  <span className="w-[14px] h-[14px] flex-shrink-0 opacity-60">
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge && <NavBadge text={item.badge.text} variant={item.badge.variant} />}
                </a>
              ) : (
                <NavLink
                  key={item.to ?? item.label}
                  to={item.to ?? basePath}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="w-[14px] h-[14px] flex-shrink-0 opacity-60 [.active_&]:opacity-100">
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge && <NavBadge text={item.badge.text} variant={item.badge.variant} />}
                </NavLink>
              )
            ))}
          </div>
        ))}
      </nav>

      <div className="px-2 pb-3 border-t border-[var(--border-soft)] pt-3 space-y-1">
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-slow
            ${health?.connected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
          <span className="text-[11px] text-[var(--text-3)]">
            {health?.connected ? 'Backend connecté' : 'Backend hors ligne'}
          </span>
        </div>
        <div onClick={handleLogout} title="Se déconnecter"
             className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] cursor-pointer
                        transition-colors hover:bg-[var(--bg-hover)] group">
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
          <IconLogout className="text-[var(--text-4)] group-hover:text-[var(--text-2)] transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
