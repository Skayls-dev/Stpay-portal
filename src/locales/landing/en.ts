import type { LandingLocale } from './index'

const en: LandingLocale = {
  badge: 'West Africa payment infrastructure',
  heading: 'Launch your mobile money checkout in days, not in months.',
  subheading:
    'ST Pay unifies providers, secures collections, and simplifies operations for product, support, and finance teams.',
  brandTagline: 'B2B mobile money gateway',
  webshopDemo: 'Webshop Demo',
  accessPortal: 'Access portal',
  createMerchant: 'Create merchant account',
  merchantLogin: 'Merchant login',
  adminLogin: 'Admin login',
  apiExample: 'API example',
  finalStatus: 'Final status: SUCCESSFUL',
  webhookAck: 'Webhook received in 1.8s, order automatically marked paid.',
  quickImplementation: 'Fast implementation',
  integrationTitle: 'How ST Pay integrates in your product',
  viewPublicDemo: 'Open public demo',
  footerTagline: 'ST Pay · Secure checkout for mobile money',
  portals: 'Portals',
  leadTitle: 'Talk with ST Pay team',
  leadSubtitle: 'Leave your details to schedule an integration or merchant pilot.',
  leadAside: 'B2B onboarding, sandbox access, and go-live checklist.',
  leadCta: 'Send request',
  leadSuccess: 'Thanks. Our team will contact you soon.',
  leadFields: {
    name: 'Full name',
    email: 'Work email',
    company: 'Company',
    message: 'Context (optional)',
  },
  metrics: [
    { label: 'API uptime', value: '99.95%' },
    { label: 'Avg processing', value: '< 2.2s' },
    { label: 'Providers', value: '4+' },
    { label: 'Countries live', value: '8' },
  ],
  features: [
    {
      title: 'Unified mobile money checkout',
      text: 'One integration for MTN, Orange, Wave, and Moov with resilient fallback flows.',
    },
    {
      title: 'Native escrow',
      text: 'Activate hold, delivery checks, and fund release without external tools.',
    },
    {
      title: 'Reliable webhooks',
      text: 'Automatic retries, event replay, and production-grade traces for support.',
    },
    {
      title: 'Observability and analytics',
      text: 'Provider health, checkout conversion, DX insights, and real-time monitoring.',
    },
  ],
  steps: [
    {
      step: '01',
      title: 'Create your merchant account',
      text: 'Access the portal, generate a test API key, and configure your callback webhook.',
    },
    {
      step: '02',
      title: 'Initiate a payment',
      text: 'Call POST /api/Payment with amount, provider, customer, and business metadata.',
    },
    {
      step: '03',
      title: 'Confirm on mobile',
      text: 'The customer validates on phone (PIN depending on provider), then status syncs.',
    },
    {
      step: '04',
      title: 'Finalize and analyze',
      text: 'Receive webhook, update order state, and track performance dashboards.',
    },
  ],
}

export default en
