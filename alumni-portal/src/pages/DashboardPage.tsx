import { format, parseISO } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { StatCard } from "@/components/portal/stat-card"
import { StatusPill } from "@/components/portal/status-pill"
import { PageLoader } from "@/components/portal/page-loader"
import { buttonVariants } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"
import { rsvpChipClass } from "@/lib/rsvp"
import { cn } from "@/lib/utils"
import { dashboardService } from "@/services/dashboard.service"
import { directoryService } from "@/services/directory.service"
import { profileService } from "@/services/profile.service"
import type { AnnouncementItem, EventItem } from "@/types/portal"
import { useNotifications } from "@/hooks/use-notifications"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatEventDate(event: EventItem) {
  try {
    const date = parseISO(event.event_date)
    return {
      month: format(date, "MMM").toUpperCase(),
      day: format(date, "d"),
    }
  } catch {
    return { month: "—", day: "—" }
  }
}

function profileCompletion(profile: Awaited<
  ReturnType<typeof profileService.getMyProfile>
> | null): number {
  if (!profile) return 0
  const checks = [
    Boolean(profile.full_name),
    Boolean(profile.photo_url),
    Boolean(profile.phone_number),
    Boolean(profile.email),
    Boolean(profile.city),
    Boolean(profile.country),
    profile.academic.length > 0,
    profile.professional.length > 0,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export function DashboardPage() {
  const { summary } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fullName, setFullName] = useState("Alumni")
  const [alumniId, setAlumniId] = useState("")
  const [completion, setCompletion] = useState(0)
  const [networkTotal, setNetworkTotal] = useState(0)
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([])
  const [registeredCount, setRegisteredCount] = useState(0)
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<AnnouncementItem | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [feedResult, profileResult, directoryResult] =
          await Promise.allSettled([
            dashboardService.getFeed(),
            profileService.getMyProfile(),
            directoryService.list({ page: 1, page_size: 1 }),
          ])
        if (cancelled) return

        const feed =
          feedResult.status === "fulfilled" ? feedResult.value : null
        const profile =
          profileResult.status === "fulfilled" ? profileResult.value : null
        const directory =
          directoryResult.status === "fulfilled" ? directoryResult.value : null

        const name = feed?.full_name || profile?.full_name
        if (!name) {
          const fail =
            (feedResult.status === "rejected" && feedResult.reason) ||
            (profileResult.status === "rejected" && profileResult.reason)
          setError(
            fail instanceof ApiError ? fail.message : "Failed to load dashboard",
          )
          return
        }

        setFullName(name)
        if (profile) {
          setAlumniId(
            profile.public_alumni_code ||
              profile.alumni_id.slice(0, 8).toUpperCase(),
          )
          setCompletion(profileCompletion(profile))
        }
        setNetworkTotal(directory?.total ?? 0)
        setRegisteredCount(feed?.my_events.length ?? 0)

        const events = (feed?.feed ?? [])
          .filter((item): item is Extract<typeof item, { type: "event" }> =>
            item.type === "event",
          )
          .map((item) => item.event)
          .slice(0, 4)
        setUpcomingEvents(events.length ? events : feed?.my_events ?? [])

        const announcement = feed?.feed.find(
          (item): item is Extract<typeof item, { type: "announcement" }> =>
            item.type === "announcement",
        )
        setLatestAnnouncement(announcement?.announcement ?? null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load dashboard")
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

  const firstName = useMemo(
    () => fullName.split(/\s+/)[0] ?? fullName,
    [fullName],
  )

  if (loading) {
    return <PageLoader label="Loading dashboard…" />
  }

  if (error) {
    return (
      <div className="portal-card p-6 text-sm text-destructive">{error}</div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
      {/* Hero */}
      <section className="portal-hero relative overflow-hidden rounded-3xl p-5 text-white shadow-[var(--portal-shadow)] sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full border border-white/10"
        />
        <p className="relative text-xs font-extrabold tracking-[0.12em] text-[#7fe2de] uppercase">
          Alumni community
        </p>
        <h2 className="relative mt-3 font-display text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {greeting()}, {firstName}
        </h2>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-[#c8d5ed]">
          Your university identity, professional profile and alumni community —
          all in one place.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-2.5">
          <Link
            to="/card"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-[11px] border-0 bg-accent font-bold text-accent-foreground hover:bg-accent/90",
            )}
          >
            View Digital ID
          </Link>
          <Link
            to="/directory"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-[11px] border-white/20 bg-white text-primary hover:bg-white/90 dark:border-white/15 dark:bg-card dark:text-foreground dark:hover:bg-card/90",
            )}
          >
            Explore Alumni
          </Link>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <StatusPill variant="dark">Verified Alumni</StatusPill>
          {alumniId ? (
            <StatusPill variant="dark">{alumniId}</StatusPill>
          ) : null}
          <StatusPill variant="dark">Profile {completion}% complete</StatusPill>
        </div>
      </section>

      {/* Metric cards */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Profile completion"
          value={`${completion}%`}
          action={
            <>
              <div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-[#7ce1dc]"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <Link
                to="/profile"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-3 w-full rounded-[11px]",
                )}
              >
                Complete profile
              </Link>
            </>
          }
        />
        <StatCard
          label="Upcoming events"
          value={upcomingEvents.length}
          hint={`${registeredCount} registered`}
          action={
            <Link
              to="/events"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full rounded-[11px]",
              )}
            >
              View events
            </Link>
          }
        />
        <StatCard
          label="Network"
          value={networkTotal.toLocaleString()}
          hint="Verified alumni"
          action={
            <Link
              to="/directory"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full rounded-[11px]",
              )}
            >
              Discover people
            </Link>
          }
        />
        <StatCard
          label="Notifications"
          value={summary.unread_count}
          hint={
            summary.unread_count > 0
              ? "Need your attention"
              : "You're all caught up"
          }
          action={
            <Link
              to="/notifications"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full rounded-[11px]",
              )}
            >
              Open inbox
            </Link>
          }
        />
      </div>

      {/* Events + announcement */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="portal-card min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Upcoming events</h3>
              <p className="text-xs text-muted-foreground">
                Stay connected with your community
              </p>
            </div>
            <Link
              to="/events"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 rounded-[11px]",
              )}
            >
              View all
            </Link>
          </div>
          <div className="my-4 h-px bg-border" />
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => {
                const { month, day } = formatEventDate(event)
                const rsvpLabel =
                  event.my_rsvp_status === "GOING"
                    ? "Registered"
                    : event.my_rsvp_status === "MAYBE"
                      ? "Maybe"
                      : event.my_rsvp_status === "NOT_GOING"
                        ? "Not going"
                        : null
                return (
                  <li
                    key={event.id}
                    className="flex min-w-0 items-start gap-3 rounded-[14px] border border-border bg-card p-3"
                  >
                    <div className="grid size-12 shrink-0 place-items-center rounded-[13px] bg-[#edf7f7] text-center font-extrabold text-[#087b7e] sm:size-[52px]">
                      <small className="block text-[9px] uppercase">{month}</small>
                      <b className="text-base leading-none sm:text-lg">{day}</b>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                        <p className="min-w-0 flex-1 break-words font-semibold leading-snug">
                          {event.title}
                        </p>
                        {rsvpLabel ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold whitespace-nowrap",
                              rsvpChipClass(event.my_rsvp_status),
                            )}
                          >
                            {rsvpLabel}
                          </span>
                        ) : (
                          <Link
                            to={`/events/${event.id}`}
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                              "shrink-0 rounded-[11px] text-xs",
                            )}
                          >
                            View
                          </Link>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {event.venue} · {event.start_time?.slice(0, 5)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="portal-card min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Latest announcement</h3>
              <p className="text-xs text-muted-foreground">From the Alumni Office</p>
            </div>
            <Link
              to="/announcements"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 rounded-[11px]",
              )}
            >
              View all
            </Link>
          </div>
          <div className="my-4 h-px bg-border" />
          {latestAnnouncement ? (
            <article className="min-w-0 border-l-4 border-accent pl-4">
              {latestAnnouncement.published_at ? (
                <p className="text-[11px] text-muted-foreground uppercase">
                  {format(parseISO(latestAnnouncement.published_at), "d MMM yyyy")}
                </p>
              ) : null}
              <h3 className="mt-1 text-base font-semibold break-words">
                {latestAnnouncement.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed break-words text-[#536176]">
                {latestAnnouncement.content}
              </p>
              <Link
                to={`/announcements/${latestAnnouncement.id}`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-4 rounded-[11px] bg-primary hover:bg-primary/90",
                )}
              >
                Read announcement
              </Link>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
