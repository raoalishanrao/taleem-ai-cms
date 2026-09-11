import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { Value as E164Number } from "react-phone-number-input"
import { CheckCircle2, ImagePlus, Loader2 } from "lucide-react"

import {
  AuthFieldLabel,
  AuthFlowLayout,
} from "@/components/auth-flow-layout"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { YearPicker } from "@/components/ui/year-picker"
import { ApiError } from "@/lib/api"
import {
  EMAIL_PATTERN,
  formatCnicInput,
  MAX_GRADUATION_YEAR,
  MIN_GRADUATION_YEAR,
  validatePhotoFile,
  validateRegistration,
  type RegistrationErrors,
} from "@/lib/registration-validation"
import { authService } from "@/services/auth.service"
import { catalogService } from "@/services/catalog.service"
import {
  registrationService,
  type RegistrationTenant,
} from "@/services/registration.service"
import type { DegreeProgram } from "@/types/portal"
import { isValidPhoneNumber } from "react-phone-number-input"

type StepId = "personal" | "academic" | "identity"

const STEP_ORDER: StepId[] = ["personal", "academic", "identity"]

const REGISTER_STEPS = [
  { id: "personal", label: "Personal Info" },
  { id: "academic", label: "Academic Info" },
  { id: "identity", label: "Identity & Photo" },
]

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.message) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function pickErrors(
  all: RegistrationErrors,
  keys: (keyof RegistrationErrors)[],
): RegistrationErrors {
  const next: RegistrationErrors = {}
  for (const key of keys) {
    if (all[key]) next[key] = all[key]
  }
  return next
}

