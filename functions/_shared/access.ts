import { json, type LeadEnv } from './env.ts'

type JwtHeader = { alg?: string; kid?: string; typ?: string }
type JwtClaims = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; email?: string }
type AccessJwk = JsonWebKey & { kid?: string; alg?: string; use?: string }
type JwkSet = { keys?: AccessJwk[] }

const MAX_TOKEN_LENGTH = 8192

function getIssuer(value: string): string | null {
  try {
    const candidate = value.includes('://') ? value : `https://${value}`
    const url = new URL(candidate)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      (url.pathname !== '' && url.pathname !== '/') ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/i.test(url.hostname)
    ) return null
    return url.origin
  } catch {
    return null
  }
}

function decodeBase64Url(segment: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error('Invalid JWT encoding')
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function decodeJsonSegment<T>(segment: string): T {
  const bytes = decodeBase64Url(segment)
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T
}

function getToken(request: Request): string | null {
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion')?.trim()
  if (assertion) return assertion

  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null
  const matches = cookieHeader.split(';').map(cookie => cookie.trim()).filter(cookie => cookie.startsWith('CF_Authorization='))
  if (matches.length !== 1) return null
  const value = matches[0].slice('CF_Authorization='.length)
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function unauthorized(): { response: Response } {
  return { response: json({ ok: false, error: 'unauthorized', message: 'Phiên Cloudflare Access không hợp lệ hoặc đã hết hạn.' }, 401) }
}

export async function authorizeAdmin(request: Request, env: LeadEnv): Promise<{ email: string } | { response: Response }> {
  const issuer = env.CF_ACCESS_TEAM_DOMAIN ? getIssuer(env.CF_ACCESS_TEAM_DOMAIN.trim()) : null
  const audience = env.CF_ACCESS_AUD?.trim()
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!issuer || !audience || !adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return { response: json({ ok: false, error: 'admin_not_configured', message: 'Quyền truy cập quản trị chưa được cấu hình.' }, 503) }
  }

  const token = getToken(request)
  if (!token || token.length > MAX_TOKEN_LENGTH) return unauthorized()

  try {
    const parts = token.split('.')
    if (parts.length !== 3 || parts.some(part => !part)) throw new Error('Invalid token')
    const header = decodeJsonSegment<JwtHeader>(parts[0])
    const claims = decodeJsonSegment<JwtClaims>(parts[1])
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) throw new Error('Invalid signing method')

    const now = Math.floor(Date.now() / 1000)
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (
      claims.iss !== issuer ||
      !audiences.includes(audience) ||
      typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now ||
      (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > now))
    ) throw new Error('Invalid claims')

    const certResponse = await fetch(`${issuer}/cdn-cgi/access/certs`, { headers: { Accept: 'application/json' } })
    if (!certResponse.ok) throw new Error('Unable to verify Access signing keys')
    const keySet = await certResponse.json() as JwkSet
    const signingKey = keySet.keys?.find(key =>
      key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig')
    )
    if (!signingKey) throw new Error('Unknown signing key')

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      signingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, decodeBase64Url(parts[2]), signedContent)
    if (!valid) throw new Error('Invalid signature')

    if (typeof claims.email !== 'string' || claims.email.trim().toLowerCase() !== adminEmail) {
      return { response: json({ ok: false, error: 'forbidden', message: 'Tài khoản này không được phép xem danh sách khách hàng.' }, 403) }
    }

    return { email: claims.email }
  } catch {
    return unauthorized()
  }
}
