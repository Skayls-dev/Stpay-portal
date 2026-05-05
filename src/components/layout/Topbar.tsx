// src/components/layout/Topbar.tsx
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { IconSearch, IconPlus } from '../icons/NavIcons'

const LABELS: Record<string, string> = {
  '':             "Vue d'ensemble",
  transactions:   'Transactions',
  merchants:      'Marchands',
  webhooks:       'Webhooks',
  analytics:      'Analytics',
  escrow:         'Escrow',
  settlements:    'Settlements',
  traceability:   'Traceability',
  providers:      'Santé API',
  'payout-accounts': 'Comptes de paiement',
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
  const navigate = useNavigate()
  const title = usePageTitle()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchValue = searchParams.get('q') ?? ''

  const onSearchChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    const normalized = value.trim()

    if (normalized) {
      next.set('q', value)
    } else {
      next.delete('q')
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <header className="h-[50px] min-h-[50px] flex items-center px-5 gap-3
                       bg-[var(--bg-card)] border-b border-[var(--border)]">
      <h1 className="flex-1 font-extrabold text-[14px] text-[var(--text-1)] tracking-tight">
        {title}
      </h1>

      {isSuperAdmin && (
        <span className="hidden md:inline-flex items-center rounded-full border border-[var(--orange-border)] bg-[var(--orange-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--orange)]">
          Console Super Admin
        </span>
      )}

      <div className="flex items-center gap-2">
        <label
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--text-1)]
                     bg-white px-3 py-1.5"
          aria-label="Rechercher"
        >
          <IconSearch />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher"
            className="w-36 bg-transparent text-[13px] text-[var(--text-2)] outline-none placeholder:text-[var(--text-3)]"
          />
        </label>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={() => navigate('/demo/webshop')}>
            <IconPlus />
            Simulation
          </button>
        )}
      </div>
    </header>
  )
}
