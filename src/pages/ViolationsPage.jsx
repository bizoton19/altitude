/**
 * ViolationsPage - Main violations list view with tabs
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import FilterBar from '../components/FilterBar'
import RiskSummary from '../components/RiskSummary'
import RecallCard from '../components/RecallCard'
import ViolationImport from '../components/ViolationImport'
import ImportHistory from '../components/ImportHistory'
import * as api from '../services/api'

function ViolationsPage() {
  const navigate = useNavigate()
  const { searchTerm } = useOutletContext() || {}
  const [activeTab, setActiveTab] = useState('list') // 'list', 'import', 'history'
  
  const [violations, setViolations] = useState([])
  const [riskSummary, setRiskSummary] = useState({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendOnline, setBackendOnline] = useState(true)
  
  // Filter state
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [deleting, setDeleting] = useState(false)
  const [deletingViolations, setDeletingViolations] = useState(new Set()) // Track which violations are being deleted
  const [deleteMessage, setDeleteMessage] = useState(null) // Success message

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const isOnline = await api.checkHealth()
        setBackendOnline(isOnline)
        
        if (!isOnline) {
          setError('Backend server is not running.')
          return
        }

        const summary = await api.getViolationsRiskSummary()
        setRiskSummary(summary)

        const violationsData = await api.getViolations({ limit: 100 })
        setViolations(violationsData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
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
          const violationsData = await api.getViolations({ limit: 100 })
          setViolations(violationsData)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(performSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, backendOnline])

  // Filter and sort
  const filteredViolations = useMemo(() => {
    let result = [...violations]

    if (riskFilter !== 'all') {
      result = result.filter(v => v.risk_level?.toUpperCase() === riskFilter.toUpperCase())
    }

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

  const handleViolationClick = (violation) => {
    navigate(`/violations/${violation.violation_id}`)
  }

  const handleDeleteAll = async () => {
    const count = violations.length
    if (!window.confirm(`⚠️ WARNING: This will delete ALL ${count} violations and all associated data (products, hazards, remedies, images, listings). This action cannot be undone!\n\nAre you absolutely sure?`)) {
      return
    }

    setDeleting(true)
    setError(null)
    setDeleteMessage(null)
    
    // Optimistically mark all visible violations as deleting
    const allViolationIds = new Set(violations.map(v => v.violation_id))
    setDeletingViolations(allViolationIds)
    
    // Show friendly message immediately
    setDeleteMessage({
      type: 'info',
      text: `🗑️ Deleting ${count} violation${count !== 1 ? 's' : ''}... This may take a moment.`
    })

    try {
      await api.deleteAllViolations()
      
      // Show success message
      setDeleteMessage({
        type: 'success',
        text: `✅ Successfully deleted ${count} violation${count !== 1 ? 's' : ''} and all associated data.`
      })
      
      // Clear violations from state
      setViolations([])
      setRiskSummary({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 })
      
      // Clear deleting state after a delay
      setTimeout(() => {
        setDeletingViolations(new Set())
        setDeleteMessage(null)
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete violations')
      setDeleteMessage(null)
      // Clear optimistic state on error
      setDeletingViolations(new Set())
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Add CSS animations for delete indicators */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div className="content-area">
      {/* Header with tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-md)',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: 'var(--space-sm)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0, marginRight: 'var(--space-md)' }}>Violations</h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'list' ? '600' : '500',
                background: activeTab === 'list' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'list' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'list' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📋 List
            </button>
            <button
              onClick={() => setActiveTab('import')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'import' ? '600' : '500',
                background: activeTab === 'import' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'import' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'import' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📥 Import
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'history' ? '600' : '500',
                background: activeTab === 'history' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'history' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'history' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📊 History
            </button>
            <button
              onClick={() => navigate('/settings/violations')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: '500',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                marginLeft: 'var(--space-sm)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--glass-bg-hover)'
                e.target.style.borderColor = 'var(--glass-border-hover)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'var(--glass-border)'
              }}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
        {activeTab === 'list' && (
          <button
            onClick={() => navigate('/violations/new')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            ⚡ Create Violation
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          <FilterBar
            activeFilter={riskFilter}
            onFilterChange={setRiskFilter}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
          />
        {error && (
          <div className="glass-panel alert-error" style={{ 
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            border: '1px solid var(--risk-high)',
            background: 'rgba(255, 51, 102, 0.1)'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>Error:</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {deleteMessage && (
          <div className="glass-panel" style={{ 
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            border: `1px solid ${deleteMessage.type === 'success' ? 'var(--neon-green)' : 'var(--neon-cyan)'}`,
            background: deleteMessage.type === 'success' 
              ? 'rgba(0, 255, 100, 0.1)' 
              : 'rgba(0, 240, 255, 0.1)',
            animation: 'fadeIn 0.3s ease-in'
          }}>
            <span style={{ fontSize: '20px' }}>
              {deleteMessage.type === 'success' ? '✅' : '🗑️'}
            </span>
            <span style={{ 
              color: deleteMessage.type === 'success' ? 'var(--neon-green)' : 'var(--neon-cyan)'
            }}>
              {deleteMessage.text}
            </span>
          </div>
        )}

        {!backendOnline && !error && (
          <div className="glass-panel alert-warning" style={{ 
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}>
            <span style={{ fontSize: '20px' }}>🔌</span>
            <div>
              <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>Backend Offline:</strong>
              <span>Start the backend server to enable full functionality.</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : (
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
                  {violations.length > 0 && (
                    <button
                      onClick={handleDeleteAll}
                      disabled={deleting}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        borderRadius: '4px',
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: deleting ? 0.5 : 1
                      }}
                    >
                      {deleting ? 'Deleting...' : '🗑️ Delete All Violations'}
                    </button>
                  )}
                </div>
                {filteredViolations.map((violation) => {
                  const isDeleting = deletingViolations.has(violation.violation_id)
                  return (
                    <div key={violation.violation_id} style={{ position: 'relative' }}>
                      {isDeleting && (
                        <div style={{
                          position: 'absolute',
                          top: 'var(--space-sm)',
                          right: 'var(--space-sm)',
                          zIndex: 10,
                          padding: 'var(--space-xs) var(--space-sm)',
                          background: 'rgba(255, 51, 102, 0.9)',
                          border: '1px solid var(--risk-high)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)',
                          boxShadow: '0 2px 8px rgba(255, 51, 102, 0.3)',
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                          <span>🗑️</span>
                          <span>Deleting...</span>
                        </div>
                      )}
                      <div style={{ 
                        opacity: isDeleting ? 0.6 : 1,
                        transition: 'opacity 0.3s ease-in-out',
                        pointerEvents: isDeleting ? 'none' : 'auto'
                      }}>
                        <RecallCard
                          recall={violation}
                          onClick={() => !isDeleting && handleViolationClick(violation)}
                          isSelected={false}
                        />
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
        </>
      )}

      {activeTab === 'import' && (
        <div style={{ padding: 'var(--space-lg) 0' }}>
          <ViolationImport />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ padding: 'var(--space-lg) 0' }}>
          <ImportHistory importType="violation" />
        </div>
      )}
    </div>
    </>
  )
}

export default ViolationsPage

