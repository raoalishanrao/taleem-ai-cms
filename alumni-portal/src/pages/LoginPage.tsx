import { AccessUnavailable } from '@/components/access-unavailable'

/** Password login removed — alumni sign in via the tenant workspace OAuth flow. */
export default function LoginPage() {
  return (
    <AccessUnavailable
      kind="error"
      title="Sign in via Taleem"
      appLabel="Alumni Portal"
      description="Alumni access is authorized from your institution’s tenant workspace. Sign in there, then open the Alumni Portal."
    />
  )
}
