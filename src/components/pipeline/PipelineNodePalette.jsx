import { useCallback, useRef } from 'react'
import { NODE_TYPES } from './PipelineNode'

// Organize nodes by category
const NODE_CATEGORIES = [
  {
    id: 'sources',
    title: 'Sources',
    nodes: ['file-source', 'api-source', 'database-source', 'agency-feed']
  },
  {
    id: 'transforms',
    title: 'Transforms',
    nodes: ['field-mapper', 'risk-classifier', 'filter', 'validation']
  },
  {
    id: 'destinations',
    title: 'Destinations',
    nodes: ['import-dest', 'export-dest', 'webhook-dest']
  }
]

function PipelineNodePalette({ isOpen, onNodeDrop }) {
  const dragRef = useRef(null)
  const dragImageRef = useRef(null)

  const handleDragStart = useCallback((nodeType) => (e) => {
    dragRef.current = nodeType
    
    // Create custom drag image
    const dragImage = document.createElement('div')
    dragImage.className = 'palette-node-drag-image'
    dragImage.innerHTML = `
      <div class="node-icon ${NODE_TYPES[nodeType].category}">
        <i class="fas ${NODE_TYPES[nodeType].icon}"></i>
      </div>
      <span>${NODE_TYPES[nodeType].title}</span>
    `
    dragImage.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 14px;
      pointer-events: none;
      z-index: 10000;
    `
    document.body.appendChild(dragImage)
    dragImageRef.current = dragImage
    
    e.dataTransfer.setDragImage(dragImage, 20, 20)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragEnd = useCallback((e) => {
    if (dragRef.current && e.dataTransfer.dropEffect !== 'none') {
      onNodeDrop(dragRef.current, e)
    }
    
    // Clean up drag image
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current)
      dragImageRef.current = null
    }
    dragRef.current = null
  }, [onNodeDrop])

  // Allow clicking to add node at center
  const handleNodeClick = useCallback((nodeType) => () => {
    // Simulate a drop at center of canvas
    const canvas = document.querySelector('.pipeline-canvas')
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const fakeEvent = {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      }
      onNodeDrop(nodeType, fakeEvent)
    }
  }, [onNodeDrop])

  if (!isOpen) return null

  return (
    <div className={`pipeline-palette ${isOpen ? 'open' : ''}`}>
      {NODE_CATEGORIES.map(category => (
        <div key={category.id} className="palette-section">
          <div className="palette-section-title">{category.title}</div>
          
          {category.nodes.map(nodeType => {
            const nodeMeta = NODE_TYPES[nodeType]
            if (!nodeMeta) return null
            
            return (
              <div
                key={nodeType}
                className="palette-node"
                draggable
                onDragStart={handleDragStart(nodeType)}
                onDragEnd={handleDragEnd}
                onClick={handleNodeClick(nodeType)}
                title={`Drag to add ${nodeMeta.title}`}
              >
                <div className={`palette-node-icon ${nodeMeta.category}`}>
                  <i className={`fas ${nodeMeta.icon}`}></i>
                </div>
                <span className="palette-node-label">{nodeMeta.title}</span>
              </div>
            )
          })}
        </div>
      ))}

      <div className="palette-section" style={{ marginTop: 'auto' }}>
        <div className="palette-section-title">Help</div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          padding: '0 var(--space-xs)'
        }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            <strong>Drag</strong> nodes to the canvas to add them.
          </p>
          <p style={{ marginBottom: 'var(--space-sm)' }}>
            <strong>Connect</strong> nodes by dragging from one port to another.
          </p>
          <p>
            <strong>Click</strong> a node to configure it.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PipelineNodePalette
