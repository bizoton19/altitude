/**
 * AppLayout - Shared layout wrapper with browser chrome and navigation
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { MarketplaceProvider } from '../context/MarketplaceContext'
import BrowserChrome from './BrowserChrome'
import MenuBar from './MenuBar'
import { signOut } from '../services/auth'
import { useAuth } from './AuthProvider'

// Generate unique tab ID
const generateTabId = () => `tab-${Date.now()}`

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  // Tab state
  const [tabs, setTabs] = useState([
    { id: 'home', title: 'Home', icon: '🏠', searchTerm: '' }
  ])
  const [activeTabId, setActiveTabId] = useState('home')

  // Get current tab
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  const searchTerm = currentTab?.searchTerm || ''

  // Tab handlers
  const handleNewTab = () => {
    const newTab = {
      id: generateTabId(),
      title: 'New Tab',
      icon: '🔍',
      searchTerm: ''
    }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const handleCloseTab = (tabId) => {
    if (tabs.length <= 1) return
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
  }

  const handleTabChange = (tabId) => {
    setActiveTabId(tabId)
  }

  // Search handlers
  const handleSearchChange = (value) => {
    setTabs(tabs.map(t => 
      t.id === activeTabId 
        ? { ...t, searchTerm: value, title: value || (t.id === 'home' ? 'Home' : 'New Tab') }
        : t
    ))
  }

  const handleSearchSubmit = (value) => {
    if (value) {
      setTabs(tabs.map(t => 
        t.id === activeTabId 
          ? { ...t, searchTerm: value, title: value, icon: '🔍' }
          : t
      ))
    }
  }

  // Navigation
  const handleBack = () => {
    navigate(-1)
  }

  const handleForward = () => {
    navigate(1)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  // Determine active view for menu bar
  const getActiveView = () => {
    const path = location.pathname
    if (path.startsWith('/violations')) return 'violations'
    if (path.startsWith('/listings')) return 'listings'
    if (path.startsWith('/investigations')) return 'investigations'
    if (path.startsWith('/review')) return 'review-queue'
    return null
  }

  // Can go back if there's history
  const canGoBack = window.history.length > 1

  return (
    <MarketplaceProvider>
      <div className="browser-container">
        <BrowserChrome
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onNewTab={handleNewTab}
          onCloseTab={handleCloseTab}
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          canGoBack={canGoBack}
          canGoForward={false}
          onSettingsClick={() => navigate('/settings')}
          onListingsClick={() => navigate('/listings')}
          showListingsActive={location.pathname === '/listings'}
        />
        
        <MenuBar
          onCreateViolation={() => navigate('/violations')}
          onListings={() => navigate('/listings')}
          onInvestigations={() => navigate('/investigations')}
          onReviewQueue={() => navigate('/review')}
          activeView={getActiveView()}
          onLogout={handleLogout}
        />
        
        <Outlet context={{ searchTerm, handleSearchChange }} />
      </div>
    </MarketplaceProvider>
  )
}

export default AppLayout

