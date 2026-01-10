import { useState, useEffect } from 'react'
import { useMarketplace } from '../context/MarketplaceContext'
import { searchMarketplaces, getMarketplaceSummary } from '../services/marketplaceService'

/**
 * MarketplaceResults Component
 * Displays aggregated marketplace search results with detailed listings and URLs
 */
function MarketplaceResults({ recall, onResultsChange, showDetailedListings = false }) {
  const { activePlatforms, hasActivePlatforms, availablePlatforms } = useMarketplace()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedPlatforms, setExpandedPlatforms] = useState({})

  useEffect(() => {
    if (recall && hasActivePlatforms()) {
      performSearch()
    } else {
      setResults([])
    }
  }, [recall, activePlatforms])

  const performSearch = async () => {
    if (!recall || !hasActivePlatforms()) return

    setLoading(true)
    setError(null)

    try {
      const marketplaceResults = await searchMarketplaces(recall, activePlatforms)
      setResults(marketplaceResults)
      onResultsChange?.(marketplaceResults)
      // Expand all platforms by default when showing detailed listings
      if (showDetailedListings) {
        const expanded = {}
        marketplaceResults.forEach(r => { expanded[r.platform] = true })
        setExpandedPlatforms(expanded)
      }
    } catch (err) {
      console.error('Error searching marketplaces:', err)
      setError('Failed to search marketplaces. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const togglePlatform = (platformId) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }))
  }

  if (!recall) return null

  if (!hasActivePlatforms()) {
    return (
      <div className="alert alert-info" style={{ marginTop: '24px' }}>
        <strong>ℹ️ No Marketplaces Added</strong>
        <p style={{ marginTop: '8px', marginBottom: 0 }}>
          Click the ⚙ settings button to add marketplaces and configure the search agent.
        </p>
      </div>
    )
  }

  const summary = getMarketplaceSummary(results)

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '500' }}>
          Marketplace Listings
        </h2>
        <button 
          onClick={performSearch}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          disabled={loading}
        >
          {loading ? '⟳ Searching...' : '⟳ Refresh Search'}
        </button>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Search Summary */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Search Summary
            </div>
            <div style={{ display: 'flex', gap: '24px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
              <span>
                Platforms: <strong style={{ color: 'var(--neon-cyan)' }}>{summary.platformsSearched}</strong>
              </span>
              <span>
                With Results: <strong style={{ color: 'var(--risk-low)' }}>{summary.platformsWithResults}</strong>
              </span>
              <span>
                Total Listings: <strong style={{ color: 'var(--risk-medium)' }}>{summary.totalListings}</strong>
              </span>
            </div>
          </div>

          {results.length === 0 || summary.totalListings === 0 ? (
            <div className="alert alert-warning">
              ⚠️ No listings found on any of the selected marketplaces. The agent will continue monitoring.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {results.map(platformResult => {
                const platform = availablePlatforms.find(p => p.id === platformResult.platform)
                const isExpanded = expandedPlatforms[platformResult.platform]
                
                return (
                  <div key={platformResult.platform} className="glass-panel" style={{ overflow: 'hidden' }}>
                    {/* Platform Header */}
                    <div 
                      onClick={() => togglePlatform(platformResult.platform)}
                      style={{ 
                        padding: '16px',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isExpanded && platformResult.listings.length > 0 ? '1px solid var(--glass-border)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>{platform?.icon || '🛒'}</span>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '2px' }}>
                            {platformResult.platformName}
                          </h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {platformResult.listings.length} listing{platformResult.listings.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {platformResult.listings.length > 0 && (
                          <span style={{ 
                            padding: '4px 8px',
                            background: 'rgba(255, 170, 0, 0.2)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: 'var(--risk-medium)',
                            fontWeight: '600'
                          }}>
                            ⚠️ POTENTIAL MATCHES
                          </span>
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Listings */}
                    {isExpanded && platformResult.listings.length > 0 && (
                      <div style={{ padding: '0 16px 16px' }}>
                        {platformResult.listings.map((listing, index) => (
                          <div 
                            key={listing.id}
                            style={{ 
                              padding: '16px',
                              marginTop: '12px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '8px',
                              border: '1px solid var(--glass-border)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                  {listing.title}
                                </h4>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                  <span>Seller: {listing.seller}</span>
                                  <span>•</span>
                                  <span>{listing.location}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                  fontSize: '18px', 
                                  fontWeight: '600', 
                                  color: 'var(--neon-cyan)',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {listing.price}
                                </div>
                                <span style={{ 
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  background: listing.availability === 'In Stock' 
                                    ? 'rgba(0, 255, 136, 0.2)' 
                                    : 'rgba(255, 170, 0, 0.2)',
                                  color: listing.availability === 'In Stock' 
                                    ? 'var(--risk-low)' 
                                    : 'var(--risk-medium)',
                                  borderRadius: '4px'
                                }}>
                                  {listing.availability}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                <span>
                                  Match Score: 
                                  <strong style={{ 
                                    marginLeft: '4px',
                                    color: listing.matchScore > 0.8 
                                      ? 'var(--risk-high)' 
                                      : listing.matchScore > 0.6 
                                        ? 'var(--risk-medium)' 
                                        : 'var(--risk-low)'
                                  }}>
                                    {(listing.matchScore * 100).toFixed(0)}%
                                  </strong>
                                </span>
                              </div>
                              <a
                                href={listing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ 
                                  padding: '6px 16px', 
                                  fontSize: '12px',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Listing →
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && platformResult.listings.length === 0 && (
                      <div style={{ padding: '0 16px 16px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No potential matches found on this platform.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MarketplaceResults
