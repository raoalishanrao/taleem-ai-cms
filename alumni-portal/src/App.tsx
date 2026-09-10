import { Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "./auth/AuthContext"
import { RequireAuth } from "./auth/RequireAuth"
import { Toaster } from "./components/ui/sonner"
import { AuthenticatedLayout } from "./layouts/AuthenticatedLayout"
import { HomePage } from "./pages/AlumniPages"
import ActivatePage from "./pages/ActivatePage"
import { AlumniCardPage } from "./pages/AlumniCardPage"
import {
  AnnouncementDetailPage,
  AnnouncementsPage,
} from "./pages/AnnouncementsPage"
import { DashboardPage } from "./pages/DashboardPage"
import { ContactRequestsPage } from "./pages/ContactRequestsPage"
import { DirectoryDetailPage } from "./pages/DirectoryDetailPage"
import { DirectoryPage } from "./pages/DirectoryPage"
import { NotificationsPage } from "./pages/NotificationsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { EventDetailPage, EventsPage } from "./pages/EventsPage"
import GatekeeperVerifyPage from "./pages/GatekeeperVerifyPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import LoginPage from "./pages/LoginPage"
import OAuthCallbackPage from "./pages/OAuthCallbackPage"
import { ProfilePage } from "./pages/ProfilePage"
import RegisterPage from "./pages/RegisterPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import { ThemeProvider } from "./theme/ThemeProvider"

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="callback" element={<OAuthCallbackPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="activate" element={<ActivatePage />} />
          <Route
            path="alumni/verify/:alumniId"
            element={<GatekeeperVerifyPage />}
          />

          <Route element={<RequireAuth />}>
            <Route element={<AuthenticatedLayout />}>
              <Route path="home" element={<DashboardPage />} />
              <Route
                path="dashboard"
                element={<Navigate to="/home" replace />}
              />
              <Route path="card" element={<AlumniCardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="contact-requests"
                element={<ContactRequestsPage />}
              />
              <Route path="directory" element={<DirectoryPage />} />
              <Route
                path="directory/:alumniId"
                element={<DirectoryDetailPage />}
              />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/:eventId" element={<EventDetailPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route
                path="announcements/:announcementId"
                element={<AnnouncementDetailPage />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  )
}
