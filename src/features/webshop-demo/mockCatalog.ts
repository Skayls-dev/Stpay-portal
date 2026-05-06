export type DemoProduct = {
  id: string
  name: string
  description: string
  priceXaf: number
  badge: string
  image: string
}

export const demoCatalog: DemoProduct[] = [
  {
    id: 'earbuds-pro',
    name: 'Ecouteurs Nomad Pro',
    description: 'Bluetooth 5.3, reduction de bruit, autonomie 28h.',
    priceXaf: 32900,
    badge: 'Audio',
    image: '/webshop/photos/earbuds.jpg',
  },
  {
    id: 'urban-watch',
    name: 'Montre Urban Pulse',
    description: 'Suivi activite, notifications, etanche IP68.',
    priceXaf: 58900,
    badge: 'Wearable',
    image: '/webshop/photos/watch.jpg',
  },
  {
    id: 'travel-pack',
    name: 'Sac Travel Lite 25L',
    description: 'Compartiment laptop 15", tissu impermeable.',
    priceXaf: 24900,
    badge: 'Lifestyle',
    image: '/webshop/photos/bag.jpg',
  },
  {
    id: 'power-bank',
    name: 'Power Bank 20 000mAh',
    description: 'Charge rapide USB-C PD, double sortie.',
    priceXaf: 19900,
    badge: 'Accessoire',
    image: '/webshop/photos/powerbank.jpg',
  },
  {
    id: 'wireless-charger',
    name: 'Chargeur sans fil 15W',
    description: 'Compatible Qi, charge rapide, indicateur LED.',
    priceXaf: 12500,
    badge: 'Accessoire',
    image: '/webshop/photos/charger.jpg',
  },
  {
    id: 'bluetooth-speaker',
    name: 'Enceinte Groove Mini',
    description: 'Son 360°, etanche IPX5, autonomie 12h.',
    priceXaf: 27900,
    badge: 'Audio',
    image: '/webshop/photos/speaker.jpg',
  },
]

export const demoProviders = [
  { value: 'MTN', label: 'MTN Mobile Money' },
  { value: 'ORANGE', label: 'Orange Money' },
] as const
