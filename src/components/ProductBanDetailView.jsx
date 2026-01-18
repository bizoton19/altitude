import { useState, useEffect } from 'react'
import RiskBadge from './RiskBadge'
import ImageGallery from './ImageGallery'
import ListingsSummary from './ListingsSummary'
import ExportPanel from './ExportPanel'
import InvestigationSummaryCard from './InvestigationSummaryCard'
import * as api from '../services/api'

/**
 * ProductBanDetailView Component
 * Full detail view for a selected product ban with image gallery and marketplace listings
 */
function ProductBanDetailView({ productBan, onClose, onInvestigationClick, onDelete }) {
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [searchingMarketplaces, setSearchingMarketplaces] = useState(false)
  const [investigations, setInvestigations] = useState([])
  const [loadingInvestigations, setLoadingInvestigations] = useState(false)

  // Helper to get value from either format (API snake_case or JSON PascalCase)
  const get = (snakeCase, pascalCase) => productBan[snakeCase] || productBan[pascalCase]

  const violationId = get('product_ban_id', 'ProductBanID') || get('violation_id', 'ViolationID') || get('recall_id', 'RecallID') // Support both for compatibility
  const title = get('title', 'Title')
  const violationNumber = get('ban_number', 'BanNumber') || get('violation_number', 'ViolationNumber') || get('recall_number', 'RecallNumber')
  const violationDate = get('ban_date', 'BanDate') || get('violation_date', 'ViolationDate') || get('recall_date', 'RecallDate')
  const description = get('description', 'Description')
  const riskLevel = get('risk_level', 'riskLevel')
  const sourceUrl = get('url', 'URL') || get('source_url', 'URL')
  const products = get('products', 'Products') || []
  const images = get('images', 'Images') || []
  const hazards = get('hazards', 'Hazards') || []
  const remedies = get('remedies', 'Remedies') || []
  const injuries = get('injuries', 'Injuries')
  const deaths = get('deaths', 'Deaths')

  // Fetch existing listings on mount
  useEffect(() => {
    const fetchListings = async () => {
      if (!violationId) return
      
      setLoadingListings(true)
      try {
        const existingListings = await api.getViolationListings(violationId)
        setListings(existingListings || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
      } finally {
        setLoadingListings(false)
      }
    }

    fetchListings()
  }, [violationId])

  // Fetch investigations for this violation
  useEffect(() => {
    const fetchInvestigations = async () => {
      if (!violationId) return
      
      setLoadingInvestigations(true)
      try {
        const investigationData = await api.getInvestigationsByViolation(violationId)
        setInvestigations(investigationData || [])
      } catch (err) {
        console.error('Error fetching investigations:', err)
      } finally {
        setLoadingInvestigations(false)
      }
    }

    fetchInvestigations()
  }, [violationId])

  // Search marketplaces for this violation
  const handleSearchMarketplaces = async () => {
    if (!violationId) return
    
    setSearchingMarketplaces(true)
    try {
      const results = await api.searchMarketplaces(violationId)
      // Flatten listings from all marketplaces
      const allListings = results.flatMap(r => r.listings || [])
      setListings(allListings)
    } catch (err) {
      console.error('Error searching marketplaces:', err)
    } finally {
      setSearchingMarketplaces(false)
    }
  }

  if (!productBan) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  const getUnits = () => {
    if (!products || products.length === 0) return 'Unknown'
    return products[0].NumberOfUnits || products[0].units_sold || 'Unknown'
  }

  const getProductName = () => {
    if (!products || products.length === 0) return 'Unknown Product'
    return products[0].Name || products[0].name || 'Unknown Product'
  }

  const getManufacturer = () => {
    if (!products || products.length === 0) return null
    return products[0].manufacturer || products[0].Manufacturer
  }

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header with close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <RiskBadge riskLevel={riskLevel} />
          <h2 style={{ fontSize: '20px', fontWeight: '500', marginTop: '8px', marginBottom: '8px' }}>
            {title || getProductName()}
          </h2>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '13px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap'
          }}>
            <span>#{violationNumber}</span>
            <span>•</span>
            <span>{formatDate(violationDate)}</span>
            <span>•</span>
            <span>{getUnits()} units</span>
            {typeof injuries === 'number' && injuries > 0 && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--risk-high)' }}>⚠ {injuries} injuries</span>
              </>
            )}
            {typeof deaths === 'number' && deaths > 0 && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--risk-high)' }}>💀 {deaths} deaths</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn"
              style={{ 
                padding: '8px 16px',
                background: 'rgba(255, 51, 102, 0.1)',
                border: '1px solid var(--risk-high)',
                color: 'var(--risk-high)'
              }}
            >
              🗑️ Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <ImageGallery images={images} />
      )}

      {/* Product Ban Details */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Product Ban Details
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '16px' }}>
          {description || 'No description available.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {products.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Product
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {getProductName()}
              </span>
            </div>
          )}

          {getManufacturer() && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Manufacturer
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {getManufacturer()}
              </span>
            </div>
          )}

          {hazards.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Hazards
              </span>
              <span style={{ color: 'var(--risk-medium)' }}>
                {hazards.map(h => h.description || h.Name).join(', ')}
              </span>
            </div>
          )}

          {remedies.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Remedy
              </span>
              <span style={{ color: 'var(--risk-low)' }}>
                {remedies.map(r => r.description || r.Name).join(', ')}
              </span>
            </div>
          )}
        </div>

        {sourceUrl && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              View Full Details on CPSC →
            </a>
          </div>
        )}
      </div>

      {/* Listings Summary Section */}
      <ListingsSummary 
        listings={listings}
        loading={loadingListings}
        searching={searchingMarketplaces}
        onSearch={handleSearchMarketplaces}
        recallId={violationId}
      />

      {/* Investigation Summary Section */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🔍 Investigations
          </h3>
          {investigations.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {investigations.length} investigation{investigations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loadingInvestigations ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : investigations.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            fontSize: '13px'
          }}>
            No investigations found for this violation
          </div>
        ) : (
          <div>
            {investigations.map((investigation) => (
              <InvestigationSummaryCard
                key={investigation.investigation_id}
                investigation={investigation}
                onClick={() => {
                  if (onInvestigationClick) {
                    onInvestigationClick(investigation)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Export Panel */}
      <ExportPanel 
        recall={productBan}
        marketplaceResults={listings}
      />
    </div>
  )
}

export default ProductBanDetailView
