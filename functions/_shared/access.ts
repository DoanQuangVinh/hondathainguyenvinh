import { json, type LeadEnv } from './env.ts'

type JwtHeader = { alg?: string; kid?: string; typ?: string }
type JwtClaims = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; email?: string }
type AccessJwk = JsonWebKey & { kid?: string; alg?: string }
type JwkSet = { keys?: AccessJwk[] }

function decodeSegment<T>(segment: string): T {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as T
}

function decodeSignature(segment: string): Uint8Array {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), char => char.charCodeAt(0))
}

export async function authorizeAdmin(request: Request, env: LeadEnv): Promise<{ email: string } | { response: Response }> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAIL) {
    return { response: json({ ok: false, error: 'admin_not_configured', message: 'Quyền truy cập quản trị chưa được cấu hình.' }, 503) }
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token || token.length > 8192) return { response: json({ ok: false, error: 'unauthorized', message: 'Cần đăng nhập Cloudflare Access.' }, 401) }

  try {
    const issuerUrl = new URL(env.CF_ACCESS_TEAM_DOMAIN)
    if (issuerUrl.protocol !== 'https:' || issuerUrl.pathname !== '/' || !issuerUrl.hostname.endsWith('.cloudflareaccess.com')) {
      return { response: json({ ok: false, error: 'admin_not_configured', message: 'Tên miền Cloudflare Access không hợp lệ.' }, 503) }
    }
    const issuer = issuerUrl.origin
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token')
    const header = decodeSegment<JwtHeader>(parts[0])
    const claims = decodeSegment<JwtClaims>(parts[1])
    if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid signing method')
    const now = Math.floor(Date.now() / 1000)
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (claims.iss !== issuer || !audiences.includes(env.CF_ACCESS_AUD) || !claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now)) {
      throw new Error('Invalid claims')
    }
    if (typeof claims.email !== 'string' || claims.email.toLowerCase() !== env.ADMIN_EMAIL.trim().toLowerCase()) {
      return { response: json({ ok: false, error: 'forbidden', message: 'Tài khoản này không được phép xem danh sách khách hàng.' }, 403) }
    }

    const certResponse = await fetch(`${issuer}/cdn-cgi/access/certs`, { headers: { Accept: 'application/json' } })
    if (!certResponse.ok) throw new Error('Unable to verify Access signing keys')
    const keySet = await certResponse.json() as JwkSet
    const signingKey = keySet.keys?.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256'))
    if (!signingKey) throw new Error('Unknown signing key')
    const publicKey = await crypto.subtle.importKey('jwk', signingKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, decodeSignature(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
    if (!valid) throw new Error('Invalid signature')
    return { email: claims.email }
  } catch {
    return { response: json({ ok: false, error: 'unauthorized', message: 'Phiên Cloudflare Access không hợp lệ hoặc đã hết hạn.' }, 401) }
  }
}
