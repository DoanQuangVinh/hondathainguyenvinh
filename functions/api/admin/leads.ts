import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'

type LeadRow = { id: string; phone: string; car_id: string; customer_name: string | null; source: string; status: string; notes: string | null; appointment_at: string | null; assigned_to: string | null; consent_version: string; consent_at: string; created_at: string }

export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    const url = new URL(request.url)
    const requestedLimit = Number(url.searchParams.get('limit') || 100)
    const limit = Number.isFinite(requestedLimit) ? Math.min(200, Math.max(1, Math.floor(requestedLimit))) : 100
    const requestedOffset = Number(url.searchParams.get('offset') || 0)
    const offset = Number.isSafeInteger(requestedOffset) ? Math.min(10_000_000, Math.max(0, requestedOffset)) : 0
    const status = url.searchParams.get('status') || ''
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80)
    if (status && !new Set(['new', 'contacted', 'test_drive', 'closed', 'lost']).has(status)) return json({ ok: false, error: 'invalid_status' }, 422)
    const where = `WHERE (? = '' OR status = ?) AND (? = '' OR phone LIKE '%' || ? || '%' OR customer_name LIKE '%' || ? || '%' OR car_id LIKE '%' || ? || '%' OR source LIKE '%' || ? || '%')`
    const binds = [status, status, q, q, q, q, q]
    const [result, count] = await Promise.all([
      env.LEADS_DB.prepare(`
      SELECT id, phone, car_id, customer_name, source, status, notes, appointment_at, assigned_to, consent_version, consent_at, created_at
      FROM leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(...binds, limit, offset).all<LeadRow>(),
      env.LEADS_DB.prepare(`SELECT COUNT(*) AS total FROM leads ${where}`).bind(...binds).first<{ total: number }>()
    ])
    if (!result.success || !count) throw new Error('Query failed')
    return json({ ok: true, leads: result.results, count: result.results.length, total: count.total, offset, limit })
  } catch {
    return json({ ok: false, error: 'database_unavailable', message: 'Không tải được danh sách khách hàng.' }, 503)
  }
}

export const onRequestPatch: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ ok: false, error: 'invalid_origin' }, 403)
    const id = new URL(request.url).searchParams.get('id')
    const data = await request.json() as Record<string, unknown>
    const statuses = new Set(['new', 'contacted', 'test_drive', 'closed', 'lost'])
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || typeof data.status !== 'string' || !statuses.has(data.status)) return json({ ok: false, error: 'invalid_update' }, 422)
    const notes = typeof data.notes === 'string' ? data.notes.trim().slice(0, 2000) : null
    const appointment = typeof data.appointment_at === 'string' && data.appointment_at.length <= 40 ? data.appointment_at : null
    const assigned = typeof data.assigned_to === 'string' ? data.assigned_to.trim().slice(0, 100) : null
    const result = await env.LEADS_DB.prepare('UPDATE leads SET status = ?, notes = COALESCE(?, notes), appointment_at = ?, assigned_to = ? WHERE id = ?').bind(data.status, notes, appointment, assigned, id).run()
    return json({ ok: true, updated: result.meta?.changes === 1 })
  } catch { return json({ ok: false, error: 'database_unavailable' }, 503) }
}

export const onRequestDelete: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  const origin = request.headers.get('Origin')
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) return json({ ok: false, error: 'invalid_origin' }, 403)
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: 'invalid_id' }, 400)
    const result = await env.LEADS_DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run()
    if (!result.success) throw new Error('Delete failed')
    return json({ ok: true, deleted: result.meta?.changes === 1 })
  } catch {
    return json({ ok: false, error: 'database_unavailable', message: 'Không xóa được bản ghi. Vui lòng thử lại.' }, 503)
  }
}
