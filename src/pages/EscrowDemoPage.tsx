// src/pages/EscrowDemoPage.tsx
// Page publique dédiée à la gestion marchand des escrows
// Route: /demo/escrow

import { Link } from 'react-router-dom'
import EscrowDemoPanel from '../features/escrow-demo/EscrowDemoPanel'

export default function EscrowDemoPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#FFF1E8_0%,#F5F4F0_35%,#EEF4FF_100%)] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">

        <header className="rounded-[18px] border border-[var(--border)] bg-white/85 backdrop-blur p-6 shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">Espace Marchand — Demo</p>
              <h1 className="text-[24px] font-extrabold tracking-tight text-[var(--text-1)]">Gestion Escrow Marchand</h1>
              <p className="mt-1 text-[13px] text-[var(--text-2)]">
                Gérez vos escrows actifs : expédition, libération des fonds, litiges.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/demo/webshop" className="btn-secondary">Côté Client →</Link>
              <span className="st-badge st-badge-orange">Marchand</span>
              <span className="st-badge st-badge-blue">Sandbox</span>
            </div>
          </div>
        </header>

        <EscrowDemoPanel role="merchant" />

      </div>
    </div>
  )
}
