import { useState, useEffect, useMemo } from 'react'
import { MarketplaceProvider } from './context/MarketplaceContext'
import { AuthProvider, useAuth } from './components/AuthProvider'
import BrowserChrome from './components/BrowserChrome'
import MenuBar from './components/MenuBar'
import FilterBar from './components/FilterBar'
import RiskSummary from './components/RiskSummary'
import RecallCard from './components/RecallCard'
import RecallDetailView from './components/RecallDetailView'
import MarketplaceManager from './components/MarketplaceManager'
import AllListingsView from './components/AllListingsView'
import ViolationForm from './components/ViolationForm'
import InvestigationList from './components/InvestigationList'
import InvestigationDetail from './components/InvestigationDetail'
import ReviewQueue from './components/ReviewQueue'
import Login from './components/Login'
import { signOut } from './services/auth'
import * as api from './services/api'

// Generate unique tab ID
const generateTabId = () => `tab-${Date.now()}`

function AppContent() {
  const { user, loading: authLoading, login, logout } = useAuth()
  // Tab state
  const [tabs, setTabs] = useState([
    { id: 'home', title: 'Home', icon: '🏠', searchTerm: '' }
  ])
  const [activeTabId, setActiveTabId] = useState('home')

  // Data state - using violations
  const [violations, setViolations] = useState([])
  const [riskSummary, setRiskSummary] = useState({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendOnline, setBackendOnline] = useState(true)
  
  // Filter state
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  
  // View state
  const [showSettings, setShowSettings] = useState(false)
  const [showAllListings, setShowAllListings] = useState(false)
  const [showViolationForm, setShowViolationForm] = useState(false)
  const [showInvestigations, setShowInvestigations] = useState(false)
  const [showReviewQueue, setShowReviewQueue] = useState(false)
  const [showInvestigationForm, setShowInvestigationForm] = useState(false)
  const [editingInvestigation, setEditingInvestigation] = useState(null)
  const [selectedViolation, setSelectedViolation] = useState(null)
  const [selectedInvestigation, setSelectedInvestigation] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Get current tab
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  const searchTerm = currentTab?.searchTerm || ''

  // Check backend health and load initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Check if backend is online
        const isOnline = await api.checkHealth()
        setBackendOnline(isOnline)
        
        if (!isOnline) {
          setError('Backend server is not running. Start it with: cd backend && python run.py')
          setLoading(false)
          return
        }

        // Fetch risk summary from violations API
        const summary = await api.getViolationsRiskSummary()
        setRiskSummary(summary)

        // Fetch initial violations
        const violationsData = await api.getViolations({ limit: 100 })
        setViolations(violationsData)
        
      } catch (err) {
        console.error('Error loading data:', err)
        setError(`Failed to load data: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Search when search term changes
  useEffect(() => {
    const performSearch = async () => {
      if (!backendOnline) return
      
      try {
        if (searchTerm && searchTerm.length >= 2) {
          setLoading(true)
          const results = await api.searchViolations(searchTerm)
          setViolations(results)
        } else if (!searchTerm) {
          // Reset to initial list
          const violationsData = await api.getViolations({ limit: 100 })
          setViolations(violationsData)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, backendOnline])

  // Filter and sort violations (client-side for responsiveness)
  const filteredViolations = useMemo(() => {
    let result = [...violations]

    // Apply risk filter
    if (riskFilter !== 'all') {
      result = result.filter(violation => 
        violation.risk_level?.toUpperCase() === riskFilter.toUpperCase()
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.violation_date || 0) - new Date(a.violation_date || 0)
        case 'oldest':
          return new Date(a.violation_date || 0) - new Date(b.violation_date || 0)
        case 'risk-high':
          const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
          return (riskOrder[a.risk_level] ?? 2) - (riskOrder[b.risk_level] ?? 2)
        case 'risk-low':
          const riskOrderLow = { LOW: 0, MEDIUM: 1, HIGH: 2 }
          return (riskOrderLow[a.risk_level] ?? 2) - (riskOrderLow[b.risk_level] ?? 2)
        default:
          return 0
      }
    })

    return result
  }, [violations, riskFilter, sortOrder])

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
    setSelectedViolation(null)
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
    setSelectedViolation(null)
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

  // Navigation handlers
  const handleBack = () => {
    // Handle form states first (most specific)
    if (showInvestigationForm) {
      setShowInvestigationForm(false)
      setEditingInvestigation(null)
    } else if (showViolationForm) {
      setShowViolationForm(false)
    } else if (selectedInvestigation) {
      setSelectedInvestigation(null)
    } else if (selectedViolation) {
      setSelectedViolation(null)
    } else if (showAllListings) {
      setShowAllListings(false)
    } else if (showInvestigations) {
      setShowInvestigations(false)
    } else if (showReviewQueue) {
      setShowReviewQueue(false)
    } else if (showSettings) {
      setShowSettings(false)
    }
  }

  // Determine if back button should be enabled
  const canGoBack = () => {
    return !!(
      showInvestigationForm ||
      showViolationForm ||
      selectedInvestigation ||
      selectedViolation ||
      showAllListings ||
      showInvestigations ||
      showReviewQueue ||
      showSettings
    )
  }

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  // Determine active view for menu bar
  const getActiveView = () => {
    if (showViolationForm) return 'violation-form'
    if (showInvestigationForm) return 'investigations' // Form is part of investigations view
    if (showInvestigations) return 'investigations'
    if (showReviewQueue) return 'review-queue'
    return null
  }

  const handleCreateViolation = () => {
    setShowViolationForm(true)
    setShowAllListings(false)
    setShowInvestigations(false)
    setShowReviewQueue(false)
    setSelectedViolation(null)
  }

  const handleInvestigations = () => {
    setShowInvestigations(true)
    setShowAllListings(false)
    setShowViolationForm(false)
    setShowInvestigationForm(false)
    setShowReviewQueue(false)
    setSelectedViolation(null)
    setSelectedInvestigation(null)
    setEditingInvestigation(null)
  }

  const handleReviewQueue = () => {
    setShowReviewQueue(true)
    setShowAllListings(false)
    setShowViolationForm(false)
    setShowInvestigationForm(false)
    setShowInvestigations(false)
    setSelectedViolation(null)
    setSelectedInvestigation(null)
    setEditingInvestigation(null)
  }

  const handleInvestigationForm = (investigation = null) => {
    setEditingInvestigation(investigation)
    setShowInvestigationForm(true)
  }

  const handleInvestigationFormSuccess = () => {
    setShowInvestigationForm(false)
    setEditingInvestigation(null)
    // Refresh investigations list will be handled by InvestigationList component
  }

  const handleInvestigationFormCancel = () => {
    setShowInvestigationForm(false)
    setEditingInvestigation(null)
  }

  // Handle violation form success
  const handleViolationCreated = async (violation) => {
    setSuccessMessage(`Violation "${violation.title}" created successfully!`)
    setShowViolationForm(false)
    // Refresh the violations list
    try {
      const summary = await api.getViolationsRiskSummary()
      setRiskSummary(summary)
      const violationsData = await api.getViolations({ limit: 100 })
      setViolations(violationsData)
    } catch (err) {
      console.error('Error refreshing violations:', err)
    }
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)
  }
  const handleForward = () => console.log('Forward')
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const summary = await api.getViolationsRiskSummary()
      setRiskSummary(summary)
      const violationsData = await api.getViolations({ limit: 100 })
      setViolations(violationsData)
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Violation selection - fetch full details from API
  const handleViolationClick = async (violation) => {
    try {
      const fullViolation = await api.getViolation(violation.violation_id)
      setSelectedViolation(fullViolation)
    } catch (err) {
      console.error('Error fetching violation details:', err)
      // Fallback to summary data
      setSelectedViolation(violation)
    }
  }

  // Handle violation click from All Listings view
  const handleListingViolationClick = async (violation) => {
    setShowAllListings(false)
    await handleViolationClick(violation)
  }

  // Handle investigation click from violation detail view
  const handleInvestigationClick = (investigation) => {
    setShowInvestigations(true)
    setSelectedViolation(null)
    setSelectedInvestigation(investigation)
  }

  // Show login if not authenticated (optional - can be removed for development)
  if (authLoading) {
    return <div className="loading">Loading...</div>
  }

  // Investigations view
  if (showInvestigations) {
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
            canGoBack={canGoBack()}
            canGoForward={false}
            onSettingsClick={() => { setShowInvestigations(false); setShowSettings(true) }}
            onListingsClick={() => { setShowInvestigations(false); setShowAllListings(true) }}
          />
          <MenuBar
            onCreateViolation={handleCreateViolation}
            onInvestigations={handleInvestigations}
            onReviewQueue={handleReviewQueue}
            activeView={getActiveView()}
            onLogout={handleLogout}
          />
          <div className="content-area">
            {showInvestigationForm ? (
              <InvestigationForm
                investigation={editingInvestigation}
                onSuccess={handleInvestigationFormSuccess}
                onCancel={handleInvestigationFormCancel}
              />
            ) : selectedInvestigation ? (
              <InvestigationDetail
                investigationId={selectedInvestigation.investigation_id}
                onBack={() => setSelectedInvestigation(null)}
              />
            ) : (
              <InvestigationList
                onInvestigationClick={(investigation) => setSelectedInvestigation(investigation)}
                onCreateInvestigation={() => handleInvestigationForm(null)}
                onEditInvestigation={(investigation) => handleInvestigationForm(investigation)}
              />
            )}
          </div>
        </div>
      </MarketplaceProvider>
    )
  }

  // Review Queue view
  if (showReviewQueue) {
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
            canGoBack={canGoBack()}
            canGoForward={false}
            onSettingsClick={() => { setShowReviewQueue(false); setShowSettings(true) }}
            onListingsClick={() => { setShowReviewQueue(false); setShowAllListings(true) }}
          />
          <MenuBar
            onCreateViolation={handleCreateViolation}
            onInvestigations={handleInvestigations}
            onReviewQueue={handleReviewQueue}
            activeView={getActiveView()}
            onLogout={handleLogout}
          />
          <div className="content-area">
            <ReviewQueue />
          </div>
        </div>
      </MarketplaceProvider>
    )
  }

  // Violation Form view
  if (showViolationForm) {
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
            canGoBack={canGoBack()}
            canGoForward={false}
            onSettingsClick={() => { setShowViolationForm(false); setShowSettings(true) }}
            onListingsClick={() => { setShowViolationForm(false); setShowAllListings(true) }}
          />
          <MenuBar
            onCreateViolation={handleCreateViolation}
            onInvestigations={handleInvestigations}
            onReviewQueue={handleReviewQueue}
            activeView={getActiveView()}
            onLogout={handleLogout}
          />
          <div className="content-area">
            <ViolationForm
              onSuccess={handleViolationCreated}
              onCancel={() => setShowViolationForm(false)}
            />
          </div>
        </div>
      </MarketplaceProvider>
    )
  }

  // All Listings view
  if (showAllListings) {
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
            canGoBack={canGoBack()}
            canGoForward={false}
            onSettingsClick={() => setShowSettings(true)}
            onListingsClick={() => setShowAllListings(false)}
            showListingsActive={true}
          />
          <MenuBar
            onCreateViolation={handleCreateViolation}
            onInvestigations={handleInvestigations}
            onReviewQueue={handleReviewQueue}
            activeView={getActiveView()}
            onLogout={handleLogout}
          />
          <div className="content-area" style={{ padding: 0 }}>
            <AllListingsView 
              onViolationClick={handleListingViolationClick}
              onBack={() => setShowAllListings(false)}
            />
          </div>
        </div>
      </MarketplaceProvider>
    )
  }

  // Settings view
  if (showSettings) {
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
            canGoBack={canGoBack()}
            canGoForward={false}
            onSettingsClick={() => setShowSettings(false)}
            onListingsClick={() => { setShowSettings(false); setShowAllListings(true) }}
          />
          <MenuBar
            onCreateViolation={handleCreateViolation}
            onInvestigations={handleInvestigations}
            onReviewQueue={handleReviewQueue}
            activeView={getActiveView()}
            onLogout={handleLogout}
          />
          <div className="content-area">
            <MarketplaceManager onBack={() => setShowSettings(false)} />
          </div>
        </div>
      </MarketplaceProvider>
    )
  }

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
          canGoBack={canGoBack()}
          canGoForward={false}
          onSettingsClick={() => setShowSettings(true)}
          onListingsClick={() => setShowAllListings(true)}
        />
        
        {/* Menu Bar */}
        <MenuBar
          onCreateViolation={handleCreateViolation}
          onInvestigations={handleInvestigations}
          onReviewQueue={handleReviewQueue}
          activeView={getActiveView()}
          onLogout={handleLogout}
        />
        
        <FilterBar
          activeFilter={riskFilter}
          onFilterChange={setRiskFilter}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />

        <div className="content-area">
          {/* Success message */}
          {successMessage && (
            <div className="alert alert-success" style={{ marginBottom: '16px', backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724' }}>
              <strong>✅ Success:</strong> {successMessage}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          {/* Backend offline warning */}
          {!backendOnline && !error && (
            <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
              <strong>🔌 Backend Offline:</strong> Start the backend server to enable full functionality.
              <pre style={{ marginTop: '8px', fontSize: '12px' }}>
                cd backend && source venv/bin/activate && python run.py
              </pre>
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : selectedViolation ? (
            /* Detail View for Selected Violation */
            <RecallDetailView
              recall={selectedViolation}
              onClose={() => setSelectedViolation(null)}
              onInvestigationClick={handleInvestigationClick}
            />
          ) : (
            /* List View */
            <>
              <RiskSummary 
                high={riskSummary.HIGH}
                medium={riskSummary.MEDIUM}
                low={riskSummary.LOW}
              />
              
              {filteredViolations.length === 0 ? (
                <div className="empty-state glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
                  <div style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    No violations found
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {searchTerm 
                      ? `No results for "${searchTerm}". Try a different search term.`
                      : 'Enter a search term or adjust filters to find violations.'}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-muted)', 
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      Showing {filteredViolations.length} violation{filteredViolations.length !== 1 ? 's' : ''}
                      {searchTerm && ` for "${searchTerm}"`}
                    </span>
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      Click a violation to view details and marketplace listings
                    </span>
                  </div>
                  {filteredViolations.map((violation) => (
                    <RecallCard
                      key={violation.violation_id}
                      recall={violation}
                      onClick={() => handleViolationClick(violation)}
                      isSelected={false}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MarketplaceProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
