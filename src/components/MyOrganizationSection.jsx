import { useState, useEffect } from 'react'
import * as api from '../services/api'

/**
 * MyOrganizationSection Component
 * Manages agency/company profile and import method configuration
 */
function MyOrganizationSection() {
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showRegistration, setShowRegistration] = useState(false)

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    setLoading(true)
    try {
      // Get current user's organization
      const org = await api.getCurrentOrganization()
      setOrganization(org)
    } catch (err) {
      // No organization registered
      setOrganization(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // Not registered - show registration option
  if (!organization) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>
            Register Your Organization
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Register as a regulatory agency or company to start importing violations and recalls
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => setShowRegistration('regulatory_agency')}
            className="glass-panel"
            style={{
              padding: 'var(--space-xl)',
              border: '2px solid var(--glass-border)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🏛️</div>
            <h3 style={{ fontSize: '20px', marginBottom: 'var(--space-sm)' }}>Regulatory Agency</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              For government agencies that issue mandatory recalls and violations
            </p>
          </button>

          <button
            onClick={() => setShowRegistration('company')}
            className="glass-panel"
            style={{
              padding: 'var(--space-xl)',
              border: '2px solid var(--glass-border)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🏢</div>
            <h3 style={{ fontSize: '20px', marginBottom: 'var(--space-sm)' }}>Company</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              For manufacturers and companies that issue voluntary recalls
            </p>
          </button>
        </div>

        {showRegistration && (
          <OrganizationRegistrationForm
            type={showRegistration}
            onSuccess={() => {
              setShowRegistration(false)
              loadOrganization()
            }}
            onCancel={() => setShowRegistration(false)}
          />
        )}
      </div>
    )
  }

  // Show organization profile and settings
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Organization Profile */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-xs)' }}>
              {organization.organization_type === 'regulatory_agency' ? '🏛️' : '🏢'} {organization.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {organization.organization_type === 'regulatory_agency' ? 'Regulatory Agency' : 'Company'} Profile
            </p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="btn btn-secondary"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {editing ? (
          <OrganizationEditForm
            organization={organization}
            onSuccess={(updated) => {
              setOrganization(updated)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <OrganizationProfileView organization={organization} />
        )}
      </div>

      {/* Import Methods Configuration */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>
          Import Methods Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 'var(--space-lg)' }}>
          Configure how you want to import violations and recalls into the system
        </p>
        <ImportMethodsConfig organization={organization} onUpdate={loadOrganization} />
      </div>
    </div>
  )
}

/**
 * Organization Registration Form
 */
function OrganizationRegistrationForm({ type, onSuccess, onCancel }) {
  const [step, setStep] = useState(1) // 1: Basic info, 2: Import methods
  const [formData, setFormData] = useState({
    organization_type: type,
    // Basic info
    name: '',
    acronym: type === 'regulatory_agency' ? '' : undefined,
    legal_name: type === 'company' ? '' : undefined,
    contact_email: '',
    contact_name: '',
    website: '',
    country: '',
    region: '',
    // Company-specific
    industry: type === 'company' ? '' : undefined,
    business_type: type === 'company' ? '' : undefined,
    brands: type === 'company' ? [] : undefined,
    // Import methods
    import_methods: [],
    // API config
    api_endpoint: '',
    api_method: 'GET',
    api_auth_type: '',
    api_key: '',
    // File upload config
    file_upload_method: '',
    // Blob storage config
    blob_storage_provider: '',
    blob_storage_container: '',
    blob_storage_path: '',
    blob_storage_region: '',
    blob_storage_endpoint: '',
    blob_storage_access_key: '',
    blob_storage_secret_key: '',
    // Email config
    email_import_address: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await api.createOrganization(formData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to register organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-xl)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '20px' }}>
          {step === 1 ? 'Step 1: Basic Information' : 'Step 2: Import Methods'}
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <span style={{ 
            padding: '4px 12px', 
            background: step === 1 ? 'var(--neon-cyan)' : 'var(--glass-bg)',
            color: step === 1 ? '#000' : 'var(--text-secondary)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            1
          </span>
          <span style={{ 
            padding: '4px 12px', 
            background: step === 2 ? 'var(--neon-cyan)' : 'var(--glass-bg)',
            color: step === 2 ? '#000' : 'var(--text-secondary)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            2
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>
          {error}
        </div>
      )}

      {step === 1 ? (
        <BasicInfoForm
          type={type}
          formData={formData}
          setFormData={setFormData}
          onNext={() => setStep(2)}
          onCancel={onCancel}
        />
      ) : (
        <ImportMethodsForm
          type={type}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onBack={() => setStep(1)}
          loading={loading}
        />
      )}
    </div>
  )
}

/**
 * Basic Information Form (Step 1)
 */
function BasicInfoForm({ type, formData, setFormData, onNext, onCancel }) {
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div>
          <label className="label">
            {type === 'regulatory_agency' ? 'Agency Name' : 'Company Name'} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="input"
            required
            placeholder={type === 'regulatory_agency' ? 'Consumer Product Safety Commission' : 'Toy Company Inc.'}
          />
        </div>

        {type === 'regulatory_agency' && (
          <div>
            <label className="label">Agency Acronym</label>
            <input
              type="text"
              value={formData.acronym}
              onChange={(e) => updateField('acronym', e.target.value)}
              className="input"
              placeholder="CPSC"
            />
          </div>
        )}

        {type === 'company' && (
          <>
            <div>
              <label className="label">Legal Name</label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => updateField('legal_name', e.target.value)}
                className="input"
                placeholder="Toy Company Inc. (Legal Entity)"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label className="label">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className="input"
                  placeholder="Toys, Electronics, Food, etc."
                />
              </div>
              <div>
                <label className="label">Business Type</label>
                <select
                  value={formData.business_type}
                  onChange={(e) => updateField('business_type', e.target.value)}
                  className="input"
                >
                  <option value="">Select...</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="distributor">Distributor</option>
                  <option value="retailer">Retailer</option>
                  <option value="importer">Importer</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div>
            <label className="label">Contact Email *</label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => updateField('contact_email', e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Contact Name</label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div>
            <label className="label">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
              className="input"
              placeholder="US, CA, GB, etc."
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Next: Configure Import Methods →
        </button>
      </div>
    </form>
  )
}

/**
 * Import Methods Form (Step 2)
 */
function ImportMethodsForm({ type, formData, setFormData, onSubmit, onBack, loading }) {
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleImportMethod = (method) => {
    setFormData(prev => {
      const methods = prev.import_methods || []
      if (methods.includes(method)) {
        return { ...prev, import_methods: methods.filter(m => m !== method) }
      } else {
        return { ...prev, import_methods: [...methods, method] }
      }
    })
  }

  const importMethods = [
    { id: 'api', label: 'REST API', description: 'Connect via HTTP API endpoint' },
    { id: 'file_upload', label: 'File Upload (Browser)', description: 'Upload CSV/JSON files through the web interface' },
    { id: 'blob_storage', label: 'Blob Storage Import', description: 'Automatically import files from blob storage (S3, Azure, GCS, etc.)' },
    { id: 'email', label: 'Email Import', description: 'Send violation data via email attachments' }
  ]

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div>
          <label className="label" style={{ marginBottom: 'var(--space-md)' }}>
            Select Import Methods *
          </label>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Choose how you want to import violations and recalls. You can select multiple methods.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            {importMethods.map(method => (
              <label
                key={method.id}
                style={{
                  padding: 'var(--space-md)',
                  border: `2px solid ${formData.import_methods?.includes(method.id) ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: formData.import_methods?.includes(method.id) ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.import_methods?.includes(method.id)}
                  onChange={() => toggleImportMethod(method.id)}
                  style={{ marginRight: 'var(--space-sm)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{method.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{method.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* API Configuration */}
        {formData.import_methods?.includes('api') && (
          <div style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <h4 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>API Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label className="label">API Endpoint URL *</label>
                <input
                  type="url"
                  value={formData.api_endpoint}
                  onChange={(e) => updateField('api_endpoint', e.target.value)}
                  className="input"
                  placeholder="https://api.example.com/violations"
                  required={formData.import_methods?.includes('api')}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">HTTP Method</label>
                  <select
                    value={formData.api_method}
                    onChange={(e) => updateField('api_method', e.target.value)}
                    className="input"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
                <div>
                  <label className="label">Authentication Type</label>
                  <select
                    value={formData.api_auth_type}
                    onChange={(e) => updateField('api_auth_type', e.target.value)}
                    className="input"
                  >
                    <option value="">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="api_key">API Key</option>
                  </select>
                </div>
              </div>
              {formData.api_auth_type && (
                <div>
                  <label className="label">
                    {formData.api_auth_type === 'bearer' ? 'Bearer Token' : 
                     formData.api_auth_type === 'basic' ? 'Basic Auth Credentials' : 
                     'API Key'} *
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => updateField('api_key', e.target.value)}
                    className="input"
                    required={formData.import_methods?.includes('api') && formData.api_auth_type}
                    placeholder="Enter credentials..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blob Storage File Import Configuration */}
        {(formData.import_methods?.includes('blob_storage') || formData.import_methods?.includes('file_upload')) && (
          <div style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <h4 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>File Import Configuration</h4>
            {formData.import_methods?.includes('blob_storage') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label className="label">File Upload Method</label>
                  <select
                    value={formData.file_upload_method}
                    onChange={(e) => updateField('file_upload_method', e.target.value)}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="blob_storage">Blob Storage</option>
                    <option value="sftp">SFTP</option>
                  </select>
                </div>
                {formData.file_upload_method === 'blob_storage' && (
                  <>
                    <div>
                      <label className="label">Storage Provider</label>
                      <select
                        value={formData.blob_storage_provider}
                        onChange={(e) => updateField('blob_storage_provider', e.target.value)}
                        className="input"
                      >
                        <option value="">Select provider...</option>
                        <option value="s3">AWS S3</option>
                        <option value="azure">Azure Blob Storage</option>
                        <option value="gcs">Google Cloud Storage</option>
                        <option value="custom">Custom/Other</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <div>
                        <label className="label">Container/Bucket Name</label>
                        <input
                          type="text"
                          value={formData.blob_storage_container}
                          onChange={(e) => updateField('blob_storage_container', e.target.value)}
                          className="input"
                          placeholder="my-violations-bucket"
                        />
                      </div>
                      <div>
                        <label className="label">Region</label>
                        <input
                          type="text"
                          value={formData.blob_storage_region}
                          onChange={(e) => updateField('blob_storage_region', e.target.value)}
                          className="input"
                          placeholder="us-east-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Path Prefix (Optional)</label>
                      <input
                        type="text"
                        value={formData.blob_storage_path}
                        onChange={(e) => updateField('blob_storage_path', e.target.value)}
                        className="input"
                        placeholder="violations/2024/"
                      />
                    </div>
                    {formData.blob_storage_provider === 'custom' && (
                      <div>
                        <label className="label">Custom Endpoint URL</label>
                        <input
                          type="text"
                          value={formData.blob_storage_endpoint}
                          onChange={(e) => updateField('blob_storage_endpoint', e.target.value)}
                          className="input"
                          placeholder="https://custom-storage.example.com"
                        />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <div>
                        <label className="label">Access Key / Account Name</label>
                        <input
                          type="password"
                          value={formData.blob_storage_access_key}
                          onChange={(e) => updateField('blob_storage_access_key', e.target.value)}
                          className="input"
                          placeholder="Access key or account name..."
                        />
                      </div>
                      <div>
                        <label className="label">Secret Key / Account Key</label>
                        <input
                          type="password"
                          value={formData.blob_storage_secret_key}
                          onChange={(e) => updateField('blob_storage_secret_key', e.target.value)}
                          className="input"
                          placeholder="Secret key or account key..."
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email Import Configuration */}
        {formData.import_methods?.includes('email') && (
          <div style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <h4 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>Email Import Configuration</h4>
            <div>
              <label className="label">Email Address for Violations</label>
              <input
                type="email"
                value={formData.email_import_address}
                onChange={(e) => updateField('email_import_address', e.target.value)}
                className="input"
                placeholder="violations@yourcompany.com"
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                Send violation data as email attachments to this address
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)' }}>
        <button type="button" onClick={onBack} className="btn btn-secondary">
          ← Back
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || !formData.import_methods?.length}>
          {loading ? 'Registering...' : 'Complete Registration'}
        </button>
      </div>
    </form>
  )
}

/**
 * Organization Profile View
 */
function OrganizationProfileView({ organization }) {
  if (!organization) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
      <div>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Contact Information</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <div><strong>Email:</strong> {organization.contact_email || 'N/A'}</div>
          <div><strong>Contact:</strong> {organization.contact_name || 'N/A'}</div>
          <div><strong>Website:</strong> {organization.website ? <a href={organization.website} target="_blank" rel="noopener">{organization.website}</a> : 'N/A'}</div>
        </div>
      </div>
      <div>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>Location</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <div><strong>Country:</strong> {organization.country || 'N/A'}</div>
          <div><strong>Region:</strong> {organization.region || 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Organization Edit Form
 */
function OrganizationEditForm({ organization, onSuccess, onCancel }) {
  // Similar to registration form but for editing
  // Implementation similar to BasicInfoForm
  return (
    <div>
      <p>Edit form (to be implemented)</p>
      <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
    </div>
  )
}

/**
 * Import Methods Configuration
 */
function ImportMethodsConfig({ organization, onUpdate }) {
  if (!organization) return null

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {organization.import_methods?.length > 0 ? (
          organization.import_methods.map(method => (
            <div key={method} style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
                {method === 'api' ? 'REST API' :
                 method === 'file_upload' ? 'File Upload (Browser)' :
                 method === 'blob_storage' ? 'Blob Storage Import' :
                 method === 'email' ? 'Email Import' : method}
              </div>
              {method === 'api' && organization.api_endpoint && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Endpoint: {organization.api_endpoint}
                </div>
              )}
              {method === 'blob_storage' && organization.blob_storage_container && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {organization.blob_storage_provider ? `${organization.blob_storage_provider.toUpperCase()}: ` : ''}
                  {organization.blob_storage_container}
                </div>
              )}
              {method === 'email' && organization.email_import_address && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Email: {organization.email_import_address}
                </div>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No import methods configured</p>
        )}
      </div>
    </div>
  )
}

export default MyOrganizationSection

