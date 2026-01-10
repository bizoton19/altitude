/**
 * Application Router Configuration
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'

// Layout
import AppLayout from './components/AppLayout'

// Pages
import RegisterPage from './components/RegisterPage'
import OrganizationGuard from './components/OrganizationGuard'

// Views (lazy load for better performance)
import ViolationsPage from './pages/ViolationsPage'
import ViolationDetailPage from './pages/ViolationDetailPage'
import ViolationFormPage from './pages/ViolationFormPage'
import InvestigationsPage from './pages/InvestigationsPage'
import InvestigationDetailPage from './pages/InvestigationDetailPage'
import SettingsPage from './pages/SettingsPage'
import ListingsPage from './pages/ListingsPage'
import ReviewQueuePage from './pages/ReviewQueuePage'

const router = createBrowserRouter([
  // Public routes
  {
    path: '/register',
    element: <RegisterPage />
  },
  
  // Protected routes (require organization)
  {
    path: '/',
    element: (
      <OrganizationGuard>
        <AppLayout />
      </OrganizationGuard>
    ),
    children: [
      // Home / Violations list
      {
        index: true,
        element: <ViolationsPage />
      },
      {
        path: 'violations',
        element: <ViolationsPage />
      },
      {
        path: 'violations/new',
        element: <ViolationFormPage />
      },
      {
        path: 'violations/:id',
        element: <ViolationDetailPage />
      },
      
      // Investigations
      {
        path: 'investigations',
        element: <InvestigationsPage />
      },
      {
        path: 'investigations/:id',
        element: <InvestigationDetailPage />
      },
      
      // Review Queue
      {
        path: 'review',
        element: <ReviewQueuePage />
      },
      
      // Listings
      {
        path: 'listings',
        element: <ListingsPage />
      },
      
      // Settings
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: 'settings/:section',
        element: <SettingsPage />
      },
      
      // Fallback
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
])

export default router

