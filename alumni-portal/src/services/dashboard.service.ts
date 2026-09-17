import { announcementsService } from "@/services/announcements.service"
import { catalogService } from "@/services/catalog.service"
import { contactRequestService } from "@/services/contact-requests.service"
import { directoryService } from "@/services/directory.service"
import { eventsService } from "@/services/events.service"
import { profileService } from "@/services/profile.service"
import type {
  AnnouncementItem,
  DirectoryAlumni,
  EventItem,
} from "@/types/portal"

export type FeedAlumni = DirectoryAlumni & {
  degree_label: string | null
  graduation_year: string | null
  job_title: string | null
  headline: string
  contact_request_pending: boolean
}

export type FeedEventItem = {
  type: "event"
  id: string
  sort_at: string
  event: EventItem
}

export type FeedAnnouncementItem = {
  type: "announcement"
  id: string
  sort_at: string
  announcement: AnnouncementItem
}

export type FeedAlumniItem = {
  type: "alumni"
  id: string
  sort_at: string
  alumni: FeedAlumni
}

export type FeedItem = FeedEventItem | FeedAnnouncementItem | FeedAlumniItem

export type AlumniFeed = {
  full_name: string
  photo_url: string | null
  alumni_id: string
  feed: FeedItem[]
  my_events: EventItem[]
  shortcuts: {
    contact_requests_total: number
    contact_requests_pending: number
    upcoming_events: number
    announcements: number
  }
}

function eventSortKey(event: EventItem) {
  return `${event.event_date}T${event.start_time || "00:00:00"}`
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

const EMPTY_PAGE = {
  items: [] as never[],
  total: 0,
  page: 1,
  page_size: 20,
}

function alumniHeadline(
  alumni: DirectoryAlumni,
  degreeLabels: Map<string, string>,
) {
  const academic = alumni.academic[0]
  const professional = alumni.professional[0]
  const degree =
    (academic
      ? degreeLabels.get(academic.degree_program_id)?.split(" — ")[0]
      : null) ?? null
  const year =
    alumni.primary_graduation_year ?? academic?.graduation_year ?? null
  const role =
    professional?.job_title ??
    professional?.role ??
    alumni.primary_role ??
    null
  const company = professional?.current_company

  if (role && company) return `${role} at ${company}`
  if (role) return role
  if (degree && year) return `${degree} · Class of ${year}`
  if (degree) return degree
  return "Alumni"
}

/**
 * Home feed from existing APIs:
 * GET /me/profile, /directory, /events, /announcements, /contact-requests/sent
 */
export const dashboardService = {
  async getFeed(): Promise<AlumniFeed> {
    const [
      profile,
      directory,
      events,
      announcements,
      degreeLabels,
      sentRequests,
    ] = await Promise.all([
      profileService.getMyProfile(),
      directoryService.list({ page: 1, page_size: 12 }).catch(() => ({
        ...EMPTY_PAGE,
        items: [] as DirectoryAlumni[],
      })),
      eventsService
        .list({ scope: "upcoming", page: 1, page_size: 20 })
        .catch(() => ({
          ...EMPTY_PAGE,
          items: [] as EventItem[],
        })),
      announcementsService.list({ page: 1, page_size: 12 }).catch(() => ({
        ...EMPTY_PAGE,
        items: [] as AnnouncementItem[],
      })),
      catalogService.getDegreeProgramMap().catch(() => new Map<string, string>()),
      contactRequestService.listSent().catch(() => []),
    ])

    const pendingTargets = new Set(
      sentRequests
        .filter((r) =>
          ["PENDING_ADMIN", "APPROVED", "PENDING"].includes(
            r.status,
          ),
        )
        .map((r) => r.target_alumni_id),
    )

    const alumniItems: FeedAlumniItem[] = directory.items
      .filter((item) => item.alumni_id !== profile.alumni_id)
      .map((alumni) => {
        const academic = alumni.academic[0]
        const professional = alumni.professional[0]
        const degree_label =
          (academic
            ? degreeLabels.get(academic.degree_program_id)?.split(" — ")[0]
            : null) ?? null
        const graduation_year =
          alumni.primary_graduation_year ?? academic?.graduation_year ?? null
        const job_title =
          professional?.job_title ??
          professional?.role ??
          alumni.primary_role ??
          null

        return {
          type: "alumni" as const,
          id: `alumni-${alumni.alumni_id}`,
          sort_at: "",
          alumni: {
            ...alumni,
            degree_label,
            graduation_year,
            job_title,
            headline: alumniHeadline(alumni, degreeLabels),
            contact_request_pending:
              alumni.is_contact_revealed ||
              pendingTargets.has(alumni.alumni_id),
          },
        }
      })

    const activity: FeedItem[] = [
      ...events.items.map(
        (event): FeedEventItem => ({
          type: "event",
          id: `event-${event.id}`,
          sort_at: eventSortKey(event),
          event,
        }),
      ),
      ...announcements.items.map(
        (announcement): FeedAnnouncementItem => ({
          type: "announcement",
          id: `announcement-${announcement.id}`,
          sort_at: announcement.published_at ?? "1970-01-01T00:00:00",
          announcement,
        }),
      ),
      ...alumniItems,
    ]

    const feed = shuffle(activity)

    const my_events = events.items.filter((event) =>
      Boolean(event.my_rsvp_status),
    )

    const pendingContactStatuses = new Set([
      "PENDING_ADMIN",
      "PENDING",
    ])

    return {
      full_name: profile.full_name,
      photo_url: profile.photo_url,
      alumni_id: profile.alumni_id,
      feed,
      my_events,
      shortcuts: {
        contact_requests_total: sentRequests.length,
        contact_requests_pending: sentRequests.filter((r) =>
          pendingContactStatuses.has(r.status),
        ).length,
        upcoming_events: events.total,
        announcements: announcements.total,
      },
    }
  },
}
