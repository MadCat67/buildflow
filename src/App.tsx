import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import CompanyFinancesPage from './pages/CompanyFinancesPage'
import MembershipPage from './pages/MembershipPage'
import AutoMessagesPage from './pages/AutoMessagesPage'
import CalendarPage from './pages/CalendarPage'
import PaymentRemindersPage from './pages/PaymentRemindersPage'
import SubPortalPage from './pages/SubPortalPage'
import SubPortalPublicPage from './pages/SubPortalPublicPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/portal/sub/:token" element={<SubPortalPublicPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/company"
            element={
              <ProtectedRoute>
                <CompanyFinancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reminders"
            element={
              <ProtectedRoute>
                <PaymentRemindersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subs"
            element={
              <ProtectedRoute>
                <SubPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages"
            element={
              <ProtectedRoute>
                <AutoMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/membership"
            element={
              <ProtectedRoute>
                <MembershipPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
