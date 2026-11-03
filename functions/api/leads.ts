import { json, type LeadEnv, type PagesFunction } from '../_shared/env.ts'

const CONSENT_VERSION = 'lead-contact-v1'
const phonePattern = /^(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9\d)\d{7}$/

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const compact = value.trim().replace(/[\s().-]/g, '')
  const international = compact.startsWith('+84') ? compact : compact.startsWith('84') ? `+${compact}` : compact
  const domestic = international.startsWith('+84') ? `0${international.slice(3)}` : international
  if (!phonePattern.test(domestic)) return null
  return `+84${domestic.slice(1)}`
}

function validOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try { return new URL(origin).origin === new URL(request.url).origin } catch { return false }
}

async function digestIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip)))
  return Array.from(signature.slice(0, 20), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function takeRateLimit(db: NonNullable<LeadEnv['LEADS_DB']>, subjectHash: string, nowSeconds: number) {
  const limits = [{ seconds: 60, maximum: 10 }, { seconds: 86_400, maximum: 30 }]
  for (const limit of limits) {
    const bucketStart = Math.floor(nowSeconds / limit.seconds) * limit.seconds
    const row = await db.prepare(`
      INSERT INTO lead_rate_buckets (subject_hash, bucket_start, bucket_seconds, hits)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(subject_hash, bucket_start, bucket_seconds)
      DO UPDATE SET hits = hits + 1
      RETURNING hits
    `).bind(subjectHash, bucketStart, limit.seconds).first<{ hits: number }>()
    if (!row || row.hits > limit.maximum) return false
  }
  return true
}

export const onRequestPost: PagesFunction<LeadEnv> = async ({ request, env }) => {
  if (!env.LEADS_DB || !env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32 || env.RETENTION_ENABLED !== 'true') {
    return json({ ok: false, error: 'service_not_configured', message: 'Biểu mẫu chưa được cấu hình nhận thông tin. Vui lòng gọi hoặc nhắn Zalo cho Vinh.' }, 503)
  }
  if (!validOrigin(request)) return json({ ok: false, error: 'invalid_origin', message: 'Không thể xác minh nguồn gửi biểu mẫu.' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'unsupported_content_type', message: 'Định dạng dữ liệu không được hỗ trợ.' }, 415)
  }
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 4096) return json({ ok: false, error: 'payload_too_large', message: 'Nội dung gửi vượt giới hạn cho phép.' }, 413)

  let payload: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > 4096) return json({ ok: false, error: 'payload_too_large', message: 'Nội dung gửi vượt giới hạn cho phép.' }, 413)
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid payload')
    payload = parsed as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'invalid_json', message: 'Dữ liệu biểu mẫu không hợp lệ.' }, 400)
  }

  if (typeof payload.website === 'string' && payload.website.trim()) {
    return json({ ok: false, error: 'invalid_submission', message: 'Không thể xử lý biểu mẫu này.' }, 400)
  }
  const phone = normalizePhone(payload.phone)
  if (!phone) return json({ ok: false, error: 'invalid_phone', message: 'Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.' }, 422)
  const carId = payload.carId === '' || payload.carId == null ? 'other' : payload.carId
  if (typeof carId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(carId)) {
    return json({ ok: false, error: 'invalid_car', message: 'Vui lòng chọn dòng xe hợp lệ.' }, 422)
  }
  if (payload.consent !== true) {
    return json({ ok: false, error: 'consent_required', message: 'Vui lòng đồng ý để Vinh liên hệ tư vấn trước khi gửi.' }, 422)
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown-client'
  try {
    const subjectHash = await digestIp(ip, env.RATE_LIMIT_SECRET)
    const allowed = await takeRateLimit(env.LEADS_DB, subjectHash, Math.floor(Date.now() / 1000))
    if (!allowed) return json({ ok: false, error: 'rate_limited', message: 'Bạn đã gửi nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau hoặc gọi Vinh.' }, 429)

    const duplicate = await env.LEADS_DB.prepare("SELECT id FROM leads WHERE phone = ? AND car_id = ? AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes') LIMIT 1").bind(phone, carId).first<{id:string}>()
    if (duplicate) return json({ ok: true, id: duplicate.id, duplicate: true, message: 'Vinh đã nhận yêu cầu của bạn gần đây.' }, 200)
    const id = crypto.randomUUID()
    const result = await env.LEADS_DB.prepare(`
      INSERT INTO leads (id, phone, car_id, consent_version, consent_at, customer_name, source, notes, appointment_at)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?, ?, ?, ?)
    `).bind(id, phone, carId, CONSENT_VERSION, typeof payload.name === 'string' ? payload.name.trim().slice(0,100) : null, ['popup','quote_form','test_drive','contact'].includes(String(payload.source)) ? String(payload.source) : 'popup', typeof payload.notes === 'string' ? payload.notes.trim().slice(0,2000) : null, typeof payload.appointmentAt === 'string' && payload.appointmentAt.length <= 40 ? payload.appointmentAt : null).run()

    if (!result.success || result.meta?.changes !== 1) {
      return json({ ok: false, error: 'save_failed', message: 'Chưa lưu được yêu cầu. Vui lòng thử lại hoặc liên hệ Vinh qua điện thoại/Zalo.' }, 503)
    }
    return json({ ok: true, id, message: 'Vinh đã nhận yêu cầu tư vấn của bạn.' }, 201)
  } catch {
    return json({ ok: false, error: 'service_unavailable', message: 'Hệ thống đang bận và chưa lưu được yêu cầu. Vui lòng gọi hoặc nhắn Zalo cho Vinh.' }, 503)
  }
}
