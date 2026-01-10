import { useState, useEffect } from 'react'
import RegionSelector from './RegionSelector'
import * as api from '../services/api'

const InvestigationSchedule = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
}

function InvestigationForm({ investigation, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: InvestigationSchedule.DAILY,
    scheduled_start_time: '',
    violation_ids: [],
    marketplace_ids: [],
    region_ids: {}, // {marketplace_id: [region_ids]}
  })

  const [violations, setViolations] = useState([])
  const [marketplaces, setMarketplaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Load violations and marketplaces
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [violationsData, marketplacesData] = await Promise.all([
          api.getViolations({ limit: 100 }),
          api.getMarketplaces(),
        ])
        setViolations(violationsData)
        setMarketplaces(marketplacesData)
      } catch (err) {
        setError('Failed to load data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Populate form if editing
  useEffect(() => {
    if (investigation) {
      setFormData({
        name: investigation.name || '',
        description: investigation.description || '',
        schedule: investigation.schedule || InvestigationSchedule.DAILY,
        scheduled_start_time: investigation.scheduled_start_time 
          ? new Date(investigation.scheduled_start_time).toISOString().slice(0, 16)
          : '',
        violation_ids: investigation.violation_ids || [],
        marketplace_ids: investigation.marketplace_ids || [],
        region_ids: investigation.region_ids || {},
      })
    }
  }, [investigation])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleViolationToggle = (violationId) => {
    const newIds = formData.violation_ids.includes(violationId)
      ? formData.violation_ids.filter(id => id !== violationId)
      : [...formData.violation_ids, violationId]
    handleChange('violation_ids', newIds)
  }

  const handleMarketplaceToggle = (marketplaceId) => {
    const newIds = formData.marketplace_ids.includes(marketplaceId)
      ? formData.marketplace_ids.filter(id => id !== marketplaceId)
      : [...formData.marketplace_ids, marketplaceId]
    
    // Clear regions for deselected marketplace
    const newRegionIds = { ...formData.region_ids }
    if (!newIds.includes(marketplaceId)) {
      delete newRegionIds[marketplaceId]
    }
    
    handleChange('marketplace_ids', newIds)
    handleChange('region_ids', newRegionIds)
  }

  const handleRegionChange = (marketplaceId, regionIds) => {
    const newRegionIds = { ...formData.region_ids }
    if (regionIds.length === 0) {
      delete newRegionIds[marketplaceId]
    } else {
      newRegionIds[marketplaceId] = regionIds
    }
    handleChange('region_ids', newRegionIds)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Validation
    if (!formData.name || !formData.scheduled_start_time || formData.violation_ids.length === 0 || formData.marketplace_ids.length === 0) {
      setError('Please fill in all required fields: Name, Start Time, at least one Violation, and at least one Marketplace')
      setSubmitting(false)
      return
    }

    try {
      const submissionData = {
        name: formData.name,
        description: formData.description || undefined,
        schedule: formData.schedule,
        scheduled_start_time: new Date(formData.scheduled_start_time).toISOString(),
        violation_ids: formData.violation_ids,
        marketplace_ids: formData.marketplace_ids,
        region_ids: Object.keys(formData.region_ids).length > 0 ? formData.region_ids : undefined,
      }

      let result
      if (investigation) {
        result = await api.updateInvestigation(investigation.investigation_id, submissionData)
      } else {
        result = await api.createInvestigation(submissionData)
      }
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      setError(err.message || 'Failed to create investigation')
      console.error('Error saving investigation:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
        padding: 'var(--space-xl)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-md)' }}></div>
          <div style={{ color: 'var(--text-secondary)' }}>Loading data...</div>
        </div>
      </div>
    )
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
        borderBottom: '2px solid var(--neon-purple)'
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
          <span style={{ fontSize: '32px' }}>🔍</span>
          {investigation ? 'Edit Investigation' : 'Create New Investigation'}
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '14px',
          margin: 0
        }}>
          Schedule automated searches for violations on marketplaces. All fields marked with <span style={{ color: 'var(--risk-high)' }}>*</span> are required.
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Basic Information */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Basic Information
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
                Name <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input"
                placeholder="e.g., Daily CPSC Recall Search"
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
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="input"
                placeholder="Describe the investigation purpose and scope..."
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>⏰</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Schedule
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
                Frequency <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <select
                value={formData.schedule}
                onChange={(e) => handleChange('schedule', e.target.value)}
                className="input"
                style={{ cursor: 'pointer' }}
                required
              >
                {Object.values(InvestigationSchedule).map(schedule => (
                  <option key={schedule} value={schedule}>
                    {schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                  </option>
                ))}
              </select>
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
                Start Time <span style={{ color: 'var(--risk-high)' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_start_time}
                onChange={(e) => handleChange('scheduled_start_time', e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
        </section>

        {/* Violations */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Violations to Investigate <span style={{ color: 'var(--risk-high)', fontSize: '14px' }}>*</span>
            </h2>
            {formData.violation_ids.length > 0 && (
              <span style={{ 
                marginLeft: 'auto',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                background: 'rgba(0, 240, 255, 0.1)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--neon-cyan)'
              }}>
                {formData.violation_ids.length} selected
              </span>
            )}
          </div>
          <div className="glass-panel" style={{ 
            maxHeight: '400px', 
            overflowY: 'auto', 
            padding: 'var(--space-sm)',
            border: '1px solid var(--glass-border)'
          }}>
            {violations.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--space-xl)', 
                color: 'var(--text-muted)',
                fontSize: '14px'
              }}>
                No violations available
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {violations.map((violation) => (
                  <label
                    key={violation.violation_id}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-md)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      border: formData.violation_ids.includes(violation.violation_id) 
                        ? '1px solid var(--neon-cyan)' 
                        : '1px solid var(--glass-border)',
                      background: formData.violation_ids.includes(violation.violation_id)
                        ? 'rgba(0, 240, 255, 0.1)'
                        : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = formData.violation_ids.includes(violation.violation_id)
                        ? 'rgba(0, 240, 255, 0.15)'
                        : 'var(--glass-bg-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = formData.violation_ids.includes(violation.violation_id)
                        ? 'rgba(0, 240, 255, 0.1)'
                        : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.violation_ids.includes(violation.violation_id)}
                      onChange={() => handleViolationToggle(violation.violation_id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--neon-cyan)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '500', 
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        {violation.title}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)'
                      }}>
                        <span>{violation.agency_name || violation.agency_acronym}</span>
                        <span>•</span>
                        <span>{violation.violation_number}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Marketplaces */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>🛒</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Marketplaces to Search <span style={{ color: 'var(--risk-high)', fontSize: '14px' }}>*</span>
            </h2>
            {formData.marketplace_ids.length > 0 && (
              <span style={{ 
                marginLeft: 'auto',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                background: 'rgba(0, 240, 255, 0.1)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--neon-cyan)'
              }}>
                {formData.marketplace_ids.length} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {marketplaces.map((marketplace) => (
              <div 
                key={marketplace.id} 
                className="glass-panel" 
                style={{
                  padding: 'var(--space-lg)',
                  border: formData.marketplace_ids.includes(marketplace.id)
                    ? '1px solid var(--neon-cyan)'
                    : '1px solid var(--glass-border)',
                  background: formData.marketplace_ids.includes(marketplace.id)
                    ? 'rgba(0, 240, 255, 0.05)'
                    : 'transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-md)',
                  cursor: 'pointer',
                  marginBottom: formData.marketplace_ids.includes(marketplace.id) && marketplace.supports_regions 
                    ? 'var(--space-md)' 
                    : 0
                }}>
                  <input
                    type="checkbox"
                    checked={formData.marketplace_ids.includes(marketplace.id)}
                    onChange={() => handleMarketplaceToggle(marketplace.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--neon-cyan)'
                    }}
                  />
                  <span style={{ 
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    fontSize: '15px'
                  }}>
                    {marketplace.name}
                  </span>
                  {marketplace.enabled === false && (
                    <span style={{ 
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 51, 102, 0.1)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--risk-high)'
                    }}>
                      Disabled
                    </span>
                  )}
                </label>
                {formData.marketplace_ids.includes(marketplace.id) && marketplace.supports_regions && (
                  <div style={{ marginTop: 'var(--space-md)', marginLeft: '34px' }}>
                    <RegionSelector
                      marketplaceId={marketplace.id}
                      selectedRegions={formData.region_ids[marketplace.id] || []}
                      onChange={(regionIds) => handleRegionChange(marketplace.id, regionIds)}
                    />
                  </div>
                )}
              </div>
            ))}
            {formData.marketplace_ids.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--space-xl)', 
                color: 'var(--text-muted)',
                fontSize: '14px'
              }}>
                Select at least one marketplace
              </div>
            )}
          </div>
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
              border: '1px solid var(--neon-purple)',
              color: 'var(--neon-purple)',
              background: 'rgba(191, 0, 255, 0.1)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all var(--transition-fast)',
              minWidth: '200px',
              opacity: submitting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.target.style.background = 'rgba(191, 0, 255, 0.2)'
                e.target.style.boxShadow = '0 0 20px rgba(191, 0, 255, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(191, 0, 255, 0.1)'
              e.target.style.boxShadow = 'none'
            }}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                Saving...
              </>
            ) : (
              <>
                <span>✓</span> {investigation ? 'Update Investigation' : 'Create Investigation'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default InvestigationForm
