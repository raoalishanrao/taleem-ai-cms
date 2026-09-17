import { useEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  BookUserIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  MegaphoneIcon,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { BrandLogo } from "@/components/brand-logo"
import { toast } from "sonner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type NavItem = {
  title: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const overviewItems: NavItem[] = [
  {
    title: "Dashboard",
    to: "/",
    icon: LayoutDashboardIcon,
    end: true,
  },
]

const peopleItems: NavItem[] = [
  {
    title: "Registrations",
    to: "/registrations",
    icon: ClipboardListIcon,
  },
  {
    title: "Alumni directory",
    to: "/alumni",
    icon: BookUserIcon,
  },
  {
    title: "Contact requests",
    to: "/contact-requests",
    icon: MailIcon,
  },
]

const contentItems: NavItem[] = [
  {
    title: "Announcements",
    to: "/announcements",
    icon: MegaphoneIcon,
  },
  {
    title: "Events",
    to: "/events",
    icon: CalendarDaysIcon,
  },
]

function isItemActive(pathname: string, item: NavItem) {
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: NavItem[]
  pathname: string
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="h-auto px-3 pt-4 pb-2 text-[11px] font-semibold tracking-[0.14em] text-sidebar-foreground/55 uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = isItemActive(pathname, item)

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.title}
                  className={cn(
                    "h-9 gap-2.5 rounded-md px-3 font-medium text-sidebar-foreground/80",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "bg-sidebar-accent text-white shadow-[inset_3px_0_0_0_var(--sidebar-primary)] hover:bg-sidebar-accent hover:text-white",
                  )}
                  render={
                    <NavLink to={item.to} end={item.end} state={null} />
                  }
                  onClick={() => {
                    if (isMobile) setOpenMobile(false)
                  }}
                >
                  <item.icon
                    className={cn(
                      "size-4",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
                    )}
                  />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function roleLabel(role: string | null) {
  if (!role) return "Administrator"
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()
  const { role, clearSession } = useAuth()
  const displayRole = roleLabel(role)
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [location.pathname, location.search, isMobile, setOpenMobile])

  function handleLogout() {
    clearSession()
    toast.success("Signed out")
    navigate("/login", { replace: true })
  }

  return (
    <>
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex size-full flex-col px-3.5 py-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
      <SidebarHeader className="p-0">
        <NavLink
          to="/"
          end
          className="flex w-full items-center justify-center px-0.5 pb-4 outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pb-0"
          onClick={() => {
            if (isMobile) setOpenMobile(false)
          }}
        >
          <BrandLogo className="h-[4.75rem] w-auto max-w-full object-contain object-center group-data-[collapsible=icon]:h-6" />
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="mt-2 gap-0 p-0">
        <NavGroup
          label="Overview"
          items={overviewItems}
          pathname={location.pathname}
        />
        <NavGroup
          label="People"
          items={peopleItems}
          pathname={location.pathname}
        />
        <NavGroup
          label="Content"
          items={contentItems}
          pathname={location.pathname}
        />
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-0 pt-4">
        <div className="flex items-center gap-2.5 rounded-[14px] bg-white/8 p-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <Avatar className="size-9 rounded-full">
            <AvatarFallback className="rounded-full bg-sidebar-primary text-xs font-semibold text-[#042a2a]">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold text-white">Admin</p>
            <p className="truncate text-[11px] text-[#9fb0ce]">{displayRole}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[#9fb0ce] hover:bg-white/10 hover:text-white"
            aria-label="Log out"
            onClick={() => setConfirmLogout(true)}
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
    <ConfirmDialog
      open={confirmLogout}
      title="Log out"
      description="Are you sure you want to log out of the admin console?"
      confirmLabel="Log out"
      variant="destructive"
      onOpenChange={setConfirmLogout}
      onConfirm={handleLogout}
    />
    </>
  )
}
