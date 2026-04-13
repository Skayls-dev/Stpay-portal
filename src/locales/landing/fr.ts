import type { LandingLocale } from './index'

const fr: LandingLocale = {
  badge: 'Infrastructure paiement Afrique de l Ouest',
  heading: 'Lance ton checkout mobile money en quelques jours, pas en plusieurs mois.',
  subheading:
    'ST Pay unifie les providers, securise la collecte, et simplifie l operationnel de ton equipe produit, support et finance.',
  brandTagline: 'Gateway mobile money B2B',
  webshopDemo: 'Demo Webshop',
  accessPortal: 'Acceder au portail',
  createMerchant: 'Creer un compte marchand',
  merchantLogin: 'Connexion marchand',
  adminLogin: 'Connexion admin',
  apiExample: 'Exemple API',
  finalStatus: 'Status final: SUCCESSFUL',
  webhookAck: 'Webhook recu en 1.8s, commande marquee payee automatiquement.',
  quickImplementation: 'Implementation rapide',
  integrationTitle: 'Comment ST Pay s integre dans ton produit',
  viewPublicDemo: 'Voir demo publique',
  footerTagline: 'ST Pay · Secure checkout for mobile money',
  portals: 'Portails',
  leadTitle: 'Parler a l equipe ST Pay',
  leadSubtitle: 'Laisse tes infos pour planifier une integration ou un pilote marchand.',
  leadAside: 'Onboarding B2B, acces sandbox et checklist go-live.',
  leadCta: 'Envoyer ma demande',
  leadSuccess: 'Merci. Notre equipe revient vers toi rapidement.',
  leadFields: {
    name: 'Nom complet',
    email: 'Email pro',
    company: 'Entreprise',
    message: 'Contexte (optionnel)',
  },
  metrics: [
    { label: 'Uptime API', value: '99.95%' },
    { label: 'Temps moyen', value: '< 2.2s' },
    { label: 'Providers', value: '4+' },
    { label: 'Pays supportes', value: '8' },
  ],
  features: [
    {
      title: 'Checkout mobile money unifie',
      text: 'Une seule integration pour MTN, Orange, Wave et Moov avec fallback resilients.',
    },
    {
      title: 'Escrow natif',
      text: 'Active la retention, la livraison et la liberation des fonds sans outil externe.',
    },
    {
      title: 'Webhook fiable',
      text: 'Retries automatiques, relecture d evenements et traces exploitables en production.',
    },
    {
      title: 'Observabilite & analytics',
      text: 'Sante providers, conversion checkout, parcours DX et monitoring temps reel.',
    },
  ],
  steps: [
    {
      step: '01',
      title: 'Creer ton compte marchand',
      text: 'Accede au portail, genere ta cle API test et configure ton webhook de retour.',
    },
    {
      step: '02',
      title: 'Initier un paiement',
      text: 'POST /api/Payment avec montant, provider, client et metadata metier.',
    },
    {
      step: '03',
      title: 'Confirmer via mobile',
      text: 'Le client valide sur son telephone (PIN selon provider), puis statut synchronise.',
    },
    {
      step: '04',
      title: 'Finaliser et analyser',
      text: 'Recu webhook, mise a jour commande et suivi de performance dans les dashboards.',
    },
  ],
}

export default fr
