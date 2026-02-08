import { useState, useCallback, useRef } from 'react'
import { NODE_TYPES } from './PipelineNode'

/**
 * Right-side configuration panel for simple nodes
 * (File Upload, Import Destination, Export, Webhook, Agency Feed, Database)
 */
function NodeConfigPanel({ node, onClose, onUpdateConfig }) {
  const nodeMeta = NODE_TYPES[node.type] || {}

  return (
    <div className="config-panel-right open">
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

      <div className="config-panel-body">
        {node.type === 'file-source' && (
          <FileSourceConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'import-dest' && (
          <ImportDestConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'export-dest' && (
          <ExportDestConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'webhook-dest' && (
          <WebhookDestConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'agency-feed' && (
          <AgencyFeedConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
        {node.type === 'database-source' && (
          <DatabaseSourceConfig node={node} onUpdateConfig={onUpdateConfig} />
        )}
      </div>
    </div>
  )
}

/**
 * File Source Configuration
 */
function FileSourceConfig({ node, onUpdateConfig }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = useCallback((file) => {
    if (!file) return

    // Detect file type
    const extension = file.name.split('.').pop().toLowerCase()
    const fileType = ['csv', 'json', 'xlsx', 'xls'].includes(extension) ? extension : 'unknown'

    onUpdateConfig({
      filename: file.name,
      fileType,
      fileSize: file.size,
      file: file // Store the file object for later upload
    })
  }, [onUpdateConfig])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  return (
    <>
      <div className="config-section">
        <div className="config-section-title">File Upload</div>
        
        <div
          style={{
            border: `2px dashed ${dragOver ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
            borderRadius: 8,
            padding: 'var(--space-lg)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            background: dragOver ? 'rgba(0, 240, 255, 0.05)' : 'transparent'
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          
          {node.config.filename ? (
            <>
              <i className="fas fa-file-check" style={{ fontSize: '2rem', color: 'var(--neon-cyan)', marginBottom: 'var(--space-sm)' }}></i>
              <div style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                {node.config.filename}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {formatFileSize(node.config.fileSize)} • {node.config.fileType.toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <i className="fas fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}></i>
              <div style={{ color: 'var(--text-secondary)' }}>
                Drop file here or click to browse
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-xs)' }}>
                CSV, JSON, or Excel
              </div>
            </>
          )}
        </div>
      </div>

      {node.config.fileType === 'csv' && (
        <div className="config-section">
          <div className="config-section-title">CSV Options</div>
          
          <div className="config-field">
            <label>Delimiter</label>
            <select
              value={node.config.delimiter || ','}
              onChange={(e) => onUpdateConfig({ delimiter: e.target.value })}
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="\t">Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>

          <div className="config-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                checked={node.config.hasHeader !== false}
                onChange={(e) => onUpdateConfig({ hasHeader: e.target.checked })}
              />
              First row is header
            </label>
          </div>
        </div>
      )}

      {node.config.filename && (
        <div className="config-section">
          <div className="config-section-title">Preview</div>
          <div style={{ 
            background: 'var(--glass-bg)', 
            borderRadius: 6, 
            padding: 'var(--space-sm)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            File ready for processing. Connect to a transform or destination node.
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Import Destination Configuration
 */
function ImportDestConfig({ node, onUpdateConfig }) {
  return (
    <>
      <div className="config-section">
        <div className="config-section-title">Import Settings</div>
        
        <div className="config-field">
          <label>Organization</label>
          <input
            type="text"
            value={node.config.organizationName || ''}
            onChange={(e) => onUpdateConfig({ organizationName: e.target.value })}
            placeholder="Your organization name"
          />
        </div>

        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.autoClassifyRisk !== false}
              onChange={(e) => onUpdateConfig({ autoClassifyRisk: e.target.checked })}
            />
            Auto-classify risk levels
          </label>
        </div>

        <div className="config-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="checkbox"
              checked={node.config.skipDuplicates !== false}
              onChange={(e) => onUpdateConfig({ skipDuplicates: e.target.checked })}
            />
            Skip duplicate records
          </label>
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Error Handling</div>
        
        <div className="config-field">
          <label>On error</label>
          <select
            value={node.config.onError || 'skip'}
            onChange={(e) => onUpdateConfig({ onError: e.target.value })}
          >
            <option value="skip">Skip failed records</option>
            <option value="stop">Stop import</option>
            <option value="retry">Retry failed records</option>
          </select>
        </div>
      </div>
    </>
  )
}

/**
 * Export Destination Configuration
 */
function ExportDestConfig({ node, onUpdateConfig }) {
  return (
    <div className="config-section">
      <div className="config-section-title">Export Settings</div>
      
      <div className="config-field">
        <label>Format</label>
        <select
          value={node.config.format || 'csv'}
          onChange={(e) => onUpdateConfig({ format: e.target.value })}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">Excel (XLSX)</option>
        </select>
      </div>

      <div className="config-field">
        <label>Filename</label>
        <input
          type="text"
          value={node.config.exportFilename || ''}
          onChange={(e) => onUpdateConfig({ exportFilename: e.target.value })}
          placeholder="export.csv"
        />
      </div>
    </div>
  )
}

/**
 * Webhook Destination Configuration
 */
function WebhookDestConfig({ node, onUpdateConfig }) {
  return (
    <>
      <div className="config-section">
        <div className="config-section-title">Webhook Settings</div>
        
        <div className="config-field">
          <label>URL</label>
          <input
            type="url"
            value={node.config.webhookUrl || ''}
            onChange={(e) => onUpdateConfig({ webhookUrl: e.target.value })}
            placeholder="https://api.example.com/webhook"
          />
        </div>

        <div className="config-field">
          <label>Method</label>
          <select
            value={node.config.webhookMethod || 'POST'}
            onChange={(e) => onUpdateConfig({ webhookMethod: e.target.value })}
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
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
    </>
  )
}

/**
 * Agency Feed Configuration
 */
function AgencyFeedConfig({ node, onUpdateConfig }) {
  return (
    <div className="config-section">
      <div className="config-section-title">Agency Feed</div>
      
      <div className="config-field">
        <label>Source</label>
        <select
          value={node.config.agencyFeed || ''}
          onChange={(e) => onUpdateConfig({ agencyFeed: e.target.value })}
        >
          <option value="">Select a feed...</option>
          <option value="cpsc">CPSC Recalls</option>
          <option value="fda">FDA Recalls</option>
          <option value="nhtsa">NHTSA Recalls</option>
        </select>
      </div>

      {node.config.agencyFeed && (
        <>
          <div className="config-field">
            <label>Date Range</label>
            <select
              value={node.config.dateRange || '30'}
              onChange={(e) => onUpdateConfig({ dateRange: e.target.value })}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="all">All available</option>
            </select>
          </div>

          <div style={{ 
            background: 'rgba(0, 240, 255, 0.1)', 
            borderRadius: 6, 
            padding: 'var(--space-sm)',
            marginTop: 'var(--space-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--neon-cyan)', fontSize: '0.75rem' }}>
              <i className="fas fa-info-circle"></i>
              <span>Feed configured and ready</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Database Source Configuration
 */
function DatabaseSourceConfig({ node, onUpdateConfig }) {
  return (
    <>
      <div className="config-section">
        <div className="config-section-title">Database Connection</div>
        
        <div className="config-field">
          <label>Database Type</label>
          <select
            value={node.config.dbType || ''}
            onChange={(e) => onUpdateConfig({ dbType: e.target.value })}
          >
            <option value="">Select type...</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mongodb">MongoDB</option>
            <option value="sqlserver">SQL Server</option>
          </select>
        </div>

        <div className="config-field">
          <label>Connection String</label>
          <input
            type="password"
            value={node.config.connectionString || ''}
            onChange={(e) => onUpdateConfig({ connectionString: e.target.value })}
            placeholder="postgresql://user:pass@host:5432/db"
          />
        </div>
      </div>

      <div className="config-section">
        <div className="config-section-title">Query</div>
        
        <div className="config-field">
          <label>Table or Query</label>
          <textarea
            value={node.config.query || ''}
            onChange={(e) => onUpdateConfig({ query: e.target.value })}
            placeholder="SELECT * FROM banned_products WHERE created_at > NOW() - INTERVAL '30 days'"
            rows={4}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          />
        </div>

        <button 
          className="toolbar-btn" 
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {/* Test connection */}}
        >
          <i className="fas fa-plug"></i>
          Test Connection
        </button>
      </div>
    </>
  )
}

// Utility function
function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export default NodeConfigPanel
