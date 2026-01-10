import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, getAuthToken, isAuthenticated, refreshToken, initializeFirebase } from '../services/auth'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase()
        setInitialized(true)

        // Check if user is already logged in
        if (isAuthenticated()) {
          const currentUser = getCurrentUser()
          setUser(currentUser)

          // Refresh token (only if not in dev mode)
          await refreshToken()
        } else {
          // In dev mode, auto-login with a dev user
          try {
            const authModule = await import('../services/auth')
            if (authModule.isDevMode && authModule.isDevMode()) {
              const devUser = {
                uid: 'dev-user',
                email: 'dev@localhost',
              }
              localStorage.setItem('firebase_token', 'dev-token')
              localStorage.setItem('firebase_user', JSON.stringify(devUser))
              setUser(devUser)
            }
          } catch (e) {
            // Auth module error, continue without user
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // In dev mode, continue without auth
        const devUser = {
          uid: 'dev-user',
          email: 'dev@localhost',
        }
        localStorage.setItem('firebase_token', 'dev-token')
        localStorage.setItem('firebase_user', JSON.stringify(devUser))
        setUser(devUser)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const login = (userData) => {
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
  }

  const value = {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    login,
    logout,
    getToken: getAuthToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

