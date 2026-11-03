import { json, type LeadEnv, type PagesFunction } from '../_shared/env.ts'

type CarRow = Record<string, unknown> & { data_json?: string | null }
type SettingRow = { key: string; value_json: string }

export const onRequestGet: PagesFunction<LeadEnv> = async ({ env }) => {
  if (!env.LEADS_DB) return json({ ok: true, source: 'static', cars: [], articles: [], settings: {} })
  try {
    const [cars, articles, settings] = await Promise.all([
      env.LEADS_DB.prepare("SELECT id, slug, name, category, list_price, on_road_price, data_json, featured, sort_order, seo_title, seo_description FROM cars WHERE status = 'published' ORDER BY sort_order, name").all<CarRow>(),
      env.LEADS_DB.prepare("SELECT id, slug, title, type, excerpt, body, cover_image, published_at, seo_title, seo_description FROM articles WHERE status = 'published' ORDER BY published_at DESC").all<Record<string, unknown>>(),
      env.LEADS_DB.prepare("SELECT key, value_json FROM site_settings WHERE key IN ('business','popup')").all<SettingRow>()
    ])
    if (!cars.success || !articles.success || !settings.success) throw new Error('Could not load catalog')

    const parsedCars = cars.results.map(row => {
      const { data_json: encoded, ...columns } = row
      try { return { ...JSON.parse(String(encoded || '{}')), ...columns } }
      catch { return columns }
    })
    const parsedSettings: Record<string, unknown> = {}
    for (const row of settings.results) {
      try {
        const value: unknown = JSON.parse(row.value_json)
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue
        const fields = value as Record<string, unknown>
        if (row.key === 'business') parsedSettings.business = { phone: fields.phone, zalo: fields.zalo, address: fields.address }
        if (row.key === 'popup') parsedSettings.popup = {
          enabled: fields.enabled, title: fields.title, description: fields.description,
          delay_seconds: fields.delay_seconds, button_text: fields.button_text, image: fields.image
        }
      } catch { /* Ignore malformed public settings. */ }
    }
    return json({ ok: true, source: 'cms', cars: parsedCars, articles: articles.results, settings: parsedSettings })
  } catch { return json({ ok: false, error: 'catalog_unavailable' }, 503) }
}
