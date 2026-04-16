import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useBackendStatus } from '../../hooks/useBackendStatus'

export default function BackendStatusBanner() {
  const { status } = useBackendStatus()
  const prevStatus = useRef(status)

  useEffect(() => {
    if (prevStatus.current === 'offline' && status === 'online') {
      toast.success('Connexion au serveur rétablie', { id: 'backend-recovery', duration: 4000 })
    }
    prevStatus.current = status
  }, [status])

  if (status !== 'offline') return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-semibold shrink-0">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      Serveur backend inaccessible — les données affichées peuvent être obsolètes
    </div>
  )
}
