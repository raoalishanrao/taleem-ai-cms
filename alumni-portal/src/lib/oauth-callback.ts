/** Shared helpers for OAuth callback → local session. */

export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const [, payload] = accessToken.split('.')
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function roleFromOauthClaims(payload: Record<string, unknown> | null): string {
  const raw = payload?.roles
  const roles = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string'
      ? raw.split(/[,\s]+/)
      : []
  if (roles.includes('ALUMNI_ADMIN')) return 'ALUMNI_ADMIN'
  if (roles.includes('ALUMNI_MEMBER')) return 'ALUMNI_MEMBER'
  return ''
}

export function tenantLoginUrl() {
  return (
    (import.meta.env.VITE_TENANT_LOGIN_URL as string | undefined)?.trim() ||
    'https://taleem-tenant.vercel.app/login'
  )
}

/** Tenant apps launcher (preferred return target after denied app access). */
export function tenantAppsUrl() {
  try {
    const url = new URL(tenantLoginUrl())
    url.pathname = '/tenant/apps'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return tenantLoginUrl()
  }
}
