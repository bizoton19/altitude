import { useState, useEffect } from 'react'
import { signInWithEmail, signUpWithEmail, initializeFirebase } from '../services/auth'

function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase()
        try {
          const authModule = await import('../services/auth')
          if (authModule.isDevMode && authModule.isDevMode()) {
            // In dev mode, show a message that auth is disabled
            setError(null)
          }
        } catch (e) {
          // Auth module not available, continue
        }
        setFirebaseReady(true)
      } catch (err) {
        console.error('Firebase initialization error:', err)
        // Don't show error in dev mode
        setFirebaseReady(true)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let user
      if (isSignUp) {
        user = await signUpWithEmail(email, password)
      } else {
        user = await signInWithEmail(email, password)
      }

      if (onSuccess) {
        onSuccess(user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!firebaseReady) {
    return (
      <div className="login-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <div>Initializing authentication...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-800 dark:text-blue-200">
          <strong>🔓 Dev Mode:</strong> Authentication is disabled. You can use any email/password to login.
          <div className="mt-2 text-xs">
            To enable Firebase Auth, see FIREBASE_SETUP.md
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

