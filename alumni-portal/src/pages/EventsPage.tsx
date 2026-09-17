import { format, parseISO } from "date-fns"
import { CalendarDays, Clock3, MapPin } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { LinkWithFrom, PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageHeader } from "@/components/portal/page-header"
import { PageLoader } from "@/components/portal/page-loader"
import { StatusPill } from "@/components/portal/status-pill"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError } from "@/lib/api-client"
import { refreshPortalRails } from "@/lib/portal-events"
import { RSVP_OPTIONS, rsvpButtonClass } from "@/lib/rsvp"
import { cn } from "@/lib/utils"
import { eventsService } from "@/services/events.service"
import type { EventItem } from "@/types/portal"

function formatEventDate(event: EventItem) {
  try {
    return format(parseISO(event.event_date), "d MMM yyyy")
  } catch {
    return event.event_date
  }
}

function formatEventTime(event: EventItem) {
  const start = event.start_time?.slice(0, 5) ?? event.start_time
  const end = event.end_time?.slice(0, 5)
  return end ? `${start} – ${end}` : start
}

function registrationCode(event: EventItem) {
  if (!event.my_rsvp_status) return null
  const year = (() => {
    try {
      return format(parseISO(event.event_date), "yyyy")
    } catch {
      return String(new Date().getFullYear())
    }
  })()
  const tail = event.id.replace(/-/g, "").slice(-5).toUpperCase()
  return `EVT-${year}-${tail}`
}

function rsvpStatusLabel(status: string | null | undefined) {
  if (status === "GOING") return "Going"
  if (status === "MAYBE") return "Maybe"
  return "Not going"
}

function rsvpStatusVariant(
  status: string | null | undefined,
): "success" | "warning" | "danger" | "info" {
  if (status === "GOING") return "success"
  if (status === "MAYBE") return "warning"
  if (status === "NOT_GOING") return "danger"
  return "info"
}

function buildCalendarUrl(event: EventItem) {
  try {
    const day = format(parseISO(event.event_date), "yyyyMMdd")
    const start = (event.start_time || "09:00:00").replace(/:/g, "").slice(0, 6)
    const end = (event.end_time || event.start_time || "10:00:00")
      .replace(/:/g, "")
      .slice(0, 6)
    const dates = `${day}T${start}/${day}T${end}`
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates,
      details: event.description ?? "",
      location: event.venue,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  } catch {
    return null
  }
}

