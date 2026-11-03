import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'

function validOrigin(request: Request) { try { return request.headers.get('Origin') === new URL(request.url).origin } catch { return false } }

export const onRequestPost: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!validOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB || !env.MEDIA_BUCKET || !env.MEDIA_PUBLIC_URL) return json({ ok: false, error: 'media_not_configured', message: 'Cần cấu hình R2 binding và MEDIA_PUBLIC_URL.' }, 503)

  let publicBase: URL
  try { publicBase = new URL(env.MEDIA_PUBLIC_URL) } catch { return json({ ok: false, error: 'media_not_configured' }, 503) }
  if (publicBase.protocol !== 'https:' || publicBase.username || publicBase.password || publicBase.search || publicBase.hash) return json({ ok: false, error: 'media_not_configured' }, 503)

  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024 + 256 * 1024) return json({ ok: false, error: 'payload_too_large' }, 413)
  let form: FormData
  try { form = await request.formData() } catch { return json({ ok: false, error: 'invalid_form' }, 400) }
  const file = form.get('file')
  if (!(file instanceof File)) return json({ ok: false, error: 'missing_file' }, 400)
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
  const extension = extensions[file.type]
  if (!extension || file.size < 1 || file.size > 8 * 1024 * 1024) return json({ ok: false, error: 'invalid_image', message: 'Chỉ nhận JPEG, PNG, WebP hoặc AVIF tối đa 8 MB.' }, 422)

  const sortOrder = Number(form.get('sortOrder') || 0)
  if (!Number.isSafeInteger(sortOrder) || Math.abs(sortOrder) > 100_000) return json({ ok: false, error: 'invalid_sort_order' }, 422)
  const id = crypto.randomUUID()
  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${id}.${extension}`
  const publicPath = publicBase.pathname.replace(/\/$/, '')
  const url = `${publicBase.origin}${publicPath}/${key}`
  const altText = String(form.get('alt') || '').trim().slice(0, 200)
  const carId = String(form.get('carId') || '').trim().slice(0, 80) || null
  const isCover = form.get('cover') === 'true' ? 1 : 0

  try {
    await env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
    const result = await env.LEADS_DB.prepare('INSERT INTO media_assets(id,object_key,url,alt_text,car_id,sort_order,is_cover) VALUES(?,?,?,?,?,?,?)').bind(id, key, url, altText, carId, sortOrder, isCover).run()
    if (!result.success) throw new Error('Could not save image metadata')
    return json({ ok: true, asset: { id, object_key: key, url, alt_text: altText, car_id: carId, sort_order: sortOrder, is_cover: isCover, created_at: new Date().toISOString() } }, 201)
  } catch {
    try { await env.MEDIA_BUCKET.delete(key) } catch { /* Best effort cleanup if metadata could not be saved. */ }
    return json({ ok: false, error: 'upload_failed', message: 'Không tải được ảnh lên thư viện.' }, 503)
  }
}

export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const carId = new URL(request.url).searchParams.get('carId') || ''
  try {
    const result = await env.LEADS_DB.prepare("SELECT * FROM media_assets WHERE (? = '' OR car_id = ?) ORDER BY created_at DESC LIMIT 200").bind(carId, carId).all<MediaAssetRow>()
    if (!result.success) throw new Error('Could not read media assets')
    return json({ ok: true, assets: result.results })
  } catch { return json({ ok: false, error: 'database_unavailable' }, 503) }
}

type MediaAssetRow = { id: string; object_key: string; url: string; alt_text: string; car_id: string | null; sort_order: number; is_cover: number; created_at: string }

export const onRequestDelete: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!validOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!env.LEADS_DB || !env.MEDIA_BUCKET) return json({ ok: false, error: 'media_not_configured' }, 503)
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: 'invalid_id' }, 400)
  try {
    const row = await env.LEADS_DB.prepare('SELECT object_key FROM media_assets WHERE id=?').bind(id).first<{ object_key: string }>()
    if (!row) return json({ ok: false, error: 'not_found' }, 404)
    await env.MEDIA_BUCKET.delete(row.object_key)
    const result = await env.LEADS_DB.prepare('DELETE FROM media_assets WHERE id=?').bind(id).run()
    if (!result.success) throw new Error('Could not delete image metadata')
    return json({ ok: true, deleted: result.meta?.changes === 1 })
  } catch { return json({ ok: false, error: 'delete_failed' }, 503) }
}
