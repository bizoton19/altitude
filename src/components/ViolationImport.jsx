import { useState, useRef, useEffect } from 'react'
import * as api from '../services/api'

// Standard ViolationCreate fields for mapping
const STANDARD_FIELDS = [
  // Core violation fields
  { value: 'violation_number', label: 'Violation Number', category: 'core' },
  { value: 'title', label: 'Title', category: 'core' },
  { value: 'url', label: 'URL', category: 'core' },
  { value: 'description', label: 'Description', category: 'core' },
  { value: 'violation_date', label: 'Violation Date', category: 'core' },
  { value: 'units_affected', label: 'Units Affected', category: 'core' },
  { value: 'injuries', label: 'Injuries', category: 'core' },
  { value: 'deaths', label: 'Deaths', category: 'core' },
  { value: 'incidents', label: 'Incidents', category: 'core' },
  { value: 'country', label: 'Country', category: 'core' },
  { value: 'region', label: 'Region', category: 'core' },
  { value: 'agency_name', label: 'Agency Name', category: 'core' },
  { value: 'agency_acronym', label: 'Agency Acronym', category: 'core' },
  { value: 'agency_id', label: 'Agency ID', category: 'core' },
  
  // Hazard fields (can be arrays/JSON)
  { value: 'hazards', label: 'Hazards (Array/JSON)', category: 'hazards' },
  { value: 'hazard_description', label: 'Hazard Description', category: 'hazards' },
  { value: 'hazard_type', label: 'Hazard Type', category: 'hazards' },
  { value: 'hazard_severity', label: 'Hazard Severity', category: 'hazards' },
  
  // Image fields (can be arrays/JSON)
  { value: 'images', label: 'Images (Array/JSON)', category: 'images' },
  { value: 'image_url', label: 'Image URL', category: 'images' },
  { value: 'image_caption', label: 'Image Caption', category: 'images' },
  { value: 'image_alt_text', label: 'Image Alt Text', category: 'images' },
  
  // Remedy fields (can be arrays/JSON)
  { value: 'remedies', label: 'Remedies (Array/JSON)', category: 'remedies' },
  { value: 'remedy_description', label: 'Remedy Description', category: 'remedies' },
  { value: 'remedy_type', label: 'Remedy Type', category: 'remedies' },
  { value: 'remedy_action_required', label: 'Remedy Action Required', category: 'remedies' },
]

const DATA_TYPES = ['string', 'integer', 'float', 'date', 'boolean']

