import { useEffect, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import {
  BriefcaseIcon,
  CheckIcon,
  GraduationCapIcon,
  UserIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { BackButton } from "@/components/admin/back-button"
import {
  DetailEmpty,
  DetailField,
  DetailFieldGrid,
  DetailRecordCard,
} from "@/components/admin/detail-fields"
import { PageHero } from "@/components/admin/page-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import { degreeProgramLabel } from "@/lib/registration-utils"
import { type NavTrailItem } from "@/lib/nav-trail"
import { cn } from "@/lib/utils"
import {
  alumniService,
  type AdminAlumniListItem,
  type DirectoryAlumniProfile,
  type DirectoryProfessional,
} from "@/services/alumni.service"

type LocationState = {
  alumni?: AdminAlumniListItem
  fromTrail?: NavTrailItem[]
}

const STEPS = [
  {
    id: "personal",
    title: "Personal & Contact",
    heading: "Personal Details",
    description: "Contact and identity details for this alumni.",
    icon: UserRoundIcon,
  },
  {
    id: "educational",
    title: "Academic",
    heading: "Academic Records",
    description: "Degree and academic records.",
    icon: GraduationCapIcon,
  },
  {
    id: "professional",
    title: "Professional",
    heading: "Professional Details",
    description: "Work history and career details.",
    icon: BriefcaseIcon,
  },
] as const satisfies ReadonlyArray<{
  id: string
  title: string
  heading: string
  description: string
  icon: LucideIcon
}>

function DetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Skeleton className="mb-4 h-8 w-24" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-[28rem] w-full rounded-[var(--radius)]" />
        <Skeleton className="h-[28rem] w-full rounded-[var(--radius)]" />
      </div>
    </div>
  )
}

function programFromList(item: AdminAlumniListItem | null) {
  if (!item?.degree_program) {
    return item?.degree_program_id
      ? degreeProgramLabel(item.degree_program_id)
      : "—"
  }
  const campus = item.degree_program.campus
    ? ` — ${item.degree_program.campus}`
    : ""
  return `${item.degree_program.degree} ${item.degree_program.program}${campus}`
}

