import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi, type MerchantRegisterResponse } from '../lib/api/auth'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  webhookUrl?: string
  isTestMode: 'true' | 'false'
}

export default function MerchantRegister() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MerchantRegisterResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      isTestMode: 'true',
      webhookUrl: 'http://localhost:3001/webhook-test',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      if (data.password !== data.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas')
        return
      }

      const response = await authApi.registerMerchant({
        name: data.name,
        email: data.email,
        password: data.password,
        webhookUrl: data.webhookUrl || undefined,
        isTestMode: data.isTestMode === 'true',
      })
      setResult(response)
      toast.success('Compte marchand cree avec succes')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de creer le compte")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-xl rounded-card border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Inscription Marchand</h1>
          <p className="mt-1 text-sm text-muted">Creez votre compte portail marchand (email/mot de passe)</p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nom du marchand
              </label>
              <input
                id="name"
                type="text"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  errors.name ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
                }`}
                placeholder="Mon entreprise"
                {...register('name', {
                  required: 'Le nom est requis',
                  minLength: { value: 2, message: 'Minimum 2 caracteres' },
                  maxLength: { value: 120, message: 'Maximum 120 caracteres' },
                })}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
                }`}
                placeholder="merchant@stpay.local"
                {...register('email', {
                  required: "L'email est requis",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Adresse e-mail invalide',
                  },
                })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
                }`}
                placeholder="Minimum 8 caracteres"
                {...register('password', {
                  required: 'Le mot de passe est requis',
                  minLength: { value: 8, message: 'Minimum 8 caracteres' },
                })}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
                }`}
                placeholder="Retapez le mot de passe"
                {...register('confirmPassword', {
                  required: 'Confirmation requise',
                })}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <div>
              <label htmlFor="webhookUrl" className="mb-1.5 block text-sm font-medium text-slate-700">
                Webhook URL (optionnel)
              </label>
              <input
                id="webhookUrl"
                type="url"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  errors.webhookUrl ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-brand'
                }`}
                placeholder="https://merchant.example.com/webhooks/stpay"
                {...register('webhookUrl', {
                  pattern: {
                    value: /^$|https?:\/\/.+/i,
                    message: 'URL invalide',
                  },
                })}
              />
              {errors.webhookUrl && <p className="mt-1 text-xs text-red-600">{errors.webhookUrl.message}</p>}
            </div>

            <div>
              <label htmlFor="isTestMode" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mode de cle
              </label>
              <select
                id="isTestMode"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                {...register('isTestMode')}
              >
                <option value="true">Test (interne)</option>
                <option value="false">Live (interne)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Creation…' : 'Creer mon compte marchand'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Compte marchand cree avec succes. Vous pouvez maintenant vous connecter.
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Marchand ID</p>
              <p className="mt-1 font-mono text-sm text-slate-900 break-all">{result.merchantId}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-1 text-sm text-slate-900 break-all">{result.email}</p>
            </div>

            <button
              onClick={() => navigate('/merchant/login', { state: { prefillEmail: result.email } })}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Aller a la connexion
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Vous avez deja un compte ?{' '}
          <Link to="/merchant/login" className="font-medium text-brand hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
