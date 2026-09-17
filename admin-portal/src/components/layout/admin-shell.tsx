import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/admin/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/auth/AuthContext"
import { tenantLoginUrl } from "@/lib/oauth-callback"

export function AdminShell() {
  const { token } = useAuth()
  if (!token) {
    window.location.href = tenantLoginUrl()
    return null
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="mx-auto flex w-full min-w-0 max-w-[1500px] flex-1 flex-col overflow-x-hidden px-4 pt-8 pb-10 sm:px-8 sm:pt-10">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
