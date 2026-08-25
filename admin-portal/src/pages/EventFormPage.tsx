import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { BackButton } from "@/components/admin/back-button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DatePicker, parseYmd, startOfDay } from "@/components/admin/date-picker"
import { ImageFilePicker } from "@/components/admin/image-file-picker"
import { PageHero } from "@/components/admin/page-hero"
import { SearchableMultiSelect } from "@/components/admin/searchable-multi-select"
import { TimePicker, parseHm } from "@/components/admin/time-picker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { trailStateFor } from "@/lib/nav-trail"
import { toast } from "sonner"
import {
  catalogService,
  type CatalogCampus,
  type CatalogDegreeProgram,
} from "@/services/catalog.service"
import { eventService, type EventType } from "@/services/event.service"

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "REUNION", label: "Reunion" },
  { value: "NETWORKING_DINNER", label: "Networking dinner" },
  { value: "GUEST_LECTURE", label: "Guest lecture" },
  { value: "OTHER", label: "Other" },
]

const GRADUATION_YEARS = Array.from({ length: 40 }, (_, index) => {
  const year = new Date().getFullYear() + 1 - index
  return String(year)
})

type FormErrors = Partial<
  Record<"title" | "event_date" | "start_time" | "venue", string>
>

function todayYmd() {
  return startOfDay(new Date())
}

