import {
  CalendarDays,
  IdCard,
  Megaphone,
  UserPlus,
  Users,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { useCallback, useEffect, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"

import { EventThumb } from "@/components/event-thumb"
import { LinkWithFrom } from "@/components/page-breadcrumb"
import { PORTAL_RAILS_REFRESH_EVENT } from "@/lib/portal-events"
import { rsvpChipClass } from "@/lib/rsvp"
import { cn } from "@/lib/utils"
import { contactRequestService } from "@/services/contact-requests.service"
import { announcementsService } from "@/services/announcements.service"
import { eventsService } from "@/services/events.service"
import type { EventItem } from "@/types/portal"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatShortDate(isoDate: string) {
  try {
    return format(parseISO(isoDate), "EEE, MMM d")
  } catch {
    return isoDate
  }
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-[0_0_0_1px_oklch(0_0_0/0.02)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

type RailsData = {
  my_events: EventItem[]
  shortcuts: {
    contact_requests_total: number
    upcoming_events: number
    announcements: number
  }
}

export function PortalRails({
  fullName,
  photoUrl,
}: {
  fullName: string
  photoUrl?: string | null
}) {
  const location = useLocation()
  const [rails, setRails] = useState<RailsData | null>(null)

  const loadRails = useCallback(async () => {
    try {
      const [events, announcements, sentRequests] = await Promise.all([
        eventsService
          .list({ scope: "upcoming", page: 1, page_size: 50 })
          .catch(() => ({ items: [] as EventItem[], total: 0 })),
        announcementsService.list({ page: 1, page_size: 1 }).catch(() => ({
          total: 0,
        })),
        contactRequestService.listSent().catch(() => []),
      ])

      setRails({
        my_events: events.items.filter((event) => Boolean(event.my_rsvp_status)),
        shortcuts: {
          contact_requests_total: sentRequests.length,
          upcoming_events: events.total,
          announcements: announcements.total ?? 0,
        },
      })
    } catch {
      setRails((prev) =>
        prev ?? {
          my_events: [],
          shortcuts: {
            contact_requests_total: 0,
            upcoming_events: 0,
            announcements: 0,
          },
        },
      )
    }
  }, [])

  useEffect(() => {
    void loadRails()
  }, [loadRails, location.pathname])

  useEffect(() => {
    function onRefresh() {
      void loadRails()
    }
    window.addEventListener(PORTAL_RAILS_REFRESH_EVENT, onRefresh)
    return () => {
      window.removeEventListener(PORTAL_RAILS_REFRESH_EVENT, onRefresh)
    }
  }, [loadRails])

  const shortcuts = rails?.shortcuts
  const myEvents = rails?.my_events ?? []

  return (
    <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[225px_minmax(0,1fr)_300px] lg:gap-6">
      <aside className="order-1 print:hidden" data-print-hide>
        <div className="sticky top-[4.25rem] space-y-3">
          <Surface>
            <div className="h-14 bg-[linear-gradient(105deg,oklch(0.42_0.12_250),oklch(0.48_0.08_220))]" />
            <div className="-mt-8 px-3 pb-3 text-center">
              <Link to="/profile" className="mx-auto inline-block rounded-full">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    className="mx-auto size-16 rounded-full object-cover ring-2 ring-card"
                  />
                ) : (
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary ring-2 ring-card">
                    {initials(fullName)}
                  </div>
                )}
              </Link>
              <Link
                to="/profile"
                className="mt-2 block text-[16px] font-semibold hover:underline"
              >
                {fullName}
              </Link>
              <p className="text-xs text-muted-foreground">Alumni member</p>
            </div>
          </Surface>

          <nav className="space-y-0.5 px-1">
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Quick access
            </p>
            {(
              [
                {
                  to: "/contact-requests",
                  label: "My Contacts",
                  meta:
                    shortcuts && shortcuts.contact_requests_total > 0
                      ? String(shortcuts.contact_requests_total)
                      : undefined,
                  icon: UserPlus,
                  tone: "bg-sky-500",
                },
                {
                  to: "/directory",
                  label: "Directory",
                  icon: Users,
                  tone: "bg-blue-600",
                },
                {
                  to: "/events",
                  label: "Events",
                  meta:
                    shortcuts && shortcuts.upcoming_events > 0
                      ? String(shortcuts.upcoming_events)
                      : undefined,
                  icon: CalendarDays,
                  tone: "bg-emerald-500",
                },
                {
                  to: "/announcements",
                  label: "Announcements",
                  meta:
                    shortcuts && shortcuts.announcements > 0
                      ? String(shortcuts.announcements)
                      : undefined,
                  icon: Megaphone,
                  tone: "bg-amber-500",
                },
                {
                  to: "/card",
                  label: "Alumni card",
                  icon: IdCard,
                  tone: "bg-violet-500",
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
                      item.tone,
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {"meta" in item && item.meta ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {item.meta}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <section className="order-2 min-w-0">
        <Outlet />
      </section>

      <aside className="order-3 print:hidden" data-print-hide>
        <div className="sticky top-[4.25rem]">
          <Surface>
            <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                My events
              </h2>
              <Link
                to="/events"
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                View all
              </Link>
            </div>
            <div className="mx-4 border-t border-border" />
            {myEvents.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-muted">
                  <CalendarDays className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nothing here yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                  RSVP on an event and it will show up with your status.
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {myEvents.map((event) => (
                  <li key={event.id}>
                    <LinkWithFrom
                      to={`/events/${event.id}`}
                      className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <EventThumb
                        imageUrl={event.image_url}
                        eventDate={event.event_date}
                        title={event.title}
                        className="mt-0.5 size-[52px] rounded-md"
                      />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                          {event.title}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatShortDate(event.event_date)}
                        </p>
                        <span
                          className={cn(
                            "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                            rsvpChipClass(event.my_rsvp_status),
                          )}
                        >
                          {event.my_rsvp_status === "GOING"
                            ? "Going"
                            : event.my_rsvp_status === "MAYBE"
                              ? "Maybe"
                              : event.my_rsvp_status === "NOT_GOING"
                                ? "Not going"
                                : "RSVP"}
                        </span>
                      </div>
                    </LinkWithFrom>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </aside>
    </div>
  )
}
