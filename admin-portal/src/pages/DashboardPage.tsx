import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  MailIcon,
  MegaphoneIcon,
  PlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api"
import { withNavTrail } from "@/lib/nav-trail"
import { cn } from "@/lib/utils"
import {
  dashboardService,
  type AdminDashboard,
  type DashboardAnnouncement,
} from "@/services/dashboard.service"
import { eventService, type AdminEvent } from "@/services/event.service"

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatLongDate(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value)
}

function categoryLabel(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
      </div>
      <div>
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  to,
  tone = "navy",
  activeCount,
}: {
  title: string
  value: number
  hint: string
  icon: LucideIcon
  to: string
  tone?: "navy" | "cyan" | "amber"
  activeCount?: number
}) {
  const location = useLocation()
  const tones = {
    navy: "bg-[#081b45]/8 text-[#081b45] dark:bg-white/8 dark:text-white",
    cyan: "bg-[#00c2b2]/15 text-[#0a7d73] dark:bg-[#00c2b2]/15 dark:text-[#7ef0e6]",
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  }

  return (
    <Link
      to={to}
      state={withNavTrail(location)}
      className="block h-full outline-none"
    >
      <Card
        size="sm"
        className="h-full transition-shadow hover:shadow-[0_12px_28px_rgb(8_27_69_/_0.1)]"
      >
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardDescription className="line-clamp-2 min-h-8 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {title}
            </CardDescription>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tones[tone],
              )}
            >
              <Icon className="size-4" />
            </span>
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatCount(value)}
          </CardTitle>
          <p className="line-clamp-1 min-h-4 text-xs text-muted-foreground">
            {typeof activeCount === "number"
              ? `${hint} · ${formatCount(activeCount)} Active`
              : hint}
          </p>
        </CardHeader>
      </Card>
    </Link>
  )
}

function EventItem({ item }: { item: AdminEvent }) {
  const location = useLocation()
  const time = item.start_time?.slice(0, 5)
  return (
    <Link
      to={`/events/${item.id}`}
      state={withNavTrail(location)}
      className="flex gap-3 rounded-2xl border border-border bg-muted/20 p-3.5 transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="size-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#081b45]/8 text-[#081b45] dark:bg-white/8 dark:text-white">
          <CalendarDaysIcon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          {item.status === "POSTPONED" ? (
            <Badge className="shrink-0 border-transparent bg-orange-500/10 font-normal text-orange-700 dark:text-orange-400">
              Postponed
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {formatDate(item.event_date)}
          {time ? ` · ${time}` : ""}
          {item.venue ? ` · ${item.venue}` : ""}
        </p>
      </div>
    </Link>
  )
}

function AnnouncementItem({ item }: { item: DashboardAnnouncement }) {
  const location = useLocation()
  return (
    <Link
      to={`/announcements/${item.id}`}
      state={withNavTrail(location)}
      className="flex gap-3 rounded-2xl border border-border bg-muted/20 p-3.5 transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="size-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#081b45]/8 text-[#081b45] dark:bg-white/8 dark:text-white">
          <MegaphoneIcon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          <Badge variant="outline" className="shrink-0 font-normal">
            {categoryLabel(item.category)}
          </Badge>
        </div>
        {item.content ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.content}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] tracking-wide text-muted-foreground uppercase">
          {formatDate(item.published_at)}
        </p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const location = useLocation()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<AdminEvent[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const [result, events] = await Promise.all([
          dashboardService.getDashboard(token),
          eventService
            .list(token, { scope: "upcoming", page: 1, page_size: 4 })
            .catch(() => ({ items: [] as AdminEvent[] })),
        ])
        if (!cancelled) {
          setData(result)
          setUpcomingEvents(events.items)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load dashboard",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-destructive">
            {error || "Failed to load dashboard"}
          </p>
        </div>
      </div>
    )
  }

  const attentionItems = [
    {
      title: "Pending registrations",
      value: data.pending_registrations_count,
      to: "/registrations?status=PENDING",
      icon: ClipboardListIcon,
    },
    {
      title: "Contact requests",
      value: data.pending_contact_requests_count,
      to: "/contact-requests",
      icon: MailIcon,
    },
  ]
  const attentionTotal =
    data.pending_registrations_count + data.pending_contact_requests_count

  const previewAnnouncements = data.latest_announcements.slice(0, 3)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <section className="relative overflow-hidden rounded-2xl bg-[#081b45] px-5 py-6 text-white shadow-[0_18px_40px_rgb(8_27_69_/_0.18)] sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -top-16 right-0 size-56 rounded-full bg-[#00c2b2]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-[#47bfff]/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#00c2b2] uppercase">
                Taleem AI · Admin
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {greeting()}
              </h1>
        
              <p className="mt-3 text-xs text-white/50">{formatLongDate()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      className="bg-[#00c2b2] text-[#042a2a] hover:bg-[#00d4c2]"
                      nativeButton={false}
                      render={
                        <Link
                          to="/registrations?status=PENDING"
                          state={withNavTrail(location)}
                        />
                      }
                    />
                  }
                >
                  Review pending registrations
                  <ArrowUpRightIcon />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Review pending alumni registration requests
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      nativeButton={false}
                      render={
                        <Link
                          to="/announcements/new"
                          state={withNavTrail(location)}
                        />
                      }
                    />
                  }
                >
                  <PlusIcon />
                  Announcement
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Create a new announcement
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      nativeButton={false}
                      render={
                        <Link
                          to="/events/new"
                          state={withNavTrail(location)}
                        />
                      }
                    />
                  }
                >
                  <PlusIcon />
                  Event
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Create a new event
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </section>
      </div>

      <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total alumni"
          value={data.alumni_count}
          hint="Active alumni in the directory"
          icon={UsersIcon}
          to="/alumni"
          tone="navy"
        />
        <StatCard
          title="Pending registrations"
          value={data.pending_registrations_count}
          hint="Awaiting admin review"
          icon={ClipboardListIcon}
          to="/registrations?status=PENDING"
          tone="amber"
        />
        <StatCard
          title="Contact requests"
          value={data.pending_contact_requests_count}
          hint="Alumni introductions to review"
          icon={MailIcon}
          to="/contact-requests"
          tone="cyan"
        />
        <StatCard
          title="Events"
          value={data.published_events_count}
          hint="Total published events"
          icon={CalendarDaysIcon}
          to="/events"
          tone="cyan"
          activeCount={data.active_events_count}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              {attentionTotal
                ? "Work waiting on the admin team"
                : "No pending reviews right now"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {attentionItems.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                state={withNavTrail(location)}
                className="flex items-center justify-between rounded-xl border border-border/80 px-3 py-3 transition-colors hover:border-[#00c2b2]/40 hover:bg-[#00c2b2]/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#081b45]/8 text-[#081b45] dark:bg-white/8 dark:text-white">
                    <item.icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    item.value > 0
                      ? "bg-[#00c2b2]/15 text-[#0a7d73]"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {formatCount(item.value)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>
                Recently published updates for alumni
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link to="/announcements" state={withNavTrail(location)} />
              }
            >
              View more
              <ArrowUpRightIcon />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {previewAnnouncements.length ? (
              previewAnnouncements.map((item) => (
                <AnnouncementItem key={item.id} item={item} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No announcements published yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>Upcoming events on the calendar</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/events" state={withNavTrail(location)} />}
            >
              View more
              <ArrowUpRightIcon />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {upcomingEvents.map((item) => (
                  <EventItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No upcoming events.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
