import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHero } from "@/components/admin/page-hero"
import { SegmentedTabs } from "@/components/admin/segmented-tabs"
import { TablePagination, parsePageSize } from "@/components/admin/table-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"
import { withNavTrail } from "@/lib/nav-trail"
import { cn } from "@/lib/utils"
import {
  eventService,
  type AdminEvent,
  type EventListScope,
} from "@/services/event.service"

const SCOPES: Array<{ label: string; value: EventListScope }> = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
  { label: "All", value: "all" },
]

function typeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatTime(value: string | null) {
  if (!value) return ""
  return value.slice(0, 5)
}

function eventStatus(item: AdminEvent) {
  if (item.is_draft) {
    return {
      label: "Draft",
      className:
        "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
    }
  }
  if (item.status === "POSTPONED") {
    return {
      label: "Postponed",
      className:
        "border-transparent bg-orange-500/10 text-orange-700 dark:text-orange-400",
    }
  }
  return {
    label: "Published",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  }
}

function TableSkeleton() {
  return (
    <div className="portal-table">
      <div className="border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const scopeParam = searchParams.get("scope")
  const scope: EventListScope =
    scopeParam === "past" || scopeParam === "all" ? scopeParam : "upcoming"
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1)
  const pageSize = parsePageSize(searchParams.get("pageSize"))

  const [items, setItems] = useState<AdminEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pendingDelete, setPendingDelete] = useState<AdminEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!token) return
    setLoading(true)
    setError("")
    try {
      const result = await eventService.list(token, {
        scope,
        page,
        page_size: pageSize,
      })
      setItems(result.items)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scope, page, pageSize])

  async function handleDelete() {
    if (!token || !pendingDelete) return

    setDeleting(true)
    setError("")
    try {
      await eventService.remove(token, pendingDelete.id)
      setPendingDelete(null)
      toast.success("Event deleted")
      await load()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete event"
      setError(message)
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  function setScope(next: EventListScope) {
    const params = new URLSearchParams(searchParams)
    if (next === "upcoming") params.delete("scope")
    else params.set("scope", next)
    params.set("page", "1")
    setSearchParams(params)
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(nextPage))
    setSearchParams(params)
  }

  function changePageSize(nextSize: number) {
    const params = new URLSearchParams(searchParams)
    if (nextSize === 10) params.delete("pageSize")
    else params.set("pageSize", String(nextSize))
    params.set("page", "1")
    setSearchParams(params)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <PageHero
          eyebrow="Community calendar"
          title="Events"
          description="Create and manage alumni events."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs items={SCOPES} value={scope} onChange={setScope} />
        <Button render={<Link to="/events/new" state={withNavTrail(location)} />}>
          <PlusIcon />
          New event
        </Button>
      </div>

      <div>
        {error ? (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="portal-card cursor-pointer p-4"
                    onClick={() =>
                      navigate(`/events/${item.id}`, {
                        state: withNavTrail(location),
                      })
                    }
                  >
                    <div className="flex items-start gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="size-12 shrink-0 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                          <CalendarDaysIcon className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">{item.title}</p>
                          <Badge
                            className={cn(
                              "shrink-0 font-normal",
                              eventStatus(item).className,
                            )}
                          >
                            {eventStatus(item).label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.venue}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(item.event_date)} · {formatTime(item.start_time)}
                          {item.end_time ? `–${formatTime(item.end_time)}` : ""}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">
                            {typeLabel(item.event_type)}
                          </Badge>
                          {item.rsvp_counts ? (
                            <span className="text-xs text-muted-foreground">
                              {item.rsvp_counts.total} RSVP
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1 border-t pt-3">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting && pendingDelete?.id === item.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingDelete(item)
                        }}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Delete</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        render={
                          <Link
                            to={`/events/${item.id}/edit`}
                            state={withNavTrail(location)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <PencilIcon />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="portal-card px-4 py-10 text-center text-sm text-muted-foreground">
                  No events found.
                </div>
              )}
            </div>

            <div className="portal-table hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Event
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
                    Type
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Date
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground lg:table-cell">
                    RSVP
                  </TableHead>
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-11 w-28 bg-muted/40 px-4 text-right text-xs uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() =>
                      navigate(`/events/${item.id}`, {
                        state: withNavTrail(location),
                      })
                    }
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="size-10 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                            <CalendarDaysIcon className="size-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {item.venue}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 md:table-cell">
                      <Badge variant="outline">{typeLabel(item.event_type)}</Badge>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {formatDate(item.event_date)}
                      <span className="mx-1.5 text-border">·</span>
                      {formatTime(item.start_time)}
                      {item.end_time ? `–${formatTime(item.end_time)}` : ""}
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 lg:table-cell">
                      {item.rsvp_counts ? (
                        <span className="tabular-nums text-sm font-medium">
                          {item.rsvp_counts.total}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={cn(
                          "font-normal",
                          eventStatus(item).className,
                        )}
                      >
                        {eventStatus(item).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deleting && pendingDelete?.id === item.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingDelete(item)
                          }}
                        >
                          <Trash2Icon />
                          <span className="sr-only">Delete</span>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          render={
                            <Link
                              to={`/events/${item.id}/edit`}
                              state={withNavTrail(location)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <PencilIcon />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground opacity-60 group-hover:opacity-100"
                          render={
                            <Link
                              to={`/events/${item.id}`}
                              state={withNavTrail(location)}
                            />
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRightIcon />
                          <span className="sr-only">View</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!items.length ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="h-28 px-4 text-center text-muted-foreground"
                    >
                      No events found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            </div>
          </>
        )}

        {!loading ? (
          <TablePagination
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete event"
        description={`Delete “${pendingDelete?.title ?? "this event"}”? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        busy={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