function currentTimeHm() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`
}

function isSameDay(date: Date, other: Date) {
  return (
    date.getFullYear() === other.getFullYear() &&
    date.getMonth() === other.getMonth() &&
    date.getDate() === other.getDate()
  )
}

function minutesOf(value: string) {
  const parsed = parseHm(value)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

function normalizeTime(value: string) {
  if (!value) return ""
  return value.length === 5 ? `${value}:00` : value
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function EventFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventType, setEventType] = useState<EventType>("OTHER")
  const [eventDate, setEventDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [venue, setVenue] = useState("")
  const [guestSpeaker, setGuestSpeaker] = useState("")
  const [isPublished, setIsPublished] = useState(true)
  const [mediaId, setMediaId] = useState<string | undefined>()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)

  const [campuses, setCampuses] = useState<CatalogCampus[]>([])
  const [degreePrograms, setDegreePrograms] = useState<CatalogDegreeProgram[]>(
    [],
  )
  const [campusIds, setCampusIds] = useState<string[]>([])
  const [degreeProgramIds, setDegreeProgramIds] = useState<string[]>([])
  const [graduationYears, setGraduationYears] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const [campusList, programList] = await Promise.all([
          catalogService.listCampuses(),
          catalogService.listDegreePrograms(),
        ])
        if (cancelled) return
        setCampuses(campusList)
        setDegreePrograms(programList)

        if (token && id) {
          const item = await eventService.getById(token, id)
          if (cancelled) return
          setTitle(item.title)
          setDescription(item.description ?? "")
          setEventType(item.event_type)
          setEventDate(item.event_date.slice(0, 10))
          setStartTime(item.start_time.slice(0, 5))
          setEndTime(item.end_time ? item.end_time.slice(0, 5) : "")
          setVenue(item.venue)
          setGuestSpeaker(item.guest_speaker ?? "")
          setIsPublished(!item.is_draft)
          setImagePreview(item.image_url)
          const nextCampusIds = item.target_criteria?.campus_ids ?? []
          const nextProgramIds = item.target_criteria?.degree_program_ids ?? []
          const nextYears = (item.target_criteria?.graduation_years ?? []).map(
            String,
          )
          const nextCities = item.target_criteria?.cities ?? []
          setCampusIds(nextCampusIds)
          setDegreeProgramIds(nextProgramIds)
          setGraduationYears(nextYears)
          setCities(nextCities)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load event form data",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, id])

  const campusOptions = useMemo(
    () =>
      campuses.map((campus) => ({
        value: campus.id,
        label: campus.name,
        hint: `${campus.code} · ${campus.city}`,
      })),
    [campuses],
  )

  const cityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(campuses.map((campus) => campus.city).filter(Boolean)),
    ).sort()
    return unique.map((city) => ({ value: city, label: city }))
  }, [campuses])

  const filteredDegreePrograms = useMemo(() => {
    if (!campusIds.length) return degreePrograms
    return degreePrograms.filter((program) =>
      campusIds.includes(program.campus_id),
    )
  }, [campusIds, degreePrograms])

  const degreeProgramOptions = useMemo(
    () =>
      filteredDegreePrograms.map((program) => ({
        value: program.id,
        label: program.label,
      })),
    [filteredDegreePrograms],
  )

  const yearOptions = useMemo(
    () => GRADUATION_YEARS.map((year) => ({ value: year, label: year })),
    [],
  )

  useEffect(() => {
    if (!campusIds.length) return
    setDegreeProgramIds((prev) =>
      prev.filter((programId) =>
        filteredDegreePrograms.some((program) => program.id === programId),
      ),
    )
  }, [campusIds, filteredDegreePrograms])

  const hasAudienceFilters =
    campusIds.length > 0 ||
    degreeProgramIds.length > 0 ||
    graduationYears.length > 0 ||
    cities.length > 0

  const audienceSummary = useMemo(() => {
    if (!hasAudienceFilters) return "All alumni"
    const parts: string[] = []
    if (campusIds.length) {
      parts.push(countLabel(campusIds.length, "campus", "campuses"))
    }
    if (degreeProgramIds.length) {
      parts.push(countLabel(degreeProgramIds.length, "program", "programs"))
    }
    if (graduationYears.length) {
      const sorted = [...graduationYears].sort()
      if (sorted.length <= 3) {
        parts.push(`class of ${sorted.join(", ")}`)
      } else {
        parts.push(countLabel(sorted.length, "year", "years"))
      }
    }
    if (cities.length) {
      parts.push(countLabel(cities.length, "city", "cities"))
    }
    return `Targeting ${parts.join(" · ")}`
  }, [
    campusIds.length,
    cities.length,
    degreeProgramIds.length,
    graduationYears,
    hasAudienceFilters,
  ])

  function clearAudience() {
    setCampusIds([])
    setDegreeProgramIds([])
    setGraduationYears([])
    setCities([])
  }

  async function handleImageChange(file: File | null) {
    if (!token || !file) return
    setUploading(true)
    setError("")
    try {
      const uploaded = await eventService.uploadImage(token, file)
      setMediaId(uploaded.media_id)
      setImagePreview(uploaded.public_url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const next: FormErrors = {}
    if (title.trim().length < 3) next.title = "Title must be at least 3 characters"
    if (!eventDate) {
      next.event_date = "Event date is required"
    } else {
      const selected = parseYmd(eventDate)
      if (!selected || selected < todayYmd()) {
        next.event_date = "Event date cannot be in the past"
      }
    }
    if (!startTime) {
      next.start_time = "Start time is required"
    } else if (eventDate) {
      const selected = parseYmd(eventDate)
      if (selected && isSameDay(selected, new Date())) {
        const startMinutes = minutesOf(startTime)
        const nowMinutes = minutesOf(currentTimeHm())
        if (
          startMinutes != null &&
          nowMinutes != null &&
          startMinutes < nowMinutes
        ) {
          next.start_time = "Start time cannot be in the past"
        }
      }
    }
    if (venue.trim().length < 2) next.venue = "Venue is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function buildTargetCriteria() {
    const criteria = {
      ...(campusIds.length ? { campus_ids: campusIds } : {}),
      ...(degreeProgramIds.length
        ? { degree_program_ids: degreeProgramIds }
        : {}),
      ...(graduationYears.length
        ? { graduation_years: graduationYears.map(Number) }
        : {}),
      ...(cities.length ? { cities } : {}),
    }
    return Object.keys(criteria).length ? criteria : null
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !validate()) return
    setConfirmSave(true)
  }

  async function handleConfirmedSave() {
    if (!token) return

    setSaving(true)
    setError("")
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        event_date: eventDate,
        start_time: normalizeTime(startTime),
        end_time: endTime ? normalizeTime(endTime) : undefined,
        venue: venue.trim(),
        guest_speaker: guestSpeaker.trim() || undefined,
        is_draft: !isPublished,
        target_criteria: buildTargetCriteria(),
        ...(mediaId ? { media_id: mediaId } : {}),
      }

      if (isEdit && id) {
        await eventService.update(token, id, body)
        setConfirmSave(false)
        toast.success("Event updated")
        navigate(`/events/${id}`, {
          replace: true,
          state: trailStateFor(location, `/events/${id}`),
        })
      } else {
        const created = await eventService.create(token, body)
        setConfirmSave(false)
        toast.success("Event created")
        navigate(`/events/${created.id}`, {
          replace: true,
          state: trailStateFor(location, `/events/${created.id}`),
        })
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Failed to update event"
            : "Failed to create event"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <BackButton fallback={isEdit && id ? `/events/${id}` : "/events"} />
        <PageHero
          eyebrow="Community calendar"
          title={isEdit ? "Edit event" : "New event"}
          description={
            isEdit
              ? "Update event details, targeting, and publish settings."
              : "Create an event and optionally target specific alumni."
          }
        />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid items-stretch gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <div className="flex h-full flex-col gap-4 lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Event information</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field data-invalid={!!errors.title || undefined}>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setErrors((prev) => ({ ...prev, title: undefined }))
                  }}
                  placeholder="Annual Alumni Reunion 2026"
                  disabled={saving}
                />
                <FieldError>{errors.title}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Optional event description…"
                  disabled={saving}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="event_type">Type</FieldLabel>
                  <select
                    id="event_type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    disabled={saving}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    {EVENT_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field data-invalid={!!errors.event_date || undefined}>
                  <FieldLabel htmlFor="event_date">Date</FieldLabel>
                  <DatePicker
                    id="event_date"
                    value={eventDate}
                    minDate={todayYmd()}
                    disabled={saving}
                    placeholder="Pick event date"
                    onChange={(next) => {
                      setEventDate(next)
                      setErrors((prev) => ({
                        ...prev,
                        event_date: undefined,
                        start_time: undefined,
                      }))
                    }}
                  />
                  <FieldError>{errors.event_date}</FieldError>
                </Field>

                <Field data-invalid={!!errors.start_time || undefined}>
                  <FieldLabel htmlFor="start_time">Start time</FieldLabel>
                  <TimePicker
                    id="start_time"
                    value={startTime}
                    disabled={saving}
                    placeholder="Pick start time"
                    minTime={
                      eventDate &&
                      parseYmd(eventDate) &&
                      isSameDay(parseYmd(eventDate)!, new Date())
                        ? currentTimeHm()
                        : undefined
                    }
                    onChange={(next) => {
                      setStartTime(next)
                      setErrors((prev) => ({
                        ...prev,
                        start_time: undefined,
                      }))
                    }}
                  />
                  <FieldError>{errors.start_time}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="end_time">End time</FieldLabel>
                  <TimePicker
                    id="end_time"
                    value={endTime}
                    disabled={saving}
                    placeholder="Optional end time"
                    onChange={(next) => setEndTime(next)}
                  />
                </Field>
              </div>

              <Field data-invalid={!!errors.venue || undefined}>
                <FieldLabel htmlFor="venue">Venue</FieldLabel>
                <Input
                  id="venue"
                  value={venue}
                  onChange={(e) => {
                    setVenue(e.target.value)
                    setErrors((prev) => ({ ...prev, venue: undefined }))
                  }}
                  placeholder="Main Campus Auditorium"
                  disabled={saving}
                />
                <FieldError>{errors.venue}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="guest_speaker">Guest speaker</FieldLabel>
                <Input
                  id="guest_speaker"
                  value={guestSpeaker}
                  onChange={(e) => setGuestSpeaker(e.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4">
          <Card className="min-h-0 flex-1">
            <CardHeader>
              <CardTitle>Image</CardTitle>
              <CardDescription>Optional cover image</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              <ImageFilePicker
                layout="fill"
                previewUrl={imagePreview}
                uploading={uploading}
                disabled={saving}
                className="min-h-0 flex-1"
                onSelect={(file) => void handleImageChange(file)}
                onClear={() => {
                  setMediaId(undefined)
                  setImagePreview(null)
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
              <CardDescription>Visibility settings</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div>
                  <Label htmlFor="is_published">Published</Label>
                  <p className="text-xs text-muted-foreground">
                    Show in the alumni feed
                  </p>
                </div>
                <Switch
                  id="is_published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  disabled={saving}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Audience</CardTitle>
            <CardDescription>
              Choose who should see this event. All is selected by default.
            </CardDescription>
            {hasAudienceFilters ? (
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={clearAudience}
                >
                  Reset to all
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-medium">{audienceSummary}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchableMultiSelect
                label="Campus"
                placeholder="All campuses"
                allLabel="All campuses"
                searchPlaceholder="Search campuses…"
                values={campusIds}
                disabled={saving}
                onChange={setCampusIds}
                options={campusOptions}
              />
              <SearchableMultiSelect
                label="Degree program"
                placeholder={
                  campusIds.length
                    ? "All programs on selected campuses"
                    : "All degree programs"
                }
                allLabel="All programs"
                searchPlaceholder="Search programs…"
                values={degreeProgramIds}
                disabled={saving}
                onChange={setDegreeProgramIds}
                options={degreeProgramOptions}
                emptyText="No degree programs found"
              />
              <SearchableMultiSelect
                label="Graduation year"
                placeholder="All years"
                allLabel="All years"
                searchPlaceholder="Search years…"
                values={graduationYears}
                disabled={saving}
                onChange={setGraduationYears}
                options={yearOptions}
              />
              <SearchableMultiSelect
                label="City"
                placeholder="All cities"
                allLabel="All cities"
                searchPlaceholder="Search cities…"
                values={cities}
                disabled={saving}
                onChange={setCities}
                options={cityOptions}
                emptyText="No cities found"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end bg-transparent">
            <Button type="submit" disabled={saving || uploading}>
              {saving
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create event"}
            </Button>
          </CardFooter>
        </Card>
        </div>
      </form>

      <ConfirmDialog
        open={confirmSave}
        title={isEdit ? "Save event changes" : "Create event"}
        description={
          isEdit
            ? `Save changes to “${title.trim() || "this event"}”?`
            : `Create “${title.trim() || "this event"}”?`
        }
        confirmLabel={isEdit ? "Save changes" : "Create event"}
        busy={saving}
        onOpenChange={setConfirmSave}
        onConfirm={handleConfirmedSave}
      />
    </div>
  )
}