function ViolationImport() {
  // File selection state
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [delimiter, setDelimiter] = useState(',')
  const [hasHeader, setHasHeader] = useState(true)
  
  // Preview state
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: File select, 2: Mapping, 3: Import
  
  // Mapping state
  const [useAutoMapping, setUseAutoMapping] = useState(true)
  const [fieldMappings, setFieldMappings] = useState({}) // {sourceField: targetField}
  const [fieldDataTypes, setFieldDataTypes] = useState({}) // {sourceField: dataType}
  const [customFieldMappings, setCustomFieldMappings] = useState({}) // {sourceField: customFieldName} for agency_metadata
  
  // Import state
  const [organizationId, setOrganizationId] = useState('')
  const [currentOrganization, setCurrentOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [isJointRecall, setIsJointRecall] = useState(false)
  const [jointOrganizationId, setJointOrganizationId] = useState('')
  const [autoClassifyRisk, setAutoClassifyRisk] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const previewAbortRef = useRef(null)

  // Load current organization on mount
  useEffect(() => {
    let isMounted = true
    
    const load = async () => {
      try {
        await loadCurrentOrganization()
      } catch (err) {
        if (isMounted) {
          console.error('Error loading organization:', err)
        }
      }
    }
    
    load()
    
    return () => {
      isMounted = false
    }
  }, [])

  const loadCurrentOrganization = async () => {
    setLoadingOrgs(true)
    try {
      // Get current user's organization (required)
      try {
        const currentOrg = await api.getCurrentOrganization()
        if (currentOrg) {
          setCurrentOrganization(currentOrg)
          setOrganizationId(currentOrg.organization_id)
        } else {
          setError('No organization found. Please register your organization in Settings → My Organization first.')
        }
      } catch (orgErr) {
        // Handle 404 gracefully - organization doesn't exist yet
        if (orgErr.message && orgErr.message.includes('404')) {
          setError('No organization found. Please register your organization in Settings → My Organization first.')
        } else {
          throw orgErr
        }
      }
      
      // Load all organizations for joint recall selection
      try {
        const orgs = await api.getOrganizations({ status: 'ACTIVE' })
        setOrganizations(orgs)
      } catch (orgsErr) {
        // Non-critical - just log, don't block the UI
        console.warn('Failed to load organizations list:', orgsErr)
      }
    } catch (err) {
      console.error('Error loading organization:', err)
      // Only set error if it's not a 404 (which we handle above)
      if (!err.message || !err.message.includes('404')) {
        setError('Failed to load organization. Please ensure you have registered your organization in Settings → My Organization.')
      }
    } finally {
      setLoadingOrgs(false)
    }
  }

  const detectFileType = (filename) => {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.csv')) return 'csv'
    if (lower.endsWith('.json')) return 'json'
    return null
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const detectedType = detectFileType(selectedFile.name)
    if (!detectedType) {
      setError('Please select a CSV or JSON file (.csv or .json)')
      return
    }

    // Cancel any previous preview request
    if (previewAbortRef.current) {
      previewAbortRef.current.abort()
    }

    setFile(selectedFile)
    setFileType(detectedType)
    setError(null)
    setPreviewData(null)
    setStep(1)

    // Call preview endpoint
    setPreviewLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (detectedType === 'csv') {
        formData.append('delimiter', delimiter)
        formData.append('has_header', hasHeader.toString())
      }

      const preview = await api.previewViolationsFile(formData)
      
      setPreviewData(preview)
      
      // Initialize mappings with auto-detected mappings
      setFieldMappings(preview.detected_mappings || {})
      
      // Initialize data types from suggested data types
      const dataTypes = {}
      preview.fields.forEach(field => {
        if (field.suggested_data_type) {
          dataTypes[field.field_name] = field.suggested_data_type
        }
      })
      setFieldDataTypes(dataTypes)
      
      setStep(2) // Move to mapping step
    } catch (err) {
      // Ignore abort errors
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to preview file')
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleMappingChange = (sourceField, targetField) => {
    setFieldMappings(prev => ({
      ...prev,
      [sourceField]: targetField || null
    }))
  }

  const handleDataTypeChange = (sourceField, dataType) => {
    setFieldDataTypes(prev => ({
      ...prev,
      [sourceField]: dataType
    }))
  }

  const handleCustomFieldMapping = (sourceField, customFieldName) => {
    setCustomFieldMappings(prev => {
      const updated = { ...prev }
      if (customFieldName && customFieldName.trim()) {
        updated[sourceField] = customFieldName.trim()
      } else {
        delete updated[sourceField]
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      if (fileType) formData.append('file_type', fileType)
      
      if (fileType === 'csv') {
        formData.append('delimiter', delimiter)
        formData.append('has_header', hasHeader.toString())
      }
      
      // Add field mapping (use auto if enabled, otherwise use manual)
      const mapping = useAutoMapping 
        ? previewData?.detected_mappings || {}
        : fieldMappings
      
      // Remove null/empty mappings
      const cleanMapping = Object.fromEntries(
        Object.entries(mapping).filter(([k, v]) => v && v !== '')
      )
      
      if (Object.keys(cleanMapping).length > 0) {
        formData.append('field_mapping', JSON.stringify(cleanMapping))
      }
      
      // Add custom field mappings (for agency_metadata)
      if (Object.keys(customFieldMappings).length > 0) {
        formData.append('custom_field_mapping', JSON.stringify(customFieldMappings))
      }
      
      // Organization (required - use current organization)
      if (!organizationId || !currentOrganization) {
        setError('Organization is required. Please ensure you have registered your organization in Settings → My Organization.')
        setLoading(false)
        return
      }
      
      formData.append('organization_id', organizationId)
      formData.append('organization_name', currentOrganization.name)
      formData.append('organization_type', currentOrganization.organization_type)
      // Legacy fields for backward compatibility
      formData.append('agency_name', currentOrganization.name)
      if (currentOrganization.acronym) formData.append('agency_acronym', currentOrganization.acronym)
      formData.append('agency_id', organizationId)
      
      // Joint recall support
      if (isJointRecall && jointOrganizationId) {
        const jointOrg = organizations.find(o => o.organization_id === jointOrganizationId)
        if (jointOrg) {
          formData.append('joint_organization_id', jointOrganizationId)
          formData.append('joint_organization_name', jointOrg.name)
          formData.append('is_joint_recall', 'true')
        }
      }
      
      formData.append('auto_classify_risk', autoClassifyRisk.toString())
      formData.append('auto_investigate', 'true')

      const data = await api.importViolationsFromFile(formData)
      setResult(data)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Failed to import violations')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setFileType(null)
    setPreviewData(null)
    setFieldMappings({})
    setFieldDataTypes({})
    setUseAutoMapping(true)
    setStep(1)
    setError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
          📥 Violation File Import
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Upload a CSV or JSON file with violation data. Map fields and select data types before importing.
        </p>
      </div>

      {/* Step 1: File Selection */}
      {step === 1 && (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <label style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              File (CSV or JSON)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="input"
              style={{ cursor: 'pointer' }}
              disabled={previewLoading}
            />
            {file && (
              <p style={{ fontSize: '12px', color: 'var(--neon-cyan)', marginTop: 'var(--space-xs)' }}>
                ✓ Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB) - {fileType?.toUpperCase()}
              </p>
            )}
          </div>

          {fileType === 'csv' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 'var(--space-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Delimiter
                </label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="input"
                  style={{ cursor: 'pointer' }}
                  disabled={previewLoading}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Has Header Row
                </span>
                <div
                  onClick={() => !previewLoading && setHasHeader(!hasHeader)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: hasHeader ? 'var(--neon-cyan)' : 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    position: 'relative',
                    cursor: previewLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: previewLoading ? 0.5 : 1
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--text-primary)',
                    position: 'absolute',
                    top: '2px',
                    left: hasHeader ? '22px' : '2px',
                    transition: 'all 0.2s ease'
                  }} />
                </div>
              </div>
            </div>
          )}

          {previewLoading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
              Analyzing file structure...
            </div>
          )}
        </form>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && previewData && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* File Info */}
          <div className="glass-panel" style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
                  {previewData.total_rows} rows • {previewData.fields.length} fields • {previewData.file_type.toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Change File
              </button>
            </div>
          </div>

          {/* Mapping Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Use Auto-Mapping
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)', marginBottom: 0 }}>
                {useAutoMapping 
                  ? 'Using automatically detected field mappings'
                  : 'Manually map each field to violation fields'}
              </p>
            </div>
            <div
              onClick={() => setUseAutoMapping(!useAutoMapping)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: useAutoMapping ? 'var(--neon-cyan)' : 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--text-primary)',
                position: 'absolute',
                top: '2px',
                left: useAutoMapping ? '22px' : '2px',
                transition: 'all 0.2s ease'
              }} />
            </div>
          </div>

          {/* Field Mapping Table */}
          <div className="glass-panel" style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Field Mapping
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Source Field</th>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Detected Type</th>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Map To</th>
                    {!useAutoMapping && (
                      <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Data Type</th>
                    )}
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.fields.map((field, idx) => {
                    const currentMapping = useAutoMapping 
                      ? previewData.detected_mappings[field.field_name]
                      : fieldMappings[field.field_name]
                    const sampleValue = field.sample_values?.[0]
                    const displaySample = typeof sampleValue === 'string' && sampleValue.length > 30 
                      ? sampleValue.substring(0, 30) + '...'
                      : String(sampleValue || '')
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: 'var(--space-sm)' }}>
                          <code style={{ fontSize: '12px', color: 'var(--neon-cyan)' }}>{field.field_name}</code>
                        </td>
                        <td style={{ padding: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                          {field.detected_type}
                        </td>
                        <td style={{ padding: 'var(--space-sm)' }}>
                          {useAutoMapping ? (
                            <span style={{ color: currentMapping ? 'var(--risk-low)' : 'var(--text-muted)' }}>
                              {currentMapping || '(unmapped)'}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <select
                                value={currentMapping || ''}
                                onChange={(e) => handleMappingChange(field.field_name, e.target.value)}
                                className="input"
                                style={{ fontSize: '12px', padding: 'var(--space-xs)', minWidth: '180px' }}
                              >
                                <option value="">-- Skip --</option>
                                <optgroup label="Core Fields">
                                  {STANDARD_FIELDS.filter(f => f.category === 'core').map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Hazards">
                                  {STANDARD_FIELDS.filter(f => f.category === 'hazards').map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Images">
                                  {STANDARD_FIELDS.filter(f => f.category === 'images').map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Remedies">
                                  {STANDARD_FIELDS.filter(f => f.category === 'remedies').map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Custom Fields">
                                  <option value="__custom__">→ Map to Custom Field</option>
                                </optgroup>
                              </select>
                              {currentMapping === '__custom__' && (
                                <input
                                  type="text"
                                  placeholder="Custom field name"
                                  value={customFieldMappings[field.field_name] || ''}
                                  onChange={(e) => handleCustomFieldMapping(field.field_name, e.target.value)}
                                  className="input"
                                  style={{ 
                                    fontSize: '12px', 
                                    padding: 'var(--space-xs)', 
                                    width: '100%',
                                    minWidth: '150px'
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </td>
                        {!useAutoMapping && (
                          <td style={{ padding: 'var(--space-sm)' }}>
                            <select
                              value={fieldDataTypes[field.field_name] || field.detected_type || 'string'}
                              onChange={(e) => handleDataTypeChange(field.field_name, e.target.value)}
                              className="input"
                              style={{ fontSize: '12px', padding: 'var(--space-xs)', minWidth: '100px' }}
                            >
                              {DATA_TYPES.map(dt => (
                                <option key={dt} value={dt}>{dt}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td style={{ padding: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displaySample}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Custom Field Mappings Section */}
            {!useAutoMapping && (() => {
              const unmappedFields = previewData.fields.filter(field => {
                const mapping = fieldMappings[field.field_name]
                return !mapping || mapping === '' || mapping === '__custom__'
              })
              
              if (unmappedFields.length === 0) return null
              
              return (
                <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(0, 240, 255, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neon-cyan)' }}>
                    Custom Fields (stored in agency_metadata)
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    Map unmapped source fields to custom field names. These will be stored in the <code>agency_metadata</code> JSON field.
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Source Field</th>
                          <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Custom Field Name</th>
                          <th style={{ padding: 'var(--space-sm)', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Sample</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unmappedFields.map((field, idx) => {
                          const sampleValue = field.sample_values?.[0]
                          const displaySample = typeof sampleValue === 'string' && sampleValue.length > 30 
                            ? sampleValue.substring(0, 30) + '...'
                            : String(sampleValue || '')
                          
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                              <td style={{ padding: 'var(--space-sm)' }}>
                                <code style={{ fontSize: '12px', color: 'var(--neon-cyan)' }}>{field.field_name}</code>
                              </td>
                              <td style={{ padding: 'var(--space-sm)' }}>
                                <input
                                  type="text"
                                  placeholder="Enter custom field name"
                                  value={customFieldMappings[field.field_name] || ''}
                                  onChange={(e) => handleCustomFieldMapping(field.field_name, e.target.value)}
                                  className="input"
                                  style={{ fontSize: '12px', padding: 'var(--space-xs)', minWidth: '200px' }}
                                />
                              </td>
                              <td style={{ padding: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displaySample}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Sample Rows Preview */}
          {previewData.sample_rows && previewData.sample_rows.length > 0 && (
            <div className="glass-panel" style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sample Data (First {Math.min(3, previewData.sample_rows.length)} rows)
              </div>
              <div style={{ overflowX: 'auto', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <pre style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(previewData.sample_rows.slice(0, 3), null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Current Organization Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 'var(--space-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Importing As
              </label>
              {loadingOrgs ? (
                <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                  <div style={{ marginTop: 'var(--space-sm)', fontSize: '12px' }}>Loading organization...</div>
                </div>
              ) : currentOrganization ? (
                <div style={{
                  padding: 'var(--space-md)',
                  background: 'var(--glass-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}>
                  <span style={{ fontSize: '20px' }}>
                    {currentOrganization.organization_type === 'regulatory_agency' ? '🏛️' : '🏢'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {currentOrganization.name}
                      {currentOrganization.acronym && (
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          ({currentOrganization.acronym})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {currentOrganization.organization_type === 'regulatory_agency' ? 'Regulatory Agency' : 'Company'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: 'var(--space-md)',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffc107'
                }}>
                  ⚠️ No organization found. Please register in Settings → My Organization
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                Violations will be imported under this organization. To change, update your organization in Settings.
              </p>
            </div>

            {/* Joint Recall Option */}
            <div style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isJointRecall}
                  onChange={(e) => setIsJointRecall(e.target.checked)}
                />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  This is a Joint Recall (issued by both agency and company)
                </span>
              </label>
              
              {isJointRecall && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: 'var(--space-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Joint Organization
                  </label>
                  <select
                    value={jointOrganizationId}
                    onChange={(e) => setJointOrganizationId(e.target.value)}
                    className="input"
                    required={isJointRecall}
                  >
                    <option value="">Select joint organization...</option>
                    {organizations
                      .filter(org => org.organization_id !== organizationId)
                      .map(org => (
                        <option key={org.organization_id} value={org.organization_id}>
                          {org.organization_type === 'regulatory_agency' ? '🏛️' : '🏢'} {org.name}
                          {org.acronym ? ` (${org.acronym})` : ''}
                        </option>
                      ))}
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                    Select the second organization involved in this joint recall
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Auto-classify Risk */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Auto-classify Risk Level
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)', marginBottom: 0 }}>
                Automatically calculate risk based on injuries, deaths, and units affected
              </p>
            </div>
            <div
              onClick={() => setAutoClassifyRisk(!autoClassifyRisk)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: autoClassifyRisk ? 'var(--neon-cyan)' : 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--text-primary)',
                position: 'absolute',
                top: '2px',
                left: autoClassifyRisk ? '22px' : '2px',
                transition: 'all 0.2s ease'
              }} />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="glass-panel"
            style={{
              padding: 'var(--space-md)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              background: 'rgba(0, 240, 255, 0.1)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Importing...' : `Import ${previewData.total_rows} Violations`}
          </button>
        </form>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div>
          <div className="glass-panel" style={{
            padding: 'var(--space-lg)',
            border: `1px solid ${result.status === 'completed' ? 'var(--risk-low)' : result.status === 'partial' ? 'var(--neon-yellow)' : 'var(--risk-high)'}`,
            background: result.status === 'completed' ? 'rgba(0, 255, 136, 0.05)' : result.status === 'partial' ? 'rgba(255, 193, 7, 0.05)' : 'rgba(255, 51, 102, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '20px' }}>
                {result.status === 'completed' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'}
              </span>
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                Import {result.status === 'completed' ? 'Completed' : result.status === 'partial' ? 'Partially Completed' : 'Failed'}
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>{result.total_items}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Successful</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--risk-low)' }}>{result.successful}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--risk-high)' }}>{result.failed}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-secondary)' }}>{result.skipped || 0}</div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>Errors:</div>
                <div style={{
                  background: 'var(--glass-bg)',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px'
                }}>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ marginBottom: 'var(--space-xs)', color: 'var(--risk-high)' }}>
                      {err.item}: {typeof err.error === 'string' ? err.error : JSON.stringify(err.error)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.created_violation_ids && result.created_violation_ids.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Created {result.created_violation_ids.length} violation{result.created_violation_ids.length !== 1 ? 's' : ''}
              </div>
            )}

            <button
              onClick={handleReset}
              style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-panel alert-error" style={{
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md)',
          border: '1px solid var(--risk-high)',
          background: 'rgba(255, 51, 102, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViolationImport
