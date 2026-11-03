import { authorizeAdmin } from '../../_shared/access.ts'
import { json, type LeadEnv, type PagesFunction } from '../../_shared/env.ts'
export const onRequestGet: PagesFunction<LeadEnv> = async ({ request, env }) => {
  const auth = await authorizeAdmin(request, env); if ('response' in auth) return auth.response
  if (!env.LEADS_DB) return json({ ok: false, error: 'database_not_configured' }, 503)
  try {
    const [totals, daily] = await Promise.all([
      env.LEADS_DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN created_at >= strftime('%Y-%m-%dT00:00:00Z','now') THEN 1 ELSE 0 END) new_today, SUM(CASE WHEN status='contacted' THEN 1 ELSE 0 END) contacted, SUM(CASE WHEN status='test_drive' THEN 1 ELSE 0 END) test_drive, SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) closed FROM leads").first<Record<string, number>>(),
      env.LEADS_DB.prepare("SELECT substr(created_at,1,10) day, COUNT(*) count FROM leads WHERE created_at >= datetime('now','-30 days') GROUP BY day ORDER BY day").all<{day:string;count:number}>()
    ])
    const total = totals?.total || 0
    return json({ ok: true, stats: { total, new_today: totals?.new_today || 0, contacted: totals?.contacted || 0, test_drive: totals?.test_drive || 0, closed: totals?.closed || 0, conversion: total ? Math.round((totals?.closed || 0) / total * 1000) / 10 : 0, daily: daily.results } })
  } catch { return json({ ok: false, error: 'database_unavailable' }, 503) }
}
