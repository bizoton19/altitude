import { useState, useCallback, useRef, useEffect } from 'react'
import { NODE_TYPES } from './PipelineNode'

// Standard fields for mapping (same as ProductBanImport)
const STANDARD_FIELDS = [
  { value: '', label: '-- Skip this field --' },
  { value: 'ban_number', label: 'Ban Number' },
  { value: 'title', label: 'Title' },
  { value: 'url', label: 'URL' },
  { value: 'description', label: 'Description' },
  { value: 'ban_date', label: 'Ban Date' },
  { value: 'units_affected', label: 'Units Affected' },
  { value: 'injuries', label: 'Injuries' },
  { value: 'deaths', label: 'Deaths' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'agency_name', label: 'Agency Name' },
  { value: 'agency_acronym', label: 'Agency Acronym' },
  { value: 'hazards', label: 'Hazards (Array/JSON)' },
  { value: 'hazard_description', label: 'Hazard Description' },
  { value: 'images', label: 'Images (Array/JSON)' },
  { value: 'image_url', label: 'Image URL' },
  { value: 'remedies', label: 'Remedies (Array/JSON)' },
  { value: 'remedy_description', label: 'Remedy Description' }
]

/**
 * Bottom configuration panel for complex nodes
 * (Field Mapper, API Source, Risk Classifier, Filter, Validation)
 */
