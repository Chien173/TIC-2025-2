import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/Auth/LoginForm'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { WordPressPostAudit } from './components/WordPressPostAudit/WordPressPostAudit'
// edit
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

const AppRoutes: React.FC = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" /> : <LoginForm />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wordpress-audit"
        element={
          <ProtectedRoute>
            <Layout>
              <WordPressPostAudit />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="font-sans">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App