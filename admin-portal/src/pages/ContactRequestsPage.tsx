import { useEffect, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronRightIcon, MailIcon } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { PageHero } from "@/components/admin/page-hero"
import { SegmentedTabs } from "@/components/admin/segmented-tabs"
import { TablePagination, parsePageSize } from "@/components/admin/table-pagination"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import {
  contactRequestService,
  type ContactRequest,
  type ContactRequestStatus,
} from "@/services/contact-request.service"

const STATUS_FILTERS: Array<{
  label: string
  value: ContactRequestStatus | ""
}> = [
  { label: "Pending", value: "PENDING_ADMIN" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED_BY_ADMIN" },
  { label: "All", value: "" },
]

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function statusClass(status: ContactRequestStatus) {
  switch (status) {
    case "APPROVED":
      return "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    case "PENDING_ADMIN":
    case "PENDING_ALUMNI":
      return "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "REJECTED_BY_ADMIN":
    case "REJECTED_BY_ALUMNI":
      return "border-transparent bg-destructive/10 text-destructive"
    default:
      return ""
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
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
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ContactRequestsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get("status")
  const statusFilter =
    statusParam === "all"
      ? ""
      : statusParam === "PENDING_ADMIN" ||
          statusParam === "APPROVED" ||
          statusParam === "REJECTED_BY_ADMIN"
        ? statusParam
        : "PENDING_ADMIN"
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1)
  const pageSize = parsePageSize(searchParams.get("pageSize"))

  const [items, setItems] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    if (!token) return
    setLoading(true)
    setError("")
    try {
      const requests = await contactRequestService.list(token, statusFilter)
      setItems(requests)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load contact requests",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter])

  function setStatus(next: ContactRequestStatus | "") {
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

  function partyName(
    item: ContactRequest,
    party: "requester" | "target",
  ) {
    const name =
      party === "requester"
        ? item.requester_alumni_name
        : item.target_alumni_name
    const id =
      party === "requester" ? item.requester_alumni_id : item.target_alumni_id
    return name?.trim() || id.slice(0, 8)
  }

  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)

  function openRequest(item: ContactRequest) {
    navigate(`/contact-requests/${item.id}`, {
      state: withNavTrail(location, { request: item }),
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <PageHero
          eyebrow="Alumni introductions"
          title="Contact requests"
          description="Review alumni contact requests."
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
                    key={item.id}
                    type="button"
                    className="portal-card w-full p-4 text-left"
                    onClick={() => openRequest(item)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                        <MailIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 font-medium leading-snug">
                            {item.request_reason}
                          </p>
                          <Badge
                            className={cn(
                              "shrink-0 font-normal",
                              statusClass(item.status),
                            )}
                          >
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {partyName(item, "requester")} →{" "}
                          {partyName(item, "target")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="portal-card px-4 py-10 text-center text-sm text-muted-foreground">
                  No contact requests found.
                </div>
              )}
            </div>

            <div className="portal-table hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Request
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
                    From → To
                  </TableHead>
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Submitted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => openRequest(item)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
                          <MailIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 font-medium">
                            {item.request_reason}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                            {partyName(item, "requester")} →{" "}
                            {partyName(item, "target")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 md:table-cell">
                      <div className="text-sm">
                        <span className="font-medium">
                          {partyName(item, "requester")}
                        </span>
                        <span className="mx-1.5 text-muted-foreground">
                          →
                        </span>
                        <span className="font-medium">
                          {partyName(item, "target")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={cn(
                          "font-normal",
                          statusClass(item.status),
                        )}
                      >
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {formatDate(item.created_at)}
                    </TableCell>
                  </TableRow>
                ))}

                {!items.length ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="h-28 px-4 text-center text-muted-foreground"
                    >
                      No contact requests found.
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
