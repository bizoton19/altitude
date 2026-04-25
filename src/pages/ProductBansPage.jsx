/**
 * ProductBansPage - Main product bans list view with tabs
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import FilterBar from '../components/FilterBar'
import RiskSummary from '../components/RiskSummary'
import ProductBanCard from '../components/ProductBanCard'
import ProductBanImport from '../components/ProductBanImport'
import ImportHistory from '../components/ImportHistory'
import * as api from '../services/api'

function ProductBansPage() {
  const navigate = useNavigate()
  const { searchTerm } = useOutletContext() || {}
  const [activeTab, setActiveTab] = useState('list') // 'list', 'import', 'history'
  
  const [productBans, setProductBans] = useState([])
  const [riskSummary, setRiskSummary] = useState({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendOnline, setBackendOnline] = useState(true)
  
  // Filter state
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [deleting, setDeleting] = useState(false)
  const [deletingProductBans, setDeletingProductBans] = useState(new Set()) // Track which product bans are being deleted
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

        const summary = await api.getProductBansRiskSummary()
        setRiskSummary(summary)

        const productBansData = await api.getProductBans({ limit: 100 })
        setProductBans(productBansData)
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
          const results = await api.searchProductBans(searchTerm)
          setProductBans(results)
        } else if (!searchTerm) {
          const productBansData = await api.getProductBans({ limit: 100 })
          setProductBans(productBansData)
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
  const filteredProductBans = useMemo(() => {
    let result = [...productBans]

    if (riskFilter !== 'all') {
      result = result.filter(v => v.risk_level?.toUpperCase() === riskFilter.toUpperCase())
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.ban_date || 0) - new Date(a.ban_date || 0)
        case 'oldest':
          return new Date(a.ban_date || 0) - new Date(b.ban_date || 0)
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
  }, [productBans, riskFilter, sortOrder])

  const handleProductBanClick = (productBan) => {
    const id = productBan.product_ban_id
    navigate(`/product-bans/${id}`)
  }

  const handleDeleteAll = async () => {
    const count = productBans.length
    if (!window.confirm(`⚠️ WARNING: This will delete ALL ${count} product ban${count !== 1 ? 's' : ''} and all associated data (products, hazards, remedies, images, listings). This action cannot be undone!\n\nAre you absolutely sure?`)) {
      return
    }

    setDeleting(true)
    setError(null)
    setDeleteMessage(null)
    
    // Optimistically mark all visible product bans as deleting
    const allProductBanIds = new Set(productBans.map(v => v.product_ban_id))
    setDeletingProductBans(allProductBanIds)
    
    // Show friendly message immediately
    setDeleteMessage({
      type: 'info',
      text: `🗑️ Deleting ${count} product ban${count !== 1 ? 's' : ''}... This may take a moment.`
    })

    try {
      await api.deleteAllProductBans()
      
      // Show success message
      setDeleteMessage({
        type: 'success',
        text: `✅ Successfully deleted ${count} product ban${count !== 1 ? 's' : ''} and all associated data.`
      })
      
      // Clear product bans from state
      setProductBans([])
      setRiskSummary({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 })
      
      // Clear deleting state after a delay
      setTimeout(() => {
        setDeletingProductBans(new Set())
        setDeleteMessage(null)
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete product bans')
      setDeleteMessage(null)
      // Clear optimistic state on error
      setDeletingProductBans(new Set())
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
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0, marginRight: 'var(--space-md)' }}>Product Bans</h2>
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
              onClick={() => navigate('/settings/product-bans')}
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
            onClick={() => navigate('/product-bans/new')}
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
            ⚡ Create Product Ban
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
            
            {filteredProductBans.length === 0 ? (
              <div className="empty-state glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
                <div style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  No product bans found
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {searchTerm 
                    ? `No results for "${searchTerm}". Try a different search term.`
                    : 'Enter a search term or adjust filters to find product bans.'}
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
                    Showing {filteredProductBans.length} product ban{filteredProductBans.length !== 1 ? 's' : ''}
                    {searchTerm && ` for "${searchTerm}"`}
                  </span>
                  {productBans.length > 0 && (
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
                      {deleting ? 'Deleting...' : '🗑️ Delete All Product Bans'}
                    </button>
                  )}
                </div>
                {filteredProductBans.map((productBan) => {
                  const id = productBan.product_ban_id
                  const isDeleting = deletingProductBans.has(id)
                  return (
                    <div key={id} style={{ position: 'relative' }}>
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
                        <ProductBanCard
                          productBan={productBan}
                          onClick={() => !isDeleting && handleProductBanClick(productBan)}
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
          <ProductBanImport onViewHistory={() => setActiveTab('history')} />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ padding: 'var(--space-lg) 0' }}>
          <ImportHistory importType="product_ban" />
        </div>
      )}
    </div>
    </>
  )
}

export default ProductBansPage
