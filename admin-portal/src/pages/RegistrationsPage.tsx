import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronRightIcon } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { PageHero } from "@/components/admin/page-hero"
import { SegmentedTabs } from "@/components/admin/segmented-tabs"
import { TablePagination, parsePageSize } from "@/components/admin/table-pagination"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { withNavTrail } from "@/lib/nav-trail"
import {
  degreeProgramLabel,
  registrationStatusVariant,
} from "@/lib/registration-utils"
import { cn } from "@/lib/utils"
import {
  registrationService,
  type RegistrationListItem,
  type RegistrationStatus,
} from "@/services/registration.service"

const STATUS_FILTERS: Array<{ label: string; value: RegistrationStatus | "" }> =
  [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "All", value: "" },
  ]

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
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
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="hidden h-5 w-20 sm:block" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegistrationsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get("status")
  const statusFilter =
    statusParam === "all"
      ? ""
      : statusParam === "PENDING" ||
          statusParam === "APPROVED" ||
          statusParam === "REJECTED"
        ? statusParam
        : "PENDING"
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1)
  const pageSize = parsePageSize(searchParams.get("pageSize"))

  const [items, setItems] = useState<RegistrationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const result = await registrationService.list(token, statusFilter)
        if (!cancelled) setItems(result)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load registrations",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, statusFilter])

  function setStatus(next: RegistrationStatus | "") {
    const params = new URLSearchParams(searchParams)
    if (!next) params.set("status", "all")
    else params.set("status", next)
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

  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <PageHero
          eyebrow="Membership review"
          title="Registrations"
          description="Review and decide on alumni applications."
        />
      </div>

      <div>
        <SegmentedTabs
          items={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatus}
        />
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
              {pagedItems.length ? (
                pagedItems.map((item) => (
                  <button
                    key={item.registration_id}
                    type="button"
                    className="portal-card w-full p-4 text-left"
                    onClick={() =>
                      navigate(`/registrations/${item.registration_id}`, {
                        state: withNavTrail(location),
                      })
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11">
                        {item.photo_url ? (
                          <AvatarImage
                            src={item.photo_url}
                            alt={item.full_name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-muted text-xs font-medium">
                          {initialsFromName(item.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">
                            {item.full_name}
                          </p>
                          <Badge
                            variant={registrationStatusVariant(item.status)}
                            className={cn(
                              "shrink-0 font-normal",
                              item.status === "PENDING" &&
                                "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
                              item.status === "APPROVED" &&
                                "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.email}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {degreeProgramLabel(item.degree_program_id)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.registration_roll_number} · {item.graduation_year}
                          {" · "}
                          {formatSubmittedDate(item.submitted_at)}
                        </p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="portal-card px-4 py-10 text-center text-sm text-muted-foreground">
                  No registrations found.
                </div>
              )}
            </div>

            <div className="portal-table hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Applicant
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
                    Program
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground lg:table-cell">
                    Roll number
                  </TableHead>
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Submitted
                  </TableHead>
                  <TableHead className="h-11 w-12 bg-muted/40 px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedItems.map((item) => (
                  <TableRow
                    key={item.registration_id}
                    className="group cursor-pointer"
                    onClick={() =>
                      navigate(`/registrations/${item.registration_id}`, {
                        state: withNavTrail(location),
                      })
                    }
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9">
                          {item.photo_url ? (
                            <AvatarImage
                              src={item.photo_url}
                              alt={item.full_name}
                            />
                          ) : null}
                          <AvatarFallback className="bg-muted text-xs font-medium">
                            {initialsFromName(item.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {item.full_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {item.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[14rem] px-4 py-3 md:table-cell">
                      <span className="line-clamp-2 whitespace-normal text-sm text-muted-foreground">
                        {degreeProgramLabel(item.degree_program_id)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 tabular-nums text-muted-foreground lg:table-cell">
                      {item.registration_roll_number}
                      <span className="mx-1.5 text-border">·</span>
                      {item.graduation_year}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant={registrationStatusVariant(item.status)}
                        className={cn(
                          "font-normal",
                          item.status === "PENDING" &&
                            "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
                          item.status === "APPROVED" &&
                            "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {formatSubmittedDate(item.submitted_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                        render={
                          <Link
                            to={`/registrations/${item.registration_id}`}
                            state={withNavTrail(location)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <ChevronRightIcon />
                        <span className="sr-only">
                          {item.status === "PENDING" ? "Review" : "View"}{" "}
                          {item.full_name}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!items.length ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="h-28 px-4 text-center text-muted-foreground"
                    >
                      No registrations found.
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
            total={items.length}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        ) : null}
      </div>
    </div>
  )
}
