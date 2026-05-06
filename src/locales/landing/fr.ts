import type { LandingLocale } from './index'

const fr: LandingLocale = {
  badge: 'Premier aggregateur Mobile Money + Escrow en Afrique Centrale',
  announcementBar: 'Sandbox gratuit · Support WhatsApp · Aucun engagement',
  headingPart1: 'Encaissez ',
  headingHighlight: 'MTN et Orange',
  headingPart2: ' avec une seule intégration.',
  heroOperatorLabel: 'Opérateurs intégrés',
  heading: 'Encaissez MTN et Orange — avec une seule intégration.',
  subheading:
    'ST Pay unifie tous vos opérateurs Mobile Money, sécurise chaque transaction par escrow natif, et vous donne une vue complète de votre activité en temps réel.',
  brandTagline: 'Gateway Mobile Money B2B',
  webshopDemo: 'Voir une démo',
  accessPortal: 'Accéder au portail',
  createMerchant: 'Créer mon compte marchand',
  merchantLogin: 'Connexion marchand',
  adminLogin: 'Connexion admin',
  apiExample: 'Exemple API',
  finalStatus: 'Statut final : SUCCESSFUL',
  webhookAck: 'Webhook reçu en 1.8s, commande marquée payée automatiquement.',
  quickImplementation: 'Actif en 4 étapes',
  integrationTitle: 'Du compte ouvert au premier paiement encaissé, le chemin est court.',
  viewPublicDemo: 'Voir la démo publique',
  footerTagline: 'ST Pay Cameroun · Douala',
  portals: 'Portails',
  leadTitle: 'Parlez à l\'équipe ST Pay',
  leadSubtitle: 'Laissez vos coordonnées — on vous contacte sous 24h pour votre onboarding et votre accès sandbox.',
  leadAside: 'Onboarding B2B accompagné · Accès sandbox immédiat · Checklist go-live fournie',
  leadAsideItems: [
    { text: 'Accès sandbox immédiat après contact' },
    { text: 'Onboarding B2B accompagné 1:1' },
    { text: 'Checklist go-live fournie' },
    { text: 'Support WhatsApp dédié' },
    { text: 'Aucun engagement, annulation libre' },
  ],
  leadCta: 'Envoyer ma demande → Accès sandbox gratuit',
  leadSuccess: 'Demande reçue. Notre équipe vous contacte sous 24h sur WhatsApp.',
  heroProblem: {
    title: 'La réalité de vos clients :',
    text: "ils payent avec MTN ou Orange — rarement le même opérateur. Sans ST Pay, vous ratez une vente sur trois parce que vous n'acceptez pas leur opérateur. Et quand un litige survient, vous n'avez aucun recours.",
  },
  socialProof: {
    eyebrow: 'Ils utilisent ST Pay',
    heading: 'Des marchands comme vous',
    trustStats: [
      { value: '50+', label: 'marchands actifs' },
      { value: '99.95%', label: 'uptime API' },
      { value: '< 2.2s', label: 'traitement moyen' },
      { value: '2', label: 'opérateurs intégrés' },
    ],
    quotes: [
      {
        text: "Avant ST Pay, je perdais des commandes chaque semaine parce que mon client avait Orange et moi j'acceptais seulement MTN. Maintenant c'est réglé.",
        initials: 'AK',
        name: 'Alphonse K.',
        role: 'Boutique en ligne, Douala',
      },
      {
        text: "L'escrow nous a permis de lancer les livraisons inter-villes sans avoir peur des impayés. Le client paie, on livre, les fonds arrivent. Simple.",
        initials: 'MN',
        name: 'Marie N.',
        role: 'Marketplace e-commerce, Yaoundé',
      },
      {
        text: "L'intégration a pris deux jours. On a branché notre boutique Shopify, testé en sandbox, et on était en ligne le vendredi. Le support répond vite sur WhatsApp.",
        initials: 'PS',
        name: 'Patrick S.',
        role: 'Développeur, PME Bafoussam',
      },
    ],
  },
  leadPhoneLabel: 'Numéro WhatsApp *',
  leadPhoneError: 'Le numéro WhatsApp est requis.',
  leadFields: {
    name: 'Nom complet',
    email: 'Email professionnel',
    company: 'Boutique / entreprise',
    volume: 'Volume mensuel estimé',
    volumeOptions: [
      { value: '', label: 'Sélectionnez…' },
      { value: '<100k', label: '< 100 000 XAF / mois' },
      { value: '100k-1M', label: '100 000 – 1 000 000 XAF / mois' },
      { value: '>1M', label: '> 1 000 000 XAF / mois' },
    ],
    operators: 'Opérateurs souhaités',
    message: 'Décrivez votre activité en une phrase (optionnel)',
    privacyNote: 'Vos données ne sont jamais partagées avec des tiers.',
  },
  metrics: [
    { label: 'Opérateurs unifiés', value: '2' },
    { label: 'Uptime API', value: '99.95%' },
    { label: 'Traitement moyen', value: '< 2.2s' },
    { label: 'Natif CEMAC', value: 'XAF' },
  ],
  features: [
    {
      title: 'Zéro client perdu à la caisse',
      text: 'Ton client peut payer avec MTN ou Orange. Tu acceptes tout, tu ne refuses personne, tu fais plus de ventes.',
    },
    {
      title: 'Ton argent est sécurisé jusqu\'à la livraison',
      text: 'L\'argent est gardé en sécurité. Tu es payé seulement quand le client reçoit le colis. Pas de mauvaise surprise, pas d\'annulation après envoi.',
    },
    {
      title: 'Tu vois tout ce qui se passe en direct',
      text: 'Tu peux voir tous tes paiements sur ton téléphone ou ton ordinateur. Tu sais qui a payé, combien, et quand, sans stress.',
    },
    {
      title: 'Installation rapide et facile',
      text: 'Le système est simple à installer. En quelques jours, tu peux déjà commencer à encaisser.',
    },
  ],
  steps: [
    {
      step: '01',
      title: 'Ouvrir votre compte marchand',
      text: 'Accédez au portail, renseignez votre activité et générez votre clé API de test.',
    },
    {
      step: '02',
      title: 'Intégrer l\'API en sandbox',
      text: 'POST /api/Payment avec montant, opérateur et référence commande. Webhook automatique.',
    },
    {
      step: '03',
      title: 'Passer en production',
      text: 'Validation go-live par l\'équipe ST Pay. Checklist fournie. Mise en ligne sous 24h.',
    },
    {
      step: '04',
      title: 'Encaisser et analyser',
      text: 'Suivez vos transactions, taux de succès par opérateur et panier moyen depuis votre dashboard.',
    },
  ],
  widget: {
    amount: 'Montant',
    chooseOp: 'Choisissez votre opérateur',
    payNow: 'Payer maintenant',
    escrowFoot: 'Paiement sécurisé par escrow',
    received: 'Paiement reçu ✓',
    webhookDelivered: 'Webhook livré',
    escrowActive: 'Escrow actif · Sécurisé',
  },
}

export default fr
