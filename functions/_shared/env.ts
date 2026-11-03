export interface D1Statement {
  bind(...values: Array<string | number | null>): D1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>
}

export interface D1Database {
  prepare(sql: string): D1Statement
}

export interface LeadEnv {
  LEADS_DB?: D1Database
  RATE_LIMIT_SECRET?: string
  RETENTION_ENABLED?: string
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
  ADMIN_EMAIL?: string
}

export interface PagesContext<E> {
  request: Request
  env: E
  params: Record<string, string>
  waitUntil(promise: Promise<unknown>): void
  next(): Promise<Response>
  data: Record<string, unknown>
}

export type PagesFunction<E> = (context: PagesContext<E>) => Response | Promise<Response>

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
  })
}