function EventMedia({ event, className }: { event: EventItem; className?: string }) {
  if (event.image_url) {
    return (
      <img
        src={event.image_url}
        alt=""
        className={cn("h-full w-full object-cover", className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-end overflow-hidden bg-[linear-gradient(145deg,#081b45_0%,#123868_50%,#1a9aa0_130%)] p-5",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 16px, #fff 16px, #fff 17px)",
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#7fe2de] uppercase">
          {event.event_type || "Event"}
        </p>
        <p className="mt-1 line-clamp-2 text-lg font-semibold text-white">
          {event.title}
        </p>
      </div>
    </div>
  )
}

function RegistrationsTable({
  events,
  onRegister,
  busyId,
}: {
  events: EventItem[]
  onRegister: (event: EventItem) => void
  busyId: string | null
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[var(--portal-shadow)] ring-1 ring-border">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">
          My event registrations
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your participation history
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <th className="px-6 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Registration</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const registered = Boolean(event.my_rsvp_status)
              const code = registrationCode(event)
              const calendarUrl = buildCalendarUrl(event)
              return (
                <tr
                  key={event.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-6 py-4">
                    <LinkWithFrom
                      to={`/events/${event.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {event.title}
                    </LinkWithFrom>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {formatEventDate(event)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-muted-foreground">
                    {code ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill variant={rsvpStatusVariant(event.my_rsvp_status)}>
                      {rsvpStatusLabel(event.my_rsvp_status)}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {registered && calendarUrl ? (
                      <a
                        href={calendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-[11px]",
                        )}
                      >
                        Calendar
                      </a>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[11px]"
                        disabled={busyId === event.id}
                        onClick={() => onRegister(event)}
                      >
                        Register
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked rows */}
      <div className="divide-y divide-border md:hidden">
        {events.map((event) => {
          const registered = Boolean(event.my_rsvp_status)
          const code = registrationCode(event)
          const calendarUrl = buildCalendarUrl(event)
          return (
            <div key={event.id} className="space-y-3 px-5 py-4">
              <div>
                <LinkWithFrom
                  to={`/events/${event.id}`}
                  className="font-semibold text-foreground"
                >
                  {event.title}
                </LinkWithFrom>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatEventDate(event)}
                  {code ? ` · ${code}` : ""}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <StatusPill variant={rsvpStatusVariant(event.my_rsvp_status)}>
                  {rsvpStatusLabel(event.my_rsvp_status)}
                </StatusPill>
                {registered && calendarUrl ? (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "rounded-[11px]",
                    )}
                  >
                    Calendar
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-[11px]"
                    disabled={busyId === event.id}
                    onClick={() => onRegister(event)}
                  >
                    Register
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EventCard({
  event,
  busy,
  error,
  onRsvp,
  linkTitle = true,
}: {
  event: EventItem
  busy: boolean
  error?: string
  onRsvp: (status: string) => void
  linkTitle?: boolean
}) {
  const date = (() => {
    try {
      const d = parseISO(event.event_date)
      return {
        month: format(d, "MMM").toUpperCase(),
        day: format(d, "d"),
      }
    } catch {
      return { month: "—", day: "—" }
    }
  })()

  return (
    <article className="group overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[var(--portal-shadow)] ring-1 ring-border transition-shadow hover:shadow-[0_18px_45px_rgba(8,27,69,0.1)]">
      <LinkWithFrom
        to={`/events/${event.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-[#0b1f4a]"
      >
        <EventMedia
          event={event}
          className="transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 grid size-[52px] place-items-center rounded-[13px] bg-white text-center shadow-sm">
          <small className="block text-[9px] font-bold tracking-wide text-[#087b7e] uppercase">
            {date.month}
          </small>
          <b className="text-lg leading-none text-[#081b45]">{date.day}</b>
        </div>
      </LinkWithFrom>

      <div className="space-y-3 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">
            {event.event_type || "Event"}
          </p>
          {linkTitle ? (
            <LinkWithFrom
              to={`/events/${event.id}`}
              className="mt-1 block font-display text-lg leading-snug font-semibold text-foreground hover:underline"
            >
              {event.title}
            </LinkWithFrom>
          ) : (
            <h2 className="mt-1 font-display text-lg leading-snug font-semibold text-foreground">
              {event.title}
            </h2>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {event.status === "POSTPONED" ? (
              <StatusPill variant="warning">Postponed</StatusPill>
            ) : null}
            {event.my_rsvp_status ? (
              <StatusPill variant={rsvpStatusVariant(event.my_rsvp_status)}>
                {rsvpStatusLabel(event.my_rsvp_status)}
              </StatusPill>
            ) : null}
          </div>
          {event.status === "POSTPONED" && event.status_reason ? (
            <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              {event.status_reason}
            </p>
          ) : null}
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Clock3 className="size-3.5 shrink-0" />
              {formatEventTime(event)}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </p>
          </div>
        </div>

        {event.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-0.5">
          {RSVP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant="outline"
              disabled={busy}
              className={cn(
                "rounded-[11px] px-3",
                rsvpButtonClass(
                  option.value,
                  event.my_rsvp_status === option.value,
                ),
              )}
              onClick={() => onRsvp(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </article>
  )
}

export function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null)
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const page = await eventsService.list({
          scope: "upcoming",
          page: 1,
          page_size: 20,
        })
        if (!cancelled) setItems(page.items)
      } catch (err) {
        if (!cancelled) {
          const status = err instanceof ApiError ? err.status : 0
          if (status === 404) {
            setItems([])
          } else {
            setError(
              err instanceof ApiError ? err.message : "Failed to load events",
            )
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const registeredCount = useMemo(
    () => items.filter((event) => Boolean(event.my_rsvp_status)).length,
    [items],
  )

  async function setRsvp(event: EventItem, status: string) {
    setRsvpBusyId(event.id)
    setRsvpErrors((current) => {
      const next = { ...current }
      delete next[event.id]
      return next
    })
    try {
      if (event.my_rsvp_status) {
        await eventsService.updateRsvp(event.id, status)
      } else {
        await eventsService.createRsvp(event.id, status)
      }
      const refreshed = await eventsService.getOne(event.id)
      setItems((prev) =>
        prev.map((item) => (item.id === event.id ? refreshed : item)),
      )
      refreshPortalRails()
      toast.success(
        `RSVP updated · ${
          RSVP_OPTIONS.find((o) => o.value === status)?.label ?? status
        }`,
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "RSVP failed"
      setRsvpErrors((current) => ({ ...current, [event.id]: message }))
    } finally {
      setRsvpBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        tone="hero"
        eyebrow="Community calendar"
        title="Alumni Events"
        description="Meet, learn, reconnect and celebrate with your alumni community."
        actions={
          !loading && !error ? (
            <>
              <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90">
                {items.length} upcoming
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90">
                {registeredCount} registered
              </span>
            </>
          ) : null
        }
      />

      {loading ? (
        <PageLoader label="Loading events…" />
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Events unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
            <CalendarDays className="size-6" strokeWidth={1.5} />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
            No upcoming events
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            When new alumni events are published, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Upcoming events
              </h2>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Browse & RSVP
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  busy={rsvpBusyId === event.id}
                  error={rsvpErrors[event.id]}
                  onRsvp={(status) => void setRsvp(event, status)}
                />
              ))}
            </div>
          </section>

          <RegistrationsTable
            events={items}
            busyId={rsvpBusyId}
            onRegister={(event) => void setRsvp(event, "GOING")}
          />
        </div>
      )}
    </div>
  )
}

export function EventDetailPage() {
  const { eventId = "" } = useParams()
  const [event, setEvent] = useState<EventItem | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const data = await eventsService.getOne(eventId)
        if (!cancelled) setEvent(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load event",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (eventId) void load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  async function setRsvp(status: string) {
    if (!event) return
    setSaving(true)
    setError("")
    try {
      if (event.my_rsvp_status) {
        await eventsService.updateRsvp(event.id, status)
      } else {
        await eventsService.createRsvp(event.id, status)
      }
      const refreshed = await eventsService.getOne(event.id)
      setEvent(refreshed)
      refreshPortalRails()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "RSVP failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoader label="Loading event…" />
  }

  if (error && !event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!event) return null

  const calendarUrl = buildCalendarUrl(event)
  const code = registrationCode(event)

  return (
    <div className="w-full space-y-4">
      <PageBreadcrumb
        current={event.title}
        fallback={{ label: "Events", to: "/events" }}
      />
      <EventCard
        event={event}
        busy={saving}
        error={error || undefined}
        onRsvp={(status) => void setRsvp(status)}
        linkTitle={false}
      />
      {event.my_rsvp_status && (code || calendarUrl) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-border">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Registration
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {code ?? "—"}
            </p>
          </div>
          {calendarUrl ? (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-[11px]",
              )}
            >
              Add to calendar
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
