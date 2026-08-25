import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { BackButton } from "@/components/admin/back-button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { FeaturedAlumniPicker } from "@/components/admin/featured-alumni-picker"
import { ImageFilePicker } from "@/components/admin/image-file-picker"
import { PageHero } from "@/components/admin/page-hero"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { trailStateFor } from "@/lib/nav-trail"
import { toast } from "sonner"
import {
  announcementService,
  type AnnouncementCategory,
} from "@/services/announcement.service"

const CATEGORIES: Array<{ value: AnnouncementCategory; label: string }> = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "ALUMNI_SPOTLIGHT", label: "Alumni spotlight" },
  { value: "CAMPUS_UPDATE", label: "Campus update" },
]

type FormErrors = Partial<
  Record<"title" | "content" | "featured_alumni_id", string>
>

export default function AnnouncementFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<AnnouncementCategory>("ANNOUNCEMENT")
  const [isPublished, setIsPublished] = useState(true)
  const [featuredAlumniId, setFeaturedAlumniId] = useState("")
  const [featuredAlumniLabel, setFeaturedAlumniLabel] = useState("")
  const [mediaId, setMediaId] = useState<string | undefined>()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)

  useEffect(() => {
    if (!token || !id) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const item = await announcementService.getById(token, id)
        if (cancelled) return
        setTitle(item.title)
        setContent(item.content)
        setCategory(item.category)
        setIsPublished(item.is_published)
        setFeaturedAlumniId(item.featured_alumni_id ?? "")
        setFeaturedAlumniLabel(item.featured_alumni?.full_name ?? "")
        setImagePreview(item.image_url)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load announcement",
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

  async function handleImageChange(file: File | null) {
    if (!token || !file) return
    setUploading(true)
    setError("")
    try {
      const uploaded = await announcementService.uploadImage(token, file)
      setMediaId(uploaded.media_id)
      setImagePreview(uploaded.public_url)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to upload image",
      )
    } finally {
      setUploading(false)
    }
  }

  function validate() {
    const next: FormErrors = {}
    if (title.trim().length < 3) next.title = "Title must be at least 3 characters"
    if (content.trim().length < 5) {
      next.content = "Content must be at least 5 characters"
    }
    if (category === "ALUMNI_SPOTLIGHT" && !featuredAlumniId) {
      next.featured_alumni_id = "Select an alumni to feature"
    }
    setErrors(next)
    return Object.keys(next).length === 0
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
        content: content.trim(),
        category,
        is_published: isPublished,
        ...(featuredAlumniId ? { featured_alumni_id: featuredAlumniId } : {}),
        ...(mediaId ? { media_id: mediaId } : {}),
      }

      if (isEdit && id) {
        await announcementService.update(token, id, body)
        setConfirmSave(false)
        toast.success("Announcement updated")
        navigate(`/announcements/${id}`, {
          replace: true,
          state: trailStateFor(location, `/announcements/${id}`),
        })
      } else {
        const created = await announcementService.create(token, body)
        setConfirmSave(false)
        toast.success("Announcement created")
        navigate(`/announcements/${created.id}`, {
          replace: true,
          state: trailStateFor(location, `/announcements/${created.id}`),
        })
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Failed to update announcement"
            : "Failed to create announcement"
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
        <BackButton
          fallback={isEdit && id ? `/announcements/${id}` : "/announcements"}
        />
        <PageHero
          eyebrow="University communication"
          title={isEdit ? "Edit announcement" : "New announcement"}
          description={
            isEdit
              ? "Update announcement content and publish settings."
              : "Create an announcement for the alumni feed."
          }
        />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Title, content, category, and featured alumni
            </CardDescription>
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
                placeholder="Welcome new alumni board"
                disabled={saving}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>

            <Field data-invalid={!!errors.content || undefined}>
              <FieldLabel htmlFor="content">Content</FieldLabel>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setErrors((prev) => ({ ...prev, content: undefined }))
                }}
                rows={8}
                placeholder="Write the announcement…"
                disabled={saving}
              />
              <FieldError>{errors.content}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as AnnouncementCategory)
                }
                disabled={saving}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <FeaturedAlumniPicker
              value={featuredAlumniId}
              label={featuredAlumniLabel}
              required={category === "ALUMNI_SPOTLIGHT"}
              disabled={saving}
              error={errors.featured_alumni_id}
              description={
                category === "ALUMNI_SPOTLIGHT"
                  ? "Required for alumni spotlights. Search and attach the alumni to feature."
                  : "Optional. Search and attach an alumni profile to this announcement."
              }
              onChange={({ id: alumniId, label: alumniLabel }) => {
                setFeaturedAlumniId(alumniId)
                setFeaturedAlumniLabel(alumniLabel)
                setErrors((prev) => ({
                  ...prev,
                  featured_alumni_id: undefined,
                }))
              }}
              onClear={() => {
                setFeaturedAlumniId("")
                setFeaturedAlumniLabel("")
              }}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
              <CardDescription>Optional cover image</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageFilePicker
                previewUrl={imagePreview}
                uploading={uploading}
                disabled={saving}
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
        </div>
        <div className="flex justify-end px-4 lg:px-6">
          <Button
            type="submit"
            disabled={saving || uploading}
          >
            {saving
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create announcement"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmSave}
        title={isEdit ? "Save announcement changes" : "Create announcement"}
        description={
          isEdit
            ? `Save changes to “${title.trim() || "this announcement"}”?`
            : `Create “${title.trim() || "this announcement"}”?`
        }
        confirmLabel={isEdit ? "Save changes" : "Create announcement"}
        busy={saving}
        onOpenChange={setConfirmSave}
        onConfirm={handleConfirmedSave}
      />
    </div>
  )
}
