import { AccessUnavailable } from '@/components/access-unavailable'

/** Password login removed — admin access is via tenant workspace OAuth. */
export default function LoginPage() {
  return (
    <AccessUnavailable
      kind="error"
      title="Sign in via Taleem"
      appLabel="Alumni Admin"
      description="Alumni Admin opens from your institution tenant workspace. Sign in there with an account that has ALUMNI_ADMIN access, then choose Alumni Admin."
    />
  )
}
