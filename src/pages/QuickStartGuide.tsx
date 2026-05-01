import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeSnippet } from '../components/ui'

type StepTone = 'orange' | 'teal' | 'purple'

type StepItem = {
  tab: string
  badge: string
  title: string
  description: string
  snippetTitle: string
  code: string
  tip: string
  tone: StepTone
}

const STEPS: StepItem[] = [
  {
    tab: '1. Clé API',
    badge: 'Étape 1 / 4',
    title: 'Obtenir et configurer ta clé API',
    snippetTitle: 'Configuration .env et installation SDK',
    description:
      'Connecte-toi au portail ST Pay, génère une clé API dans Developer Portal → API Keys, et stocke-la dans une variable d\'environnement.',
    code: `# .env
STPAY_API_KEY=sk_live_xxxxxxxxxxxxxxxx
STPAY_BASE_URL=https://api.stpay.io/v1

# Installation SDK (npm)
npm install stpay-js

# Ou via fetch natif — aucune dépendance requise`,
    tip: 'La clé est stockée hashée côté ST Pay. Ne la commite jamais dans ton repo — utilise un .gitignore ou un vault.',
    tone: 'orange',
  },
  {
    tab: '2. Paiement simple',
    badge: 'Étape 2 / 4',
    title: 'Initier un paiement mobile money',
    snippetTitle: 'POST /payments via fetch',
    description:
      'Un seul endpoint POST /payments pour tous les opérateurs (MTN, Orange, Wave, Moov). ST Pay gère le routage automatiquement.',
    code: `const response = await fetch("https://api.stpay.io/v1/payments", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.STPAY_API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    provider:    "mtn",        // mtn | orange | wave | moov
    phone:       "237670000000",
    amount:      5000,         // en XAF
    currency:    "XAF",
    reference:   "ORDER-001",
    description: "Commande Kuvaago"
  })
});

const { paymentId, status } = await response.json();
// status = "pending" → le client reçoit un push USSD`,
    tip: 'Pour MTN, le client valide via USSD push sur son téléphone. Pour Orange Money, le PIN est saisi côté client — ST Pay le relaie de façon sécurisée, jamais logué.',
    tone: 'teal',
  },
  {
    tab: '3. Escrow',
    badge: 'Étape 3 / 4',
    title: 'Créer un escrow (paiement garanti)',
    snippetTitle: 'Créer un escrow puis suivre la libération',
    description:
      'Idéal pour les marketplaces. Les fonds sont bloqués jusqu\'à la confirmation de livraison.',
    code: `// 1. Créer l'escrow
const escrow = await fetch("/v1/escrow", {
  method: "POST",
  headers: { "Authorization": \`Bearer \${API_KEY}\` },
  body: JSON.stringify({
    amount:        25000,
    currency:      "XAF",
    buyer_phone:   "237670000001",
    seller_phone:  "237691000002",
    provider:      "orange",
    timeout_hours: 48    // libération auto après 48h
  })
}).then(r => r.json());

// 2. Partager le lien acheteur → escrow.buyer_url
// 3. Le vendeur confirme l'expédition → PATCH /escrow/{id}/confirm
// 4. L'acheteur valide le code de retrait → fonds libérés`,
    tip: 'Le code de retrait (pickup code) est le seul déclencheur de libération des fonds. Si l\'acheteur ne confirme pas dans le délai, un timeout automatique libère le vendeur.',
    tone: 'purple',
  },
  {
    tab: '4. Webhooks',
    badge: 'Étape 4 / 4',
    title: 'Recevoir les webhooks de confirmation',
    snippetTitle: 'Express.js — réception et vérification HMAC',
    description:
      'ST Pay appelle ton endpoint quand le statut change. Vérifie toujours la signature HMAC-SHA256 avant de traiter l\'événement.',
    code: `// Express.js — exemple de réception webhook
app.post("/webhooks/stpay", (req, res) => {
  const sig     = req.headers["x-stpay-signature"];
  const secret  = process.env.STPAY_WEBHOOK_SECRET;
  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (sig !== expected) return res.status(401).end();

  const { event, data } = req.body;
  if (event === "payment.success") {
    // Libérer la commande / notifier l'utilisateur
  }
  res.status(200).end();
});`,
    tip: 'Configure ton URL webhook dans le portail ST Pay → Webhooks. Utilise ngrok en local pour les tests. Ne libère jamais une commande sur la valeur de retour de l\'API — attends toujours le webhook payment.success.',
    tone: 'orange',
  },
]

const TONE_STYLE: Record<StepTone, { bg: string; text: string }> = {
  orange: { bg: '#FF660020', text: '#CC4400' },
  teal: { bg: '#E1F5EE', text: '#0F6E56' },
  purple: { bg: '#EEEDFE', text: '#3C3489' },
}

export default function QuickStartGuide() {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const step = useMemo(() => STEPS[currentStep], [currentStep])

  return (
    <section className="w-full max-w-5xl mx-auto [font-family:var(--font-sans)]" style={{ color: 'var(--text-1)' }}>
      <div className="rounded-2xl border p-5 md:p-6" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-card, #FFFFFF)' }}>
        <div className="mb-5">
          <div className="flex items-center gap-2.5">
            {STEPS.map((_, i) => (
              <React.Fragment key={i}>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: i <= currentStep ? '#FF6600' : 'var(--border-soft)' }}
                />
                {i < STEPS.length - 1 && (
                  <span
                    className="h-px flex-1"
                    style={{ background: i < currentStep ? '#FF6600' : 'var(--border-soft)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {STEPS.map((item, index) => {
            const active = index === currentStep
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => setCurrentStep(index)}
                className="rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition"
                style={{
                  color: active ? '#FF6600' : 'var(--text-2)',
                  border: `0.5px solid ${active ? '#FF6600' : 'var(--border-soft)'}`,
                  background: active ? '#FFF4EC' : 'transparent',
                }}
              >
                {item.tab}
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border p-4 md:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg, #FFFFFF)' }}>
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: TONE_STYLE[step.tone].bg, color: TONE_STYLE[step.tone].text }}
          >
            {step.badge}
          </span>

          <h2 className="mt-3 text-lg font-extrabold tracking-tight">{step.title}</h2>
          <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: 'var(--text-2)' }}>
            {step.description}
          </p>

          <CodeSnippet
            title={step.snippetTitle}
            code={step.code}
            className="mt-4"
            preClassName="text-[12.5px] leading-[1.7] text-white"
          />

          <div
            className="mt-4 rounded-r-lg px-[14px] py-[10px] text-[13px] leading-[1.6]"
            style={{
              background: 'var(--bg-raised)',
              borderLeft: '2px solid #FF6600',
              color: 'var(--text-2)',
            }}
          >
            {step.tip}
          </div>

          <div className="mt-5 flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((v) => Math.max(0, v - 1))}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold"
                style={{
                  color: 'var(--text-1)',
                  background: 'transparent',
                  border: '0.5px solid var(--border-soft)',
                }}
              >
                ← Précédent
              </button>
            ) : (
              <span />
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((v) => Math.min(STEPS.length - 1, v + 1))}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
                style={{ background: '#FF6600' }}
              >
                Étape suivante →
              </button>
            ) : (
              <Link
                to="/developer-portal"
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
                style={{ background: '#FF6600' }}
              >
                Terminé ✓
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
