import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PortalSelect() {
  const { isAuthenticated, isSuperAdmin } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-2xl rounded-card border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white font-bold text-xl">
            ST
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Choisir votre portail</h1>
          <p className="mt-1 text-sm text-muted">Accedez a l'espace qui correspond a votre profil</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/login"
            className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-brand hover:bg-brand/5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Super admin</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Portail admin</h2>
            <p className="mt-2 text-sm text-slate-600">Gestion globale des marchands, transactions, webhooks et analytics.</p>
          </Link>

          <Link
            to="/merchant/login"
            className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-brand hover:bg-brand/5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Marchand</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Portail marchand</h2>
            <p className="mt-2 text-sm text-slate-600">Suivi de vos paiements, statuts, webhooks et donnees escrow.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