export default function AlumniDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const location = useLocation()
  const navState = (location.state as LocationState | null) ?? null
  const stateAlumni = navState?.alumni ?? null

  const listItem =
    stateAlumni && stateAlumni.alumni_id === id ? stateAlumni : null
  const [profile, setProfile] = useState<DirectoryAlumniProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!token || !id) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")

      try {
        const directoryProfile = await alumniService.getDirectoryProfile(
          token,
          id,
        )
        if (!cancelled) setProfile(directoryProfile)
      } catch (err) {
        if (!cancelled) {
          setProfile(null)
          setError(
            err instanceof ApiError ? err.message : "Failed to load alumni",
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

  if (loading) return <DetailSkeleton />

  const name = profile?.full_name ?? listItem?.full_name
  const email = profile?.email ?? listItem?.email
  const photoUrl = profile?.photo_url ?? listItem?.photo_url ?? null

  if (!name) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <BackButton fallback="/alumni" />
        <p className="text-sm text-destructive">
          {error || "Alumni not found"}
        </p>
      </div>
    )
  }

  const phone = profile?.phone_number ?? listItem?.phone_number
  const whatsapp = profile?.whatsapp_number ?? listItem?.whatsapp_number
  const city = profile?.city ?? listItem?.city
  const country = profile?.country ?? listItem?.country
  const locationLabel = [city, country].filter(Boolean).join(", ")
  const address = profile?.address
  const secondaryAddress = profile?.secondry_address
  const linkedinUrl = profile?.linkedin_url
  const graduationYear =
    profile?.primary_graduation_year ??
    profile?.academic?.[0]?.graduation_year ??
    listItem?.graduation_year

  const professionalItems: DirectoryProfessional[] =
    profile?.professional?.length
      ? profile.professional
      : listItem?.professional
        ? [listItem.professional]
        : []

  const academicItems = profile?.academic ?? []
  const step = STEPS[stepIndex]
  const StepIcon = step.icon
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const rollNumber = listItem?.registration_roll_number

  const sectionHasData = {
    personal: Boolean(email || phone || address),
    educational: academicItems.length > 0 || Boolean(listItem?.degree_program_id),
    professional: professionalItems.length > 0,
  }

  const fallbackProgram = programFromList(listItem)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackButton fallback="/alumni" />
        <PageHero
          eyebrow="Alumni network"
          title={name}
          description={[
            rollNumber ? `Roll ${rollNumber}` : null,
            email,
            locationLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <aside className="portal-card flex h-full flex-col gap-6 p-6">
          <div className="flex flex-col items-center text-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="size-28 rounded-full border-4 border-accent object-cover shadow-sm ring-4 ring-accent/15"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-full border-4 border-accent bg-muted text-muted-foreground shadow-sm ring-4 ring-accent/15">
                <UserIcon className="size-10" />
              </div>
            )}
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
              {name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {rollNumber ? `Roll ${rollNumber}` : email}
            </p>
            <Badge
              variant="outline"
              className="mt-3 border-accent/30 bg-accent/10 font-medium text-accent dark:border-accent/40 dark:bg-accent/15 dark:text-accent"
            >
              Alumni
            </Badge>
          </div>

          <nav className="space-y-1.5" aria-label="Profile sections">
            {STEPS.map((item, index) => {
              const active = index === stepIndex
              const Icon = item.icon
              const done = sectionHasData[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary font-medium text-primary-foreground shadow-[0_8px_18px_rgba(8,27,69,0.18)]"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-white/15" : "bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {done ? (
                    <CheckIcon className="size-4 shrink-0 text-accent" />
                  ) : null}
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="portal-card flex min-h-[28rem] flex-col p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <StepIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {stepIndex + 1} of {STEPS.length}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {step.heading}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>

          <div className="mt-8 flex-1">
            {step.id === "personal" ? (
              <DetailFieldGrid>
                <DetailField
                  label="Full name"
                  value={name}
                  className="sm:col-span-2"
                />
                <DetailField label="Email address" value={email} />
                <DetailField
                  label="Mobile / WhatsApp"
                  value={whatsapp || phone}
                />
                <DetailField label="Phone" value={phone} />
                <DetailField label="Location" value={locationLabel} />
                <DetailField
                  label="LinkedIn"
                  value={
                    linkedinUrl ? (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {linkedinUrl}
                      </a>
                    ) : null
                  }
                  className="sm:col-span-2"
                />
                <DetailField label="Address" value={address} />
                <DetailField
                  label="Secondary address"
                  value={secondaryAddress}
                />
              </DetailFieldGrid>
            ) : null}

            {step.id === "educational" ? (
              academicItems.length > 0 ? (
                <div className="grid gap-4">
                  {academicItems.map((item, index) => {
                    const program =
                      item.degree_program_id === listItem?.degree_program_id
                        ? fallbackProgram
                        : degreeProgramLabel(item.degree_program_id)
                    return (
                      <DetailRecordCard
                        key={`${item.degree_program_id}-${index}`}
                        icon={<GraduationCapIcon className="size-4" />}
                        title={program}
                        subtitle={
                          item.graduation_year
                            ? `Class of ${item.graduation_year}`
                            : undefined
                        }
                      >
                        <DetailFieldGrid>
                          <DetailField
                            label="Degree program"
                            value={program}
                            className="sm:col-span-2"
                          />
                          <DetailField
                            label="Graduation year"
                            value={item.graduation_year}
                          />
                          {index === 0 ? (
                            <>
                              <DetailField
                                label="Roll number"
                                value={listItem?.registration_roll_number}
                              />
                              <DetailField
                                label="Department"
                                value={listItem?.degree_program?.department}
                                className="sm:col-span-2"
                              />
                            </>
                          ) : null}
                        </DetailFieldGrid>
                      </DetailRecordCard>
                    )
                  })}
                </div>
              ) : sectionHasData.educational ? (
                <DetailRecordCard
                  icon={<GraduationCapIcon className="size-4" />}
                  title={fallbackProgram}
                  subtitle={
                    graduationYear ? `Class of ${graduationYear}` : undefined
                  }
                >
                  <DetailFieldGrid>
                    <DetailField
                      label="Degree program"
                      value={fallbackProgram}
                      className="sm:col-span-2"
                    />
                    <DetailField
                      label="Graduation year"
                      value={graduationYear}
                    />
                    <DetailField
                      label="Roll number"
                      value={listItem?.registration_roll_number}
                    />
                    <DetailField
                      label="Department"
                      value={listItem?.degree_program?.department}
                      className="sm:col-span-2"
                    />
                  </DetailFieldGrid>
                </DetailRecordCard>
              ) : (
                <DetailEmpty icon={<GraduationCapIcon className="size-5" />}>
                  No academic details available.
                </DetailEmpty>
              )
            ) : null}

            {step.id === "professional" ? (
              professionalItems.length > 0 ? (
                <div className="grid gap-4">
                  {professionalItems.map((item, index) => (
                    <DetailRecordCard
                      key={`${item.job_title ?? "role"}-${index}`}
                      icon={<BriefcaseIcon className="size-4" />}
                      title={item.job_title || item.role || "Role"}
                      subtitle={item.current_company || undefined}
                    >
                      <DetailFieldGrid>
                        <DetailField
                          label="Company"
                          value={item.current_company}
                        />
                        <DetailField label="Job title" value={item.job_title} />
                        <DetailField
                          label="Role"
                          value={item.role}
                          className="sm:col-span-2"
                        />
                      </DetailFieldGrid>
                    </DetailRecordCard>
                  ))}
                </div>
              ) : (
                <DetailEmpty icon={<BriefcaseIcon className="size-5" />}>
                  No professional details available.
                </DetailEmpty>
              )
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-2 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isFirst}
              onClick={() => setStepIndex((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              disabled={isLast}
              onClick={() => setStepIndex((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
