import { useCallback } from 'react'

// Node type definitions with metadata
const NODE_TYPES = {
  // Source nodes
  'file-source': {
    category: 'source',
    icon: 'fa-file-import',
    title: 'File Upload',
    defaultSubtitle: 'CSV, JSON, or Excel'
  },
  'api-source': {
    category: 'source',
    icon: 'fa-plug',
    title: 'REST API',
    defaultSubtitle: 'Connect to API endpoint'
  },
  'database-source': {
    category: 'source',
    icon: 'fa-database',
    title: 'Database',
    defaultSubtitle: 'SQL or NoSQL connection'
  },
  'agency-feed': {
    category: 'source',
    icon: 'fa-building-columns',
    title: 'Agency Feed',
    defaultSubtitle: 'CPSC, FDA, NHTSA'
  },
  
  // Transform nodes
  'field-mapper': {
    category: 'transform',
    icon: 'fa-arrows-turn-right',
    title: 'Field Mapper',
    defaultSubtitle: 'Map source to target fields'
  },
  'risk-classifier': {
    category: 'transform',
    icon: 'fa-triangle-exclamation',
    title: 'Risk Classifier',
    defaultSubtitle: 'Auto-classify risk levels'
  },
  'filter': {
    category: 'transform',
    icon: 'fa-filter',
    title: 'Filter',
    defaultSubtitle: 'Filter records by condition'
  },
  'validation': {
    category: 'transform',
    icon: 'fa-check-double',
    title: 'Validation',
    defaultSubtitle: 'Validate data schema'
  },
  
  // Destination nodes
  'import-dest': {
    category: 'destination',
    icon: 'fa-cloud-arrow-up',
    title: 'Import to System',
    defaultSubtitle: 'Create banned products'
  },
  'export-dest': {
    category: 'destination',
    icon: 'fa-file-export',
    title: 'Export File',
    defaultSubtitle: 'Download as file'
  },
  'webhook-dest': {
    category: 'destination',
    icon: 'fa-paper-plane',
    title: 'Webhook',
    defaultSubtitle: 'POST to endpoint'
  }
}

function PipelineNode({ 
  node, 
  isSelected, 
  onSelect, 
  onDragStart, 
  onConnectionStart,
  onDelete 
}) {
  const nodeType = NODE_TYPES[node.type] || {
    category: 'unknown',
    icon: 'fa-question',
    title: node.type,
    defaultSubtitle: ''
  }

  // Get subtitle from config or use default
  const getSubtitle = () => {
    switch (node.type) {
      case 'file-source':
        return node.config.filename || nodeType.defaultSubtitle
      case 'api-source':
        if (node.config.url) {
          try {
            return new URL(node.config.url).hostname
          } catch {
            return node.config.url.substring(0, 30) + (node.config.url.length > 30 ? '...' : '')
          }
        }
        return nodeType.defaultSubtitle
      case 'field-mapper':
        const mappedCount = Object.keys(node.config.mappings || {}).length
        return mappedCount > 0 ? `${mappedCount} fields mapped` : nodeType.defaultSubtitle
      case 'risk-classifier':
        return node.config.enabled ? 'Auto-classification ON' : nodeType.defaultSubtitle
      case 'import-dest':
        return node.config.organizationName || nodeType.defaultSubtitle
      default:
        return nodeType.defaultSubtitle
    }
  }

  // Get preview content
  const getPreviewContent = () => {
    switch (node.type) {
      case 'file-source':
        if (node.config.rowCount) {
          return (
            <>
              <div className="node-preview-stat">
                <i className="fas fa-table"></i>
                <span>{node.config.rowCount.toLocaleString()} rows</span>
              </div>
              <div className="node-preview-stat">
                <i className="fas fa-columns"></i>
                <span>{node.config.fieldCount} fields</span>
              </div>
            </>
          )
        }
        return null
        
      case 'api-source':
        if (node.config.method) {
          return (
            <div className="node-preview-stat">
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.7rem',
                color: 'var(--neon-cyan)' 
              }}>
                {node.config.method}
              </span>
            </div>
          )
        }
        return null

      case 'field-mapper':
        const mappedCount = Object.keys(node.config.mappings || {}).length
        if (mappedCount > 0) {
          const autoMapped = node.config.autoMappingEnabled ? ' (auto)' : ''
          return (
            <div className="node-preview-stat">
              <i className="fas fa-check"></i>
              <span>{mappedCount} mapped{autoMapped}</span>
            </div>
          )
        }
        return null

      case 'risk-classifier':
        return (
          <div className="node-preview-stat">
            <i className="fas fa-robot"></i>
            <span>AI Model</span>
          </div>
        )

      default:
        return null
    }
  }

  // Handle mouse down on node (for dragging)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Left click only
    if (e.target.classList.contains('node-port')) return // Don't drag when clicking port
    
    e.stopPropagation()
    onSelect()
    onDragStart(e)
  }, [onSelect, onDragStart])

  // Handle port mouse down (for connections)
  const handlePortMouseDown = useCallback((port, portType) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    onConnectionStart(port, portType, e)
  }, [onConnectionStart])

  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    // Could show context menu here
  }, [])

  // Determine which ports to show
  const hasInput = !['file-source', 'api-source', 'database-source', 'agency-feed'].includes(node.type)
  const hasOutput = !['import-dest', 'export-dest', 'webhook-dest'].includes(node.type)

  return (
    <div
      className={`pipeline-node ${nodeType.category} ${isSelected ? 'selected' : ''} ${node.status}`}
      style={{
        left: node.position.x,
        top: node.position.y
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* Input port */}
      {hasInput && (
        <div 
          className="node-port input"
          data-node-id={node.id}
          data-port="input"
          style={{ left: -8, top: '50%', transform: 'translateY(-50%)' }}
          onMouseDown={handlePortMouseDown('input', 'input')}
        />
      )}

      {/* Output port */}
      {hasOutput && (
        <div 
          className="node-port output"
          data-node-id={node.id}
          data-port="output"
          style={{ right: -8, top: '50%', transform: 'translateY(-50%)' }}
          onMouseDown={handlePortMouseDown('output', 'output')}
        />
      )}

      {/* Node header */}
      <div className="node-header">
        <div className={`node-icon ${nodeType.category}`}>
          <i className={`fas ${nodeType.icon}`}></i>
        </div>
        <div className="node-title-group">
          <div className="node-title">{nodeType.title}</div>
          <div className="node-subtitle">{getSubtitle()}</div>
        </div>
        <div className={`node-status ${node.status}`} title={node.status}></div>
      </div>

      {/* Node body with preview */}
      <div className="node-body">
        <div className="node-preview">
          {getPreviewContent()}
        </div>
      </div>
    </div>
  )
}

export { NODE_TYPES }
export default PipelineNode
