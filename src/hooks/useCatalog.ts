import { useEffect, useState } from 'react'
import { cars as fallbackCars } from '../data/cars'
import type { Car } from '../types'
import { articles as fallbackArticles } from '../data/articles'
import type { Article } from '../types'

export function useCatalogCars(): Car[] {
  const [cars, setCars] = useState<Car[]>(fallbackCars)
  useEffect(() => {
    let active = true
    void fetch('/api/catalog', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => {
      if (!active || data?.source !== 'cms' || !Array.isArray(data.cars)) return
      const normalized = data.cars.map((row: Record<string, any>) => ({
        ...row,
        id: String(row.id),
        price: row.list_price != null ? Math.round(Number(row.list_price) / 1_000_000) : (typeof row.price === 'number' ? row.price : null),
        priceLabel: row.priceLabel || (row.list_price ? `${(Number(row.list_price) / 1_000_000).toLocaleString('vi-VN')} triệu ₫` : 'Liên hệ xác nhận'),
        image: row.image || '', secondaryImage: row.secondaryImage || row.image || '',
        colors: Array.isArray(row.colors) ? row.colors : [], trim: Array.isArray(row.trim) ? row.trim : [],
        specs: Array.isArray(row.specs) ? row.specs : [], highlights: Array.isArray(row.highlights) ? row.highlights : [],
        verified: Boolean(row.verified), featured: Boolean(row.featured),
        officialUrl: String(row.officialUrl || ''), officialPriceUrl: String(row.officialPriceUrl || '')
      })) as Car[]
      setCars(normalized)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  return cars
}

export function useCatalogArticles(): Article[] {
  const [articles, setArticles] = useState<Article[]>(fallbackArticles)
  useEffect(() => {
    let active = true
    void fetch('/api/catalog', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => {
      if (!active || data?.source !== 'cms' || !Array.isArray(data.articles)) return
      setArticles(data.articles.map((row: Record<string, any>) => ({
        slug: String(row.slug), category: row.type === 'promotion' ? 'Khuyến mãi' : 'Góc tư vấn ô tô',
        date: row.published_at ? new Date(row.published_at).toLocaleDateString('vi-VN') : '',
        title: String(row.title), excerpt: String(row.excerpt || ''), image: String(row.cover_image || ''),
        read: '3 phút đọc', body: String(row.body || '').split(/\n{2,}/).filter(Boolean)
      })))
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  return articles
}
