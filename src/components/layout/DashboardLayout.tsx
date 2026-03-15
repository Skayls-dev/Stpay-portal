import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'

// Accepts both nested-route <Outlet> usage (App.jsx) and direct children (legacy)
export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-surface text-slate-800">
      <Topbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
