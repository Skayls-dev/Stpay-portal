import en from './en'
import fr from './fr'

export type Lang = 'fr' | 'en'

export type LandingLocale = {
  badge: string
  heading: string
  subheading: string
  brandTagline: string
  webshopDemo: string
  accessPortal: string
  createMerchant: string
  merchantLogin: string
  adminLogin: string
  apiExample: string
  finalStatus: string
  webhookAck: string
  quickImplementation: string
  integrationTitle: string
  viewPublicDemo: string
  footerTagline: string
  portals: string
  leadTitle: string
  leadSubtitle: string
  leadAside: string
  leadCta: string
  leadSuccess: string
  leadFields: {
    name: string
    email: string
    company: string
    message: string
  }
  metrics: Array<{ label: string; value: string }>
  features: Array<{ title: string; text: string }>
  steps: Array<{ step: string; title: string; text: string }>
}

export const landingLocales: Record<Lang, LandingLocale> = {
  fr,
  en,
}
