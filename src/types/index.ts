export type Car = {
  id: string; slug: string; name: string; category: string; price: number | null; priceLabel: string
  image: string; secondaryImage: string; description: string; powertrain: string; seats: number
  fuel: string; transmission: string; engine: string; dimensions: string; colors: { name: string; hex: string }[]
  highlights: string[]; trim: { name: string; price: string; description: string }[]; featured?: boolean
  officialUrl: string; officialPriceUrl: string; verified: boolean; specs: { label: string; value: string }[]
}
export type Article = { slug: string; category: string; date: string; title: string; excerpt: string; image: string; read: string; body: string[] }
