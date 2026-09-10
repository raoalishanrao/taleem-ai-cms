import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { AccessUnavailable } from '@/components/access-unavailable'
import { AuthPageLayout } from '@/components/auth-page-layout'
import { useAuth } from '@/auth/AuthContext'
import {
  decodeJwtPayload,
  roleFromOauthClaims,
} from '@/lib/oauth-callback'

type CallbackError = {
  kind: 'unauthorized' | 'error'
  description: string
  currentAccess?: string | null
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setSession } = useAuth()
  const [error, setError] = useState<CallbackError | null>(null)

  useEffect(() => {
    const accessToken = params.get('access_token')
    if (!accessToken) {
      setError({
        kind: 'error',
        description: 'No access token was returned. Start again from your institution workspace.',
      })
      return
    }

    const payload = decodeJwtPayload(accessToken)
    const sub = typeof payload?.sub === 'string' ? payload.sub : null
    if (!sub) {
      setError({
        kind: 'error',
        description: 'The access token could not be read. Try signing in again from the tenant workspace.',
      })
      return
    }

    const role = roleFromOauthClaims(payload)
    if (role !== 'ALUMNI_ADMIN') {
      setError({
        kind: 'unauthorized',
        description:
          'Your account can sign in to Taleem, but it is not assigned Alumni Admin for this institution. Only accounts with admin access can open this console.',
        currentAccess: role || 'none',
      })
      return
    }

    setSession({
      token: accessToken,
      userId: sub,
      role,
    })
    navigate('/', { replace: true })
  }, [navigate, params, setSession])

  if (error) {
    return (
      <AccessUnavailable
        kind={error.kind}
        description={error.description}
        currentAccess={error.currentAccess}
        appLabel="Alumni Admin"
        requiredAccess="ALUMNI_ADMIN"
      />
    )
  }

  return (
    <AuthPageLayout>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-card p-8 text-center ring-1 ring-border/60">
        <LoaderCircle className="size-8 animate-spin text-accent" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Opening Alumni Admin</p>
          <p className="text-sm text-muted-foreground">Verifying your access…</p>
        </div>
      </div>
    </AuthPageLayout>
  )
}
