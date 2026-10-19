import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isNativeApp } from './lib/native'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LandingPage from './pages/LandingPage'
import SendFlow from './pages/send/SendFlow'
import ConnectionsPage from './pages/ConnectionsPage'
import AddressPage from './pages/AddressPage'
import AdminPage from './pages/AdminPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import GoogleAuthSuccessPage from './pages/GoogleAuthSuccessPage'
import ProfilePage from './pages/ProfilePage'
import InvitePage from './pages/InvitePage'
import CollectAddressPage from './pages/CollectAddressPage'
import ImportantDatesPage from './pages/ImportantDatesPage'
import SecretKeyPage from './pages/SecretKeyPage'
import ExtraCardSuccessPage from './pages/ExtraCardSuccessPage'
import SettingsPage from './pages/SettingsPage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import NotificationPreferencesPage from './pages/NotificationPreferencesPage'
import HandwritingPage from './pages/HandwritingPage'
import WelcomePage from './pages/WelcomePage'
import PickHandlePage from './pages/signup/PickHandlePage'
import SignupAddressPage from './pages/signup/SignupAddressPage'
import SignupBirthdayPage from './pages/signup/SignupBirthdayPage'
import AddDatePage from './pages/AddDatePage'
import ScheduledCardsPage from './pages/ScheduledCardsPage'

// A new screen should always open at the top — without this, React Router
// keeps whatever scroll position the previous screen was left at.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <p className="text-rose-400 text-sm">Loading...</p>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/home" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute>{isNativeApp ? <Navigate to="/welcome" replace /> : <LandingPage />}</PublicRoute>} />
      <Route path="/welcome" element={<PublicRoute><WelcomePage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google/success" element={<GoogleAuthSuccessPage />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/send" element={<ProtectedRoute><SendFlow /></ProtectedRoute>} />
      <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
      <Route path="/dates" element={<ProtectedRoute><ImportantDatesPage /></ProtectedRoute>} />
      <Route path="/secret-key" element={<ProtectedRoute><SecretKeyPage /></ProtectedRoute>} />
      <Route path="/extra-card/success" element={<ExtraCardSuccessPage />} />
      <Route path="/signup/handle" element={<ProtectedRoute><PickHandlePage /></ProtectedRoute>} />
      <Route path="/signup/address" element={<ProtectedRoute><SignupAddressPage /></ProtectedRoute>} />
      <Route path="/signup/birthday" element={<ProtectedRoute><SignupBirthdayPage /></ProtectedRoute>} />
      <Route path="/dates/add" element={<ProtectedRoute><AddDatePage /></ProtectedRoute>} />
      <Route path="/address" element={<ProtectedRoute><AddressPage /></ProtectedRoute>} />
      <Route path="/settings/address" element={<ProtectedRoute><AddressPage /></ProtectedRoute>} />
      <Route path="/settings/scheduled" element={<ProtectedRoute><ScheduledCardsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/invite" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/settings/account" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
      <Route path="/handwriting" element={<ProtectedRoute><HandwritingPage /></ProtectedRoute>} />
      <Route path="/handwriting/:sessionKey" element={<ProtectedRoute><HandwritingPage /></ProtectedRoute>} />
      <Route path="/collect-address/:token" element={<CollectAddressPage />} />
      <Route path="/i/:token" element={<CollectAddressPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
