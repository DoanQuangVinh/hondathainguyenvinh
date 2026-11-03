interface D1Statement {
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>
}
interface D1Database { prepare(sql: string): D1Statement }
interface Env { LEADS_DB: D1Database }
interface ScheduledEvent { scheduledTime: number; cron: string }

export default {
  async scheduled(_controller: ScheduledEvent, env: Env): Promise<void> {
    await env.LEADS_DB.prepare(`DELETE FROM leads WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')`).run()
    await env.LEADS_DB.prepare(`DELETE FROM lead_rate_buckets WHERE bucket_start < unixepoch('now', '-2 days')`).run()
  }
}
