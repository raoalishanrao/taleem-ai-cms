import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AdminShell } from './components/layout/admin-shell'
import { Toaster } from './components/ui/sonner'
import AlumniDetailPage from './pages/AlumniDetailPage'
import AlumniDirectoryPage from './pages/AlumniDirectoryPage'
import AnnouncementDetailPage from './pages/AnnouncementDetailPage'
import AnnouncementFormPage from './pages/AnnouncementFormPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ContactRequestDetailPage from './pages/ContactRequestDetailPage'
import ContactRequestsPage from './pages/ContactRequestsPage'
import DashboardPage from './pages/DashboardPage'
import EventDetailPage from './pages/EventDetailPage'
import EventFormPage from './pages/EventFormPage'
import EventsPage from './pages/EventsPage'
import LoginPage from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import RegistrationDetailPage from './pages/RegistrationDetailPage'
import RegistrationsPage from './pages/RegistrationsPage'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<OAuthCallbackPage />} />
          <Route element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route
              path="registrations/:id"
              element={<RegistrationDetailPage />}
            />
            <Route path="alumni" element={<AlumniDirectoryPage />} />
            <Route path="alumni/:id" element={<AlumniDetailPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="announcements/new" element={<AnnouncementFormPage />} />
            <Route
              path="announcements/:id/edit"
              element={<AnnouncementFormPage />}
            />
            <Route
              path="announcements/:id"
              element={<AnnouncementDetailPage />}
            />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/new" element={<EventFormPage />} />
            <Route path="events/:id/edit" element={<EventFormPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="contact-requests" element={<ContactRequestsPage />} />
            <Route
              path="contact-requests/:id"
              element={<ContactRequestDetailPage />}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
