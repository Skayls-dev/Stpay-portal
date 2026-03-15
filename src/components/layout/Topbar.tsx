// src/components/layout/Topbar.tsx
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { IconSearch, IconPlus } from '../icons/NavIcons'

const LABELS: Record<string, string> = {
  '':             "Vue d'ensemble",
  transactions:   'Transactions',
  merchants:      'Marchands',
  webhooks:       'Webhooks',
  analytics:      'Analytics',
  escrow:         'Escrow',
  providers:      'Santé API',
  profile:        'Mon profil',
}

function usePageTitle() {
  const { pathname } = useLocation()
  const last = pathname.replace(/^\//, '').split('/')
    .filter((s) => s && s !== 'admin' && s !== 'merchant').at(-1) ?? ''
  return LABELS[last] ?? last.charAt(0).toUpperCase() + last.slice(1)
}

export default function Topbar() {
  const { isSuperAdmin } = useAuth()
  const title = usePageTitle()

  return (
    <header className="h-[50px] min-h-[50px] flex items-center px-5 gap-3
                       bg-[var(--bg-card)] border-b border-[var(--border)]">
      <h1 className="flex-1 font-extrabold text-[14px] text-[var(--text-1)] tracking-tight">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <button className="btn-secondary">
          <IconSearch />
          Rechercher
        </button>
        {isSuperAdmin && (
          <button className="btn-primary">
            <IconPlus />
            Nouveau paiement
          </button>
        )}
      </div>
    </header>
  )
}
