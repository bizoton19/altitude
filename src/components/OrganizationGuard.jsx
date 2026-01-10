/**
 * OrganizationGuard - Redirects to registration if no organization exists
 */
import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import * as api from '../services/api'

function OrganizationGuard({ children }) {
  const [loading, setLoading] = useState(true)
  const [hasOrganization, setHasOrganization] = useState(false)
  const location = useLocation()

  useEffect(() => {
    checkOrganization()
  }, [])

  const checkOrganization = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
      
      // Try to get the current user's organization
      const org = await Promise.race([
        api.getCurrentOrganization(),
        timeoutPromise
      ])
      setHasOrganization(!!org)
    } catch (err) {
      // 404 means no organization found
      if (err.message?.includes('404') || err.message?.includes('No organization')) {
        setHasOrganization(false)
      } else if (err.message?.includes('Timeout')) {
        // Timeout - assume no organization to avoid blocking
        console.warn('Organization check timed out, assuming no organization')
        setHasOrganization(false)
      } else {
        // Other errors - assume organization exists to avoid blocking
        console.error('Error checking organization:', err)
        setHasOrganization(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Loading...
        </div>
      </div>
    )
  }

  // If no organization and not already on register page, redirect to register
  if (!hasOrganization && location.pathname !== '/register') {
    return <Navigate to="/register" replace state={{ from: location }} />
  }

  return children
}

export default OrganizationGuard

