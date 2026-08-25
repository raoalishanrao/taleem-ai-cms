import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ImageIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { BackButton } from "@/components/admin/back-button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHero } from "@/components/admin/page-hero"
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
import { ApiError } from "@/lib/api"
import { useBackNavigation, withNavTrail } from "@/lib/nav-trail"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  announcementService,
  type Announcement,
} from "@/services/announcement.service"

function categoryLabel(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words whitespace-pre-wrap">
        {value || "—"}
      </dd>
    </div>
  )
}

export default function AnnouncementDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { backTo, backState } = useBackNavigation("/announcements")

  const [item, setItem] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!token || !id) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const result = await announcementService.getById(token, id)
        if (!cancelled) setItem(result)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load announcement",
          )
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

  async function handleDelete() {
    if (!token || !item) return

    setBusy(true)
    setError("")
    try {
      await announcementService.remove(token, item.id)
      setConfirmDelete(false)
      toast.success("Announcement deleted")
      navigate(backTo, backState ? { state: backState, replace: true } : { replace: true })
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete announcement"
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
        <BackButton fallback="/announcements" />
        <p className="text-sm text-destructive">
          {error || "Announcement not found"}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackButton fallback="/announcements" />
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
            <Button
              size="sm"
              variant="outline"
              render={
                <Link
                  to={`/announcements/${item.id}/edit`}
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
          eyebrow="University communication"
          title={item.title}
          description={`Published ${formatDate(item.published_at)}`}
          badge={
            <>
              <Badge
                className={cn(
                  "font-normal",
                  item.is_published
                    ? "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {item.is_published ? "Published" : "Draft"}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/25 bg-white/10 font-normal text-white"
              >
                {categoryLabel(item.category)}
              </Badge>
            </>
          }
        />
      </div>

      {error ? (
        <p className="px-4 text-sm text-destructive lg:px-6">{error}</p>
      ) : null}

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Full announcement body</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {item.content}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent>
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="aspect-video w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                  <ImageIcon className="size-8" />
                  <span className="text-xs">No image</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow
                  label="Category"
                  value={categoryLabel(item.category)}
                />
                <DetailRow
                  label="Status"
                  value={item.is_published ? "Published" : "Draft"}
                />
                <DetailRow
                  label="Published at"
                  value={formatDate(item.published_at)}
                />
                {item.featured_alumni ? (
                  <DetailRow
                    label="Featured alumni"
                    value={
                      <Link
                        to={`/alumni/${item.featured_alumni.alumni_id}`}
                        state={withNavTrail(location)}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {item.featured_alumni.full_name}
                      </Link>
                    }
                  />
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete announcement"
        description={`Delete “${item.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        busy={busy}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
      />
    </div>
  )
}
