import en from './en'
import fr from './fr'

export type Lang = 'fr' | 'en'

export type LandingLocale = {
  badge: string
  announcementBar: string
  headingPart1: string
  headingHighlight: string
  headingPart2: string
  heroOperatorLabel: string
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
  leadAsideItems: Array<{ text: string }>
  leadCta: string
  leadSuccess: string
  heroProblem: { title: string; text: string }
  socialProof: {
    eyebrow: string
    heading: string
    trustStats: Array<{ value: string; label: string }>
    quotes: Array<{ text: string; initials: string; name: string; role: string }>
  }
  leadPhoneLabel: string
  leadPhoneError: string
  leadFields: {
    name: string
    email: string
    company: string
    volume: string
    volumeOptions: Array<{ value: string; label: string }>
    operators: string
    message: string
    privacyNote: string
  }
  metrics: Array<{ label: string; value: string }>
  features: Array<{ title: string; text: string }>
  steps: Array<{ step: string; title: string; text: string }>
  widget: {
    amount: string
    chooseOp: string
    payNow: string
    escrowFoot: string
    received: string
    webhookDelivered: string
    escrowActive: string
  }
}

export const landingLocales: Record<Lang, LandingLocale> = {
  fr,
  en,
}
