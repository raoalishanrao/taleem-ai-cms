import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronRightIcon } from "lucide-react"

import { useAuth } from "@/auth/AuthContext"
import { PageHero } from "@/components/admin/page-hero"
import { SearchableSelect } from "@/components/admin/searchable-select"
import { TablePagination, parsePageSize } from "@/components/admin/table-pagination"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { ApiError } from "@/lib/api"
import { withNavTrail } from "@/lib/nav-trail"
import { COUNTRIES, cityOptions, isPakistan } from "@/lib/locations"
import {
  alumniService,
  type AdminAlumniListItem,
} from "@/services/alumni.service"
import {
  catalogService,
  type CatalogDegreeProgram,
} from "@/services/catalog.service"

const GRADUATION_YEARS = Array.from({ length: 40 }, (_, index) => {
  const year = new Date().getFullYear() + 1 - index
  return String(year)
})

function yearOptions(current?: string) {
  const years = [...GRADUATION_YEARS]
  const trimmed = current?.trim()
  if (trimmed && !years.includes(trimmed)) years.unshift(trimmed)
  return years.map((year) => ({ value: year, label: year }))
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function programLabel(item: AdminAlumniListItem) {
  if (!item.degree_program) return "—"
  const campus = item.degree_program.campus
    ? ` — ${item.degree_program.campus}`
    : ""
  return `${item.degree_program.degree} ${item.degree_program.program}${campus}`
}

function locationLabel(item: AdminAlumniListItem) {
  return [item.city, item.country].filter(Boolean).join(", ") || "—"
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
            <Skeleton className="hidden h-5 w-24 md:block" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AlumniDirectoryPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get("search") ?? ""
  const graduationYear = searchParams.get("graduation_year") ?? ""
  const degreeProgramId = searchParams.get("degree_program_id") ?? ""
  const country = searchParams.get("country") ?? ""
  const city = isPakistan(country) ? (searchParams.get("city") ?? "") : ""
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1)
  const pageSize = parsePageSize(searchParams.get("pageSize"))

  const [searchInput, setSearchInput] = useState(search)
  const [yearInput, setYearInput] = useState(graduationYear)
  const [degreeProgramInput, setDegreeProgramInput] = useState(degreeProgramId)
  const [cityInput, setCityInput] = useState(city)
  const [countryInput, setCountryInput] = useState(country)

  const [degreePrograms, setDegreePrograms] = useState<CatalogDegreeProgram[]>(
    [],
  )
  const [items, setItems] = useState<AdminAlumniListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setSearchInput(search)
    setYearInput(graduationYear)
    setDegreeProgramInput(degreeProgramId)
    setCityInput(city)
    setCountryInput(country)
  }, [search, graduationYear, degreeProgramId, city, country])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const programs = await catalogService.listDegreePrograms()
        if (!cancelled) setDegreePrograms(programs)
      } catch {
        if (!cancelled) setDegreePrograms([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    void (async () => {
      setLoading(true)
      setError("")
      try {
        const result = await alumniService.list(token, {
          search,
          graduation_year: graduationYear,
          degree_program_id: degreeProgramId,
          city,
          country,
          page,
          page_size: pageSize,
        })
        if (!cancelled) {
          setItems(result.items)
          setTotal(result.total)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load alumni directory",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    token,
    search,
    graduationYear,
    degreeProgramId,
    city,
    country,
    page,
    pageSize,
  ])

  function applyFilters(event: React.FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (searchInput.trim()) next.set("search", searchInput.trim())
    if (yearInput.trim()) next.set("graduation_year", yearInput.trim())
    if (degreeProgramInput) next.set("degree_program_id", degreeProgramInput)
    if (countryInput.trim()) next.set("country", countryInput.trim())
    if (isPakistan(countryInput) && cityInput.trim()) {
      next.set("city", cityInput.trim())
    }
    next.set("page", "1")
    if (pageSize !== 10) next.set("pageSize", String(pageSize))
    setSearchParams(next)
  }

  function clearFilters() {
    setSearchInput("")
    setYearInput("")
    setDegreeProgramInput("")
    setCityInput("")
    setCountryInput("")
    setSearchParams({})
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    next.set("page", String(nextPage))
    setSearchParams(next)
  }

  function changePageSize(nextSize: number) {
    const next = new URLSearchParams(searchParams)
    if (nextSize === 10) next.delete("pageSize")
    else next.set("pageSize", String(nextSize))
    next.set("page", "1")
    setSearchParams(next)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <PageHero
          eyebrow="Alumni network"
          title="Alumni directory"
          description="Search and browse active alumni."
        />
      </div>

      <form
        onSubmit={applyFilters}
        className="portal-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Name"
        />
        <SearchableSelect
          placeholder="All graduation years"
          searchPlaceholder="Search years…"
          value={yearInput}
          onChange={setYearInput}
          emptyText="No years found"
          options={yearOptions(yearInput)}
        />
        <SearchableSelect
          placeholder="All degree programs"
          searchPlaceholder="Search degree programs…"
          value={degreeProgramInput}
          onChange={setDegreeProgramInput}
          emptyText="No degree programs found"
          options={degreePrograms.map((program) => ({
            value: program.id,
            label: program.label,
          }))}
        />
        <SearchableSelect
          placeholder="All countries"
          searchPlaceholder="Search countries…"
          value={countryInput}
          onChange={(next) => {
            setCountryInput(next)
            if (!isPakistan(next)) setCityInput("")
          }}
          emptyText="No countries found"
          options={COUNTRIES.map((item) => ({
            value: item,
            label: item,
          }))}
        />
        <SearchableSelect
          placeholder={isPakistan(countryInput) ? "All cities" : "No cities"}
          searchPlaceholder="Search cities…"
          value={isPakistan(countryInput) ? cityInput : ""}
          onChange={setCityInput}
          emptyText="No cities"
          options={
            isPakistan(countryInput)
              ? cityOptions(cityInput).map((item) => ({
                  value: item,
                  label: item,
                }))
              : []
          }
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <Button type="submit" className="flex-1">
            Filter
          </Button>
        </div>
      </form>

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
                  <button
                    key={item.alumni_id}
                    type="button"
                    className="portal-card w-full p-4 text-left"
                    onClick={() =>
                      navigate(`/alumni/${item.alumni_id}`, {
                        state: withNavTrail(location, { alumni: item }),
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
                        <p className="font-medium leading-snug">
                          {item.full_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.email}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {programLabel(item)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[locationLabel(item), item.graduation_year]
                            .filter((value) => value && value !== "—")
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="portal-card px-4 py-10 text-center text-sm text-muted-foreground">
                  No alumni found.
                </div>
              )}
            </div>

            <div className="portal-table hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                    Alumni
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
                    Program
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground lg:table-cell">
                    Location
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Year
                  </TableHead>
                  <TableHead className="hidden h-11 bg-muted/40 px-4 text-xs uppercase tracking-wide text-muted-foreground xl:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="h-11 w-12 bg-muted/40 px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.alumni_id}
                    className="group cursor-pointer"
                    onClick={() =>
                      navigate(`/alumni/${item.alumni_id}`, {
                        state: withNavTrail(location, { alumni: item }),
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
                    <TableCell className="hidden max-w-[16rem] px-4 py-3 md:table-cell">
                      <span className="line-clamp-2 whitespace-normal text-sm text-muted-foreground">
                        {programLabel(item)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                      {locationLabel(item)}
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                      {item.graduation_year ?? "—"}
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground xl:table-cell">
                      {item.professional?.job_title ||
                        item.professional?.role ||
                        "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                        render={
                          <Link
                            to={`/alumni/${item.alumni_id}`}
                            state={withNavTrail(location, { alumni: item })}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <ChevronRightIcon />
                        <span className="sr-only">View {item.full_name}</span>
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
                      No alumni found.
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
    </div>
  )
}
