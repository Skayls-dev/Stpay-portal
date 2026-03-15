// src/components/layout/Topbar.tsx
// Slim topbar: current page title (from route) + contextual actions.
// Navigation has moved to the Sidebar.

import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { IconSearch, IconPlus } from '../icons/NavIcons'

const ROUTE_LABELS: Record<string, string> = {
  '':           'Vue d\'ensemble',
  'transactions': 'Transactions',
  'merchants':    'Marchands',
  'webhooks':     'Webhooks',
  'analytics':    'Analytics',
  'escrow':       'Escrow',
  'providers':    'Santé API',
  'profile':      'Mon profil',
}

function usePageTitle(): string {
  const { pathname } = useLocation()
  const segments = pathname.replace(/^\//, '').split('/')
  // Last meaningful segment (skip 'admin' / 'merchant')
  const last = segments.filter((s) => s && s !== 'admin' && s !== 'merchant').at(-1) ?? ''
  return ROUTE_LABELS[last] ?? last.charAt(0).toUpperCase() + last.slice(1)
}

export default function Topbar() {
  const { isSuperAdmin } = useAuth()
  const title = usePageTitle()

  return (
    <header className="h-[52px] min-h-[52px] flex items-center px-5 gap-3
                       bg-[var(--bg-raised)] border-b border-[var(--border-soft)]">
      {/* Page title */}
      <h1 className="flex-1 font-display font-semibold text-[14px] text-[var(--text-primary)]">
        {title}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="btn-ghost">
          <IconSearch />
          Rechercher
        </button>

        {/* Only admin can create manual payments */}
        {isSuperAdmin && (
          <button className="btn-gold">
            <IconPlus />
            Nouveau paiement
          </button>
        )}
      </div>
    </header>
  )
}
