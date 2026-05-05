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
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company: '', volume: '', message: '' })
  const [selectedOperators, setSelectedOperators] = useState<string[]>([])
  const [isSent, setIsSent] = useState(false)
  const [phoneError, setPhoneError] = useState('')

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

  const onFieldChange = (field: 'name' | 'phone' | 'email' | 'company' | 'volume' | 'message', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === 'phone' && phoneError) setPhoneError('')
    if (isSent) setIsSent(false)
  }

  const onOperatorToggle = (op: string) => {
    setSelectedOperators((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    )
    if (isSent) setIsSent(false)
  }

  const onLeadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      company: formData.company.trim(),
      message: formData.message.trim(),
    }

    if (!payload.phone) {
      setPhoneError(t.leadPhoneError)
      return
    }

    if (!payload.name || !payload.email || !payload.company) {
      return
    }

    console.info('Landing lead submit', { ...payload, operators: selectedOperators })
    setIsSent(true)
    setPhoneError('')
    setFormData({ name: '', phone: '', email: '', company: '', volume: '', message: '' })
    setSelectedOperators([])
  }

  const featureIllustrations = [
    // 0: Zéro client perdu — operator aggregation flow
    <div className="mb-4 rounded-[10px] bg-[var(--orange-bg)] p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1.5">
          {(['MTN','Orange'] as const).map((name, i) => (
            <span key={name} className={`rounded-[4px] px-2 py-[3px] text-[9px] font-bold ${
              i===0?'bg-[var(--mtn-bg)] text-[var(--mtn-text)]':
              'bg-[var(--ora-bg)] text-[var(--ora-text)]'
            }`}>{name}</span>
          ))}
        </div>
        <svg width="22" height="8" viewBox="0 0 22 8" fill="none" className="shrink-0">
          <path d="M0 4h18M14 1.5L18 4l-4 2.5" stroke="var(--orange)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-[var(--orange)] text-[11px] font-extrabold text-white shadow">ST</div>
        <svg width="22" height="8" viewBox="0 0 22 8" fill="none" className="shrink-0">
          <path d="M0 4h18M14 1.5L18 4l-4 2.5" stroke="var(--orange)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="flex h-9 grow items-center justify-center rounded-[7px] border border-[var(--border)] bg-white text-[8px] font-semibold text-[var(--text-2)] text-center leading-snug">Votre<br/>boutique</div>
      </div>
    </div>,
    // 1: Fonds garantis — escrow pipeline
    <div className="mb-4 rounded-[10px] bg-[var(--green-bg)] p-3.5">
      <div className="flex items-center justify-between">
        {[{icon:'\uD83D\uDCB0',label:'Paiement'},{icon:'\uD83D\uDD12',label:'Rétention'},{icon:'\uD83D\uDCE6',label:'Livraison'},{icon:'\u2713',label:'Libération'}].map((item, i) => (
          <div key={item.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] shadow-sm">{item.icon}</div>
              <span className="text-[7.5px] font-semibold text-[var(--green)]">{item.label}</span>
            </div>
            {i < 3 && <div className="mx-1 h-px flex-1 border-t border-dashed border-[var(--green-border)]" />}
          </div>
        ))}
      </div>
    </div>,
    // 2: Tableau de bord — mini dashboard
    <div className="mb-4 rounded-[10px] bg-[var(--blue-bg)] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-extrabold text-[var(--blue)]">Portail Marchand ST Pay</span>
        <span className="rounded-full bg-[var(--green)] px-1.5 py-[2px] text-[7px] font-bold text-white">Live</span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-[6px] bg-white p-1.5">
          <p className="text-[11px] font-extrabold leading-tight text-[var(--text-1)]">1.2M XAF</p>
          <p className="text-[8px] text-[var(--text-3)]">Volume</p>
        </div>
        <div className="rounded-[6px] bg-white p-1.5">
          <p className="text-[11px] font-extrabold leading-tight text-[var(--green)]">97.4%</p>
          <p className="text-[8px] text-[var(--text-3)]">Succès</p>
        </div>
      </div>
      <div className="flex h-7 items-end gap-0.5">
        {[4,6,5,8,7,9,10].map((h, i) => (
          <div key={i} style={{height:`${h*2.5}px`}} className="flex-1 rounded-t-[2px] bg-[var(--blue)] opacity-60" />
        ))}
      </div>
    </div>,
    // 3: Intégration — code snippet
    <div className="mb-4 overflow-hidden rounded-[10px] bg-[#0B1220] p-3.5">
      <p className="font-mono text-[9.5px] leading-relaxed"><span className="text-[#63B3ED]">POST </span><span className="text-[#D7E7FF]">/api/Payment</span></p>
      <p className="font-mono text-[9px] leading-relaxed"><span className="text-[#63B3ED]">amount</span><span className="text-[#D7E7FF]">: </span><span className="text-[#A8FF78]">32900</span></p>
      <p className="font-mono text-[9px] leading-relaxed"><span className="text-[#63B3ED]">provider</span><span className="text-[#D7E7FF]">: </span><span className="text-[#FFE08A]">&quot;ORANGE&quot;</span></p>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="rounded-full bg-[#1a7a4022] px-2 py-[2px] text-[8px] font-bold text-[#2AC840]">✓ JWT Created</span>
        <span className="rounded-full border border-[#63b3ed33] px-2 py-[2px] text-[8px] font-bold text-[#63B3ED]">&lt; 1 semaine</span>
      </div>
    </div>,
  ]

  const stepIllustrations = [
    // Step 01: Portal account
    <div className="mb-3 overflow-hidden rounded-[9px] border border-[var(--border)] bg-white p-2.5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[var(--orange)] text-[7px] font-extrabold text-white">ST</div>
        <span className="text-[9px] font-semibold text-[var(--text-2)]">Portail Marchand</span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1">
        <div className="h-3.5 rounded-[3px] bg-[var(--bg-subtle)]" />
        <div className="h-3.5 rounded-[3px] bg-[var(--bg-subtle)]" />
        <div className="h-3.5 rounded-[3px] border border-[var(--orange-border)] bg-[var(--orange-bg)]" />
      </div>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
        <span className="text-[8px] font-semibold text-[var(--green)]">Clé API générée ✓</span>
      </div>
    </div>,
    // Step 02: API call
    <div className="mb-3 overflow-hidden rounded-[9px] bg-[#0B1220] p-2.5">
      <p className="font-mono text-[9px]"><span className="text-[#63B3ED]">POST </span><span className="text-white">/api/Payment</span></p>
      <p className="font-mono text-[9px]"><span className="text-[#63B3ED]">amount</span><span className="text-white">: </span><span className="text-[#A8FF78]">32500</span></p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <svg width="16" height="6" viewBox="0 0 16 6" fill="none"><path d="M0 3h13M10 1l3 2-3 2" stroke="#FF6600" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--orange)] text-[7px] font-bold text-white">ST</div>
        <span className="rounded-full bg-[#1a7a4022] px-1.5 py-px text-[8px] font-bold text-[#2AC840]">200 OK</span>
      </div>
    </div>,
    // Step 03: Go-live checklist
    <div className="mb-3 overflow-hidden rounded-[9px] border border-[var(--green-border)] bg-[var(--green-bg)] p-2.5">
      <p className="mb-1.5 text-[9px] font-extrabold text-[var(--green)]">Checklist Go-Live</p>
      {['Clé API live','Webhook configuré','Validation ST Pay'].map(item => (
        <div key={item} className="mb-1 flex items-center gap-1.5">
          <svg className="h-3 w-3 shrink-0 text-[var(--green)]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="5"/><path d="M3.5 6l1.5 1.5 3-3"/>
          </svg>
          <span className="text-[8.5px] text-[var(--green)]">{item}</span>
        </div>
      ))}
    </div>,
    // Step 04: Dashboard chart
    <div className="mb-3 overflow-hidden rounded-[9px] bg-[var(--blue-bg)] p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-bold text-[var(--blue)]">Dashboard</span>
        <span className="rounded-full bg-[var(--green)] px-1.5 py-px text-[8px] font-extrabold text-white">+23%</span>
      </div>
      <div className="flex h-8 items-end gap-0.5">
        {[3,5,4,7,6,8,10].map((h, i) => (
          <div key={i} style={{height:`${h*2.8}px`}} className={`flex-1 rounded-t-[2px] ${i===6?'bg-[var(--orange)]':'bg-[var(--blue)] opacity-50'}`} />
        ))}
      </div>
      <p className="mt-1 text-[7.5px] text-[var(--text-3)]">Dernière transaction MTN · il y a 4 min</p>
    </div>,
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#FFF1E8_0%,#F6F4EF_48%,#EAF2FF_100%)] text-[var(--text-1)]">
      <header className="sticky top-0 z-30 shadow-[0_1px_0_var(--border)]">
        {/* Announcement bar */}
        <div className="hidden border-b border-[var(--orange-border)] bg-[var(--orange-bg)] px-4 py-[7px] text-center text-[11px] font-semibold tracking-[0.01em] text-[var(--orange-dark)] sm:block">
          {t.announcementBar}
        </div>
        {/* Nav bar */}
        <div className="bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <img
                src="/stpaylogo.png"
                alt="ST Pay"
                className="h-9 w-auto object-contain sm:h-10"
              />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]">{t.brandTagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-[999px] border border-[var(--border)] bg-[var(--bg-subtle)] p-[3px] sm:flex">
                <button
                  type="button"
                  className={`rounded-[999px] px-3 py-1 text-[11px] font-bold transition-colors ${lang === 'fr' ? 'bg-[var(--orange)] text-white shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
                  onClick={() => setLang('fr')}
                >FR</button>
                <button
                  type="button"
                  className={`rounded-[999px] px-3 py-1 text-[11px] font-bold transition-colors ${lang === 'en' ? 'bg-[var(--blue)] text-white shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
                  onClick={() => setLang('en')}
                >EN</button>
              </div>
              <div className="hidden h-4 w-px bg-[var(--border)] sm:block" />
              <Link to="/demo/webshop" className="btn-secondary hidden sm:inline-flex">{t.webshopDemo}</Link>
              <Link to="/merchant/login" className="hidden text-[13px] font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] sm:block">{t.merchantLogin}</Link>
              <Link to="/register" className="btn-primary">{t.createMerchant}</Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-reveal relative overflow-hidden border-b border-[var(--border)]">
          <div className="absolute inset-0">
            <img
              src="/heroImage.png"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(8,12,22,0.72)_0%,rgba(8,12,22,0.5)_44%,rgba(246,244,239,0.26)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,102,0,0.28)_0%,transparent_50%)]" />
          </div>

          <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-14">
            <div className="max-w-3xl">
            <div className="space-y-7 landing-delay-1 rounded-[22px] border border-white/55 bg-white/95 p-5 shadow-[0_20px_65px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7 lg:p-8">
            {/* Badge pill */}
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--orange-border)] bg-[var(--orange-bg)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
              {t.badge}
            </p>

            {/* Headline with orange highlight */}
            <h1 className="max-w-3xl text-[40px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px] lg:text-[58px]">
              {t.headingPart1}
              <span className="text-[var(--orange)]">{t.headingHighlight}</span>
              {t.headingPart2}
            </h1>

            {/* Operator trust badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-2)]">{t.heroOperatorLabel} :</span>
              <span className="rounded-full bg-[var(--mtn-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--mtn-text)]">MTN MoMo</span>
              <span className="rounded-full bg-[var(--ora-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--ora-text)]">Orange Money</span>
            </div>

            {/* Problem callout */}
            <div className="rounded-[var(--r-lg)] border-l-[3px] border-l-[var(--orange)] bg-white/92 px-5 py-4 text-[14px] leading-relaxed text-[var(--text-2)] shadow-[inset_0_0_0_1px_var(--border-soft)]">
              <strong className="text-[var(--text-1)]">{t.heroProblem.title}</strong>{' '}
              {t.heroProblem.text}
            </div>

            {/* Subheading */}
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--text-1)]">
              {t.subheading}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-5 py-2.5 text-[14px]">{t.createMerchant}</Link>
              <Link to="/demo/webshop" className="btn-secondary">{t.webshopDemo}</Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {t.metrics.map((m, idx) => (
                <div key={m.label} className={`rounded-[12px] border border-[var(--border)] bg-white p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.1)] landing-reveal landing-delay-${idx + 1}`}>
                  <p className="text-[20px] font-extrabold leading-tight text-[var(--text-1)]">{m.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[var(--text-2)]">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
            </div>
          </div>
        </section>

        <section className="landing-reveal landing-delay-1 mx-auto w-full max-w-7xl px-4 pb-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {t.features.map((feature, idx) => (
              <article
                key={feature.title}
                className={`rounded-[14px] border border-[var(--border)] bg-white p-5
                hover:border-[var(--orange-border)]
                hover:shadow-[0_4px_16px_rgba(255,102,0,0.07)]
                transition-all duration-200
                landing-reveal landing-delay-${idx + 1}`}
              >
                {featureIllustrations[idx]}
                <h2 className="text-[14px] font-bold tracking-tight text-[var(--text-1)]">{feature.title}</h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-2)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Trust stats strip */}
        <section className="landing-reveal landing-delay-1 border-y border-[var(--border)] bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-around gap-x-6 gap-y-4 px-4 py-6">
            {t.socialProof.trustStats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-[26px] font-extrabold leading-none tracking-tight text-[var(--text-1)]">{s.value}</span>
                <span className="text-[11px] font-medium text-[var(--text-3)]">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="landing-reveal landing-delay-1 mx-auto w-full max-w-7xl px-4 py-12">
          <div className="mb-8 text-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)]">
              {t.socialProof.eyebrow}
            </p>
            <h3 className="text-[24px] font-extrabold tracking-tight">{t.socialProof.heading}</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {t.socialProof.quotes.map((q, idx) => (
              <div
                key={q.name}
                className={`landing-reveal landing-delay-${idx + 1} flex flex-col justify-between rounded-[16px] border border-[var(--border)] bg-white p-6 shadow-[0_4px_18px_rgba(0,0,0,0.05)]`}
              >
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {[0,1,2,3,4].map((i) => (
                    <svg key={i} className="h-3.5 w-3.5 text-[var(--orange)]" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1l1.9 3.9L14 5.7l-3 2.9.7 4.1L8 10.8l-3.7 1.9.7-4.1-3-2.9 4.1-.8z"/>
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="flex-1 text-[13px] leading-relaxed text-[var(--text-1)]">
                  <span className="mr-0.5 text-[22px] font-extrabold leading-none text-[var(--orange)]">"</span>
                  {q.text}
                  <span className="ml-0.5 text-[22px] font-extrabold leading-none text-[var(--orange)]">"</span>
                </p>
                {/* Author */}
                <div className="mt-5 flex items-center gap-3 border-t border-[var(--border-soft)] pt-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange-dark)] text-[11px] font-extrabold text-white shadow-sm">
                    {q.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-1)]">{q.name}</p>
                    <p className="text-[11px] text-[var(--text-3)]">{q.role}</p>
                  </div>
                </div>
              </div>
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
                <div key={s.step} className={`overflow-hidden rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4 landing-reveal landing-delay-${idx + 1}`}>
                  {stepIllustrations[idx]}
                  <p className="text-[12px] font-extrabold text-[var(--orange)]">{s.step}</p>
                  <p className="mt-1 text-[14px] font-bold">{s.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--text-2)]">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-reveal landing-delay-2 mx-auto w-full max-w-7xl px-4 pb-16">
          <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.07)] lg:grid lg:grid-cols-[1fr_1.6fr]">
            {/* Left aside */}
            <aside className="flex flex-col justify-between gap-6 bg-gradient-to-b from-[var(--orange-bg)] to-white p-7 lg:p-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)]">Contact</p>
                <h4 className="mt-2 text-[22px] font-extrabold leading-tight tracking-tight">{t.leadTitle}</h4>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-2)]">{t.leadSubtitle}</p>
              </div>
              <ul className="space-y-2.5">
                {t.leadAsideItems.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-[13px] text-[var(--text-1)]">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-white">
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                        <path d="M2 5l2 2 4-4"/>
                      </svg>
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-shrink-0">
                  <rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
                </svg>
                {t.leadFields.privacyNote}
              </p>
            </aside>

            {/* Right form */}
            <form onSubmit={onLeadSubmit} className="p-7 lg:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadFields.name} *
                  <input
                    value={formData.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)]"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadPhoneLabel}
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => onFieldChange('phone', e.target.value)}
                    placeholder="237 6XX XXX XXX"
                    className={`mt-1.5 w-full rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)] ${phoneError ? 'border-[var(--red)] bg-[var(--red-bg)]' : 'border-[var(--border)]'}`}
                  />
                  {phoneError ? <span className="mt-1 block text-[11px] font-medium text-[var(--red)]">{phoneError}</span> : null}
                </label>
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadFields.email} *
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => onFieldChange('email', e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)]"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[var(--text-2)]">
                  {t.leadFields.company} *
                  <input
                    value={formData.company}
                    onChange={(e) => onFieldChange('company', e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)]"
                  />
                </label>
              </div>

              {/* Volume select */}
              <label className="mt-4 block text-[12px] font-semibold text-[var(--text-2)]">
                {t.leadFields.volume}
                <select
                  value={formData.volume}
                  onChange={(e) => onFieldChange('volume', e.target.value)}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)]"
                >
                  {t.leadFields.volumeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              {/* Operator checkboxes */}
              <div className="mt-4">
                <p className="text-[12px] font-semibold text-[var(--text-2)]">{t.leadFields.operators}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['MTN MoMo', 'Orange Money'] as const).map((op) => {
                    const active = selectedOperators.includes(op)
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => onOperatorToggle(op)}
                        className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-all ${
                          active
                            ? 'border-[var(--orange)] bg-[var(--orange-bg)] text-[var(--orange-dark)]'
                            : 'border-[var(--border)] bg-white text-[var(--text-2)] hover:border-[var(--orange-border)]'
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}{op}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message */}
              <label className="mt-4 block text-[12px] font-semibold text-[var(--text-2)]">
                {t.leadFields.message}
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => onFieldChange('message', e.target.value)}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--orange)] focus:ring-1 focus:ring-[var(--orange-border)]"
                />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-primary px-5 py-2.5 text-[14px]">{t.leadCta}</button>
                {isSent
                  ? <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--green)]">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4"/></svg>
                      {t.leadSuccess}
                    </span>
                  : null
                }
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-[12px] text-[var(--text-3)]">{t.footerTagline}</p>
          <div className="flex gap-2">
            <Link to="/login" className="btn-secondary">{t.portals}</Link>
            <Link to="/demo/webshop" className="btn-secondary">{t.webshopDemo}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
