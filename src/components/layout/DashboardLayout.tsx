// src/components/layout/DashboardLayout.tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'
import MerchantPsiGate from '../../pages/MerchantPsiGate'

export default function DashboardLayout() {
  const { isSuperAdmin, isMerchant, psiAccepted } = useAuth()
  const blockMerchantContent = isMerchant && !psiAccepted

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[var(--bg-page)] ${isSuperAdmin ? 'admin-skin' : ''}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-5">
          {!blockMerchantContent ? <Outlet /> : null}
        </main>
      </div>
      {blockMerchantContent && <MerchantPsiGate standalone={false} />}
    </div>
  )
}
