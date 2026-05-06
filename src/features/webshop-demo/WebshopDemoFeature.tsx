import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EscrowDemoPanel from '../escrow-demo/EscrowDemoPanel'
import { buildEscrowPayload, buildPaymentInitiationPayload, type PaymentResponse } from '../../lib/api/modules'
import { publishEscrowDemo, publishSimulatedEscrowDemo, useActiveEscrowRecord } from '../escrow-demo/store'
import { demoCatalog, demoProviders, type DemoProduct } from './mockCatalog'

type CartLine = {
  product: DemoProduct
  quantity: number
}

type DemoStatus = 'idle' | 'creating' | 'pending' | 'success'
type WidgetStage = 'cart' | 'auth' | 'confirm' | 'done'
type CheckoutMode = 'simulated' | 'live'
type DemoFlowMode = 'widget' | 'api'

const LOCAL_DEMO_API_KEY = 'sk_test_local_stpay_2026'

const fmtXaf = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} XAF`
const PIN_PROVIDERS = new Set(['MTN', 'ORANGE', 'MOOV'])
const buildFallbackImage = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#F3F4F6'/>
          <stop offset='100%' stop-color='#E5E7EB'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='900' fill='url(#g)'/>
      <circle cx='600' cy='360' r='120' fill='#D1D5DB'/>
      <rect x='420' y='520' width='360' height='40' rx='20' fill='#9CA3AF'/>
      <text x='600' y='640' text-anchor='middle' font-family='Arial, sans-serif' font-size='42' font-weight='700' fill='#4B5563'>${label}</text>
    </svg>`,
  )}`
const PROVIDER_PHONE_THEME: Record<string, {
  networkLabel: string
  shellBg: string
  shellBorder: string
  accent: string
  keypadBg: string
  keypadKeyBg: string
  keypadKeyText: string
  okBg: string
  okText: string
}> = {
  MTN: {
    networkLabel: 'MTN CM',
    shellBg: '#1C1C12',
    shellBorder: '#5D5312',
    accent: '#FFD700',
    keypadBg: '#19180F',
    keypadKeyBg: '#2D2B1D',
    keypadKeyText: '#FFF8CC',
    okBg: '#1E5B1E',
    okText: '#8DFF8D',
  },
  ORANGE: {
    networkLabel: 'ORANGE CM',
    shellBg: '#1D1712',
    shellBorder: '#6E3D16',
    accent: '#FF7900',
    keypadBg: '#1D1510',
    keypadKeyBg: '#352218',
    keypadKeyText: '#FFE2CC',
    okBg: '#6B2F06',
    okText: '#FFD2A8',
  },
  WAVE: {
    networkLabel: 'WAVE CM',
    shellBg: '#111A1D',
    shellBorder: '#12617A',
    accent: '#00C2FF',
    keypadBg: '#0F1C22',
    keypadKeyBg: '#18303A',
    keypadKeyText: '#CCF3FF',
    okBg: '#0F4B5C',
    okText: '#8CF3FF',
  },
  MOOV: {
    networkLabel: 'MOOV CM',
    shellBg: '#101B13',
    shellBorder: '#1B6635',
    accent: '#0DB14B',
    keypadBg: '#102016',
    keypadKeyBg: '#1B3525',
    keypadKeyText: '#D1FFE2',
    okBg: '#165732',
    okText: '#A2FFCA',
  },
}

// ── Simulation SMS reçu par le client ──────────────────────────────────────
function SmsSim() {
  const active = useActiveEscrowRecord()
  const [copied, setCopied] = useState(false)

  if (!active || active.releaseMode !== 'pickup_code' || !active.pickupCode) return null
  if (!['in_transit', 'held'].includes(active.status)) return null

  const shortRef = active.escrowId.slice(-6).toUpperCase()

  function copy() {
    void navigator.clipboard.writeText(active.pickupCode!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-[14px] border-2 border-dashed border-[var(--green-border)] bg-[var(--green-bg)] p-4 shadow-[0_4px_18px_rgba(0,180,80,0.08)]">
      {/* En-tête "SMS reçu" */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--green)] text-white text-[14px]">✉</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--green)]">SMS reçu — Simulation</p>
          <p className="text-[10px] text-[var(--text-3)]">Comme reçu sur le téléphone du client après expédition</p>
        </div>
      </div>

      {/* Bulle SMS */}
      <div className="rounded-[12px] bg-white border border-[var(--border)] p-3 font-mono text-[12px] text-[var(--text-1)] leading-relaxed shadow-sm">
        <p>ST Pay : Votre commande <strong>#{shortRef}</strong> est en route.</p>
        <p className="mt-1">
          Confirmez la réception en saisissant le code :{' '}
          <span className="rounded-[6px] bg-[var(--orange-bg)] px-2 py-0.5 text-[15px] font-extrabold tracking-[0.25em] text-[var(--orange-dark)]">
            {active.pickupCode}
          </span>
        </p>
        <p className="mt-1 text-[10px] text-[var(--text-3)]">Dans la section "Actions client" ci-dessous.</p>
      </div>

      {/* Bouton copier */}
      <button
        type="button"
        className="mt-3 btn-secondary w-full justify-center"
        onClick={copy}
      >
        {copied ? '✓ Copié !' : 'Copier le code'}
      </button>
    </div>
  )
}

export default function WebshopDemoFeature() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [payerName, setPayerName] = useState('Client Demo')
  const [payerPhone, setPayerPhone] = useState('237677000000')
  const [provider, setProvider] = useState('MTN')
  const [status, setStatus] = useState<DemoStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)
  const [mode, setMode] = useState<CheckoutMode>('simulated')
  const [statusInfo, setStatusInfo] = useState('')
  const [flowMode, setFlowMode] = useState<DemoFlowMode>('api')
  const [demoTab, setDemoTab] = useState<'client' | 'merchant'>('client')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [widgetStage, setWidgetStage] = useState<WidgetStage>('cart')
  const [widgetPin, setWidgetPin] = useState('')
  const [pinError, setPinError] = useState('')

  const [apiAuthOpen, setApiAuthOpen] = useState(false)
  const [apiAuthPin, setApiAuthPin] = useState('')
  const [apiAuthError, setApiAuthError] = useState('')
  const [apiAuthStage, setApiAuthStage] = useState<'auth' | 'confirm' | 'done'>('auth')
  const [configApiKey, setConfigApiKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('stpay_api_key')
    if (stored) return stored
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? LOCAL_DEMO_API_KEY
      : ''
  })
  const [escrowEnabled, setEscrowEnabled] = useState(true)
  const [escrowMode, setEscrowMode] = useState<'pickup_code' | 'auto_timeout' | 'dual_confirm'>('pickup_code')
  const [starterCheckoutRequested, setStarterCheckoutRequested] = useState(false)

  const lines = useMemo<CartLine[]>(() => {
    return demoCatalog
      .map((product) => ({ product, quantity: cart[product.id] ?? 0 }))
      .filter((line) => line.quantity > 0)
  }, [cart])

  const subtotal = useMemo(() => lines.reduce((acc, line) => acc + (line.product.priceXaf * line.quantity), 0), [lines])
  const fee = Math.round(subtotal * 0.015)
  const total = subtotal + fee
  const providerNeedsPin = PIN_PROVIDERS.has(provider)
  const isProcessing = status === 'creating' || status === 'pending'
  const phoneTheme = PROVIDER_PHONE_THEME[provider] ?? {
    networkLabel: `${provider} CM`,
    shellBg: '#1A1A1A',
    shellBorder: '#333333',
    accent: '#9CA3AF',
    keypadBg: '#111111',
    keypadKeyBg: '#232323',
    keypadKeyText: '#FFFFFF',
    okBg: '#374151',
    okText: '#D1D5DB',
  }

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const createStarterEscrowOrder = () => {
    const starter = demoCatalog[0]
    if (!starter) return

    setFlowMode('api')
    setEscrowEnabled(true)
    setEscrowMode('pickup_code')
    setProvider('MTN')
    setPayerName('Client Escrow Demo')
    setPayerPhone('237677123456')
    setCart({ [starter.id]: 1 })
    setStarterCheckoutRequested(true)
  }

  const saveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stpay_api_key', configApiKey)
    }
  }

  useEffect(() => {
    if (!starterCheckoutRequested) return
    if (!lines.length || status !== 'idle') return

    setStarterCheckoutRequested(false)
    void runCheckoutDemo()
  }, [lines.length, starterCheckoutRequested, status])

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev }
      const qty = (next[id] ?? 0) - 1
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  const runCheckoutDemo = async () => {
    if (!lines.length || status !== 'idle') return

    const sanitizedName = payerName.trim()
    const sanitizedPhone = payerPhone.replace(/\s+/g, '')
    if (!sanitizedName || sanitizedPhone.length < 8) {
      setStatusInfo('Nom et numero du payeur requis (numero >= 8 caracteres).')
      return
    }

    setStatus('creating')
    setStatusInfo('Tentative API live en cours...')
    const generatedTx = `DEMO-${Date.now().toString().slice(-8)}`
    const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:5169'
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('stpay_api_key') : null
    const token = typeof window !== 'undefined' ? localStorage.getItem('stpay_token') : null

    const merchantReference = `WEBSHOP-DEMO-${Date.now().toString().slice(-6)}`
    const livePayload = buildPaymentInitiationPayload({
      amount: total,
      currency: 'XAF',
      provider,
      customer: {
        phoneNumber: sanitizedPhone,
        name: sanitizedName,
      },
      merchant: {
        reference: merchantReference,
        name: 'Demo Store',
        callbackUrl: `${window.location.origin}/demo/webshop`,
      },
      description: escrowEnabled ? 'Public webshop checkout demo with escrow' : 'Public webshop checkout demo',
      metadata: {
        source: 'public-webshop-demo',
        ...(providerNeedsPin ? { pin: widgetPin || '1234' } : {}),
        lines: lines.map((line) => ({ id: line.product.id, qty: line.quantity })),
      },
      escrow: buildEscrowPayload({
        enabled: escrowEnabled,
        releaseMode: escrowMode,
        autoTimeoutDays: escrowMode === 'auto_timeout' ? 7 : undefined,
      }),
    })

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(`${baseUrl}/api/Payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(livePayload),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (response.ok) {
        const body = await response.json() as PaymentResponse
        const liveTx = body.transactionId || body.id || generatedTx
        setMode('live')
        setTxId(liveTx)
        setStatusInfo(escrowEnabled ? 'Transaction et escrow créés via API ST Pay.' : 'Transaction creee via API ST Pay.')
        if (escrowEnabled && body.escrow?.escrowId) {
          publishEscrowDemo({
            escrowId: body.escrow.escrowId,
            txId: liveTx,
            orderRef: merchantReference,
            merchantName: livePayload.merchant.name || 'Demo Store',
            customerName: sanitizedName,
            customerPhone: sanitizedPhone,
            provider,
            amount: total,
            description: String(livePayload.description || 'Webshop escrow demo'),
            releaseMode: escrowMode,
            status: body.escrow.status,
            pickupCode: body.escrow.pickupCode,
            autoReleaseAt: body.escrow.autoReleaseAt,
            source: 'backend',
          })
        }
        setStatus('pending')
        // Ouvrir modal d'auth pour Mode B
        setApiAuthOpen(true)
        setApiAuthPin('')
        setApiAuthError('')
        setApiAuthStage('auth')
        return
      }

      const statusCode = response.status
      if (statusCode === 401 || statusCode === 403) {
        setStatusInfo('API live protegee (auth requise). Fallback en simulation publique.')
      } else {
        setStatusInfo(`API live indisponible (${statusCode}). Fallback en simulation.`)
      }
    } catch {
      setStatusInfo('API live non joignable. Fallback en simulation locale.')
    }

    if (escrowEnabled) {
      await publishSimulatedEscrowDemo({
        orderRef: merchantReference,
        merchantName: livePayload.merchant.name || 'Demo Store',
        customerName: sanitizedName,
        customerPhone: sanitizedPhone,
        provider,
        amount: total,
        description: String(livePayload.description || 'Webshop escrow demo'),
        releaseMode: escrowMode,
        autoReleaseAt: escrowMode === 'auto_timeout' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      })
    }

    // Fallback: ouvrir la modal aussi en cas d'erreur
    setMode('simulated')
    setTxId(generatedTx)
    setStatus('pending')
    setApiAuthOpen(true)
    setApiAuthPin('')
    setApiAuthError('')
    setApiAuthStage('auth')
  }

  const resetDemo = () => {
    setStatus('idle')
    setTxId(null)
    setStatusInfo('')
    setWidgetPin('')
    setPinError('')
    setWidgetStage('cart')
    setWidgetOpen(false)
    setApiAuthOpen(false)
    setApiAuthPin('')
    setApiAuthError('')
    setApiAuthStage('auth')
  }

  const openWidget = () => {
    if (!lines.length) return
    setWidgetOpen(true)
    setWidgetPin('')
    setPinError('')
    setWidgetStage(status === 'success' ? 'done' : 'cart')
  }

  const advanceWidget = () => {
    if (widgetStage === 'cart') setWidgetStage('auth')
    else if (widgetStage === 'auth') {
      if (providerNeedsPin && widgetPin.length < 4) {
        setPinError('PIN requis (min 4 chiffres).')
        return
      }
      setPinError('')
      setWidgetStage('confirm')
      if (status === 'idle') {
        void runCheckoutDemo()
      }
    }
  }

  const dialPin = (digit: string) => {
    if (widgetStage !== 'auth') return
    if (!providerNeedsPin) return
    if (widgetPin.length >= 6) return
    setPinError('')
    setWidgetPin((prev) => `${prev}${digit}`)
  }

  const deletePin = () => {
    if (widgetStage !== 'auth') return
    if (!providerNeedsPin) return
    setPinError('')
    setWidgetPin((prev) => prev.slice(0, -1))
  }

  const dialApiAuthPin = (digit: string) => {
    if (apiAuthStage !== 'auth') return
    if (!providerNeedsPin) return
    if (apiAuthPin.length >= 6) return
    setApiAuthError('')
    setApiAuthPin((prev) => `${prev}${digit}`)
  }

  const deleteApiAuthPin = () => {
    if (apiAuthStage !== 'auth') return
    if (!providerNeedsPin) return
    setApiAuthError('')
    setApiAuthPin((prev) => prev.slice(0, -1))
  }

  const confirmApiAuth = async () => {
    if (apiAuthStage !== 'auth') return
    if (providerNeedsPin && apiAuthPin.length < 4) {
      setApiAuthError('PIN requis (min 4 chiffres).')
      return
    }
    setApiAuthError('')
    setApiAuthStage('confirm')
    // Simulation de confirmation
    await new Promise((r) => setTimeout(r, 1500))
    setApiAuthStage('done')
    setStatus('success')
  }

  const reopenApiAuth = () => {
    if (status !== 'pending') return
    setApiAuthOpen(true)
  }

  const closeApiAuthModal = () => {
    if (apiAuthStage === 'confirm') return
    setApiAuthOpen(false)
  }

  const launchFromWidget = async () => {
    if (status !== 'idle') return
    await runCheckoutDemo()
  }

  const payloadPreview = buildPaymentInitiationPayload({
    amount: total,
    currency: 'XAF',
    provider,
    customer: {
      phoneNumber: payerPhone,
      name: payerName,
    },
    merchant: {
      reference: 'WEBSHOP-DEMO-001',
      name: 'Demo Store',
      callbackUrl: `${window.location.origin}/demo/webshop`,
    },
    description: escrowEnabled ? 'Public webshop checkout demo with escrow' : 'Public webshop checkout demo',
    metadata: {
      source: 'public-webshop-demo',
      ...(providerNeedsPin ? { pin: widgetPin || '1234' } : {}),
      lines: lines.map((line) => ({ id: line.product.id, qty: line.quantity })),
    },
    escrow: buildEscrowPayload({
      enabled: escrowEnabled,
      releaseMode: escrowMode,
      autoTimeoutDays: escrowMode === 'auto_timeout' ? 7 : undefined,
    }),
  })

  const sdkSnippet = `<script src=\"https://cdn.stpay.africa/web-sdk.js\"></script>\n<button id=\"stpay-btn\">Payer avec ST Pay</button>\n<script>\n  const stpay = new STPay({ publicKey: 'pk_test_xxx' });\n\n  document.getElementById('stpay-btn').onclick = () => {\n    stpay.checkout({\n      amount: ${total},\n      currency: 'XAF',\n      provider: '${provider}',\n      customer: { phoneNumber: '${payerPhone}', name: '${payerName}' },\n      merchant: { reference: 'WEBSHOP-DEMO-001' },\n      metadata: { source: 'public-webshop-demo' }\n    });\n  };\n</script>`

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#FFF1E8_0%,#F5F4F0_35%,#EEF4FF_100%)] px-4 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[18px] border border-[var(--border)] bg-white/85 backdrop-blur p-6 shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">Public Demo</p>
              <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--text-1)]">Webshop + ST Pay Checkout</h1>
              <p className="mt-1 text-[13px] text-[var(--text-2)]">Feature isolee pour montrer l'integration checkout sans login.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary">Retour connexion</Link>
              <span className="st-badge st-badge-blue">Sandbox</span>
            </div>
          </div>

          {/* Onglets Client / Marchand */}
          <div className="mt-5 inline-flex rounded-[12px] border border-[var(--border-med)] bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              className={`rounded-[9px] px-5 py-2 text-[13px] font-semibold transition-colors ${
                demoTab === 'client'
                  ? 'bg-white text-[var(--orange)] shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
              }`}
              onClick={() => setDemoTab('client')}
            >
              🛒 Espace Client
            </button>
            <button
              type="button"
              className={`rounded-[9px] px-5 py-2 text-[13px] font-semibold transition-colors ${
                demoTab === 'merchant'
                  ? 'bg-white text-[var(--orange)] shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
              }`}
              onClick={() => setDemoTab('merchant')}
            >
              🏪 Espace Marchand
            </button>
          </div>
        </header>

        {demoTab === 'client' && (<>

        <div className="rounded-[14px] border border-[var(--border)] bg-white/85 backdrop-blur p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-[10px] border border-[var(--border-med)] bg-[var(--bg-subtle)] p-1">
              <button
                type="button"
                className={`rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-colors ${flowMode === 'widget' ? 'bg-white text-[var(--orange)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
                onClick={() => setFlowMode('widget')}
              >
                Mode A - Widget SDK
              </button>
              <button
                type="button"
                className={`rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-colors ${flowMode === 'api' ? 'bg-white text-[var(--orange)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
                onClick={() => setFlowMode('api')}
              >
                Mode B - Checkout API
              </button>
            </div>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--orange-bg)] p-2.5 text-[10px] text-[var(--orange-dark)]">
              <strong>💡 Différence clé:</strong> Mode A = aperçu UI | Mode B = transaction réelle sur backend
            </div>
          </div>

          <div className="mt-4 rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4">
            <p className="mb-3 text-[12px] font-semibold text-[var(--text-1)]">🔐 Configuration API (Mode B)</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Coller votre clé API (X-Api-Key)"
                value={configApiKey}
                onChange={(e) => setConfigApiKey(e.target.value)}
                className="sp-input flex-1 text-[12px]"
              />
              <button type="button" className="btn-secondary" onClick={saveApiKey}>Sauvegarder</button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-2)]">
              {configApiKey ? '✅ Clé API configurée - Mode B utilisera l\'authentification' : '⚠️ Aucune clé API - Mode B utilisera la simulation'}
            </p>
            {(configApiKey === LOCAL_DEMO_API_KEY) && (
              <p className="mt-2 text-[11px] text-[var(--text-2)]">
                Clé locale préchargée pour le backend de développement : <strong>{LOCAL_DEMO_API_KEY}</strong>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setDemoTab('merchant')}>
                Espace marchand →
              </button>
              <button type="button" className="btn-primary" onClick={createStarterEscrowOrder}>
                Démarrer une commande escrow démo
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="grid auto-rows-min content-start items-start gap-3 sm:grid-cols-2">
            {demoCatalog.map((product) => (
              <article key={product.id} className="h-fit overflow-hidden rounded-[14px] border border-[var(--border)] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = buildFallbackImage(product.name)
                  }}
                />
                <div className="space-y-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[14px] font-bold text-[var(--text-1)]">{product.name}</h2>
                    <span className="st-badge st-badge-neutral">{product.badge}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-2)]">{product.description}</p>
                  <div className="flex items-center justify-between pt-1.5">
                    <p className="text-[13px] font-extrabold text-[var(--text-1)]">{fmtXaf(product.priceXaf)}</p>
                    <button className="btn-primary !px-2.5 !py-1.5" type="button" onClick={() => addToCart(product.id)}>Ajouter</button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            {flowMode === 'widget' && (
            <>
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Demo embed SDK</span></div>
              <div className="space-y-3 p-4">
                <p className="text-[12px] text-[var(--text-2)]">
                  <strong>Mode A - Widget SDK Preview:</strong> Visualisez le widget ST Pay intégré dans votre webshop. Aucune transaction n'est créée sur le backend. C'est une démonstration de l'interface utilisateur.
                </p>
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--text-1)]">Demo Store Widget</p>
                      <p className="text-[11px] text-[var(--text-3)]">Panier: {lines.length} article(s)</p>
                    </div>
                    <span className="st-badge st-badge-neutral">Web SDK</span>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-[10px] border-0 px-3 py-2 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(255,102,0,0.28)]"
                    style={{ background: 'linear-gradient(135deg,#FF6600,#E55A00)' }}
                    onClick={openWidget}
                    disabled={!lines.length}
                  >
                    Ouvrir le Widget SDK
                  </button>
                </div>
                <div className="rounded-[10px] border border-[var(--blue-border)] bg-[var(--blue-bg)] p-3 text-[11px] text-[var(--blue)]">
                  ℹ️ <strong>Preview uniquement:</strong> Le widget affiche panier → auth mobile → confirmation, mais <strong>aucune transaction réelle</strong> n'est créée. Idéal pour tester l'UX utilisateur.
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Panier</span></div>
              <div className="space-y-3 p-4">
                {!lines.length && <p className="text-[12px] text-[var(--text-3)]">Ajoute un article pour demarrer la demo.</p>}
                {lines.map((line) => (
                  <div key={line.product.id} className="rounded-[10px] border border-[var(--border-soft)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-semibold text-[var(--text-1)]">{line.product.name}</p>
                        <p className="text-[11px] text-[var(--text-3)]">{fmtXaf(line.product.priceXaf)} x {line.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="btn-secondary !px-2 !py-1" onClick={() => removeFromCart(line.product.id)}>-</button>
                        <button className="btn-secondary !px-2 !py-1" onClick={() => addToCart(line.product.id)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid gap-1 rounded-[10px] bg-[var(--bg-subtle)] p-3 text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--text-2)]">Sous-total</span><strong>{fmtXaf(subtotal)}</strong></div>
                  <div className="flex justify-between"><span className="text-[var(--text-2)]">Frais ST Pay (1.5%)</span><strong>{fmtXaf(fee)}</strong></div>
                  <div className="mt-1 flex justify-between text-[14px]"><span className="font-bold">Total</span><strong>{fmtXaf(total)}</strong></div>
                </div>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)]">Nom du payeur</span>
                  <input
                    className="sp-input"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)]">Numero du payeur (compte)</span>
                  <input
                    className="sp-input"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="Ex: 237677123456"
                    inputMode="tel"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)]">Provider mobile money</span>
                  <select className="sp-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {demoProviders.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            </>
            )}

            {flowMode === 'api' && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Panier</span></div>
              <div className="space-y-3 p-4">
                {!lines.length && <p className="text-[12px] text-[var(--text-3)])">Ajoute un article pour demarrer la demo.</p>}
                {lines.map((line) => (
                  <div key={line.product.id} className="rounded-[10px] border border-[var(--border-soft)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-semibold text-[var(--text-1)]">{line.product.name}</p>
                        <p className="text-[11px] text-[var(--text-3)]">{fmtXaf(line.product.priceXaf)} x {line.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="btn-secondary !px-2 !py-1" onClick={() => removeFromCart(line.product.id)}>-</button>
                        <button className="btn-secondary !px-2 !py-1" onClick={() => addToCart(line.product.id)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid gap-1 rounded-[10px] bg-[var(--bg-subtle)] p-3 text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--text-2)])">Sous-total</span><strong>{fmtXaf(subtotal)}</strong></div>
                  <div className="flex justify-between"><span className="text-[var(--text-2)])">Frais ST Pay (1.5%)</span><strong>{fmtXaf(fee)}</strong></div>
                  <div className="mt-1 flex justify-between text-[14px]"><span className="font-bold">Total</span><strong>{fmtXaf(total)}</strong></div>
                </div>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)])">Nom du payeur</span>
                  <input
                    className="sp-input"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)])">Numero du payeur (compte)</span>
                  <input
                    className="sp-input"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="Ex: 237677123456"
                    inputMode="tel"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--text-2)])">Provider mobile money</span>
                  <select className="sp-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {demoProviders.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>

                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-1)])">Escrow end-to-end</p>
                      <p className="text-[10px] text-[var(--text-3)])">Demande un escrow réel au backend, sinon une simulation locale synchronisée.</p>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${escrowEnabled ? 'bg-[var(--orange)]' : 'bg-[var(--border-med)]'}`}
                      onClick={() => setEscrowEnabled((value) => !value)}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${escrowEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {escrowEnabled && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { value: 'pickup_code', label: 'Code retrait' },
                        { value: 'dual_confirm', label: 'Double confirm.' },
                        { value: 'auto_timeout', label: 'Auto-timeout' },
                      ].map((option) => (
                        <label key={option.value} className={`flex items-center gap-2 rounded-[8px] border px-2 py-2 text-[11px] ${escrowMode === option.value ? 'border-[var(--orange-border)] bg-[var(--orange-bg)] text-[var(--orange-dark)]' : 'border-[var(--border-soft)] bg-white text-[var(--text-2)]'}`}>
                          <input
                            type="radio"
                            name="webshopEscrowMode"
                            checked={escrowMode === option.value}
                            onChange={() => setEscrowMode(option.value as typeof escrowMode)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--text-2)]">
                  <p className="font-semibold">💳 Mode B - Checkout API: Crée une VRAIE transaction sur votre backend ST Pay</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed">Le bouton envoie les données du panier à votre API ST Pay (http://localhost:5169/api/Payment). Si l'escrow est activé, le checkout inclut `escrow.enabled=true` avec le mode choisi.</p>
                </div>

                <div className="flex gap-2">
                  <button type="button" className="btn-primary flex-1 justify-center" onClick={runCheckoutDemo} disabled={!lines.length || status !== 'idle'}>
                    {status === 'idle' && 'Lancer paiement API (simulation)'}
                    {status === 'creating' && 'Creation transaction API...'}
                    {status === 'pending' && 'Autorisation mobile en attente...'}
                    {status === 'success' && 'Paiement confirme'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetDemo}>Reset</button>
                </div>

                <div className="rounded-[10px] border border-[var(--orange-border)] bg-[var(--orange-bg)] p-3">
                  <p className="text-[11px] font-bold text-[var(--orange-dark)])">Etat checkout</p>
                  <p className="mt-1 text-[12px] text-[var(--text-2)]">
                    {status === 'idle' && 'Pret: panier compose et provider selectionne.'}
                    {status === 'creating' && 'Creation transaction ST Pay...'}
                    {status === 'pending' && 'Transaction en attente de confirmation mobile.'}
                    {status === 'success' && `Paiement confirme (${txId}) via mode ${mode}.`}
                  </p>
                  {escrowEnabled && <p className="mt-2 text-[11px] text-[var(--text-2)])">Escrow demandé: <strong>{escrowMode}</strong>.</p>}
                  {status === 'pending' && !apiAuthOpen && (
                    <button type="button" className="btn-secondary mt-2" onClick={reopenApiAuth}>
                      Reprendre l'autorisation mobile
                    </button>
                  )}
                  {statusInfo && <p className="mt-2 text-[11px] text-[var(--text-2)]">{statusInfo}</p>}
                </div>
              </div>
            </div>
            )}

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Payload demo ST Pay</span></div>
              <pre className="max-h-[300px] overflow-auto bg-[#111827] p-4 text-[11px] leading-relaxed text-[#E5E7EB]">{JSON.stringify(payloadPreview, null, 2)}</pre>
            </div>

            <SmsSim />

            <EscrowDemoPanel role="client" onSwitchToMerchant={() => setDemoTab('merchant')} />

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Snippet integration Web SDK</span></div>
              <pre className="max-h-[300px] overflow-auto bg-[#0B1220] p-4 text-[11px] leading-relaxed text-[#CFE3FF]">{sdkSnippet}</pre>
            </div>
          </aside>
        </div>

        </>)}

        {demoTab === 'merchant' && (
          <div className="mx-auto w-full max-w-2xl">
            <EscrowDemoPanel role="merchant" />
          </div>
        )}

      </div>

      {widgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => setWidgetOpen(false)}>
          <div className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">ST Pay Widget</p>
                <h3 className="text-[18px] font-extrabold text-[var(--text-1)]">Checkout Demo</h3>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setWidgetOpen(false)}>Fermer</button>
            </div>

            <div className="mb-4 rounded-[10px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-[var(--text-3)]">Payeur</p>
                  <p className="font-semibold text-[var(--text-1)]">{payerName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[var(--text-3)]">Compte</p>
                  <p className="font-semibold text-[var(--text-1)]">{payerPhone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-1.5 text-[10px] font-semibold">
              {['Panier', 'Auth', 'Confirm', 'Done'].map((label, idx) => {
                const activeIdx = widgetStage === 'cart' ? 0 : widgetStage === 'auth' ? 1 : widgetStage === 'confirm' ? 2 : 3
                const active = idx <= activeIdx
                return (
                  <div key={label} className={`rounded-full px-2 py-1 text-center ${active ? 'bg-[var(--orange-bg)] text-[var(--orange-dark)]' : 'bg-[var(--bg-subtle)] text-[var(--text-3)]'}`}>
                    {label}
                  </div>
                )
              })}
            </div>

            <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4">
              {widgetStage === 'cart' && <p className="text-[12px] text-[var(--text-2)]">Validation du panier: {fmtXaf(total)} avec {provider}.</p>}
              {widgetStage === 'auth' && (
                <div className="space-y-3">
                  <p className="text-[12px] text-[var(--text-2)]">Auth mobile sur telephone client ({provider}).</p>
                  <div
                    className="mx-auto w-full max-w-[220px] rounded-[16px] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
                    style={{
                      border: `1px solid ${phoneTheme.shellBorder}`,
                      background: phoneTheme.shellBg,
                      boxShadow: `0 0 0 1px ${phoneTheme.accent}33, 0 10px 24px rgba(0,0,0,0.35)`,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] text-[#E5E7EB]">
                      <span>{phoneTheme.networkLabel}</span>
                      <span>4G</span>
                    </div>
                    <div className="mb-2 rounded-[10px] border border-[#2A2A2A] bg-black p-3 text-center font-mono text-[11px] text-[#F5F5F5]">
                      <div className="mb-1 text-[10px] text-[#9CA3AF]">{providerNeedsPin ? 'Saisissez votre PIN (4 chiffres) puis OK' : 'Validation sans PIN'}</div>
                      <div className="mb-1 text-[10px] text-[#9CA3AF]">Payeur: {payerName || 'N/A'}</div>
                      <div className="mb-1 text-[10px] text-[#9CA3AF]">Compte: {payerPhone || 'N/A'}</div>
                      <div className="rounded px-2 py-2 text-[16px] tracking-[0.35em]" style={{ background: `${phoneTheme.accent}22`, border: `1px solid ${phoneTheme.accent}55` }}>
                        {providerNeedsPin ? (widgetPin ? '•'.repeat(widgetPin.length) : '_ _ _ _') : 'OK'}
                      </div>
                      <div className="mt-2 text-[10px] text-[#9CA3AF]">Montant: {fmtXaf(total)}</div>
                    </div>

                    {providerNeedsPin ? (
                      <div className="grid grid-cols-3 gap-1.5" style={{ background: phoneTheme.keypadBg, padding: 4, borderRadius: 10 }}>
                        {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            className="rounded-[8px] py-1.5 text-[12px] font-semibold"
                            style={{ background: phoneTheme.keypadKeyBg, color: phoneTheme.keypadKeyText }}
                            onClick={() => dialPin(digit)}
                          >
                            {digit}
                          </button>
                        ))}
                        <button type="button" className="rounded-[8px] bg-[#3D2B18] py-1.5 text-[11px] font-semibold text-[#FBBF24]" onClick={deletePin}>⌫</button>
                        <button type="button" className="rounded-[8px] py-1.5 text-[12px] font-semibold" style={{ background: phoneTheme.keypadKeyBg, color: phoneTheme.keypadKeyText }} onClick={() => dialPin('0')}>0</button>
                        <button type="button" className="rounded-[8px] py-1.5 text-[11px] font-semibold" style={{ background: phoneTheme.okBg, color: phoneTheme.okText }} onClick={advanceWidget}>OK</button>
                      </div>
                    ) : (
                      <button type="button" className="w-full rounded-[8px] py-2 text-[12px] font-semibold" style={{ background: phoneTheme.okBg, color: phoneTheme.okText }} onClick={advanceWidget}>
                        Autoriser
                      </button>
                    )}
                  </div>
                  {pinError && <p className="text-[11px] font-semibold text-[var(--red)]">{pinError}</p>}
                </div>
              )}
              {widgetStage === 'confirm' && (
                <div className="space-y-2 text-center">
                  {!isProcessing && (
                    <p className="text-[12px] text-[var(--text-2)]">Confirmation ST Pay: pret a creer la transaction.</p>
                  )}
                  {isProcessing && (
                    <>
                      <div
                        className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-solid"
                        style={{ borderColor: `${phoneTheme.accent}66`, borderTopColor: phoneTheme.accent }}
                      />
                      <p className="text-[12px] font-semibold" style={{ color: phoneTheme.accent }}>
                        {status === 'creating' ? 'Creation transaction ST Pay...' : 'Validation mobile en cours...'}
                      </p>
                      <p className="text-[11px] text-[var(--text-3)]">Provider: {provider}</p>
                    </>
                  )}
                </div>
              )}
              {widgetStage === 'done' && (
                <p className="text-[12px] text-[var(--green)] font-semibold">Paiement confirme ({mode}). Transaction: {txId ?? 'DEMO-OK'}.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {widgetStage === 'cart' && (
                <button className="btn-secondary flex-1 justify-center" type="button" onClick={advanceWidget}>Etape suivante</button>
              )}
              {widgetStage === 'confirm' && (
                <button className="btn-primary flex-1 justify-center" type="button" onClick={launchFromWidget} disabled={status !== 'idle'}>
                  {status === 'idle' ? 'Payer maintenant' : 'Traitement...'}
                </button>
              )}
              {widgetStage === 'done' && (
                <button className="btn-primary flex-1 justify-center" type="button" onClick={() => setWidgetOpen(false)}>Terminer</button>
              )}
            </div>
          </div>
        </div>
      )}

      {apiAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={closeApiAuthModal}>
          <div className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--orange)]">Mode B - Autorisation Mobile</p>
                <h3 className="text-[18px] font-extrabold text-[var(--text-1)]">Confirmation Paiement</h3>
              </div>
              <button className="btn-ghost" type="button" onClick={closeApiAuthModal} disabled={apiAuthStage === 'confirm'}>
                {apiAuthStage === 'confirm' ? 'Traitement...' : 'Fermer'}
              </button>
            </div>

            <div className="mb-4 rounded-[10px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-[var(--text-3)]">Montant</p>
                  <p className="font-semibold text-[var(--text-1)]">{fmtXaf(total)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-3)]">Provider</p>
                  <p className="font-semibold text-[var(--text-1)]">{provider}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4">
              {apiAuthStage === 'auth' && (
                <div className="space-y-3">
                  <p className="text-[12px] text-[var(--text-2)]">Le client doit autoriser le paiement sur son téléphone.</p>
                  <div
                    className="mx-auto w-full max-w-[220px] rounded-[16px] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
                    style={{
                      border: `1px solid ${phoneTheme.shellBorder}`,
                      background: phoneTheme.shellBg,
                      boxShadow: `0 0 0 1px ${phoneTheme.accent}33, 0 10px 24px rgba(0,0,0,0.35)`,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] text-[#E5E7EB]">
                      <span>{phoneTheme.networkLabel}</span>
                      <span>4G</span>
                    </div>
                    <div className="mb-2 rounded-[10px] border border-[#2A2A2A] bg-black p-3 text-center font-mono text-[11px] text-[#F5F5F5]">
                      <div className="mb-1 text-[10px] text-[#9CA3AF]">{providerNeedsPin ? 'Saisissez votre PIN (4 chiffres) puis OK' : 'Validation sans PIN'}</div>
                      <div className="mb-1 text-[10px] text-[#9CA3AF]">Montant: {fmtXaf(total)}</div>
                      <div className="rounded px-2 py-2 text-[16px] tracking-[0.35em]" style={{ background: `${phoneTheme.accent}22`, border: `1px solid ${phoneTheme.accent}55` }}>
                        {providerNeedsPin ? (apiAuthPin ? '•'.repeat(apiAuthPin.length) : '_ _ _ _') : 'OK'}
                      </div>
                    </div>

                    {providerNeedsPin ? (
                      <div className="grid grid-cols-3 gap-1.5" style={{ background: phoneTheme.keypadBg, padding: 4, borderRadius: 10 }}>
                        {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            className="rounded-[8px] py-1.5 text-[12px] font-semibold"
                            style={{ background: phoneTheme.keypadKeyBg, color: phoneTheme.keypadKeyText }}
                            onClick={() => dialApiAuthPin(digit)}
                          >
                            {digit}
                          </button>
                        ))}
                        <button type="button" className="rounded-[8px] bg-[#3D2B18] py-1.5 text-[11px] font-semibold text-[#FBBF24]" onClick={deleteApiAuthPin}>⌫</button>
                        <button type="button" className="rounded-[8px] py-1.5 text-[12px] font-semibold" style={{ background: phoneTheme.keypadKeyBg, color: phoneTheme.keypadKeyText }} onClick={() => dialApiAuthPin('0')}>0</button>
                        <button type="button" className="rounded-[8px] py-1.5 text-[11px] font-semibold" style={{ background: phoneTheme.okBg, color: phoneTheme.okText }} onClick={confirmApiAuth}>OK</button>
                      </div>
                    ) : (
                      <button type="button" className="w-full rounded-[8px] py-2 text-[12px] font-semibold" style={{ background: phoneTheme.okBg, color: phoneTheme.okText }} onClick={confirmApiAuth}>
                        Autoriser
                      </button>
                    )}
                  </div>
                  {apiAuthError && <p className="text-[11px] font-semibold text-[var(--red)]">{apiAuthError}</p>}
                </div>
              )}
              {apiAuthStage === 'confirm' && (
                <div className="space-y-2 text-center">
                  <div
                    className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-solid"
                    style={{ borderColor: `${phoneTheme.accent}66`, borderTopColor: phoneTheme.accent }}
                  />
                  <p className="text-[12px] font-semibold" style={{ color: phoneTheme.accent }}>
                    Confirmation du paiement en cours...
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">Provider: {provider}</p>
                </div>
              )}
              {apiAuthStage === 'done' && (
                <p className="text-[12px] text-[var(--green)] font-semibold">✅ Paiement confirmé! Transaction créée: {txId}.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {apiAuthStage === 'done' && (
                <button className="btn-primary flex-1 justify-center" type="button" onClick={closeApiAuthModal}>Terminer</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
