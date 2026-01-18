import { useState, useEffect } from 'react'
import { createViolation, classifyViolationRisk } from '../services/api'
import RiskBadge from './RiskBadge'

const BanType = {
  RECALL: 'recall',
  WARNING: 'warning',
  ADVISORY: 'advisory',
  ALERT: 'alert',
  NOTICE: 'notice',
  BAN: 'ban',
  IMPORT_ALERT: 'import_alert',
  SAFETY_ADVISORY: 'safety_advisory',
}
// Backward compatibility
const ViolationType = BanType

function ProductBanForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    ban_number: '',
    title: '',
    url: '',
    agency_name: '',
    agency_acronym: '',
    agency_id: '',
    description: '',
    ban_date: '',
    ban_type: BanType.RECALL,
    units_affected: '',
    injuries: 0,
    deaths: 0,
    incidents: 0,
    country: '',
    region: '',
    products: [],
    hazards: [],
    remedies: [],
    images: [],
  })

  const [riskPreview, setRiskPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Update risk preview when relevant fields change
  useEffect(() => {
    const updateRiskPreview = async () => {
      if (formData.units_affected || formData.injuries || formData.deaths || formData.incidents || formData.hazards.length > 0) {
        try {
          const hazardDescriptions = formData.hazards.map(h => h.description).filter(Boolean)
          const result = await classifyViolationRisk({
            units_affected: parseInt(formData.units_affected) || 0,
            injuries: formData.injuries || 0,
            deaths: formData.deaths || 0,
            incidents: formData.incidents || 0,
            hazard_descriptions: hazardDescriptions,
          })
          setRiskPreview(result)
        } catch (err) {
          console.error('Error classifying risk:', err)
        }
      }
    }

    const timeoutId = setTimeout(updateRiskPreview, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.units_affected, formData.injuries, formData.deaths, formData.incidents, formData.hazards])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        name: '',
        description: '',
        model_number: '',
        serial_number: '',
        manufacturer: '',
        brand: '',
        distributor: '',
        importer: '',
        identifiers: {},
        product_metadata: {},
      }]
    }))
  }

  const updateProduct = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }))
  }

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }))
  }

  const addHazard = () => {
    setFormData(prev => ({
      ...prev,
      hazards: [...prev.hazards, { description: '', hazard_type: '', severity: '' }]
    }))
  }

  const updateHazard = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      hazards: prev.hazards.map((h, i) => i === index ? { ...h, [field]: value } : h)
    }))
  }

  const removeHazard = (index) => {
    setFormData(prev => ({
      ...prev,
      hazards: prev.hazards.filter((_, i) => i !== index)
    }))
  }

  const addRemedy = () => {
    setFormData(prev => ({
      ...prev,
      remedies: [...prev.remedies, { description: '', remedy_type: '', action_required: '' }]
    }))
  }

  const updateRemedy = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      remedies: prev.remedies.map((r, i) => i === index ? { ...r, [field]: value } : r)
    }))
  }

  const removeRemedy = (index) => {
    setFormData(prev => ({
      ...prev,
      remedies: prev.remedies.filter((_, i) => i !== index)
    }))
  }

  const addImage = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { url: '', caption: '', alt_text: '' }]
    }))
  }

  const updateImage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? { ...img, [field]: value } : img)
    }))
  }

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Validation
    if (!formData.ban_number || !formData.title || !formData.url || !formData.agency_name) {
      setError('Please fill in all required fields: Ban Number, Title, URL, and Agency Name')
      setSubmitting(false)
      return
    }

    try {
      // Prepare submission data (use new field names, backend will handle backward compatibility)
      const submissionData = {
        ban_number: formData.ban_number,
        title: formData.title,
        url: formData.url,
        agency_name: formData.agency_name,
        agency_acronym: formData.agency_acronym || undefined,
        agency_id: formData.agency_id || undefined,
        description: formData.description || undefined,
        ban_date: formData.ban_date || undefined,
        ban_type: formData.ban_type,
        units_affected: formData.units_affected ? parseInt(formData.units_affected) : undefined,
        injuries: formData.injuries || 0,
        deaths: formData.deaths || 0,
        incidents: formData.incidents || 0,
        country: formData.country || undefined,
        region: formData.region || undefined,
        agency_metadata: {},
      }

      const result = await createViolation(submissionData)
      
      // Note: Products, hazards, remedies, and images would need to be added via separate endpoints
      // or the backend endpoint would need to be updated to accept them in the create request
      
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      setError(err.message || 'Failed to create product ban')
      console.error('Error creating product ban:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ 
      padding: 'var(--space-xl)', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="glass-panel" style={{ 
        padding: 'var(--space-xl)', 
        marginBottom: 'var(--space-lg)',
        borderBottom: '2px solid var(--neon-cyan)'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          marginBottom: 'var(--space-sm)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)'
        }}>
          <span style={{ fontSize: '32px' }}>⚡</span>
          Create New Product Ban
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '14px',
          margin: 0
        }}>
          Enter product ban details manually. All fields marked with <span style={{ color: 'var(--risk-high)' }}>*</span> are required.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-panel alert-error" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Risk Preview */}
      {riskPreview && (
        <div className="glass-panel" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'rgba(0, 240, 255, 0.1)',
          borderColor: 'var(--neon-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Risk Preview:</span>
            <RiskBadge level={riskPreview.risk_level} />
          <span style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            Score: {(riskPreview.risk_score * 100).toFixed(1)}%
            </span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Core Information */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Core Information
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Ban Number <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.ban_number}
                onChange={(e) => handleChange('ban_number', e.target.value)}
                className="input"
                placeholder="e.g., CPSC-26156"
                required
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Title <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="input"
                placeholder="Brief description of the violation"
                required
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                URL <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                className="input"
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Ban Date
              </label>
              <input
                type="date"
                value={formData.ban_date}
                onChange={(e) => handleChange('ban_date', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Ban Type
              </label>
              <select
                value={formData.ban_type}
                onChange={(e) => handleChange('ban_type', e.target.value)}
                className="input"
                style={{ cursor: 'pointer' }}
              >
                {Object.values(BanType).map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="input"
                placeholder="Detailed description of the violation..."
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </section>

        {/* Agency Information */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Agency Information
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Agency Name <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.agency_name}
                onChange={(e) => handleChange('agency_name', e.target.value)}
                className="input"
                placeholder="e.g., Consumer Product Safety Commission"
                required
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Agency Acronym
              </label>
              <input
                type="text"
                value={formData.agency_acronym}
                onChange={(e) => handleChange('agency_acronym', e.target.value)}
                className="input"
                placeholder="e.g., CPSC"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Agency ID
              </label>
              <input
                type="text"
                value={formData.agency_id}
                onChange={(e) => handleChange('agency_id', e.target.value)}
                className="input"
                placeholder="Optional internal ID"
              />
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Statistics
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Units Affected
              </label>
              <input
                type="number"
                value={formData.units_affected}
                onChange={(e) => handleChange('units_affected', e.target.value)}
                min="0"
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Injuries
              </label>
              <input
                type="number"
                value={formData.injuries}
                onChange={(e) => handleChange('injuries', parseInt(e.target.value) || 0)}
                min="0"
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Deaths
              </label>
              <input
                type="number"
                value={formData.deaths}
                onChange={(e) => handleChange('deaths', parseInt(e.target.value) || 0)}
                min="0"
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Incidents
              </label>
              <input
                type="number"
                value={formData.incidents}
                onChange={(e) => handleChange('incidents', parseInt(e.target.value) || 0)}
                min="0"
                className="input"
                placeholder="0"
              />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>🌍</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Location
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Country (ISO Code)
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value.toUpperCase())}
                className="input"
                placeholder="US, CA, GB, etc."
                maxLength={2}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Region
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className="input"
                placeholder="North America, EU, APAC, etc."
              />
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                Products
              </h2>
            </div>
            <button
              type="button"
              onClick={addProduct}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                background: 'rgba(0, 240, 255, 0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 240, 255, 0.2)'
                e.target.style.boxShadow = '0 0 15px var(--shadow-glow)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 240, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <span>+</span> Add Product
            </button>
          </div>
          {formData.products.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No products added yet. Click "Add Product" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {formData.products.map((product, index) => (
                <div key={index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      margin: 0,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}>
                      <span>📦</span> Product {index + 1}
                    </h3>
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.1)'
                      }}
                >
                      ✕ Remove
                </button>
              </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Name
                      </label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        className="input"
                        placeholder="Product name"
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Manufacturer
                      </label>
                  <input
                    type="text"
                    value={product.manufacturer}
                    onChange={(e) => updateProduct(index, 'manufacturer', e.target.value)}
                        className="input"
                        placeholder="Manufacturer name"
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Brand
                      </label>
                  <input
                    type="text"
                    value={product.brand}
                    onChange={(e) => updateProduct(index, 'brand', e.target.value)}
                        className="input"
                        placeholder="Brand name"
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Model Number
                      </label>
                  <input
                    type="text"
                    value={product.model_number}
                    onChange={(e) => updateProduct(index, 'model_number', e.target.value)}
                        className="input"
                        placeholder="Model #"
                  />
                </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Description
                      </label>
                  <textarea
                    value={product.description}
                    onChange={(e) => updateProduct(index, 'description', e.target.value)}
                    rows={2}
                        className="input"
                        placeholder="Product description..."
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </section>

        {/* Hazards */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                Hazards
              </h2>
            </div>
            <button
              type="button"
              onClick={addHazard}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--risk-medium)',
                color: 'var(--risk-medium)',
                background: 'rgba(255, 170, 0, 0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 170, 0, 0.2)'
                e.target.style.boxShadow = '0 0 15px var(--risk-medium-glow)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 170, 0, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <span>+</span> Add Hazard
            </button>
          </div>
          {formData.hazards.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No hazards added yet. Click "Add Hazard" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {formData.hazards.map((hazard, index) => (
                <div key={index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      margin: 0,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}>
                      <span>⚠️</span> Hazard {index + 1}
                    </h3>
                <button
                  type="button"
                  onClick={() => removeHazard(index)}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.1)'
                      }}
                >
                      ✕ Remove
                </button>
              </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Description
                      </label>
                  <textarea
                    value={hazard.description}
                    onChange={(e) => updateHazard(index, 'description', e.target.value)}
                        rows={3}
                        className="input"
                        placeholder="Describe the hazard..."
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Type
                      </label>
                  <input
                    type="text"
                    value={hazard.hazard_type}
                    onChange={(e) => updateHazard(index, 'hazard_type', e.target.value)}
                        className="input"
                        placeholder="e.g., Fire, Choking"
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Severity
                      </label>
                  <input
                    type="text"
                    value={hazard.severity}
                    onChange={(e) => updateHazard(index, 'severity', e.target.value)}
                        className="input"
                    placeholder="Class I, II, III"
                  />
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </section>

        {/* Remedies */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '20px' }}>🔧</span>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                Remedies
              </h2>
            </div>
            <button
              type="button"
              onClick={addRemedy}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--risk-low)',
                color: 'var(--risk-low)',
                background: 'rgba(0, 255, 136, 0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 255, 136, 0.2)'
                e.target.style.boxShadow = '0 0 15px var(--risk-low-glow)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 255, 136, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <span>+</span> Add Remedy
            </button>
          </div>
          {formData.remedies.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No remedies added yet. Click "Add Remedy" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {formData.remedies.map((remedy, index) => (
                <div key={index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      margin: 0,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}>
                      <span>🔧</span> Remedy {index + 1}
                    </h3>
                <button
                  type="button"
                  onClick={() => removeRemedy(index)}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.1)'
                      }}
                >
                      ✕ Remove
                </button>
              </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Description
                      </label>
                  <textarea
                    value={remedy.description}
                    onChange={(e) => updateRemedy(index, 'description', e.target.value)}
                        rows={3}
                        className="input"
                        placeholder="Describe the recommended remedy..."
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Type
                      </label>
                  <input
                    type="text"
                    value={remedy.remedy_type}
                    onChange={(e) => updateRemedy(index, 'remedy_type', e.target.value)}
                        className="input"
                        placeholder="e.g., Refund, Repair"
                  />
                </div>
                <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Action Required
                      </label>
                  <input
                    type="text"
                    value={remedy.action_required}
                    onChange={(e) => updateRemedy(index, 'action_required', e.target.value)}
                        className="input"
                        placeholder="Required action"
                  />
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </section>

        {/* Images */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '20px' }}>🖼️</span>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                Images
              </h2>
            </div>
            <button
              type="button"
              onClick={addImage}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--neon-purple)',
                color: 'var(--neon-purple)',
                background: 'rgba(191, 0, 255, 0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(191, 0, 255, 0.2)'
                e.target.style.boxShadow = '0 0 15px rgba(191, 0, 255, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(191, 0, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <span>+</span> Add Image
            </button>
          </div>
          {formData.images.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No images added yet. Click "Add Image" to get started.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {formData.images.map((image, index) => (
                <div key={index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <h3 style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      margin: 0,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}>
                      <span>🖼️</span> Image {index + 1}
                    </h3>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 51, 102, 0.1)'
                      }}
                >
                      ✕ Remove
                </button>
              </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        marginBottom: 'var(--space-xs)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        URL
                      </label>
                  <input
                    type="url"
                    value={image.url}
                    onChange={(e) => updateImage(index, 'url', e.target.value)}
                        className="input"
                        placeholder="https://..."
                  />
                </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500',
                          marginBottom: 'var(--space-xs)',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Caption
                        </label>
                  <input
                    type="text"
                    value={image.caption}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                          className="input"
                          placeholder="Image caption"
                  />
                </div>
                <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '12px', 
                          fontWeight: '500',
                          marginBottom: 'var(--space-xs)',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Alt Text
                        </label>
                  <input
                    type="text"
                    value={image.alt_text}
                    onChange={(e) => updateImage(index, 'alt_text', e.target.value)}
                          className="input"
                          placeholder="Alt text"
                  />
                </div>
                    </div>
                    {image.url && (
                      <div style={{ 
                        marginTop: 'var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border)'
                      }}>
                        <img 
                          src={image.url} 
                          alt={image.alt_text || image.caption || 'Preview'} 
                          style={{ 
                            width: '100%', 
                            height: '200px', 
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
              </div>
            </div>
          ))}
            </div>
          )}
        </section>

        {/* Form Actions */}
        <div className="glass-panel" style={{ 
          padding: 'var(--space-lg)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-lg)'
        }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="glass-panel"
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                minWidth: '120px'
              }}
              disabled={submitting}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.target.style.background = 'var(--glass-bg-hover)'
                  e.target.style.borderColor = 'var(--glass-border-hover)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'var(--glass-border)'
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="glass-panel"
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              background: 'rgba(0, 240, 255, 0.1)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all var(--transition-fast)',
              minWidth: '180px',
              opacity: submitting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.target.style.background = 'rgba(0, 240, 255, 0.2)'
                e.target.style.boxShadow = '0 0 20px var(--shadow-glow)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 240, 255, 0.1)'
              e.target.style.boxShadow = 'none'
            }}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                Creating...
              </>
            ) : (
              <>
                <span>✓</span> Create Violation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductBanForm
