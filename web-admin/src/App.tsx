import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminLayout from './components/layout/AdminLayout'
import OverviewPage from './pages/OverviewPage'
import UsersPage from './pages/UsersPage'
import UsageLimitsPage from './pages/UsageLimitsPage'
import SessionsPage from './pages/SessionsPage'
import FeedbacksPage from './pages/FeedbacksPage'

function App() {
  const isAuthenticated = !!localStorage.getItem('admin_token')

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AdminLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="limits" element={<UsageLimitsPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="feedbacks" element={<FeedbacksPage />} />
      </Route>
    </Routes>
  )
}

export default App


