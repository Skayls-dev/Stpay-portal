// src/pages/PortalSelect.tsx
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PortalSelect() {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  if (isAuthenticated) return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-[52px] h-[52px] rounded-[14px]
                          flex items-center justify-center font-extrabold text-[18px] text-white"
               style={{ background: 'var(--orange)' }}>
            ST
          </div>
          <h1 className="font-extrabold text-[22px] text-[var(--text-1)] tracking-tight">
            ST Pay Portal
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-3)]">
            Sélectionnez votre espace de connexion
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/admin/login"
                className="group block bg-white border border-[var(--border)]
                           rounded-[var(--r-lg)] p-6 text-left transition-all duration-150
                           hover:border-[var(--blue-border)] hover:bg-[var(--blue-bg)]">
            <div className="mb-4 w-9 h-9 rounded-[8px] flex items-center justify-center
                            bg-[var(--blue-bg)] border border-[var(--blue-border)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1.5" fill="var(--blue)" opacity=".8"/>
                <rect x="10" y="2" width="6" height="6" rx="1.5" fill="var(--blue)" opacity=".5"/>
                <rect x="2" y="10" width="6" height="6" rx="1.5" fill="var(--blue)" opacity=".5"/>
                <rect x="10" y="10" width="6" height="6" rx="1.5" fill="var(--blue)" opacity=".3"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue)] mb-1">
              Super Admin
            </p>
            <h2 className="font-extrabold text-[16px] text-[var(--text-1)] mb-2 tracking-tight">
              Portail Admin
            </h2>
            <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
              Gestion globale des marchands, transactions, webhooks et analytiques.
            </p>
            <div className="mt-4 flex items-center gap-1 text-[11px] text-[var(--blue)] font-semibold
                            opacity-0 group-hover:opacity-100 transition-opacity">
              Accéder
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>

          <Link to="/merchant/login"
                className="group block bg-white border border-[var(--border)]
                           rounded-[var(--r-lg)] p-6 text-left transition-all duration-150
                           hover:border-[var(--orange-border)] hover:bg-[var(--orange-bg)]">
            <div className="mb-4 w-9 h-9 rounded-[8px] flex items-center justify-center
                            bg-[var(--orange-bg)] border border-[var(--orange-border)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="5" width="14" height="10" rx="2" stroke="var(--orange)" strokeWidth="1.4"/>
                <path d="M6 9h3M6 12h5" stroke="var(--orange)" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="13" cy="10" r="1.5" stroke="var(--orange)" strokeWidth="1.2"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
               style={{ color: 'var(--orange)' }}>
              Marchand
            </p>
            <h2 className="font-extrabold text-[16px] text-[var(--text-1)] mb-2 tracking-tight">
              Portail Marchand
            </h2>
            <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
              Suivi de vos paiements, statuts, webhooks et données escrow.
            </p>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold
                            opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ color: 'var(--orange)' }}>
              Accéder
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--text-4)]">
          ST Pay · Payment Gateway for West Africa
        </p>
      </div>
    </div>
  )
}
