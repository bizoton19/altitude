import { useState } from 'react'
import RiskBadge from './RiskBadge'
import ImageGallery from './ImageGallery'

/**
 * ProductBanCard Component
 * Displays product ban information in a futuristic glass card
 * Supports both API format (snake_case) and original JSON format (PascalCase)
 * Supports both violations and recalls for backward compatibility
 */
function ProductBanCard({ productBan, onClick, isSelected }) {
  const [expanded, setExpanded] = useState(false)

  if (!productBan) return null

  // Helper to get value from either format (violation or product ban fields)
  const get = (snakeCase, pascalCase, violationField = null) => {
    // Try violation field first if provided
    if (violationField && productBan[violationField]) return productBan[violationField]
    // Then try snake_case
    if (productBan[snakeCase]) return productBan[snakeCase]
    // Then try PascalCase
    if (productBan[pascalCase]) return productBan[pascalCase]
    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  // Get product ban number (support both old and new field names)
  const violationNumber = get('ban_number', 'BanNumber') || get('violation_number', 'ViolationNumber') || get('recall_number', 'RecallNumber')
  const violationDate = get('ban_date', 'BanDate') || get('violation_date', 'ViolationDate') || get('recall_date', 'RecallDate')
  
  // Get URL (violations use 'url', product bans use 'source_url')
  const violationUrl = get('url', 'URL', 'url') || get('source_url', 'URL')
  
  // Get agency info
  const agencyName = get('agency_name', 'AgencyName')
  const agencyAcronym = get('agency_acronym', 'AgencyAcronym')
  
  // Get images (violations have images array, summaries have image_url)
  const images = get('images', 'Images') || []
  const imageUrl = get('image_url', 'ImageURL')
  // If we have image_url but no images array, create an image object
  const displayImages = images.length > 0 ? images : (imageUrl ? [{ url: imageUrl }] : [])

  const getUnits = () => {
    const products = get('products', 'Products')
    if (!products || products.length === 0) {
      // Try units_affected for violations
      const unitsAffected = get('units_affected', 'UnitsAffected')
      return unitsAffected ? `${unitsAffected} units` : 'Unknown'
    }
    const firstProduct = products[0]
    return firstProduct.NumberOfUnits || firstProduct.units_sold || firstProduct.units_affected || 'Unknown'
  }

  const getProductName = () => {
    const products = get('products', 'Products')
    if (!products || products.length === 0) return null
    return products[0].Name || products[0].name || null
  }

  const riskLevel = get('risk_level', 'riskLevel')
  const title = get('title', 'Title') || getProductName() || 'Unknown Violation'
  const productName = getProductName()
  const description = get('description', 'Description')
  const injuries = get('injuries', 'Injuries')
  const deaths = get('deaths', 'Deaths')

  return (
    <div 
      className={`recall-card glass-panel ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={isSelected ? { borderColor: 'var(--neon-cyan)', boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' } : {}}
    >
      <div className="recall-card-header">
        <div style={{ flex: 1 }}>
          <RiskBadge riskLevel={riskLevel} />
          <h3 className="recall-card-title" style={{ marginTop: '8px' }}>
            {title}
          </h3>
          {productName && productName !== title && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
              Product: <strong>{productName}</strong>
            </p>
          )}
          <div className="recall-card-meta">
            <span>#{violationNumber}</span>
            <span>•</span>
            <span>{formatDate(violationDate)}</span>
            {agencyName && (
              <>
                <span>•</span>
                <span>{agencyAcronym || agencyName}</span>
              </>
            )}
            <span>•</span>
            <span>{getUnits()}</span>
            {(typeof injuries === 'number' && injuries > 0) && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--risk-high)' }}>⚠ {injuries} injuries</span>
              </>
            )}
            {(typeof deaths === 'number' && deaths > 0) && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--risk-high)' }}>💀 {deaths} deaths</span>
              </>
            )}
          </div>
        </div>
        <button 
          className="expand-btn"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {expanded ? '▲ COLLAPSE' : '▼ EXPAND'}
        </button>
      </div>

      {/* Images - show even when collapsed if available */}
      {displayImages.length > 0 && (
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <ImageGallery images={displayImages} />
        </div>
      )}

      <p className="recall-card-description" style={expanded ? { WebkitLineClamp: 'unset' } : {}}>
        {description || 'No description available.'}
      </p>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          {/* Products */}
          {get('products', 'Products')?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Products
              </span>
              {get('products', 'Products').map((p, idx) => (
                <div key={idx} style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                    {p.Name || p.name}
                  </div>
                  {(p.model_number || p.ModelNumber) && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      Model: {p.model_number || p.ModelNumber}
                    </div>
                  )}
                  {(p.manufacturer || p.Manufacturer) && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      Manufacturer: {p.manufacturer || p.Manufacturer}
                    </div>
                  )}
                  {(p.brand || p.Brand) && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      Brand: {p.brand || p.Brand}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Hazards */}
          {get('hazards', 'Hazards')?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Hazards
              </span>
              <div style={{ color: 'var(--risk-medium)', fontSize: '13px' }}>
                {get('hazards', 'Hazards').map((h, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    {h.description || h.Name || h.name}
                    {h.hazard_type && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>
                        ({h.hazard_type})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remedies */}
          {get('remedies', 'Remedies')?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Remedy
              </span>
              <div style={{ color: 'var(--risk-low)', fontSize: '13px' }}>
                {get('remedies', 'Remedies').map((r, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    {r.description || r.Name || r.name}
                    {r.remedy_type && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>
                        ({r.remedy_type})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agency Information */}
          {agencyName && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Regulatory Agency
              </span>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {agencyName}
                {agencyAcronym && agencyAcronym !== agencyName && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                    ({agencyAcronym})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Official Violation URL */}
          {violationUrl && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
              <a 
                href={violationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--neon-cyan)', 
                  fontSize: '13px', 
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                View Official Violation Details →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductBanCard
