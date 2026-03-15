// src/pages/Login.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../lib/api/auth'
import { useAuthStore } from '../stores/authStore'

interface LoginForm {
  email: string
  password: string
}

interface LoginProps {
  portal?: 'admin' | 'merchant'
}

export default function Login({ portal = 'merchant' }: LoginProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? ''
  const prefillEmail = (location.state as { prefillEmail?: string } | null)?.prefillEmail || ''

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await authApi.login(data, { portal })
      login(response.user, response.token, response.apiKey)
      const defaultHome = response.user.role === 'super_admin' ? '/admin' : '/merchant'
      const isLoginRoute = from === '/login' || from === '/admin/login' || from === '/merchant/login'
      navigate(!from || from === '/' || isLoginRoute ? defaultHome : from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = portal === 'admin'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'var(--gold)', filter: 'blur(120px)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-[var(--bg-raised)] border border-[var(--border-medium)]
                        rounded-[var(--radius-lg)] p-8 shadow-2xl">

          {/* Header */}
          <div className="mb-8 text-center">
            {/* Logo */}
            <div className="mx-auto mb-5 w-[48px] h-[48px] rounded-[12px] flex items-center justify-center
                            font-display font-extrabold text-[16px] text-[#0E0F14]"
                 style={{ background: 'linear-gradient(135deg, #F5A623, #E8890A)' }}>
              ST
            </div>
            <h1 className="font-display font-semibold text-[20px] text-[var(--text-primary)] leading-tight">
              {isAdmin ? 'Portail Admin' : 'Portail Marchand'}
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
              {isAdmin
                ? 'Espace réservé aux super-administrateurs'
                : 'Connexion à votre espace marchand'}
            </p>

            {/* Portal type pill */}
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium
              ${isAdmin
                ? 'bg-[var(--blue-bg)] text-[var(--blue)] border border-[rgba(59,130,246,0.2)]'
                : 'bg-[var(--gold-bg)] text-[var(--gold)] border border-[var(--gold-border)]'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-slow
                ${isAdmin ? 'bg-[var(--blue)]' : 'bg-[var(--gold)]'}`} />
              {isAdmin ? 'Super Admin' : 'Marchand'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email"
                     className="block mb-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={isAdmin ? 'admin@stpay.local' : 'merchant@stpay.local'}
                defaultValue={prefillEmail}
                className={`w-full rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[13px]
                            bg-[var(--bg-overlay)] text-[var(--text-primary)]
                            placeholder:text-[var(--text-muted)] outline-none transition
                            focus:ring-1 focus:ring-[var(--gold)]/30
                            ${errors.email
                              ? 'border-[var(--red)] bg-[var(--red-bg)]'
                              : 'border-[var(--border-medium)] focus:border-[var(--gold)]'}`}
                {...register('email', {
                  required: "L'email est requis",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-[var(--red)]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password"
                     className="block mb-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[13px]
                            bg-[var(--bg-overlay)] text-[var(--text-primary)]
                            placeholder:text-[var(--text-muted)] outline-none transition
                            focus:ring-1 focus:ring-[var(--gold)]/30
                            ${errors.password
                              ? 'border-[var(--red)] bg-[var(--red-bg)]'
                              : 'border-[var(--border-medium)] focus:border-[var(--gold)]'}`}
                {...register('password', {
                  required: 'Le mot de passe est requis',
                  minLength: { value: 8, message: 'Minimum 8 caractères' },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-[11px] text-[var(--red)]">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-semibold
                         text-[#0E0F14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? 'var(--gold)' : 'var(--gold)' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--gold-bright)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)' }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center text-[12px] text-[var(--text-muted)] space-y-1.5">
            {!isAdmin ? (
              <>
                <p>
                  Nouveau marchand ?{' '}
                  <Link to="/register"
                        className="text-[var(--gold)] hover:text-[var(--gold-bright)] font-medium transition-colors">
                    Créer un compte
                  </Link>
                </p>
                <p>
                  Vous êtes admin ?{' '}
                  <Link to="/admin/login"
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Portail admin →
                  </Link>
                </p>
              </>
            ) : (
              <p>
                Vous êtes marchand ?{' '}
                <Link to="/merchant/login"
                      className="text-[var(--gold)] hover:text-[var(--gold-bright)] font-medium transition-colors">
                  Portail marchand →
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