export function SignupForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState<StepId>("personal")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [referenceId, setReferenceId] = useState("")
  const [apiError, setApiError] = useState("")
  const [errors, setErrors] = useState<RegistrationErrors>({})

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [cnic, setCnic] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [tenants, setTenants] = useState<RegistrationTenant[]>([])
  const [tenantId, setTenantId] = useState("")
  const [tenantsError, setTenantsError] = useState("")
  const [degreePrograms, setDegreePrograms] = useState<DegreeProgram[]>([])
  const [degreeProgramId, setDegreeProgramId] = useState("")
  const [graduationYear, setGraduationYear] = useState("")
  const [phoneNumber, setPhoneNumber] = useState<E164Number | undefined>()
  const [whatsappNumber, setWhatsappNumber] = useState<E164Number | undefined>()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    void catalogService
      .listDegreePrograms()
      .then(setDegreePrograms)
      .catch(() => {})

    void registrationService
      .listTenants()
      .then((rows) => {
        setTenants(rows)
        setTenantsError(
          rows.length === 0
            ? "No institutions are currently open for registration."
            : "",
        )
      })
      .catch(() => {
        setTenants([])
        setTenantsError(
          "Unable to load institutions. Please try again later.",
        )
      })
  }, [])

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const stepIndex = STEP_ORDER.indexOf(step)

  const sidebarSteps = useMemo(
    () =>
      REGISTER_STEPS.map((item, index) => ({
        ...item,
        done: index < stepIndex,
      })),
    [stepIndex],
  )

  function clearFieldError(field: keyof RegistrationErrors) {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function onPhotoChange(file: File | null) {
    setApiError("")
    if (!file) {
      setPhoto(null)
      clearFieldError("photo")
      return
    }
    const photoError = validatePhotoFile(file)
    if (photoError) {
      setPhoto(null)
      setErrors((current) => ({ ...current, photo: photoError }))
      return
    }
    setPhoto(file)
    clearFieldError("photo")
  }

  function values() {
    return {
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      whatsapp_number: whatsappNumber,
      cnic_national_id: cnic,
      degree_program_id: degreeProgramId,
      registration_roll_number: rollNumber,
      graduation_year: graduationYear,
      tenant_id: tenantId,
      photo,
    }
  }

  function validatePersonal(): RegistrationErrors {
    const next: RegistrationErrors = {}
    if (!tenantId.trim()) next.tenant_id = "Please select your institution"

    const name = fullName.trim()
    if (!name) next.full_name = "Full name is required"
    else if (name.length < 2) next.full_name = "Full name must be at least 2 characters"

    const mail = email.trim()
    if (!mail) next.email = "Email is required"
    else if (!EMAIL_PATTERN.test(mail)) next.email = "Enter a valid email address"

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      next.phone_number = "Enter a valid phone number"
    }
    if (whatsappNumber && !isValidPhoneNumber(whatsappNumber)) {
      next.whatsapp_number = "Enter a valid WhatsApp number"
    }
    return next
  }

  function validateAcademic(): RegistrationErrors {
    return pickErrors(validateRegistration(values()), [
      "cnic_national_id",
      "degree_program_id",
      "registration_roll_number",
      "graduation_year",
    ])
  }

  function goNext() {
    setApiError("")
    if (step === "personal") {
      const next = validatePersonal()
      setErrors(next)
      if (Object.keys(next).length > 0) return
      setStep("academic")
      return
    }
    if (step === "academic") {
      const next = validateAcademic()
      setErrors(next)
      if (Object.keys(next).length > 0) return
      setStep("identity")
    }
  }

  function goBack() {
    setApiError("")
    setErrors({})
    if (step === "academic") setStep("personal")
    if (step === "identity") setStep("academic")
  }

  function onStepSelect(stepId: string) {
    const target = stepId as StepId
    const targetIndex = STEP_ORDER.indexOf(target)
    if (targetIndex < 0) return
    // Allow going back freely; forward only through completed validation path
    if (targetIndex <= stepIndex) {
      setStep(target)
      setErrors({})
      setApiError("")
      return
    }
    if (targetIndex === stepIndex + 1) goNext()
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== "identity") {
      goNext()
      return
    }

    setApiError("")
    const nextErrors = validateRegistration(values())
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (
        nextErrors.tenant_id ||
        nextErrors.full_name ||
        nextErrors.email ||
        nextErrors.phone_number
      ) {
        setStep("personal")
      } else if (
        nextErrors.cnic_national_id ||
        nextErrors.degree_program_id ||
        nextErrors.registration_roll_number ||
        nextErrors.graduation_year
      ) {
        setStep("academic")
      } else if (nextErrors.photo) {
        setStep("identity")
      }
      return
    }

    setLoading(true)
    try {
      let mediaId: string | undefined
      try {
        const upload = await authService.uploadPhoto(photo!)
        mediaId = upload.media_id
        if (!mediaId) {
          setErrors({ photo: "Photo upload did not return a media id" })
          return
        }
      } catch (err) {
        setErrors({ photo: errorMessage(err, "Photo upload failed") })
        return
      }

      const result = await authService.register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber || undefined,
        whatsapp_number: whatsappNumber || undefined,
        cnic_national_id: cnic.trim(),
        degree_program_id: degreeProgramId,
        registration_roll_number: rollNumber.trim(),
        graduation_year: graduationYear,
        media_id: mediaId,
        tenant_id: tenantId,
      })

      setReferenceId(
        result.reference_number ||
          result.registration_id ||
          `ALM-${Date.now().toString().slice(-8)}`,
      )
      setSubmitted(true)
      setApiError("")
    } catch (err) {
      setApiError(errorMessage(err, "Registration failed"))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthFlowLayout
        centered
        title="Request Received"
        eyebrow="Registration submitted"
      >
        <div className="text-center">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-[#159570]/30 bg-[#159570]/10">
            <CheckCircle2 className="size-8 text-[#159570]" />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#1e8f97] uppercase">
            Registration submitted
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-primary">
            Request Received
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Your alumni registration is pending verification. You will be
            notified by email once it is reviewed.
          </p>

          <div className="portal-card mt-8 p-5 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Reference number
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-primary">
                  {referenceId}
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                Pending Verification
              </span>
            </div>
            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  Status
                </p>
                <p className="mt-1 text-sm font-medium">Awaiting review</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  Notification
                </p>
                <p className="mt-1 text-sm font-medium">Email</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  Next step
                </p>
                <p className="mt-1 text-sm font-medium">
                  Watch your inbox for an activation link after approval.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-8 h-11 w-full tracking-wide uppercase"
            onClick={() => navigate("/login")}
          >
            Go to login
          </Button>
        </div>
      </AuthFlowLayout>
    )
  }

  const headings = {
    personal: {
      eyebrow: "Personal information",
      title: "Personal Information",
      description:
        "Choose your institution, then enter contact details for verification.",
    },
    academic: {
      eyebrow: "Academic information",
      title: "Academic Record",
      description: "Degree and campus details from your student record.",
    },
    identity: {
      eyebrow: "Identity & photo",
      title: "Identity & Photo",
      description: "Upload a clear photo for your alumni identity card.",
    },
  }[step]

  return (
    <AuthFlowLayout
      eyebrow="Alumni Registration"
      title="Alumni Registration"
      description="Submit your details for university verification. After approval, activate from your email."
      steps={sidebarSteps}
      activeStepId={step}
      onStepSelect={onStepSelect}
    >
      <form onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-2xl">
        <FieldGroup className="gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#1e8f97] uppercase">
              {headings.eyebrow}
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {headings.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {headings.description}
            </p>
          </div>

          {step === "personal" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                data-invalid={!!errors.tenant_id || undefined}
              >
                <AuthFieldLabel htmlFor="tenant_id">Institution</AuthFieldLabel>
                <SearchableSelect
                  id="tenant_id"
                  value={tenantId}
                  onChange={(value) => {
                    setTenantId(value)
                    clearFieldError("tenant_id")
                  }}
                  options={tenants.map((tenant) => ({
                    value: tenant.id,
                    label: tenant.displayName,
                  }))}
                  placeholder={
                    tenantsError
                      ? "Institutions unavailable"
                      : "Select your university"
                  }
                  searchPlaceholder="Search institution…"
                  aria-invalid={!!errors.tenant_id}
                  className="h-11"
                  disabled={tenants.length === 0}
                />
                <FieldError>
                  {errors.tenant_id || tenantsError || null}
                </FieldError>
              </Field>

              <Field
                className="sm:col-span-2"
                data-invalid={!!errors.full_name || undefined}
              >
                <AuthFieldLabel htmlFor="full_name">Full name</AuthFieldLabel>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="e.g. Muhammad Ahmed Khan"
                  value={fullName}
                  maxLength={150}
                  aria-invalid={!!errors.full_name}
                  className="h-11"
                  autoFocus
                  onChange={(event) => {
                    setFullName(event.target.value)
                    clearFieldError("full_name")
                  }}
                />
                <FieldError>{errors.full_name}</FieldError>
              </Field>

              <Field data-invalid={!!errors.email || undefined}>
                <AuthFieldLabel htmlFor="email">Email address</AuthFieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ahmed.khan@email.com"
                  value={email}
                  maxLength={255}
                  aria-invalid={!!errors.email}
                  className="h-11"
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearFieldError("email")
                  }}
                />
                <FieldError>{errors.email}</FieldError>
              </Field>

              <Field data-invalid={!!errors.phone_number || undefined}>
                <AuthFieldLabel htmlFor="phone_number">
                  Mobile / WhatsApp
                </AuthFieldLabel>
                <PhoneInput
                  id="phone_number"
                  international
                  defaultCountry="PK"
                  placeholder="+92 300 0000000"
                  value={phoneNumber ?? whatsappNumber}
                  aria-invalid={!!errors.phone_number}
                  onChange={(value) => {
                    setPhoneNumber(value)
                    setWhatsappNumber(value)
                    clearFieldError("phone_number")
                    clearFieldError("whatsapp_number")
                  }}
                />
                <FieldError>
                  {errors.phone_number || errors.whatsapp_number}
                </FieldError>
              </Field>
            </div>
          ) : null}

          {step === "academic" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                data-invalid={!!errors.cnic_national_id || undefined}
              >
                <AuthFieldLabel htmlFor="cnic_national_id">
                  CNIC / National ID
                </AuthFieldLabel>
                <Input
                  id="cnic_national_id"
                  name="cnic_national_id"
                  placeholder="35202-1234567-1"
                  inputMode="numeric"
                  value={cnic}
                  maxLength={15}
                  aria-invalid={!!errors.cnic_national_id}
                  className="h-11"
                  autoFocus
                  onChange={(event) => {
                    setCnic(formatCnicInput(event.target.value))
                    clearFieldError("cnic_national_id")
                  }}
                />
                <FieldError>{errors.cnic_national_id}</FieldError>
              </Field>

              <Field
                className="sm:col-span-2"
                data-invalid={!!errors.degree_program_id || undefined}
              >
                <AuthFieldLabel htmlFor="degree_program_id">
                  Degree program
                </AuthFieldLabel>
                <SearchableSelect
                  id="degree_program_id"
                  value={degreeProgramId}
                  onChange={(value) => {
                    setDegreeProgramId(value)
                    clearFieldError("degree_program_id")
                  }}
                  options={degreePrograms.map((program) => ({
                    value: program.id,
                    label: program.label,
                  }))}
                  placeholder="Select your program"
                  searchPlaceholder="Search program…"
                  aria-invalid={!!errors.degree_program_id}
                  className="h-11"
                />
                <FieldError>{errors.degree_program_id}</FieldError>
              </Field>

              <Field
                data-invalid={!!errors.registration_roll_number || undefined}
              >
                <AuthFieldLabel htmlFor="registration_roll_number">
                  Registration / Roll number
                </AuthFieldLabel>
                <Input
                  id="registration_roll_number"
                  name="registration_roll_number"
                  value={rollNumber}
                  maxLength={50}
                  aria-invalid={!!errors.registration_roll_number}
                  className="h-11"
                  onChange={(event) => {
                    setRollNumber(event.target.value)
                    clearFieldError("registration_roll_number")
                  }}
                />
                <FieldError>{errors.registration_roll_number}</FieldError>
              </Field>

              <Field data-invalid={!!errors.graduation_year || undefined}>
                <AuthFieldLabel htmlFor="graduation_year">
                  Graduation year
                </AuthFieldLabel>
                <YearPicker
                  id="graduation_year"
                  value={graduationYear}
                  minYear={MIN_GRADUATION_YEAR}
                  maxYear={MAX_GRADUATION_YEAR}
                  placeholder="Select year"
                  aria-invalid={!!errors.graduation_year}
                  className="h-11"
                  onChange={(year) => {
                    setGraduationYear(year)
                    clearFieldError("graduation_year")
                  }}
                />
                <FieldError>{errors.graduation_year}</FieldError>
              </Field>
            </div>
          ) : null}

          {step === "identity" ? (
            <div className="grid gap-4">
              <Field data-invalid={!!errors.photo || undefined}>
                <AuthFieldLabel htmlFor="photo">Profile photo</AuthFieldLabel>
                <input
                  ref={photoInputRef}
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-invalid={!!errors.photo}
                  onChange={(event) =>
                    onPhotoChange(event.target.files?.[0] ?? null)
                  }
                />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-accent/40 bg-muted ring-2 ring-accent/10">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="size-6" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        {photo ? "Change photo" : "Upload photo"}
                      </Button>
                      {photo ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl text-muted-foreground"
                          onClick={() => {
                            onPhotoChange(null)
                            if (photoInputRef.current) {
                              photoInputRef.current.value = ""
                            }
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    {photo ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {photo.name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Required for your Digital Alumni ID. JPG or PNG, max
                        5MB.
                      </p>
                    )}
                  </div>
                </div>
                <FieldError>{errors.photo}</FieldError>
              </Field>
            </div>
          ) : null}

          {apiError ? (
            <p className="text-sm text-destructive" role="alert">
              {apiError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {stepIndex + 1} / {STEP_ORDER.length}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {step !== "personal" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11"
                  onClick={goBack}
                >
                  Previous
                </Button>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-11 min-w-[160px] tracking-wide uppercase"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 normal-case">
                    <Loader2 className="size-4 animate-spin" />
                    {photo && step === "identity"
                      ? "Uploading…"
                      : "Submitting…"}
                  </span>
                ) : step === "identity" ? (
                  "Submit request"
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Login
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthFlowLayout>
  )
}
