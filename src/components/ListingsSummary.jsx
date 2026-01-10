import { useState, useMemo } from 'react'

/**
 * ListingsSummary Component
 * Displays a summary of marketplace listings found for a recall
 */
function ListingsSummary({ listings, loading, searching, onSearch, recallId }) {
  const [expandedMarketplace, setExpandedMarketplace] = useState(null)
  const [sortBy, setSortBy] = useState('match') // match, price, date

  // Group listings by marketplace
  const groupedListings = useMemo(() => {
    const groups = {}
    listings.forEach(listing => {
      const marketplace = listing.marketplace_name || listing.marketplace_id || 'Unknown'
      if (!groups[marketplace]) {
        groups[marketplace] = []
      }
      groups[marketplace].push(listing)
    })
    return groups
  }, [listings])

  const marketplaces = Object.keys(groupedListings)
  const totalListings = listings.length
  const highConfidenceCount = listings.filter(l => (l.match_score || 0) >= 0.7).length

  // Sort listings within expanded marketplace
  const getSortedListings = (marketplaceListings) => {
    return [...marketplaceListings].sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return (b.match_score || 0) - (a.match_score || 0)
        case 'price':
          return (a.price || 0) - (b.price || 0)
        case 'date':
          return new Date(b.found_at || 0) - new Date(a.found_at || 0)
        default:
          return 0
      }
    })
  }

  const getMatchScoreColor = (score) => {
    if (score >= 0.7) return 'var(--risk-high)'
    if (score >= 0.4) return 'var(--risk-medium)'
    return 'var(--risk-low)'
  }

  const getMatchScoreLabel = (score) => {
    if (score >= 0.7) return 'High'
    if (score >= 0.4) return 'Medium'
    return 'Low'
  }

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Marketplace Listings
          </h3>
          {totalListings > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {totalListings} listing{totalListings !== 1 ? 's' : ''} found across {marketplaces.length} marketplace{marketplaces.length !== 1 ? 's' : ''}
              {highConfidenceCount > 0 && (
                <span style={{ color: 'var(--risk-high)', marginLeft: '8px' }}>
                  ({highConfidenceCount} high-confidence match{highConfidenceCount !== 1 ? 'es' : ''})
                </span>
              )}
            </p>
          )}
        </div>
        
        <button
          className="btn btn-primary"
          onClick={onSearch}
          disabled={searching || loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {searching ? (
            <>
              <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              Searching...
            </>
          ) : (
            <>🔍 Search Marketplaces</>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
          Loading existing listings...
        </div>
      )}

      {/* Empty state */}
      {!loading && totalListings === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px', 
          background: 'var(--glass-bg)', 
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--glass-border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>🛒</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            No marketplace listings found yet
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Click "Search Marketplaces" to scan enabled platforms for this recalled product
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && totalListings > 0 && (
        <>
          {/* Sort controls */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', alignSelf: 'center' }}>Sort by:</span>
            {[
              { value: 'match', label: 'Match Score' },
              { value: 'price', label: 'Price' },
              { value: 'date', label: 'Date Found' }
            ].map(option => (
              <button
                key={option.value}
                className={`filter-btn ${sortBy === option.value ? 'active' : ''}`}
                onClick={() => setSortBy(option.value)}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Marketplace Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {marketplaces.map(marketplace => {
              const marketplaceListings = groupedListings[marketplace]
              const isExpanded = expandedMarketplace === marketplace
              const avgScore = marketplaceListings.reduce((sum, l) => sum + (l.match_score || 0), 0) / marketplaceListings.length

              return (
                <div key={marketplace} style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)',
                  overflow: 'hidden'
                }}>
                  {/* Marketplace Header */}
                  <button
                    onClick={() => setExpandedMarketplace(isExpanded ? null : marketplace)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {marketplace.toLowerCase().includes('ebay') ? '🛍️' :
                         marketplace.toLowerCase().includes('amazon') ? '📦' :
                         marketplace.toLowerCase().includes('facebook') ? '👥' :
                         marketplace.toLowerCase().includes('craigslist') ? '📋' :
                         marketplace.toLowerCase().includes('mercari') ? '🏷️' :
                         marketplace.toLowerCase().includes('offerup') ? '📱' : '🛒'}
                      </span>
                      <span style={{ fontWeight: '500' }}>{marketplace}</span>
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'var(--glass-bg)', 
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                      }}>
                        {marketplaceListings.length} listing{marketplaceListings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        color: getMatchScoreColor(avgScore),
                        fontFamily: 'var(--font-mono)'
                      }}>
                        Avg: {Math.round(avgScore * 100)}% match
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Listings */}
                  {isExpanded && (
                    <div style={{ 
                      padding: '0 16px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {getSortedListings(marketplaceListings).map((listing, idx) => (
                        <div 
                          key={listing.id || idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--glass-bg)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--glass-border)'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '14px', 
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {listing.title}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: 'var(--text-muted)',
                              marginTop: '4px',
                              display: 'flex',
                              gap: '12px'
                            }}>
                              {listing.price && (
                                <span style={{ color: 'var(--risk-low)' }}>
                                  ${listing.price.toFixed(2)}
                                </span>
                              )}
                              {listing.seller_name && (
                                <span>Seller: {listing.seller_name}</span>
                              )}
                              {listing.seller_rating && (
                                <span>⭐ {listing.seller_rating}</span>
                              )}
                            </div>
                            {listing.match_reasons?.length > 0 && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: 'var(--text-muted)',
                                marginTop: '4px'
                              }}>
                                {listing.match_reasons.join(' • ')}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                            {/* Match Score Badge */}
                            <div style={{
                              padding: '4px 8px',
                              background: `${getMatchScoreColor(listing.match_score || 0)}22`,
                              border: `1px solid ${getMatchScoreColor(listing.match_score || 0)}44`,
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: getMatchScoreColor(listing.match_score || 0),
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {Math.round((listing.match_score || 0) * 100)}% {getMatchScoreLabel(listing.match_score || 0)}
                            </div>
                            
                            {/* View Button */}
                            {listing.listing_url && (
                              <a
                                href={listing.listing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '6px 12px',
                                  background: 'var(--neon-cyan)',
                                  color: '#000',
                                  borderRadius: 'var(--radius-sm)',
                                  textDecoration: 'none',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                View →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary Stats */}
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Listings</span>
              <span style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {totalListings}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>High Confidence</span>
              <span style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--risk-high)' }}>
                {highConfidenceCount}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Marketplaces</span>
              <span style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
                {marketplaces.length}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Avg Price</span>
              <span style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--risk-low)' }}>
                ${listings.filter(l => l.price).length > 0 
                  ? (listings.filter(l => l.price).reduce((sum, l) => sum + l.price, 0) / listings.filter(l => l.price).length).toFixed(0)
                  : '—'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ListingsSummary
