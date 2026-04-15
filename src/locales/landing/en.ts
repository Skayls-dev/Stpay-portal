import type { LandingLocale } from './index'

const en: LandingLocale = {
  badge: 'First Mobile Money + Escrow aggregator in Central Africa',
  announcementBar: 'Free sandbox · WhatsApp support · No lock-in',
  headingPart1: 'Accept ',
  headingHighlight: 'MTN and Orange',
  headingPart2: ' with a single integration.',
  heroOperatorLabel: 'Integrated operators',
  heading: 'Accept MTN and Orange with a single integration.',
  subheading:
    'ST Pay unifies all your Mobile Money operators, secures every transaction with native escrow, and gives you a complete real-time view of your business.',
  brandTagline: 'B2B Mobile Money Gateway',
  webshopDemo: 'View demo',
  accessPortal: 'Access portal',
  createMerchant: 'Create my merchant account',
  merchantLogin: 'Merchant login',
  adminLogin: 'Admin login',
  apiExample: 'API example',
  finalStatus: 'Final status: SUCCESSFUL',
  webhookAck: 'Webhook received in 1.8s, order automatically marked paid.',
  quickImplementation: 'Live in 4 steps',
  integrationTitle: 'From account opening to the first collected payment, the path is short.',
  viewPublicDemo: 'View public demo',
  footerTagline: 'ST Pay Cameroon · Douala',
  portals: 'Portals',
  leadTitle: 'Talk to the ST Pay team',
  leadSubtitle: 'Leave your details — we will contact you within 24 hours for onboarding and sandbox access.',
  leadAside: 'Guided B2B onboarding · Instant sandbox access · Go-live checklist included',
  leadAsideItems: [
    { text: 'Instant sandbox access after contact' },
    { text: '1:1 guided B2B onboarding' },
    { text: 'Go-live checklist provided' },
    { text: 'Dedicated WhatsApp support' },
    { text: 'No commitment, cancel any time' },
  ],
  leadCta: 'Send my request → Free sandbox access',
  leadSuccess: 'Request received. Our team will contact you on WhatsApp within 24 hours.',
  heroProblem: {
    title: "Your customers' reality:",
    text: 'they pay with MTN or Orange, rarely the same operator. Without ST Pay, you lose one sale out of three because you do not accept their operator. And when a dispute happens, you have no protection.',
  },
  socialProof: {
    eyebrow: 'They use ST Pay',
    heading: 'Merchants like you',
    trustStats: [
      { value: '50+', label: 'active merchants' },
      { value: '99.95%', label: 'API uptime' },
      { value: '< 2.2s', label: 'avg processing' },
      { value: '2', label: 'integrated operators' },
    ],
    quotes: [
      {
        text: 'Before ST Pay, I was losing orders every week because my customer had Orange while I only accepted MTN. Now that problem is gone.',
        initials: 'AK',
        name: 'Alphonse K.',
        role: 'Online store, Douala',
      },
      {
        text: 'Escrow allowed us to launch intercity deliveries without worrying about unpaid orders. The customer pays, we ship, the funds arrive. Simple.',
        initials: 'MN',
        name: 'Marie N.',
        role: 'E-commerce marketplace, Yaoundé',
      },
      {
        text: 'Integration took two days. We connected our Shopify store, tested in sandbox, and were live by Friday. Support replies fast on WhatsApp.',
        initials: 'PS',
        name: 'Patrick S.',
        role: 'Developer, SME Bafoussam',
      },
    ],
  },
  leadPhoneLabel: 'WhatsApp number *',
  leadPhoneError: 'WhatsApp number is required.',
  leadFields: {
    name: 'Full name',
    email: 'Business email',
    company: 'Store / company',
    volume: 'Estimated monthly volume',
    volumeOptions: [
      { value: '', label: 'Select…' },
      { value: '<100k', label: '< 100,000 XAF / month' },
      { value: '100k-1M', label: '100,000 – 1,000,000 XAF / month' },
      { value: '>1M', label: '> 1,000,000 XAF / month' },
    ],
    operators: 'Desired operators',
    message: 'Describe your business in one sentence (optional)',
    privacyNote: 'Your data is never shared with third parties.',
  },
  metrics: [
    { label: 'API uptime', value: '99.95%' },
    { label: 'Unified operators', value: '2' },
    { label: 'Avg processing', value: '< 2.2s' },
    { label: 'Native CEMAC', value: 'XAF' },
  ],
  features: [
    {
      title: 'No more lost customers at checkout',
      text: 'A single payment link accepts MTN MoMo and Orange Money. Your customer picks their operator and you still get paid.',
    },
    {
      title: 'Funds secured until delivery',
      text: 'Native escrow holds the payment until receipt is confirmed. You ship without risk and the buyer cannot cancel after dispatch.',
    },
    {
      title: 'Real-time merchant dashboard',
      text: 'Every payment, every status, every webhook is visible in your merchant portal. No more manually tracking SMS messages.',
    },
    {
      title: 'Integrate in a few days',
      text: 'Documented REST API, available SDKs, and instant sandbox access. Your developers can integrate in under a week.',
    },
  ],
  steps: [
    {
      step: '01',
      title: 'Open your merchant account',
      text: 'Access the portal, tell us about your business, and generate your test API key.',
    },
    {
      step: '02',
      title: 'Integrate the sandbox API',
      text: 'POST /api/Payment with amount, operator, and order reference. Automatic webhook included.',
    },
    {
      step: '03',
      title: 'Go live',
      text: 'Go-live validation by the ST Pay team. Checklist provided. Production launch within 24 hours.',
    },
    {
      step: '04',
      title: 'Collect and analyze',
      text: 'Track your transactions, operator success rates, and average basket size from your dashboard.',
    },
  ],
  widget: {
    amount: 'Amount',
    chooseOp: 'Choose your operator',
    payNow: 'Pay now',
    escrowFoot: 'Payment secured by escrow',
    received: 'Payment received ✓',
    webhookDelivered: 'Webhook delivered',
    escrowActive: 'Escrow active · Secured',
  },
}

export default en
