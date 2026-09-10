import { Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { tenantLoginUrl } from "@/lib/oauth-callback"

export function RequireAuth() {
  const { token } = useAuth()
  const location = useLocation()

  if (!token) {
    const url = new URL(tenantLoginUrl())
    url.searchParams.set("returnTo", location.pathname)
    window.location.href = url.toString()
    return null
  }

  return <Outlet />
}
