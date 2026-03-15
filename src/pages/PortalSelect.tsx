// src/pages/PortalSelect.tsx
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PortalSelect() {
  const { isAuthenticated, isSuperAdmin } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'var(--gold)', filter: 'blur(100px)' }}
        />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-[52px] h-[52px] rounded-[14px] flex items-center justify-center
                          font-display font-extrabold text-[18px] text-[#0E0F14]"
               style={{ background: 'linear-gradient(135deg, #F5A623, #E8890A)' }}>
            ST
          </div>
          <h1 className="font-display font-semibold text-[22px] text-[var(--text-primary)] leading-tight">
            ST Pay Portal
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            Sélectionnez votre espace de connexion
          </p>
        </div>

        {/* Portal cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/admin/login"
            className="group block bg-[var(--bg-raised)] border border-[var(--border-soft)]
                       rounded-[var(--radius-lg)] p-6 text-left transition-all duration-200
                       hover:border-[var(--blue)] hover:bg-[var(--blue-bg)]"
          >
            {/* Icon */}
            <div className="mb-4 w-9 h-9 rounded-[8px] flex items-center justify-center
                            bg-[var(--blue-bg)] border border-[rgba(59,130,246,0.2)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1.5" fill="var(--blue)" opacity="0.8" />
                <rect x="10" y="2" width="6" height="6" rx="1.5" fill="var(--blue)" opacity="0.5" />
                <rect x="2" y="10" width="6" height="6" rx="1.5" fill="var(--blue)" opacity="0.5" />
                <rect x="10" y="10" width="6" height="6" rx="1.5" fill="var(--blue)" opacity="0.3" />
              </svg>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--blue)] mb-1">
              Super Admin
            </p>
            <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)] mb-2">
              Portail Admin
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Gestion globale des marchands, transactions, webhooks et analytiques.
            </p>

            <div className="mt-4 flex items-center gap-1 text-[11px] text-[var(--blue)] font-medium
                            opacity-0 group-hover:opacity-100 transition-opacity">
              Accéder
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>

          <Link
            to="/merchant/login"
            className="group block bg-[var(--bg-raised)] border border-[var(--border-soft)]
                       rounded-[var(--radius-lg)] p-6 text-left transition-all duration-200
                       hover:border-[var(--gold)] hover:bg-[var(--gold-bg)]"
          >
            {/* Icon */}
            <div className="mb-4 w-9 h-9 rounded-[8px] flex items-center justify-center
                            bg-[var(--gold-bg)] border border-[var(--gold-border)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="5" width="14" height="10" rx="2" stroke="var(--gold)" strokeWidth="1.4" />
                <path d="M6 9h3M6 12h5" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="13" cy="10" r="1.5" stroke="var(--gold)" strokeWidth="1.2" />
              </svg>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)] mb-1">
              Marchand
            </p>
            <h2 className="font-display font-semibold text-[16px] text-[var(--text-primary)] mb-2">
              Portail Marchand
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Suivi de vos paiements, statuts, webhooks et données escrow.
            </p>

            <div className="mt-4 flex items-center gap-1 text-[11px] text-[var(--gold)] font-medium
                            opacity-0 group-hover:opacity-100 transition-opacity">
              Accéder
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
          ST Pay · Payment Gateway for West Africa
        </p>
      </div>
    </div>
  )
}
