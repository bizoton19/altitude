import { useState, useEffect, useMemo } from 'react'
import * as api from '../services/api'

/**
 * AllListingsView Component
 * Shows all marketplace listings across all violations, sortable by risk, date, or violation
 */
function AllListingsView({ onViolationClick, onRecallClick, onBack }) {
  const [listings, setListings] = useState([])
  const [violations, setViolations] = useState({}) // Map of violation_id -> violation data
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('risk') // risk, date, violation, marketplace
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [filterRisk, setFilterRisk] = useState('all') // all, HIGH, MEDIUM, LOW
  const [filterMarketplace, setFilterMarketplace] = useState('all')

  // Support both onViolationClick and onRecallClick for compatibility
  const handleViolationClick = onViolationClick || onRecallClick

  // Fetch all listings and violations on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all violations to get risk levels
        const violationsData = await api.getViolations({ limit: 200 })
        const violationsMap = {}
        violationsData.forEach(v => {
          violationsMap[v.violation_id] = v
          // Also map by recall_id for backward compatibility with listings
          if (v.recall_id) {
            violationsMap[v.recall_id] = v
          }
        })
        setViolations(violationsMap)

        // Fetch all listings
        const allListings = await api.getAllListings()
        setListings(allListings || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Get unique marketplaces for filter
  const marketplaces = useMemo(() => {
    const unique = new Set(listings.map(l => l.marketplace_name || l.marketplace_id || 'Unknown'))
    return ['all', ...Array.from(unique).sort()]
  }, [listings])

  // Get risk level for a listing based on its violation
  const getListingRisk = (listing) => {
    const violation = violations[listing.violation_id] || violations[listing.recall_id]
    return violation?.risk_level || 'LOW'
  }

  // Sort and filter listings
  const processedListings = useMemo(() => {
    let result = [...listings]

    // Add violation data to each listing
    result = result.map(listing => ({
      ...listing,
      violation: violations[listing.violation_id] || violations[listing.recall_id],
      recall: violations[listing.violation_id] || violations[listing.recall_id], // Keep for backward compatibility
      risk_level: getListingRisk(listing)
    }))

    // Filter by risk
    if (filterRisk !== 'all') {
      result = result.filter(l => l.risk_level === filterRisk)
    }

    // Filter by marketplace
    if (filterMarketplace !== 'all') {
      result = result.filter(l => 
        (l.marketplace_name || l.marketplace_id) === filterMarketplace
      )
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'risk':
          const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
          comparison = (riskOrder[a.risk_level] || 2) - (riskOrder[b.risk_level] || 2)
          break
        case 'date':
          comparison = new Date(b.found_at || 0) - new Date(a.found_at || 0)
          break
        case 'recall':
        case 'violation':
          comparison = (a.violation?.title || a.recall?.title || '').localeCompare(b.violation?.title || b.recall?.title || '')
          break
        case 'marketplace':
          comparison = (a.marketplace_name || '').localeCompare(b.marketplace_name || '')
          break
        case 'match':
          comparison = (b.match_score || 0) - (a.match_score || 0)
          break
        case 'price':
          comparison = (a.price || 0) - (b.price || 0)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [listings, violations, sortBy, sortOrder, filterRisk, filterMarketplace])

  // Stats
  const stats = useMemo(() => {
    const byRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    processedListings.forEach(l => {
      byRisk[l.risk_level] = (byRisk[l.risk_level] || 0) + 1
    })
    return byRisk
  }, [processedListings])

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH': return 'var(--risk-high)'
      case 'MEDIUM': return 'var(--risk-medium)'
      case 'LOW': return 'var(--risk-low)'
      default: return 'var(--text-muted)'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getMatchScoreColor = (score) => {
    if (score >= 0.7) return 'var(--risk-high)'
    if (score >= 0.4) return 'var(--risk-medium)'
    return 'var(--risk-low)'
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🛒</span>
            All Marketplace Listings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {processedListings.length} listing{processedListings.length !== 1 ? 's' : ''} found across all monitored violations
          </p>
        </div>
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Violations
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
            High Risk
          </span>
          <span style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--risk-high)' }}>
            {stats.HIGH}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Medium Risk
          </span>
          <span style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--risk-medium)' }}>
            {stats.MEDIUM}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Low Risk
          </span>
          <span style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--risk-low)' }}>
            {stats.LOW}
          </span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Total
          </span>
          <span style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
            {processedListings.length}
          </span>
        </div>
      </div>

      {/* Filters and Sort Controls */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Sort By */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input"
              style={{ padding: '8px 12px', minWidth: '140px' }}
            >
              <option value="risk">Risk Level</option>
              <option value="date">Date Found</option>
              <option value="violation">Violation</option>
              <option value="marketplace">Marketplace</option>
              <option value="match">Match Score</option>
              <option value="price">Price</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Order
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className={`filter-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setSortOrder('desc')}
                style={{ padding: '8px 12px' }}
              >
                ↓ Desc
              </button>
              <button
                className={`filter-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setSortOrder('asc')}
                style={{ padding: '8px 12px' }}
              >
                ↑ Asc
              </button>
            </div>
          </div>

          {/* Filter by Risk */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Risk Level
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'HIGH', 'MEDIUM', 'LOW'].map(risk => (
                <button
                  key={risk}
                  className={`filter-btn ${filterRisk === risk ? 'active' : ''}`}
                  onClick={() => setFilterRisk(risk)}
                  style={{ 
                    padding: '8px 12px',
                    color: risk !== 'all' && filterRisk === risk ? getRiskColor(risk) : undefined
                  }}
                >
                  {risk === 'all' ? 'All' : risk}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by Marketplace */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Marketplace
            </label>
            <select
              value={filterMarketplace}
              onChange={(e) => setFilterMarketplace(e.target.value)}
              className="glass-input"
              style={{ padding: '8px 12px', minWidth: '140px' }}
            >
              {marketplaces.map(mp => (
                <option key={mp} value={mp}>
                  {mp === 'all' ? 'All Marketplaces' : mp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading listings...</p>
        </div>
      ) : processedListings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>No Listings Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            No marketplace listings have been found yet. Search for violated products on the violation detail pages to populate this view.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '80px 1fr 200px 120px 100px 100px 120px',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderBottom: '1px solid var(--glass-border)',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)'
          }}>
            <div>Risk</div>
            <div>Listing</div>
            <div>Violation</div>
            <div>Marketplace</div>
            <div>Match</div>
            <div>Price</div>
            <div>Found</div>
          </div>

          {/* Table Rows */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {processedListings.map((listing, idx) => (
              <div 
                key={listing.id || idx}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 1fr 200px 120px 100px 100px 120px',
                  gap: '16px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--glass-border)',
                  alignItems: 'center',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* Risk Badge */}
                <div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    background: `${getRiskColor(listing.risk_level)}22`,
                    color: getRiskColor(listing.risk_level),
                    border: `1px solid ${getRiskColor(listing.risk_level)}44`
                  }}>
                    {listing.risk_level}
                  </span>
                </div>

                {/* Listing Title & URL */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px'
                  }}>
                    {listing.title || 'Untitled Listing'}
                  </div>
                  {listing.listing_url && (
                    <a 
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: 'var(--neon-cyan)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Listing →
                    </a>
                  )}
                </div>

                {/* Violation Info */}
                <div style={{ minWidth: 0 }}>
                  {(listing.violation || listing.recall) ? (
                    <button
                      onClick={() => handleViolationClick && handleViolationClick(listing.violation || listing.recall)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        width: '100%'
                      }}
                      title={listing.violation?.title || listing.recall?.title}
                    >
                      <span style={{ color: 'var(--neon-purple)', marginRight: '4px' }}>
                        #{(listing.violation?.violation_number || listing.recall?.recall_number)}
                      </span>
                      {(listing.violation?.title || listing.recall?.title)?.substring(0, 30)}...
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      Unknown Violation
                    </span>
                  )}
                </div>

                {/* Marketplace */}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {listing.marketplace_name || listing.marketplace_id || 'Unknown'}
                </div>

                {/* Match Score */}
                <div>
                  {listing.match_score !== undefined ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: getMatchScoreColor(listing.match_score)
                    }}>
                      {Math.round(listing.match_score * 100)}%
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                  )}
                </div>

                {/* Price */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--risk-low)' }}>
                  {listing.price ? `$${listing.price.toFixed(2)}` : '—'}
                </div>

                {/* Date Found */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatDate(listing.found_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AllListingsView
