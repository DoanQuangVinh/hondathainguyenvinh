import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const idPattern = /^[a-z0-9-]{1,80}$/i
function validOrigin(request: Request) { try { return request.headers.get('Origin') === new URL(request.url).origin } catch { return false } }
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text()
    if (text.length > 100_000) return null
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch { return null }
}

export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    const result = await env.LEADS_DB.prepare('SELECT * FROM cars ORDER BY sort_order, name').all<Record<string, unknown>>()
    if (!result.success) throw new Error('Could not read cars')
    const cars = result.results.map(row => {
      const { data_json: encoded, ...columns } = row
      try {
        const data = JSON.parse(String(encoded || '{}')) as Record<string, unknown>
        return { ...data, ...columns }
      } catch { return columns }
    })
    return json({ ok: true, cars })
  } catch { return json({ ok: false, error: 'database_unavailable', message: 'Không tải được danh mục xe.' }, 503) }
}

export const onRequestPost: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!validOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const data = await readBody(request)
  if (!data || typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 120 || typeof data.slug !== 'string' || data.slug.length > 80 || !slugPattern.test(data.slug)) {
    return json({ ok: false, error: 'invalid_car', message: 'Nhập tên xe và slug hợp lệ (chữ thường, số, dấu gạch ngang).' }, 422)
  }
  if (data.status !== 'draft' && data.status !== 'published') return json({ ok: false, error: 'invalid_status' }, 422)
  const listPrice = data.list_price == null || data.list_price === '' ? null : Number(data.list_price)
  if (listPrice !== null && (!Number.isSafeInteger(listPrice) || listPrice < 0)) return json({ ok: false, error: 'invalid_price' }, 422)
  if (typeof data.category === 'string' && data.category.length > 100) return json({ ok: false, error: 'invalid_category' }, 422)
  if (typeof data.on_road_price === 'string' && data.on_road_price.length > 100) return json({ ok: false, error: 'invalid_on_road_price' }, 422)
  const sortOrder = Number(data.sort_order ?? 0)
  if (!Number.isSafeInteger(sortOrder) || Math.abs(sortOrder) > 100_000) return json({ ok: false, error: 'invalid_sort_order' }, 422)
  const id = typeof data.id === 'string' && idPattern.test(data.id) ? data.id : crypto.randomUUID()
  const category = typeof data.category === 'string' ? data.category.trim() : ''
  const onRoadPrice = typeof data.on_road_price === 'string' ? data.on_road_price.trim() : ''
  try {
    const result = await env.LEADS_DB.prepare(`
      INSERT INTO cars(id,slug,name,category,list_price,on_road_price,data_json,status,featured,sort_order,seo_title,seo_description,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,category=excluded.category,list_price=excluded.list_price,
        on_road_price=excluded.on_road_price,data_json=excluded.data_json,status=excluded.status,featured=excluded.featured,
        sort_order=excluded.sort_order,seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=excluded.updated_at
    `).bind(
      id, data.slug, data.name.trim(), category, listPrice, onRoadPrice, JSON.stringify(data), data.status,
      data.featured === true ? 1 : 0, sortOrder,
      typeof data.seo_title === 'string' ? data.seo_title.slice(0, 200) : '',
      typeof data.seo_description === 'string' ? data.seo_description.slice(0, 500) : ''
    ).run()
    if (!result.success) throw new Error('Save failed')
    return json({ ok: true, id }, 201)
  } catch { return json({ ok: false, error: 'save_failed', message: 'Không lưu được xe. Có thể slug đã được sử dụng.' }, 409) }
}

export const onRequestDelete: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!validOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !idPattern.test(id)) return json({ ok: false, error: 'invalid_id' }, 400)
  try {
    const result = await env.LEADS_DB.prepare('DELETE FROM cars WHERE id = ?').bind(id).run()
    if (!result.success) throw new Error('Delete failed')
    return json({ ok: true, deleted: result.meta?.changes === 1 })
  } catch { return json({ ok: false, error: 'database_unavailable' }, 503) }
}
