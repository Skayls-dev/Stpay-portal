import { useState, useEffect, useRef, useCallback } from 'react'
import client from '../lib/api/client'

export type BackendStatus = 'checking' | 'online' | 'offline'

const POLL_ONLINE_MS  = 30_000
const POLL_OFFLINE_MS = 10_000
const HEALTH_TIMEOUT_MS = 5_000

export function useBackendStatus(): { status: BackendStatus } {
  const [status, setStatus] = useState<BackendStatus>('checking')
  const statusRef = useRef<BackendStatus>('checking')

  const setStatusSynced = (s: BackendStatus) => {
    statusRef.current = s
    setStatus(s)
  }

  const check = useCallback(async () => {
    try {
      await client.get('/api/payment/health', { timeout: HEALTH_TIMEOUT_MS })
      setStatusSynced('online')
    } catch {
      setStatusSynced('offline')
    }
  }, [])

  // Polling loop — interval adapts based on current status
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const loop = async () => {
      if (cancelled) return
      await check()
      if (cancelled) return
      const interval = statusRef.current === 'offline' ? POLL_OFFLINE_MS : POLL_ONLINE_MS
      timer = setTimeout(loop, interval)
    }

    loop()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [check])

  // Also react immediately when any axios request gets a network error
  useEffect(() => {
    const handler = () => setStatusSynced('offline')
    window.addEventListener('stpay:backend-unreachable', handler)
    return () => window.removeEventListener('stpay:backend-unreachable', handler)
  }, [])

  return { status }
}
