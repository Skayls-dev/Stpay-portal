// src/pages/MerchantRegister.tsx
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

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block mb-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-[var(--red)]">{error}</p>}
    </div>
  )
}

const INPUT_CLS = (hasError: boolean) =>
  `w-full rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[13px]
   bg-[var(--bg-overlay)] text-[var(--text-primary)]
   placeholder:text-[var(--text-muted)] outline-none transition
   focus:ring-1 focus:ring-[var(--gold)]/30
   ${hasError
     ? 'border-[var(--red)] bg-[var(--red-bg)]'
     : 'border-[var(--border-medium)] focus:border-[var(--gold)]'}`

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ result, onLogin }: {
  result: MerchantRegisterResponse
  onLogin: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)]
                      bg-[var(--green-bg)] border border-[rgba(34,197,94,0.2)]">
        <div className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-[13px] text-[var(--green)] font-medium">
          Compte marchand créé avec succès !
        </p>
      </div>

      {/* Credentials */}
      {[
        { label: 'Marchand ID', value: result.merchantId, mono: true },
        { label: 'Nom',         value: result.merchantName },
        { label: 'Email',       value: result.email },
      ].map(({ label, value, mono }) => (
        <div key={label}
             className="rounded-[var(--radius-sm)] border border-[var(--border-soft)]
                        bg-[var(--bg-overlay)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">{label}</p>
          <p className={`text-[13px] text-[var(--text-primary)] break-all
                         ${mono ? 'font-mono' : ''}`}>
            {value}
          </p>
        </div>
      ))}

      {/* Warning */}
      <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)]
                      bg-[var(--amber-bg)] border border-[rgba(245,158,11,0.2)]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
          <path d="M7 1L13 12H1L7 1Z" stroke="var(--amber)" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M7 5v3M7 9.5v.5" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <p className="text-[11px] text-[var(--amber)]">
          Conservez votre Marchand ID en lieu sûr. Il sera nécessaire pour les intégrations API.
        </p>
      </div>

      <button
        onClick={onLogin}
        className="w-full py-2.5 rounded-[var(--radius-sm)] text-[13px] font-semibold
                   text-[#0E0F14] bg-[var(--gold)] hover:bg-[var(--gold-bright)]
                   transition-colors"
      >
        Aller à la connexion →
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MerchantRegister() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<MerchantRegisterResponse | null>(null)

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<RegisterForm>({ defaultValues: { isTestMode: 'true' } })

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.registerMerchant({
        name:       data.name,
        email:      data.email,
        password:   data.password,
        webhookUrl: data.webhookUrl || undefined,
        isTestMode: data.isTestMode === 'true',
      })
      setResult(res)
      toast.success('Compte créé avec succès !')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de créer le compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4 py-10">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px]
                        rounded-full opacity-[0.03]"
             style={{ background: 'var(--gold)', filter: 'blur(100px)' }} />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Card */}
        <div className="bg-[var(--bg-raised)] border border-[var(--border-medium)]
                        rounded-[var(--radius-lg)] p-8 shadow-2xl">

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 w-[44px] h-[44px] rounded-[10px]
                            flex items-center justify-center
                            font-display font-extrabold text-[15px] text-[#0E0F14]"
                 style={{ background: 'linear-gradient(135deg, #F5A623, #E8890A)' }}>
              ST
            </div>
            <h1 className="font-display font-semibold text-[20px] text-[var(--text-primary)]">
              Créer un compte marchand
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
              Accédez au portail marchand ST Pay
            </p>
          </div>

          {result ? (
            <SuccessView
              result={result}
              onLogin={() => navigate('/merchant/login', { state: { prefillEmail: result.email } })}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

              {/* Name */}
              <Field label="Nom du marchand" error={errors.name?.message}>
                <input
                  type="text"
                  className={INPUT_CLS(!!errors.name)}
                  placeholder="Acme Corp"
                  {...register('name', { required: 'Le nom est requis' })}
                />
              </Field>

              {/* Email */}
              <Field label="Adresse e-mail" error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  className={INPUT_CLS(!!errors.email)}
                  placeholder="contact@acme.com"
                  {...register('email', {
                    required: "L'email est requis",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
                  })}
                />
              </Field>

              {/* Password row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mot de passe" error={errors.password?.message}>
                  <input
                    type="password"
                    className={INPUT_CLS(!!errors.password)}
                    placeholder="••••••••"
                    {...register('password', {
                      required: 'Mot de passe requis',
                      minLength: { value: 8, message: 'Min. 8 caractères' },
                    })}
                  />
                </Field>
                <Field label="Confirmation" error={errors.confirmPassword?.message}>
                  <input
                    type="password"
                    className={INPUT_CLS(!!errors.confirmPassword)}
                    placeholder="••••••••"
                    {...register('confirmPassword', {
                      required: 'Confirmation requise',
                      validate: (v) => v === watch('password') || 'Ne correspond pas',
                    })}
                  />
                </Field>
              </div>

              {/* Webhook URL */}
              <Field label="URL Webhook (optionnel)" error={errors.webhookUrl?.message}>
                <input
                  type="url"
                  className={INPUT_CLS(!!errors.webhookUrl)}
                  placeholder="https://votre-serveur.com/webhooks/stpay"
                  {...register('webhookUrl', {
                    pattern: { value: /^$|https?:\/\/.+/i, message: 'URL invalide' },
                  })}
                />
              </Field>

              {/* Mode selector */}
              <div>
                <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
                  Type de clé API
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'true',  label: 'Test',  sub: 'sk_test_…',  color: 'amber' },
                    { val: 'false', label: 'Live',  sub: 'sk_live_…',  color: 'green' },
                  ].map(({ val, label, sub, color }) => {
                    const checked = watch('isTestMode') === val
                    return (
                      <label
                        key={val}
                        className={`flex items-center gap-3 p-3 rounded-[var(--radius-sm)]
                                    border cursor-pointer transition-all
                                    ${checked
                                      ? color === 'amber'
                                        ? 'border-[rgba(245,158,11,0.3)] bg-[var(--amber-bg)]'
                                        : 'border-[rgba(34,197,94,0.3)] bg-[var(--green-bg)]'
                                      : 'border-[var(--border-soft)] bg-transparent hover:bg-[var(--bg-overlay)]'}`}
                      >
                        <input type="radio" value={val}
                               className="sr-only" {...register('isTestMode')} />
                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors
                          ${checked
                            ? color === 'amber'
                              ? 'border-[var(--amber)] bg-[var(--amber)]'
                              : 'border-[var(--green)] bg-[var(--green)]'
                            : 'border-[var(--border-medium)] bg-transparent'}`} />
                        <div>
                          <p className="text-[12px] font-medium text-[var(--text-primary)]">{label}</p>
                          <p className="text-[10px] font-mono text-[var(--text-muted)]">{sub}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-semibold
                           text-[#0E0F14] bg-[var(--gold)] hover:bg-[var(--gold-bright)]
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Création en cours…' : 'Créer mon compte marchand'}
              </button>
            </form>
          )}

          {/* Footer */}
          {!result && (
            <p className="mt-6 text-center text-[12px] text-[var(--text-muted)]">
              Vous avez déjà un compte ?{' '}
              <Link to="/merchant/login"
                    className="text-[var(--gold)] hover:text-[var(--gold-bright)] font-medium transition-colors">
                Se connecter
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
