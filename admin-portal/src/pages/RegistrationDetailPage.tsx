import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { MailIcon, QrCodeIcon, UserIcon } from "lucide-react"

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"
import {
  degreeProgramLabel,
  formatDateTime,
  registrationStatusVariant,
} from "@/lib/registration-utils"
import { cn } from "@/lib/utils"
import {
  registrationService,
  type RegistrationDetail,
} from "@/services/registration.service"

function DetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Skeleton className="mb-4 h-8 w-24" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
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
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  )
}

export default function RegistrationDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()

  const [item, setItem] = useState<RegistrationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [cnic, setCnic] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [fieldError, setFieldError] = useState("")
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(
    null,
  )
  const [activationEmailFailed, setActivationEmailFailed] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

  async function load() {
    if (!token || !id) return
    setLoading(true)
    setError("")
    try {
      const result = await registrationService.getById(token, id)
      setItem(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load")
      setItem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setActivationEmailFailed(false)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  function openAccept() {
    setCnic("")
    setFieldError("")
    setConfirmAction("APPROVED")
  }

  function openReject() {
    setRejectionReason("")
    setFieldError("")
    setConfirmAction("REJECTED")
  }

  function closeConfirm() {
    if (busy) return
    setConfirmAction(null)
    setCnic("")
    setRejectionReason("")
    setFieldError("")
  }

  function resetConfirm() {
    setConfirmAction(null)
    setCnic("")
    setRejectionReason("")
    setFieldError("")
  }

  async function handleReview() {
    if (!token || !id || !item || !confirmAction) return
    const status = confirmAction

    if (status === "APPROVED") {
      if (!cnic.trim()) {
        setFieldError("Enter the CNIC to confirm this registration")
        return
      }
      if (!/^\d{5}-\d{7}-\d$/.test(cnic.trim())) {
        setFieldError("CNIC must match #####-#######-#")
        return
      }
    }

    if (status === "REJECTED" && !rejectionReason.trim()) {
      setFieldError("Rejection reason is required")
      return
    }

    setBusy(true)
    setError("")
    setFieldError("")

    try {
      const result = await registrationService.review(token, id, {
        status,
        cnic_national_id:
          status === "APPROVED" ? cnic.trim() : item.cnic_national_id,
        ...(status === "REJECTED"
          ? { rejection_reason: rejectionReason.trim() }
          : {}),
      })

      if (result.status === "APPROVED") {
        const notes = [
          result.notification_failed ? "activation email failed to send" : null,
          result.qr_failed ? "QR generation failed" : null,
        ].filter(Boolean)
        setActivationEmailFailed(result.notification_failed)
        toast.success(
          notes.length
            ? `Approved (${notes.join(", ")}).`
            : "Registration approved.",
        )
      } else {
        toast.success(
          result.notification_failed
            ? "Rejected (notification failed to send)."
            : "Registration rejected.",
        )
      }

      resetConfirm()
      await load()
    } catch (err) {
      const failMessage =
        err instanceof ApiError
          ? err.message
          : status === "APPROVED"
            ? "Approve failed"
            : "Reject failed"
      setError(failMessage)
      toast.error(failMessage)
    } finally {
      setBusy(false)
    }
  }

  async function handleResendActivation() {
    if (!item?.email) return
    setResendBusy(true)
    setError("")
    try {
      await registrationService.resendActivation(item.email)
      setActivationEmailFailed(false)
      toast.success("Confirmation email resent.")
    } catch (err) {
      const failMessage =
        err instanceof ApiError
          ? err.message
          : "Failed to resend confirmation email"
      setError(failMessage)
      toast.error(failMessage)
    } finally {
      setResendBusy(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (!item) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <BackButton fallback="/registrations" />
        <p className="text-sm text-destructive">
          {error || "Registration not found"}
        </p>
      </div>
    )
  }

  const isPending = item.status === "PENDING"
  const profilePhotoUrl = item.alumni?.photo_url ?? item.photo_url
  const qrCodeUrl = item.alumni?.qr_code ?? null

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <BackButton fallback="/registrations" />
        <PageHero
          eyebrow="Membership review"
          title={item.full_name}
          description={[item.reference_number, item.email]
            .filter(Boolean)
            .join(" · ")}
          badge={
            <Badge
              variant={registrationStatusVariant(item.status)}
              className={cn(
                "font-normal",
                item.status === "PENDING" &&
                  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
              )}
            >
              {item.status}
            </Badge>
          }
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {activationEmailFailed && item.status === "APPROVED" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Activation email failed to send to{" "}
              <span className="font-medium">{item.email}</span>.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={resendBusy}
              onClick={() => void handleResendActivation()}
            >
              <MailIcon />
              {resendBusy ? "Sending…" : "Resend confirmation email"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Applicant details</CardTitle>
            <CardDescription>
              Submitted {formatDateTime(item.submitted_at)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow
                label="Reference no"
                value={item.reference_number}
              />
              <DetailRow label="Full name" value={item.full_name} />
              <DetailRow label="Email" value={item.email} />
              <DetailRow label="Phone" value={item.phone_number} />
              <DetailRow label="WhatsApp" value={item.whatsapp_number} />
              <DetailRow label="CNIC" value={item.cnic_national_id} />
              <DetailRow
                label="Roll number"
                value={item.registration_roll_number}
              />
              <DetailRow label="Graduation year" value={item.graduation_year} />
              <DetailRow
                label="Degree program"
                value={
                  item.degree_program_name ||
                  degreeProgramLabel(item.degree_program_id)
                }
              />
              {item.rejection_reason ? (
                <DetailRow
                  label="Rejection reason"
                  value={item.rejection_reason}
                />
              ) : null}
              {item.reviewed_at ? (
                <DetailRow
                  label="Reviewed at"
                  value={formatDateTime(item.reviewed_at)}
                />
              ) : null}
              {item.alumni ? (
                <>
                  <DetailRow label="Alumni ID" value={item.alumni.alumni_id} />
                  <DetailRow
                    label="Alumni status"
                    value={item.alumni.status}
                  />
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile & QR</CardTitle>
              <CardDescription>
                Alumni photo and membership QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
                <p className="w-full text-xs font-medium text-muted-foreground">
                  Profile photo
                </p>
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={`${item.full_name} profile`}
                    className="size-40 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex size-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                    <UserIcon className="size-10" />
                    <span className="text-xs">No photo uploaded</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
                <p className="w-full text-xs font-medium text-muted-foreground">
                  Alumni QR code
                </p>
                {qrCodeUrl ? (
                  <>
                    <img
                      src={qrCodeUrl}
                      alt={`${item.full_name} QR code`}
                      className="size-40 rounded-lg border bg-white object-contain p-2"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <a
                          href={qrCodeUrl}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <QrCodeIcon />
                      Open QR
                    </Button>
                  </>
                ) : (
                  <div className="flex size-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                    <QrCodeIcon className="size-10" />
                    <span className="text-xs">
                      {item.alumni ? "QR not available" : "Available after approval"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-end gap-2 px-4 lg:px-6">
          <Button
            variant="destructive"
            disabled={busy}
            onClick={openReject}
          >
            Reject
          </Button>
          <Button disabled={busy} onClick={openAccept}>
            Approve
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAction === "APPROVED"}
        title="Confirm CNIC"
        description={`Enter the applicant's CNIC to approve ${item.full_name}. This will activate their alumni account.`}
        confirmLabel="Approve"
        busy={busy}
        onOpenChange={(open) => {
          if (!open) closeConfirm()
        }}
        onConfirm={handleReview}
      >
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="confirm-cnic">CNIC</FieldLabel>
          <Input
            id="confirm-cnic"
            value={cnic}
            onChange={(e) => {
              setCnic(e.target.value)
              setFieldError("")
            }}
            placeholder="#####-#######-#"
            autoComplete="off"
            disabled={busy}
          />
          {fieldError ? <FieldError>{fieldError}</FieldError> : null}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmAction === "REJECTED"}
        title="Reject registration"
        description={`Reject ${item.full_name}? A reason is required and will be sent to the applicant.`}
        confirmLabel="Reject"
        variant="destructive"
        busy={busy}
        onOpenChange={(open) => {
          if (!open) closeConfirm()
        }}
        onConfirm={handleReview}
      >
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="reject-reason">Rejection reason</FieldLabel>
          <Textarea
            id="reject-reason"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value)
              setFieldError("")
            }}
            placeholder="Explain why this registration is rejected"
            rows={4}
            disabled={busy}
          />
          {fieldError ? <FieldError>{fieldError}</FieldError> : null}
        </Field>
      </ConfirmDialog>
    </div>
  )
}