function BottomConfigPanel({ node, height, onHeightChange, onClose, onUpdateConfig }) {
  const nodeMeta = NODE_TYPES[node.type] || {}
  const resizeRef = useRef(null)
  const isResizing = useRef(false)

  // Handle resize drag
  const handleResizeStart = useCallback((e) => {
    isResizing.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return
      
      const container = resizeRef.current?.closest('.pipeline-content')
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const newHeight = ((containerRect.bottom - e.clientY) / containerRect.height) * 100
      
      // Clamp between 20% and 80%
      onHeightChange(Math.min(80, Math.max(20, newHeight)))
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onHeightChange])

  return (
    <div 
      className="config-panel-bottom open" 
      style={{ height: `${height}%` }}
      ref={resizeRef}
    >
      {/* Resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />

      <div className="config-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div className={`node-icon ${nodeMeta.category}`} style={{ width: 24, height: 24, fontSize: '0.75rem' }}>
            <i className={`fas ${nodeMeta.icon}`}></i>
          </div>
          <span className="config-panel-title">{nodeMeta.title}</span>
        </div>
        <button className="config-panel-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="config-panel-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {node.type === 'field-mapper' && (
          <FieldMapperConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'api-source' && (
          <ApiSourceConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'risk-classifier' && (
          <RiskClassifierConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'filter' && (
          <FilterConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'validation' && (
          <ValidationConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
      </div>
    </div>
  )
}

/**
 * Field Mapper Configuration - Full mapping table
 */
function FieldMapperConfig({ node, onUpdateConfig }) {
  const [autoMapping, setAutoMapping] = useState(node.config.autoMappingEnabled ?? true)
  
  // Mock source fields for demo - in real implementation, these come from upstream node
  const sourceFields = node.config.sourceFields || [
    { name: 'recall_number', sample: 'REC-2024-001', detectedType: 'string' },
    { name: 'product_name', sample: 'Widget Pro Max', detectedType: 'string' },
    { name: 'recall_date', sample: '2024-01-15', detectedType: 'date' },
    { name: 'hazard_type', sample: 'Fire hazard', detectedType: 'string' },
    { name: 'units_sold', sample: '15000', detectedType: 'integer' },
    { name: 'injury_count', sample: '3', detectedType: 'integer' },
    { name: 'product_image', sample: 'https://...', detectedType: 'string' },
    { name: 'remedy_info', sample: 'Return for refund', detectedType: 'string' }
  ]

  const mappings = node.config.mappings || {}

  const handleMappingChange = useCallback((sourceField, targetField) => {
    const newMappings = { ...mappings, [sourceField]: targetField }
    if (!targetField) {
      delete newMappings[sourceField]
    }
    onUpdateConfig({ mappings: newMappings, autoMappingEnabled: autoMapping })
  }, [mappings, autoMapping, onUpdateConfig])

  const handleAutoMappingToggle = useCallback((enabled) => {
    setAutoMapping(enabled)
    if (enabled) {
      // Auto-map fields based on name similarity
      const autoMappings = {}
      sourceFields.forEach(field => {
        const match = findBestMatch(field.name)
        if (match) {
          autoMappings[field.name] = match
        }
      })
      onUpdateConfig({ mappings: autoMappings, autoMappingEnabled: true })
    } else {
      onUpdateConfig({ autoMappingEnabled: false })
    }
  }, [sourceFields, onUpdateConfig])

  const handleApply = useCallback(() => {
    onUpdateConfig({ 
      mappings, 
      autoMappingEnabled: autoMapping,
      configured: true 
    })
  }, [mappings, autoMapping, onUpdateConfig])

  return (
    <>
      {/* Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: 'var(--space-sm) var(--space-md)',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoMapping}
              onChange={(e) => handleAutoMappingToggle(e.target.checked)}
            />
            <span>Auto-mapping</span>
            {autoMapping && (
              <span style={{ 
                fontSize: '0.625rem', 
                background: 'rgba(0, 240, 255, 0.15)',
                color: 'var(--neon-cyan)',
                padding: '2px 6px',
                borderRadius: 4
              }}>
                AI + Fuzzy
              </span>
            )}
          </label>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {Object.keys(mappings).length} of {sourceFields.length} fields mapped
          </span>
        </div>

        <button className="toolbar-btn primary" onClick={handleApply}>
          <i className="fas fa-check"></i>
          Apply Mapping
        </button>
      </div>

      {/* Mapping table */}
      <div className="mapping-table-container">
        <table className="mapping-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Source Field</th>
              <th style={{ width: '15%' }}>Sample</th>
              <th style={{ width: '5%' }}></th>
              <th style={{ width: '25%' }}>Target Field</th>
              <th style={{ width: '15%' }}>Data Type</th>
              <th style={{ width: '15%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sourceFields.map(field => {
              const targetValue = mappings[field.name] || ''
              const isAutoMapped = autoMapping && targetValue
              
              return (
                <tr key={field.name}>
                  <td>
                    <code style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)'
                    }}>
                      {field.name}
                    </code>
                  </td>
                  <td>
                    <span className="mapping-sample">{field.sample}</span>
                  </td>
                  <td className="mapping-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </td>
                  <td>
                    <select
                      className="mapping-select"
                      value={targetValue}
                      onChange={(e) => handleMappingChange(field.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem'
                      }}
                    >
                      {STANDARD_FIELDS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}>
                      {field.detectedType}
                    </span>
                  </td>
                  <td>
                    {targetValue ? (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        fontSize: '0.75rem',
                        color: 'var(--risk-low)'
                      }}>
                        <i className="fas fa-check-circle"></i>
                        Mapped
                        {isAutoMapped && (
                          <span className="mapping-auto-badge">AUTO</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ 
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        Skipped
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/**
 * API Source Configuration
 */
function ApiSourceConfig({ node, onUpdateConfig }) {
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleTest = useCallback(async () => {
    setTesting(true)
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1000))
    setTestResult({
      success: true,
      status: 200,
      recordCount: 42,
      sampleFields: ['id', 'title', 'date', 'status']
    })
    setTesting(false)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', padding: 'var(--space-md)', height: '100%', overflow: 'auto' }}>
      {/* Left column: Configuration */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <div className="config-section">
          <div className="config-section-title">Endpoint</div>
          
          <div className="config-field">
            <label>URL</label>
            <input
              type="url"
              value={node.config.url || ''}
              onChange={(e) => onUpdateConfig({ url: e.target.value })}
              placeholder="https://api.example.com/data"
            />
          </div>

          <div className="config-field">
            <label>Method</label>
            <select
              value={node.config.method || 'GET'}
              onChange={(e) => onUpdateConfig({ method: e.target.value })}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">Authentication</div>
          
          <div className="config-field">
            <label>Auth Type</label>
            <select
              value={node.config.authType || 'none'}
              onChange={(e) => onUpdateConfig({ authType: e.target.value })}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="api-key">API Key</option>
            </select>
          </div>

          {node.config.authType === 'bearer' && (
            <div className="config-field">
              <label>Token</label>
              <input
                type="password"
                value={node.config.authToken || ''}
                onChange={(e) => onUpdateConfig({ authToken: e.target.value })}
                placeholder="Enter bearer token"
              />
            </div>
          )}
        </div>

        <div className="config-section">
          <div className="config-section-title">Headers</div>
          <div className="config-field">
            <textarea
              value={node.config.headers || ''}
              onChange={(e) => onUpdateConfig({ headers: e.target.value })}
              placeholder={'{\n  "Content-Type": "application/json"\n}'}
              rows={4}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
            />
          </div>
        </div>
      </div>

      {/* Right column: Test results */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <div className="config-section">
          <div className="config-section-title">Test Connection</div>
          
          <button 
            className="toolbar-btn primary" 
            style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--space-md)' }}
            onClick={handleTest}
            disabled={testing || !node.config.url}
          >
            {testing ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Testing...
              </>
            ) : (
              <>
                <i className="fas fa-play"></i>
                Test Connection
              </>
            )}
          </button>

          {testResult && (
            <div style={{ 
              background: testResult.success ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
              border: `1px solid ${testResult.success ? 'var(--risk-low)' : 'var(--risk-high)'}`,
              borderRadius: 8,
              padding: 'var(--space-md)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
                color: testResult.success ? 'var(--risk-low)' : 'var(--risk-high)'
              }}>
                <i className={`fas ${testResult.success ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                <strong>{testResult.success ? 'Connection successful' : 'Connection failed'}</strong>
              </div>
              
              {testResult.success && (
                <>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    Status: {testResult.status}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    Records found: {testResult.recordCount}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Fields: {testResult.sampleFields.join(', ')}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Risk Classifier Configuration
 */
function RiskClassifierConfig({ node, onUpdateConfig }) {
  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <div className="config-section">
        <div className="config-section-title">Classification Model</div>
        
        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.enabled !== false}
              onChange={(e) => onUpdateConfig({ enabled: e.target.checked })}
            />
            Enable auto-classification
          </label>
        </div>

        <div className="config-field">
          <label>Model</label>
          <select
            value={node.config.model || 'default'}
            onChange={(e) => onUpdateConfig({ model: e.target.value })}
          >
            <option value="default">Default (Severity + Hazard)</option>
            <option value="injuries">Injury-focused</option>
            <option value="units">Units-focused</option>
          </select>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Thresholds</div>
        
        <div className="config-field">
          <label>High Risk (units affected)</label>
          <input
            type="number"
            value={node.config.highThreshold || 10000}
            onChange={(e) => onUpdateConfig({ highThreshold: parseInt(e.target.value) })}
          />
        </div>

        <div className="config-field">
          <label>Medium Risk (units affected)</label>
          <input
            type="number"
            value={node.config.mediumThreshold || 1000}
            onChange={(e) => onUpdateConfig({ mediumThreshold: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Filter Configuration
 */
function FilterConfig({ node, onUpdateConfig }) {
  const conditions = node.config.conditions || []

  const addCondition = useCallback(() => {
    onUpdateConfig({ 
      conditions: [...conditions, { field: '', operator: 'equals', value: '' }] 
    })
  }, [conditions, onUpdateConfig])

  const updateCondition = useCallback((index, updates) => {
    const newConditions = conditions.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    )
    onUpdateConfig({ conditions: newConditions })
  }, [conditions, onUpdateConfig])

  const removeCondition = useCallback((index) => {
    onUpdateConfig({ conditions: conditions.filter((_, i) => i !== index) })
  }, [conditions, onUpdateConfig])

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <div className="config-section">
        <div className="config-section-title">Filter Conditions</div>
        
        {conditions.map((condition, index) => (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              gap: 'var(--space-sm)', 
              alignItems: 'center',
              marginBottom: 'var(--space-sm)'
            }}
          >
            <input
              type="text"
              placeholder="Field name"
              value={condition.field}
              onChange={(e) => updateCondition(index, { field: e.target.value })}
              style={{ flex: 1 }}
            />
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(index, { operator: e.target.value })}
            >
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="contains">contains</option>
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
              <option value="is_empty">is empty</option>
              <option value="is_not_empty">is not empty</option>
            </select>
            <input
              type="text"
              placeholder="Value"
              value={condition.value}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
              style={{ flex: 1 }}
            />
            <button 
              className="toolbar-btn"
              onClick={() => removeCondition(index)}
              title="Remove condition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}

        <button className="toolbar-btn" onClick={addCondition}>
          <i className="fas fa-plus"></i>
          Add Condition
        </button>
      </div>

      <div className="config-section">
        <div className="config-section-title">Logic</div>
        <div className="config-field">
          <label>Match</label>
          <select
            value={node.config.matchLogic || 'all'}
            onChange={(e) => onUpdateConfig({ matchLogic: e.target.value })}
          >
            <option value="all">All conditions (AND)</option>
            <option value="any">Any condition (OR)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

/**
 * Validation Configuration
 */
function ValidationConfig({ node, onUpdateConfig }) {
  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <div className="config-section">
        <div className="config-section-title">Validation Rules</div>
        
        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.requireTitle !== false}
              onChange={(e) => onUpdateConfig({ requireTitle: e.target.checked })}
            />
            Require title field
          </label>
        </div>

        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.requireDate !== false}
              onChange={(e) => onUpdateConfig({ requireDate: e.target.checked })}
            />
            Require ban date
          </label>
        </div>

        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.validateUrls !== false}
              onChange={(e) => onUpdateConfig({ validateUrls: e.target.checked })}
            />
            Validate URL formats
          </label>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">On Invalid</div>
        <div className="config-field">
          <select
            value={node.config.onInvalid || 'skip'}
            onChange={(e) => onUpdateConfig({ onInvalid: e.target.value })}
          >
            <option value="skip">Skip invalid records</option>
            <option value="stop">Stop pipeline</option>
            <option value="flag">Flag and continue</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// Helper: Find best matching standard field for a source field name
function findBestMatch(sourceName) {
  const normalized = sourceName.toLowerCase().replace(/[_-]/g, '')
  
  const mappingHints = {
    'recallnumber': 'ban_number',
    'bannumber': 'ban_number',
    'id': 'ban_number',
    'productname': 'title',
    'title': 'title',
    'name': 'title',
    'recalldate': 'ban_date',
    'bandate': 'ban_date',
    'date': 'ban_date',
    'description': 'description',
    'hazard': 'hazard_description',
    'hazardtype': 'hazard_description',
    'units': 'units_affected',
    'unitssold': 'units_affected',
    'unitsaffected': 'units_affected',
    'injuries': 'injuries',
    'injurycount': 'injuries',
    'deaths': 'deaths',
    'image': 'image_url',
    'imageurl': 'image_url',
    'productimage': 'image_url',
    'remedy': 'remedy_description',
    'remedyinfo': 'remedy_description'
  }

  return mappingHints[normalized] || null
}

export default BottomConfigPanel
