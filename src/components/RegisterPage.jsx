/**
 * RegisterPage - Organization registration for first-time users
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import * as api from '../services/api'

function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(null)

  // Check if organization already exists on mount
  useEffect(() => {
    checkExistingOrganization()
  }, [])

  const checkExistingOrganization = async () => {
    try {
      const org = await api.getCurrentOrganization()
      // If organization exists, redirect to home
      if (org) {
        navigate('/', { replace: true })
      }
    } catch (err) {
      // 404 or error means no organization - that's fine, show registration
      if (!err.message?.includes('404') && !err.message?.includes('No organization')) {
        console.error('Error checking organization:', err)
      }
    } finally {
      setChecking(false)
    }
  }
  
  const [formData, setFormData] = useState({
    // Required
    organization_type: '',
    name: '',
    contact_email: '',
    
    // Optional - shared
    legal_name: '',
    contact_name: '',
    contact_phone: '',
    website: '',
    country: '',
    
    // Agency-specific
    acronym: '',
    
    // Company-specific
    industry: '',
    business_type: '',
    brands: [],
    
    // Import methods
    import_methods: ['file_upload']
  })

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Clean up empty optional fields
      const submitData = { ...formData }
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key]
        }
      })
      
      await api.createOrganization(submitData)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) {
      return formData.organization_type && formData.name && formData.contact_email
    }
    return true
  }

  const isAgency = formData.organization_type === 'regulatory_agency'
  const isCompany = formData.organization_type === 'company'

  // Shared input styles
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }

  // Show loading while checking for existing organization
  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }}></div>
          <div>Checking existing organization...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(20, 20, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '36px',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
        margin: '20px 0'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ 
            fontSize: '42px', 
            marginBottom: '12px',
            filter: 'drop-shadow(0 4px 12px rgba(100, 150, 255, 0.3))'
          }}>
            {isAgency ? '🏛️' : isCompany ? '🏢' : '✨'}
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#fff',
            marginBottom: '6px',
            letterSpacing: '-0.5px'
          }}>
            {step === 1 ? 'Welcome to Altitude' : 'Almost there...'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            {step === 1 ? 'Set up your organization to get started' : 'Just a few more details'}
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '28px',
          justifyContent: 'center'
        }}>
          {[1, 2].map(s => (
            <div
              key={s}
              style={{
                width: s <= step ? '60px' : '40px',
                height: '4px',
                borderRadius: '2px',
                background: s <= step 
                  ? 'linear-gradient(90deg, #4a90e2, #7c5ce0)' 
                  : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 80, 80, 0.1)',
            border: '1px solid rgba(255, 80, 80, 0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            color: '#ff6b6b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Organization Type */}
              <div>
                <label style={labelStyle}>Organization Type *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => updateField('organization_type', 'regulatory_agency')}
                    style={{
                      flex: 1,
                      padding: '16px 12px',
                      borderRadius: '10px',
                      border: isAgency 
                        ? '2px solid #4a90e2' 
                        : '1px solid rgba(255,255,255,0.1)',
                      background: isAgency
                        ? 'rgba(74, 144, 226, 0.15)'
                        : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏛️</div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>Regulatory Agency</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                      Issue official recalls
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('organization_type', 'company')}
                    style={{
                      flex: 1,
                      padding: '16px 12px',
                      borderRadius: '10px',
                      border: isCompany 
                        ? '2px solid #7c5ce0' 
                        : '1px solid rgba(255,255,255,0.1)',
                      background: isCompany
                        ? 'rgba(124, 92, 224, 0.15)'
                        : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏢</div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>Company</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                      Voluntary recalls
                    </div>
                  </button>
                </div>
              </div>

              {/* Organization Name */}
              <div>
                <label style={labelStyle}>Organization Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  style={inputStyle}
                  placeholder={isAgency 
                    ? 'e.g., Consumer Product Safety Commission' 
                    : isCompany
                    ? 'e.g., Acme Corporation'
                    : 'Enter organization name'}
                  required
                />
              </div>

              {/* Acronym (for agencies) */}
              {isAgency && (
                <div>
                  <label style={labelStyle}>Acronym</label>
                  <input
                    type="text"
                    value={formData.acronym}
                    onChange={(e) => updateField('acronym', e.target.value.toUpperCase())}
                    style={inputStyle}
                    placeholder="e.g., CPSC, FDA, NHTSA"
                    maxLength={10}
                  />
                </div>
              )}

              {/* Contact Email */}
              <div>
                <label style={labelStyle}>Contact Email *</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  style={inputStyle}
                  placeholder={isAgency ? 'admin@agency.gov' : 'contact@company.com'}
                  required
                />
              </div>

              {/* Next button */}
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceed()}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '600',
                  marginTop: '8px',
                  background: canProceed() 
                    ? 'linear-gradient(135deg, #4a90e2, #7c5ce0)' 
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  opacity: canProceed() ? 1 : 0.5,
                  transition: 'all 0.2s',
                  boxShadow: canProceed() ? '0 4px 20px rgba(74, 144, 226, 0.3)' : 'none'
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Additional Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Contact Name */}
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  style={inputStyle}
                  placeholder="Primary contact person"
                />
              </div>

              {/* Two column layout */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    style={inputStyle}
                    placeholder="https://..."
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select...</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Company-specific fields */}
              {isCompany && (
                <>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Industry</label>
                      <select
                        value={formData.industry}
                        onChange={(e) => updateField('industry', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select...</option>
                        <option value="toys">Toys & Games</option>
                        <option value="electronics">Electronics</option>
                        <option value="food">Food & Beverages</option>
                        <option value="automotive">Automotive</option>
                        <option value="household">Household</option>
                        <option value="cosmetics">Cosmetics</option>
                        <option value="medical">Medical Devices</option>
                        <option value="clothing">Clothing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Business Type</label>
                      <select
                        value={formData.business_type}
                        onChange={(e) => updateField('business_type', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select...</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="distributor">Distributor</option>
                        <option value="retailer">Retailer</option>
                        <option value="importer">Importer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Legal Name (if different)</label>
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => updateField('legal_name', e.target.value)}
                      style={inputStyle}
                      placeholder="Registered legal entity name"
                    />
                  </div>
                </>
              )}

              {/* Agency-specific fields */}
              {isAgency && (
                <div>
                  <label style={labelStyle}>Legal Name (if different)</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => updateField('legal_name', e.target.value)}
                    style={inputStyle}
                    placeholder="Full official name"
                  />
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #4a90e2, #7c5ce0)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(74, 144, 226, 0.3)'
                  }}
                >
                  {loading ? 'Creating...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </form>

      </div>
    </div>
  )
}

export default RegisterPage
