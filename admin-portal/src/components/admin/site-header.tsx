import { Fragment } from "react"
import { Link, useLocation } from "react-router-dom"

import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  getBreadcrumbs,
  trailStateFor,
  type NavTrailState,
} from "@/lib/nav-trail"

export function SiteHeader() {
  const location = useLocation()
  const { pathname, state } = location
  const fromTrail = (state as NavTrailState | null)?.fromTrail
  const crumbs = getBreadcrumbs(pathname, fromTrail)

  return (
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-8">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <Fragment key={`${crumb.label}-${crumb.to ?? "page"}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {isLast || !crumb.to ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={
                        <Link
                          to={crumb.to}
                          state={trailStateFor(location, crumb.to)}
                        />
                      }
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
