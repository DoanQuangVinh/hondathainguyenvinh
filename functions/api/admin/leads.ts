import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'

type LeadRow = { id: string; phone: string; car_id: string; consent_version: string; consent_at: string; created_at: string }

export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env)
  if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    const url = new URL(request.url)
    const requestedLimit = Number(url.searchParams.get('limit') || 100)
    const limit = Number.isFinite(requestedLimit) ? Math.min(200, Math.max(1, Math.floor(requestedLimit))) : 100
    const result = await env.LEADS_DB.prepare(`
      SELECT id, phone, car_id, consent_version, consent_at, created_at
      FROM leads ORDER BY created_at DESC LIMIT ?
    `).bind(limit).all<LeadRow>()
    if (!result.success) throw new Error('Query failed')
    return json({ ok: true, leads: result.results, count: result.results.length })
  } catch {
    return json({ ok: false, error: 'database_unavailable', message: 'Không tải được danh sách khách hàng.' }, 503)
  }
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
