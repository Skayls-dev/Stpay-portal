import React from 'react'
import { Link } from 'react-router-dom'
import { CodeSnippet } from '../components/ui'
import FlowDiagram from '../components/diagrams/FlowDiagram'

const SCENARIOS = [
  {
    title: 'Scénario 1 : paiement initié depuis la montre',
    steps: [
      'L’utilisateur lance un paiement sur la montre.',
      'La montre transmet la demande à l’app mobile via Data Layer ou WatchConnectivity.',
      'L’app mobile appelle l’API ST Pay avec la clé API du marchand.',
      'L’app mobile renvoie l’état courant vers la montre : QR, code USSD, attente ou statut final.',
      'La montre affiche le résultat final sans jamais exposer la clé API.',
    ],
    diagram: `sequenceDiagram
  participant Watch as Montre connectée
  participant Mobile as App mobile compagnon
  participant API as API ST Pay
  Watch->>Mobile: Demande de paiement (montant, référence)
  Mobile->>API: POST /api/Payment avec X-Api-Key
  API-->>Mobile: Statut initial (en attente)
  Mobile-->>Watch: Afficher QR, code ou attente
  API-->>Mobile: Statut final (succès ou échec)
  Mobile-->>Watch: Afficher le statut final`,
  },
  {
    title: 'Scénario 2 : synchronisation du statut',
    steps: [
      'Le mobile suit le paiement en polling ou via webhook.',
      'À chaque changement significatif, le mobile pousse un résumé de statut vers la montre.',
      'La montre n’appelle jamais directement l’API ST Pay.',
    ],
    diagram: `sequenceDiagram
  participant Watch as Montre connectée
  participant Mobile as App mobile compagnon
  participant API as API ST Pay
  loop Synchronisation statut
  API-->>Mobile: Mise à jour de statut
  Mobile-->>Watch: pending, success, failed, cancelled
  end
  Note over Watch,Mobile: La logique réseau et la clé API restent côté mobile`,
  },
  {
    title: 'Scénario 3 : annulation depuis la montre',
    steps: [
      'L’utilisateur appuie sur Annuler depuis la montre.',
      'La montre envoie la commande à l’app mobile.',
      'Le mobile appelle l’API d’annulation ou interrompt le flux local selon l’état courant.',
      'Le mobile confirme ensuite le nouvel état à la montre.',
    ],
    diagram: `sequenceDiagram
  participant Watch as Montre connectée
  participant Mobile as App mobile compagnon
  participant API as API ST Pay
  Watch->>Mobile: Annuler le paiement
  Mobile->>API: DELETE /api/Payment/{id}
  API-->>Mobile: Statut d'annulation
  Mobile-->>Watch: Afficher paiement annulé`,
  },
]

const ANDROID_SNIPPET = `// Sur la montre (Wear OS) — Kotlin
val request = "PAYMENT_REQUEST|amount=5000;ref=ORDER123"
val nodeId = /* ID du mobile appairé */

Wearable.getMessageClient(context)
  .sendMessage(nodeId, "/stpay/payment", request.toByteArray())

// Sur le mobile Android
override fun onMessageReceived(event: MessageEvent) {
  if (event.path == "/stpay/payment") {
    val data = String(event.data)
    val response = apiClient.processPayment(
      amount = 5000,
      currency = "XAF",
      provider = "MTN",
      reference = "ORDER123"
    )

    val statusMsg = "STATUS|\${response.status}"
    Wearable.getMessageClient(context)
      .sendMessage(nodeId, "/stpay/status", statusMsg.toByteArray())
  }
}`

const IOS_SNIPPET = `// Sur la montre (watchOS)
let message = ["type": "payment_request", "amount": 5000, "ref": "ORDER123"]
WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)

// Sur l'iPhone compagnon
func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
  guard message["type"] as? String == "payment_request" else { return }

  // Appel API ST Pay ici
  let statusMsg = ["type": "status", "status": "pending"]
  session.sendMessage(statusMsg, replyHandler: nil, errorHandler: nil)
}

// Sur la montre : affichage du statut
func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
  guard message["type"] as? String == "status" else { return }
  let status = message["status"] as? String
  // Afficher succès, échec ou attente
}`

const DESIGN_RULES = [
  'Ne stockez jamais la clé API sur la montre. Toute authentification ST Pay reste côté mobile.',
  'Testez d’abord la communication montre ↔ mobile avant d’introduire l’appel API.',
  'Prévoyez des états réseau explicites : appareil hors ligne, app mobile fermée, session expirée.',
  'Réduisez la charge UI côté montre : affichez un résumé court, laissez le détail au mobile.',
]

export default function WearablesGuide() {
  return (
    <div className="space-y-5">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Guide Wearables & Companion Apps</span>
          <span className="text-[11px] text-[var(--text-3)]">Intégré au portail marchand, sans sortie vers un fichier HTML externe</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl space-y-2">
              <h1 className="text-[24px] font-extrabold text-[var(--text-1)]">Intégrer ST Pay sur smartwatch avec app compagnon</h1>
              <p className="text-[13px] leading-6 text-[var(--text-2)]">
                Cette page reprend le guide wearables dans l’application elle-même. Le principe reste le même : la montre orchestre l’expérience utilisateur,
                mais le mobile compagnon porte l’appel API, la sécurité et le suivi du paiement.
              </p>
            </div>
            <Link to="/merchant/developer" className="btn-secondary text-[12px]">
              Retour au portail développeur
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1d4ed8]">Architecture</p>
              <p className="mt-2 text-[13px] text-[#1e3a8a]">Montre pour l’UI, mobile pour la logique métier, API ST Pay pour l’exécution du paiement.</p>
            </div>
            <div className="rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#c2410c]">Sécurité</p>
              <p className="mt-2 text-[13px] text-[#9a3412]">La clé API ne quitte jamais le mobile. La montre ne détient que des messages métier et des statuts.</p>
            </div>
            <div className="rounded-[12px] border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#15803d]">UX</p>
              <p className="mt-2 text-[13px] text-[#166534]">Affichez une progression courte sur la montre et renvoyez vers le téléphone pour le détail complet.</p>
            </div>
          </div>
        </div>
      </div>

      {SCENARIOS.map((scenario) => (
        <div key={scenario.title} className="panel">
          <div className="panel-header">
            <span className="panel-title">{scenario.title}</span>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1.15fr_0.85fr]">
            <ol className="space-y-2 pl-5 text-[13px] leading-6 text-[var(--text-2)]">
              {scenario.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--text-3)]">Séquence</p>
              <FlowDiagram
                id={`wearable-sequence-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                definition={scenario.diagram}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Exemple Android / Wear OS</span>
          </div>
          <div className="p-5">
            <CodeSnippet title="Kotlin — montre + mobile" code={ANDROID_SNIPPET} preClassName="text-[12px] whitespace-pre leading-6" />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Exemple iOS / watchOS</span>
          </div>
          <div className="p-5">
            <CodeSnippet title="Swift — WatchConnectivity" code={IOS_SNIPPET} preClassName="text-[12px] whitespace-pre leading-6" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Checklist d’implémentation</span>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {DESIGN_RULES.map((rule) => (
            <div key={rule} className="rounded-[12px] border border-[var(--border)] bg-white p-4 text-[13px] leading-6 text-[var(--text-2)]">
              {rule}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}