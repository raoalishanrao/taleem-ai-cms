import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  BanIcon,
  CalendarClockIcon,
  ImageIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { BackButton } from "@/components/admin/back-button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DatePicker } from "@/components/admin/date-picker"
import { PageHero } from "@/components/admin/page-hero"
import { TimePicker } from "@/components/admin/time-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { useBackNavigation, withNavTrail } from "@/lib/nav-trail"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  catalogService,
  type CatalogCampus,
  type CatalogDegreeProgram,
} from "@/services/catalog.service"
import {
  eventService,
  type AdminEvent,
  type AdminRsvpListItem,
} from "@/services/event.service"

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
  if (!value) return "—"
  return value.slice(0, 5)
}

function toHm(value: string | null) {
  return value ? value.slice(0, 5) : ""
}

function normalizeTime(value: string) {
  if (!value) return ""
  return value.length === 5 ? `${value}:00` : value
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

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid min-h-12 content-center gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words whitespace-pre-wrap">
        {value || "—"}
      </dd>
    </div>
  )
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { backTo, backState } = useBackNavigation("/events")

  const [item, setItem] = useState<AdminEvent | null>(null)
  const [rsvps, setRsvps] = useState<AdminRsvpListItem[]>([])
  const [campuses, setCampuses] = useState<CatalogCampus[]>([])
  const [degreePrograms, setDegreePrograms] = useState<CatalogDegreeProgram[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmPostpone, setConfirmPostpone] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [postponeReason, setPostponeReason] = useState("")
  const [postponeDate, setPostponeDate] = useState("")
  const [postponeStart, setPostponeStart] = useState("")
  const [postponeEnd, setPostponeEnd] = useState("")
  const [postponeVenue, setPostponeVenue] = useState("")
  const [fieldError, setFieldError] = useState("")

  useEffect(() => {
    if (!token || !id) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const [event, rsvpList, campusList, programList] = await Promise.all([
          eventService.getById(token, id),
          eventService
            .listRsvps(token, id)
            .catch(() => [] as AdminRsvpListItem[]),
          catalogService.listCampuses().catch(() => [] as CatalogCampus[]),
          catalogService
            .listDegreePrograms()
            .catch(() => [] as CatalogDegreeProgram[]),
        ])
        if (!cancelled) {
          setItem(event)
          setRsvps(rsvpList)
          setCampuses(campusList)
          setDegreePrograms(programList)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load event")
          setItem(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, id])

  const campusLabels = useMemo(() => {
    const ids = item?.target_criteria?.campus_ids ?? []
    if (!ids.length) return "All"
    return ids
      .map(
        (campusId) =>
          campuses.find((campus) => campus.id === campusId)?.name ?? campusId,
      )
      .join(", ")
  }, [item, campuses])

  const degreeProgramLabels = useMemo(() => {
    const ids = item?.target_criteria?.degree_program_ids ?? []
    if (!ids.length) return "All"
    return ids
      .map(
        (programId) =>
          degreePrograms.find((program) => program.id === programId)?.label ??
          programId,
      )
      .join(", ")
  }, [item, degreePrograms])

  async function handleDelete() {
    if (!token || !item) return

    setBusy(true)
    setError("")
    try {
      await eventService.remove(token, item.id)
      setConfirmDelete(false)
      toast.success("Event deleted")
      navigate(backTo, backState ? { state: backState, replace: true } : { replace: true })
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete event"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  function openCancel() {
    setCancelReason("")
    setFieldError("")
    setConfirmCancel(true)
  }

  function openPostpone() {
    if (!item) return
    setPostponeReason(item.status_reason ?? "")
    setPostponeDate(item.event_date.slice(0, 10))
    setPostponeStart(toHm(item.start_time))
    setPostponeEnd(toHm(item.end_time))
    setPostponeVenue(item.venue)
    setFieldError("")
    setConfirmPostpone(true)
  }

  async function handleCancel() {
    if (!token || !item) return

    const reason = cancelReason.trim()
    if (reason && reason.length < 3) {
      setFieldError("Reason must be at least 3 characters")
      return
    }

    setBusy(true)
    setError("")
    setFieldError("")
    try {
      await eventService.cancel(token, item.id, {
        ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
      })
      setConfirmCancel(false)
      toast.success("Event cancelled")
      navigate(
        backTo,
        backState ? { state: backState, replace: true } : { replace: true },
      )
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to cancel event"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePostpone() {
    if (!token || !item) return

    const reason = postponeReason.trim()
    if (reason.length < 3) {
      setFieldError("Reason must be at least 3 characters")
      return
    }

    setBusy(true)
    setError("")
    setFieldError("")
    try {
      const updated = await eventService.postpone(token, item.id, {
        reason,
        ...(postponeDate ? { event_date: postponeDate } : {}),
        ...(postponeStart
          ? { start_time: normalizeTime(postponeStart) }
          : {}),
        end_time: postponeEnd ? normalizeTime(postponeEnd) : null,
        ...(postponeVenue.trim().length >= 2
          ? { venue: postponeVenue.trim() }
          : {}),
      })
      const refreshed = await eventService.getById(token, item.id).catch(() => updated)
      setItem({
        ...refreshed,
        rsvp_counts: refreshed.rsvp_counts ?? item.rsvp_counts,
      })
      setConfirmPostpone(false)
      toast.success("Event postponed")
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to postpone event"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-72 w-full" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <BackButton fallback="/events" />
        <p className="text-sm text-destructive">{error || "Event not found"}</p>
      </div>
    )
  }

  const counts = item.rsvp_counts
  const status = eventStatus(item)
  const isPublished = !item.is_draft

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackButton fallback="/events" />
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon />
              Delete
            </Button>
            {isPublished ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={openCancel}
              >
                <BanIcon />
                Cancel event
              </Button>
            ) : null}
            {isPublished ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={openPostpone}
              >
                <CalendarClockIcon />
                Postpone
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              render={
                <Link
                  to={`/events/${item.id}/edit`}
                  state={withNavTrail(location)}
                />
              }
            >
              <PencilIcon />
              Edit
            </Button>
          </div>
        </div>
        <PageHero
          eyebrow="Community calendar"
          title={item.title}
          description={`${formatDate(item.event_date)} · ${formatTime(item.start_time)}${
            item.end_time ? `–${formatTime(item.end_time)}` : ""
          } · ${item.venue}`}
          badge={
            <>
              <Badge className={cn("font-normal", status.className)}>
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/25 bg-white/10 font-normal text-white"
              >
                {typeLabel(item.event_type)}
              </Badge>
            </>
          }
        />
      </div>

      {error ? (
        <p className="px-4 text-sm text-destructive lg:px-6">{error}</p>
      ) : null}

      <div className="grid items-stretch gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-2">
          <Card size="sm" className="min-h-28 shrink-0">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="min-h-24">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {item.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card className="min-h-72 flex-1">
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Event information and audience</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              <dl className="grid h-full flex-1 auto-rows-fr gap-x-8 sm:grid-cols-2">
                <DetailRow label="Type" value={typeLabel(item.event_type)} />
                <DetailRow label="Date" value={formatDate(item.event_date)} />
                <DetailRow
                  label="Time"
                  value={`${formatTime(item.start_time)}${
                    item.end_time ? ` – ${formatTime(item.end_time)}` : ""
                  }`}
                />
                <DetailRow label="Venue" value={item.venue} />
                <DetailRow label="Guest speaker" value={item.guest_speaker} />
                {item.status === "POSTPONED" ? (
                  <DetailRow
                    label="Postpone reason"
                    value={item.status_reason}
                  />
                ) : null}
                <DetailRow label="Campuses" value={campusLabels} />
                <DetailRow label="Degree programs" value={degreeProgramLabels} />
                <DetailRow
                  label="Graduation years"
                  value={
                    item.target_criteria?.graduation_years?.length
                      ? item.target_criteria.graduation_years.join(", ")
                      : "All"
                  }
                />
                <DetailRow
                  label="Cities"
                  value={
                    item.target_criteria?.cities?.length
                      ? item.target_criteria.cities.join(", ")
                      : "All"
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4">
          <Card className="min-h-0 flex-1">
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-full min-h-32 w-full flex-1 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                  <ImageIcon className="size-8" />
                  <span className="text-xs">No image</span>
                </div>
              )}
            </CardContent>
          </Card>

          {counts ? (
            <Card className="min-h-28 shrink-0" size="sm">
              <CardHeader>
                <CardTitle>RSVP summary</CardTitle>
                <CardDescription>{counts.total} total responses</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <div className="flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-3">
                  <p className="text-base font-semibold tabular-nums">
                    {counts.going}
                  </p>
                  <p className="text-xs text-muted-foreground">Going</p>
                </div>
                <div className="flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-3">
                  <p className="text-base font-semibold tabular-nums">
                    {counts.maybe}
                  </p>
                  <p className="text-xs text-muted-foreground">Maybe</p>
                </div>
                <div className="flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-3">
                  <p className="text-base font-semibold tabular-nums">
                    {counts.not_going}
                  </p>
                  <p className="text-xs text-muted-foreground">Not going</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>RSVPs</CardTitle>
            <CardDescription>Alumni responses for this event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {rsvps.length ? (
                rsvps.map((rsvp) => (
                  <div
                    key={rsvp.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {rsvp.full_name || "Unknown"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {rsvp.email || rsvp.alumni_id}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {rsvp.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(rsvp.updated_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
                  No RSVPs yet.
                </div>
              )}
            </div>
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="bg-muted/40 px-4">Alumni</TableHead>
                    <TableHead className="bg-muted/40 px-4">Status</TableHead>
                    <TableHead className="hidden bg-muted/40 px-4 sm:table-cell">
                      Updated
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvps.map((rsvp) => (
                    <TableRow key={rsvp.id}>
                      <TableCell className="px-4 py-3">
                        <div className="font-medium">
                          {rsvp.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rsvp.email || rsvp.alumni_id}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline">
                          {rsvp.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                        {formatDate(rsvp.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rsvps.length ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={3}
                        className="h-24 px-4 text-center text-muted-foreground"
                      >
                        No RSVPs yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete event"
        description={`Delete “${item.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        busy={busy}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel event"
        description={`Cancel “${item.title}”? Alumni will be notified and the event will be removed. This cannot be undone.`}
        confirmLabel="Cancel event"
        cancelLabel="Keep event"
        variant="destructive"
        busy={busy}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmCancel(false)
            setCancelReason("")
            setFieldError("")
          }
        }}
        onConfirm={handleCancel}
      >
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="cancel-reason">Reason (optional)</FieldLabel>
          <Textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value)
              setFieldError("")
            }}
            placeholder="Shared with alumni in the cancellation notice"
            rows={3}
            disabled={busy}
          />
          {fieldError ? <FieldError>{fieldError}</FieldError> : null}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmPostpone}
        title="Postpone event"
        description={`Postpone “${item.title}”? Alumni will be notified. You can keep the current schedule or set a new date, time, and venue.`}
        confirmLabel="Postpone"
        busy={busy}
        contentClassName="sm:max-w-lg"
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPostpone(false)
            setFieldError("")
          }
        }}
        onConfirm={handlePostpone}
      >
        <div className="grid gap-3">
          <Field data-invalid={fieldError ? true : undefined}>
            <FieldLabel htmlFor="postpone-reason">Reason</FieldLabel>
            <Textarea
              id="postpone-reason"
              value={postponeReason}
              onChange={(e) => {
                setPostponeReason(e.target.value)
                setFieldError("")
              }}
              placeholder="Venue unavailable — new date to be confirmed"
              rows={3}
              disabled={busy}
            />
            {fieldError ? <FieldError>{fieldError}</FieldError> : null}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="postpone-date">New date</FieldLabel>
              <DatePicker
                id="postpone-date"
                value={postponeDate}
                disabled={busy}
                placeholder="Keep current date"
                onChange={setPostponeDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="postpone-venue">Venue</FieldLabel>
              <Input
                id="postpone-venue"
                value={postponeVenue}
                onChange={(e) => {
                  setPostponeVenue(e.target.value)
                  setFieldError("")
                }}
                disabled={busy}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="postpone-start">Start time</FieldLabel>
              <TimePicker
                id="postpone-start"
                value={postponeStart}
                disabled={busy}
                placeholder="Start time"
                onChange={setPostponeStart}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="postpone-end">End time</FieldLabel>
              <TimePicker
                id="postpone-end"
                value={postponeEnd}
                disabled={busy}
                placeholder="Optional end time"
                onChange={setPostponeEnd}
              />
            </Field>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
