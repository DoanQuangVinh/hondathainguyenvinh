import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
function originOk(request: Request) { try { return request.headers.get('Origin') === new URL(request.url).origin } catch { return false } }
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text()
    if (text.length > 500_000) return null
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch { return null }
}

export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    const [articles, settings] = await Promise.all([
      env.LEADS_DB.prepare('SELECT * FROM articles ORDER BY updated_at DESC').all<ArticleRow>(),
      env.LEADS_DB.prepare('SELECT key,value_json FROM site_settings').all<{ key: string; value_json: string }>()
    ])
    if (!articles.success || !settings.success) throw new Error('Could not load CMS data')
    return json({
      ok: true,
      articles: articles.results,
      settings: Object.fromEntries(settings.results.map(row => {
        try { return [row.key, JSON.parse(row.value_json)] } catch { return [row.key, null] }
      }))
    })
  } catch { return json({ ok: false, error: 'database_unavailable', message: 'Không tải được bài viết và cài đặt.' }, 503) }
}

type ArticleRow = { id: string; slug: string; title: string; type: string; excerpt: string; body: string; cover_image: string | null; status: string; published_at: string | null; seo_title: string | null; seo_description: string | null; updated_at: string }

export const onRequestPost: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!originOk(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const data = await readBody(request)
  if (!data) return json({ ok: false, error: 'invalid_json' }, 400)

  if (data.kind === 'settings') {
    if (!data.values || typeof data.values !== 'object' || Array.isArray(data.values)) return json({ ok: false, error: 'invalid_settings' }, 422)
    const values = data.values as Record<string, unknown>
    const entries = Object.entries(values).filter(([key]) => /^(business|popup)$/.test(key))
    if (!entries.length) return json({ ok: false, error: 'invalid_settings' }, 422)
    try {
      for (const [key, value] of entries) {
        const encoded = JSON.stringify(value)
        if (encoded.length > 50_000) return json({ ok: false, error: 'settings_too_large' }, 422)
        const result = await env.LEADS_DB.prepare("INSERT INTO site_settings(key,value_json,updated_at) VALUES(?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(key, encoded).run()
        if (!result.success) throw new Error('Settings write failed')
      }
      return json({ ok: true })
    } catch { return json({ ok: false, error: 'settings_save_failed' }, 503) }
  }

  if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 200 || typeof data.slug !== 'string' || data.slug.length > 100 || !slugPattern.test(data.slug)) {
    return json({ ok: false, error: 'invalid_article', message: 'Nhập tiêu đề và slug hợp lệ (chữ thường, số, dấu gạch ngang).' }, 422)
  }
  if (data.type !== 'news' && data.type !== 'promotion') return json({ ok: false, error: 'invalid_type' }, 422)
  if (data.status !== 'draft' && data.status !== 'published') return json({ ok: false, error: 'invalid_status' }, 422)
  const excerpt = typeof data.excerpt === 'string' ? data.excerpt : ''
  const body = typeof data.body === 'string' ? data.body : ''
  const coverImage = typeof data.cover_image === 'string' ? data.cover_image.trim() : ''
  if (excerpt.length > 2_000 || body.length > 200_000 || coverImage.length > 2_000) return json({ ok: false, error: 'content_too_large' }, 422)
  const id = typeof data.id === 'string' && /^[a-z0-9-]{1,80}$/i.test(data.id) ? data.id : crypto.randomUUID()
  const seoTitle = typeof data.seo_title === 'string' ? data.seo_title.slice(0, 200) : ''
  const seoDescription = typeof data.seo_description === 'string' ? data.seo_description.slice(0, 500) : ''
  const published = data.status === 'published'
  try {
    const result = await env.LEADS_DB.prepare(`
      INSERT INTO articles(id,slug,title,type,excerpt,body,cover_image,status,published_at,seo_title,seo_description,updated_at)
      VALUES(?,?,?,?,?,?,?,?,CASE WHEN ?='published' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,type=excluded.type,excerpt=excluded.excerpt,
        body=excluded.body,cover_image=excluded.cover_image,status=excluded.status,
        published_at=CASE WHEN excluded.status='published' THEN COALESCE(articles.published_at,excluded.published_at) ELSE NULL END,
        seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=excluded.updated_at
    `).bind(id, data.slug, data.title.trim(), data.type, excerpt, body, coverImage || null, data.status, published ? 'published' : 'draft', seoTitle, seoDescription).run()
    if (!result.success) throw new Error('Article write failed')
    return json({ ok: true, id }, 201)
  } catch { return json({ ok: false, error: 'save_failed', message: 'Không lưu được bài viết. Có thể slug đã được sử dụng.' }, 409) }
}

export const onRequestDelete: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!originOk(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[a-z0-9-]{1,80}$/i.test(id)) return json({ ok: false, error: 'invalid_id' }, 400)
  try {
    const result = await env.LEADS_DB.prepare('DELETE FROM articles WHERE id=?').bind(id).run()
    if (!result.success) throw new Error('Article delete failed')
    return json({ ok: true, deleted: result.meta?.changes === 1 })
  } catch { return json({ ok: false, error: 'database_unavailable' }, 503) }
}
