// src/pages/Login.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../lib/api/auth'
import client from '../lib/api/client'
import { useAuthStore } from '../stores/authStore'

interface LoginForm { email: string; password: string }
interface LoginProps { portal?: 'admin' | 'merchant' }

const INPUT = (err: boolean) =>
  `w-full rounded-[6px] border px-3.5 py-2.5 text-[13px] outline-none transition-all
   ${err
     ? 'border-[var(--red)] bg-[var(--red-bg)]'
     : 'border-[var(--border-med)] bg-white focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]'}`

export default function Login({ portal = 'merchant' }: LoginProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const from = (location.state as any)?.from ?? ''
  const prefillEmail = (location.state as any)?.prefillEmail || ''
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const isAdmin = portal === 'admin'

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data, { portal })

      const isRoleMismatch =
        (portal === 'merchant' && res.user.role !== 'merchant') ||
        (portal === 'admin' && res.user.role !== 'super_admin')

      if (isRoleMismatch) {
        toast.error(
          portal === 'merchant'
            ? 'Ce compte est admin. Utilisez le portail admin.'
            : 'Ce compte est marchand. Utilisez le portail marchand.',
        )
        return
      }

      login(res.user, res.token, res.apiKey)

      if (res.user.role === 'merchant' && !res.apiKey) {
        try {
          const keysResponse = await client.get('/api/keys')
          const keys = Array.isArray(keysResponse.data?.keys) ? keysResponse.data.keys : []
          const firstKey = keys[0]?.key
          if (typeof firstKey === 'string' && firstKey.trim()) {
            localStorage.setItem('stpay_api_key', firstKey)
          }
        } catch {
          // Non-blocking: merchant can still navigate, and key can be configured later.
        }
      }

      const home = res.user.role === 'super_admin' ? '/admin' : '/merchant'
      const isLogin = ['/login','/admin/login','/merchant/login'].includes(from)
      navigate(!from || from === '/' || isLogin ? home : from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="w-full max-w-sm bg-white border border-[var(--border-med)]
                      rounded-[var(--r-lg)] p-8 shadow-sm">

        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 w-[44px] h-[44px] rounded-[10px]
                          flex items-center justify-center font-extrabold text-[15px] text-white"
               style={{ background: 'var(--orange)' }}>
            ST
          </div>
          <h1 className="font-extrabold text-[20px] text-[var(--text-1)] tracking-tight">
            {isAdmin ? 'Portail Admin' : 'Portail Marchand'}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
            {isAdmin ? 'Espace réservé aux super-administrateurs' : 'Connexion à votre espace marchand'}
          </p>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[11px] font-semibold border
                           ${isAdmin
                             ? 'bg-[var(--blue-bg)] border-[var(--blue-border)] text-[var(--blue)]'
                             : 'bg-[var(--orange-bg)] border-[var(--orange-border)] text-[var(--orange-dark)]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse-slow
              ${isAdmin ? 'bg-[var(--blue)]' : 'bg-[var(--orange)]'}`} />
            {isAdmin ? 'Super Admin' : 'Marchand'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="block mb-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              Adresse e-mail
            </label>
            <input type="email" autoComplete="email" defaultValue={prefillEmail}
              placeholder={isAdmin ? 'admin@stpay.local' : 'merchant@stpay.local'}
              className={INPUT(!!errors.email)}
              {...register('email', {
                required: "L'email est requis",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
              })}
            />
            {errors.email && <p className="mt-1 text-[11px] text-[var(--red)]">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-[12px] font-semibold text-[var(--text-2)]">
              Mot de passe
            </label>
            <input type="password" autoComplete="current-password" placeholder="••••••••"
              className={INPUT(!!errors.password)}
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
              })}
            />
            {errors.password && <p className="mt-1 text-[11px] text-[var(--red)]">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading}
                  className="w-full mt-1 py-2.5 rounded-[6px] text-[13px] font-bold
                             text-white transition-colors disabled:opacity-50"
                  style={{ background: loading ? 'var(--orange)' : 'var(--orange)' }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--orange-dark)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--orange)' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center text-[12px] text-[var(--text-3)] space-y-1.5">
          {!isAdmin ? (
            <>
              <p>Nouveau marchand ?{' '}
                <Link to="/register" className="text-[var(--orange)] hover:text-[var(--orange-dark)] font-semibold">
                  Créer un compte
                </Link>
              </p>
              <p>Vous êtes admin ?{' '}
                <Link to="/admin/login" className="text-[var(--text-2)] hover:text-[var(--text-1)]">
                  Portail admin →
                </Link>
              </p>
            </>
          ) : (
            <p>Vous êtes marchand ?{' '}
              <Link to="/merchant/login" className="text-[var(--orange)] hover:text-[var(--orange-dark)] font-semibold">
                Portail marchand →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
