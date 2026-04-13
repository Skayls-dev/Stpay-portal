import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { landingLocales, type Lang } from '../locales/landing'

export default function LandingPage() {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'fr'
    const savedLang = window.localStorage.getItem('stpay.landing.lang')
    return savedLang === 'en' ? 'en' : 'fr'
  })
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' })
  const [isSent, setIsSent] = useState(false)

  const t = useMemo(() => landingLocales[lang], [lang])

  useEffect(() => {
    window.localStorage.setItem('stpay.landing.lang', lang)
  }, [lang])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
    )

    const targets = document.querySelectorAll('.landing-reveal')
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  if (isAuthenticated) {
    return <Navigate to={isSuperAdmin ? '/admin' : '/merchant'} replace />
  }

  const onFieldChange = (field: 'name' | 'email' | 'company' | 'message', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (isSent) setIsSent(false)
  }

  const onLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.company.trim()) {
      return
    }
    setIsSent(true)
    setFormData({ name: '', email: '', company: '', message: '' })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#FFF1E8_0%,#F6F4EF_48%,#EAF2FF_100%)] text-[var(--text-1)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--orange)] text-[15px] font-extrabold text-white">ST</div>
            <div>
              <p className="text-[14px] font-extrabold tracking-tight">ST Pay</p>
              <p className="text-[10px] text-[var(--text-3)]">{t.brandTagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-[999px] border border-[var(--border)] bg-white p-1 sm:flex">
              <button
                type="button"
                className={`rounded-[999px] px-3 py-1 text-[11px] font-bold ${lang === 'fr' ? 'bg-[var(--orange)] text-white' : 'text-[var(--text-2)]'}`}
                onClick={() => setLang('fr')}
              >
                FR
              </button>
              <button
                type="button"
                className={`rounded-[999px] px-3 py-1 text-[11px] font-bold ${lang === 'en' ? 'bg-[var(--blue)] text-white' : 'text-[var(--text-2)]'}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
            <Link to="/demo/webshop" className="btn-secondary">{t.webshopDemo}</Link>
            <Link to="/choose-portal" className="btn-primary">{t.accessPortal}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-reveal mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6 landing-delay-1">
            <p className="inline-flex rounded-full border border-[var(--orange-border)] bg-[var(--orange-bg)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)]">
              {t.badge}
            </p>
            <h1 className="max-w-3xl text-[36px] font-extrabold leading-[1.1] tracking-tight sm:text-[48px]">
              {t.heading}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--text-2)]">
              {t.subheading}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">{t.createMerchant}</Link>
              <Link to="/merchant/login" className="btn-secondary">{t.merchantLogin}</Link>
              <Link to="/admin/login" className="btn-secondary">{t.adminLogin}</Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {t.metrics.map((m, idx) => (
                <div key={m.label} className={`rounded-[12px] border border-[var(--border)] bg-white p-3 shadow-[0_8px_16px_rgba(0,0,0,0.04)] landing-reveal landing-delay-${idx + 1}`}>
                  <p className="text-[18px] font-extrabold text-[var(--text-1)]">{m.value}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-float rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[0_22px_55px_rgba(0,0,0,0.08)]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">{t.apiExample}</p>
            <pre className="overflow-auto rounded-[12px] bg-[#0B1220] p-4 text-[12px] leading-relaxed text-[#D7E7FF]">
{`POST /api/Payment
{
  "amount": 32900,
  "currency": "XAF",
  "provider": "ORANGE",
  "customer": {
    "phoneNumber": "237677123456",
    "name": "Jean Dupont"
  },
  "merchant": {
    "reference": "ORDER-2094",
    "callbackUrl": "https://shop.example.com/webhooks/stpay"
  }
}`}
            </pre>
            <div className="mt-4 rounded-[12px] border border-[var(--green-border)] bg-[var(--green-bg)] p-3">
              <p className="text-[12px] font-semibold text-[var(--green)]">{t.finalStatus}</p>
              <p className="text-[11px] text-[var(--text-2)]">{t.webhookAck}</p>
            </div>
          </div>
        </section>

        <section className="landing-reveal landing-delay-1 mx-auto w-full max-w-7xl px-4 pb-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {t.features.map((feature, idx) => (
              <article key={feature.title} className={`rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[0_10px_22px_rgba(0,0,0,0.05)] landing-reveal landing-delay-${idx + 1}`}>
                <h2 className="text-[15px] font-bold tracking-tight">{feature.title}</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-2)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-reveal landing-delay-2 mx-auto w-full max-w-7xl px-4 pb-12">
          <div className="rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">{t.quickImplementation}</p>
                <h3 className="text-[24px] font-extrabold tracking-tight">{t.integrationTitle}</h3>
              </div>
              <Link to="/demo/webshop" className="btn-secondary">{t.viewPublicDemo}</Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {t.steps.map((s, idx) => (
                <div key={s.step} className={`rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4 landing-reveal landing-delay-${idx + 1}`}>
                  <p className="text-[12px] font-extrabold text-[var(--orange)]">{s.step}</p>
                  <p className="mt-1 text-[14px] font-bold">{s.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--text-2)]">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-reveal landing-delay-2 mx-auto w-full max-w-7xl px-4 pb-12">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <aside className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
              <h4 className="text-[21px] font-extrabold tracking-tight">{t.leadTitle}</h4>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">{t.leadSubtitle}</p>
              <div className="mt-4 rounded-[12px] border border-[var(--orange-border)] bg-[var(--orange-bg)] p-3 text-[12px] text-[var(--orange-dark)]">
                {t.leadAside}
              </div>
            </aside>

            <form onSubmit={onLeadSubmit} className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadFields.name}
                  <input
                    value={formData.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    required
                    className="mt-1 w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--orange)]"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadFields.email}
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => onFieldChange('email', e.target.value)}
                    required
                    className="mt-1 w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--orange)]"
                  />
                </label>
              </div>
              <label className="mt-3 block text-[12px] font-semibold text-[var(--text-2)]">
                {t.leadFields.company}
                <input
                  value={formData.company}
                  onChange={(e) => onFieldChange('company', e.target.value)}
                  required
                  className="mt-1 w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--orange)]"
                />
              </label>
              <label className="mt-3 block text-[12px] font-semibold text-[var(--text-2)]">
                {t.leadFields.message}
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => onFieldChange('message', e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--orange)]"
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-primary">{t.leadCta}</button>
                {isSent ? <span className="text-[12px] font-semibold text-[var(--green)]">{t.leadSuccess}</span> : null}
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-[12px] text-[var(--text-3)]">{t.footerTagline}</p>
          <div className="flex gap-2">
            <Link to="/choose-portal" className="btn-secondary">{t.portals}</Link>
            <Link to="/demo/webshop" className="btn-secondary">{t.webshopDemo}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
