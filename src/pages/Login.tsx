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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await authApi.login(data, { portal })
      login(response.user, response.token, response.apiKey)

      const defaultHome = response.user.role === 'super_admin' ? '/admin' : '/merchant'
      const isLoginRoute = from === '/login' || from === '/admin/login' || from === '/merchant/login'
      const target = !from || from === '/' || isLoginRoute ? defaultHome : from

      navigate(target, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm rounded-card border border-slate-200 bg-white p-8 shadow-sm">
        {/* Logo / titre */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white font-bold text-lg">
            ST
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {portal === 'admin' ? 'Portail Admin ST Pay' : 'Portail Marchand ST Pay'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {portal === 'admin'
              ? 'Connexion super admin (email/mot de passe)'
              : 'Connexion marchand (email/mot de passe)'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
              }`}
              placeholder={portal === 'admin' ? 'admin@stpay.local' : 'merchant@stpay.local'}
              defaultValue={prefillEmail}
              {...register('email', {
                required: "L'email est requis",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Adresse e-mail invalide',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
              }`}
              placeholder="••••••••"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: { value: 8, message: 'Minimum 8 caracteres' },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {portal === 'merchant' ? (
          <div className="mt-6 space-y-1 text-center text-sm text-slate-500">
            <p>
              Nouveau marchand ?{' '}
              <Link to="/register" className="font-medium text-brand hover:underline">
                Creer un compte
              </Link>
            </p>
            <p>
              Vous etes admin ?{' '}
              <Link to="/admin/login" className="font-medium text-brand hover:underline">
                Aller au portail admin
              </Link>
            </p>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            Vous etes marchand ?{' '}
            <Link to="/merchant/login" className="font-medium text-brand hover:underline">
              Aller au portail marchand
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
