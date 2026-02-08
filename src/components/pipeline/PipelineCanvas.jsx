import { useState, useCallback, useEffect, useRef } from 'react'
import { usePipelineCanvas } from '../../hooks/usePipelineCanvas'
import PipelineToolbar from './PipelineToolbar'
import PipelineNodePalette from './PipelineNodePalette'
import PipelineNode from './PipelineNode'
import PipelineConnection from './PipelineConnection'
import NodeConfigPanel from './NodeConfigPanel'
import BottomConfigPanel from './BottomConfigPanel'

// Node types that use bottom panel for configuration
const BOTTOM_PANEL_NODES = ['field-mapper', 'api-source', 'risk-classifier', 'filter', 'validation']
const RIGHT_PANEL_NODES = ['file-source', 'import-dest', 'export-dest', 'webhook-dest', 'agency-feed', 'database-source']

function PipelineCanvas({ 
  initialNodes = [], 
  initialConnections = [],
  pipelineName = 'Untitled Pipeline',
  onSave,
  onRun 
}) {
  const canvas = usePipelineCanvas(initialNodes, initialConnections)
  const [name, setName] = useState(pipelineName)
  const [isPaletteOpen, setIsPaletteOpen] = useState(true)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(50) // percentage
  
  const containerRef = useRef(null)

  // Handle node selection to open appropriate panel
  useEffect(() => {
    const selectedNode = canvas.getSelectedNode()
    if (selectedNode) {
      if (BOTTOM_PANEL_NODES.includes(selectedNode.type)) {
        setIsBottomPanelOpen(true)
        setIsRightPanelOpen(false)
      } else if (RIGHT_PANEL_NODES.includes(selectedNode.type)) {
        setIsRightPanelOpen(true)
        setIsBottomPanelOpen(false)
      }
    }
  }, [canvas.selectedNodeId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.selectedNodeId) {
        e.preventDefault()
        canvas.removeNode(canvas.selectedNodeId)
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        canvas.clearSelection()
        setIsRightPanelOpen(false)
        setIsBottomPanelOpen(false)
      }
      
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          canvas.redo()
        } else {
          canvas.undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canvas])

  // Canvas mouse handlers
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('pipeline-canvas-inner')) {
      canvas.clearSelection()
      canvas.setDragState({ type: 'canvas', startX: e.clientX, startY: e.clientY })
    }
  }, [canvas])

  const handleCanvasMouseMove = useCallback((e) => {
    if (!canvas.dragState) return

    if (canvas.dragState.type === 'canvas') {
      const dx = e.clientX - canvas.lastMousePos.current.x
      const dy = e.clientY - canvas.lastMousePos.current.y
      canvas.panViewport(dx, dy)
    } else if (canvas.dragState.type === 'node') {
      const dx = (e.clientX - canvas.lastMousePos.current.x) / canvas.viewport.zoom
      const dy = (e.clientY - canvas.lastMousePos.current.y) / canvas.viewport.zoom
      const node = canvas.getNode(canvas.dragState.nodeId)
      if (node) {
        canvas.updateNodePosition(canvas.dragState.nodeId, {
          x: node.position.x + dx,
          y: node.position.y + dy
        })
      }
    } else if (canvas.dragState.type === 'connection') {
      const pos = canvas.screenToCanvas(e.clientX, e.clientY)
      canvas.setTempConnection({
        ...canvas.tempConnection,
        endX: pos.x,
        endY: pos.y
      })
    }

    canvas.lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [canvas])

  const handleCanvasMouseUp = useCallback((e) => {
    if (canvas.dragState?.type === 'connection' && canvas.tempConnection) {
      // Check if we're over a valid port
      const targetEl = document.elementFromPoint(e.clientX, e.clientY)
      if (targetEl?.classList.contains('node-port') && targetEl.dataset.nodeId) {
        const targetNodeId = targetEl.dataset.nodeId
        const targetPort = targetEl.dataset.port
        if (targetNodeId !== canvas.tempConnection.sourceId) {
          canvas.addConnection(
            canvas.tempConnection.sourceId,
            canvas.tempConnection.sourcePort,
            targetNodeId,
            targetPort
          )
        }
      }
      canvas.setTempConnection(null)
    }
    canvas.setDragState(null)
  }, [canvas])

  // Handle wheel for zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      canvas.zoomViewport(delta)
    }
  }, [canvas])

  // Handle node drag from palette
  const handleNodeDrop = useCallback((nodeType, e) => {
    const pos = canvas.screenToCanvas(e.clientX, e.clientY)
    const nodeId = canvas.addNode(nodeType, { x: pos.x - 100, y: pos.y - 50 })
    canvas.selectNode(nodeId)
  }, [canvas])

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId, e) => {
    canvas.selectNode(nodeId)
    canvas.setDragState({ type: 'node', nodeId })
    canvas.lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [canvas])

  // Handle connection drag start
  const handleConnectionStart = useCallback((nodeId, port, portType, e) => {
    const node = canvas.getNode(nodeId)
    if (!node) return

    // Calculate port position
    const portX = portType === 'output' ? node.position.x + 200 : node.position.x
    const portY = node.position.y + 50

    canvas.setDragState({ type: 'connection' })
    canvas.setTempConnection({
      sourceId: nodeId,
      sourcePort: port,
      startX: portX,
      startY: portY,
      endX: portX,
      endY: portY
    })
    canvas.lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [canvas])

  // Close panels
  const handleCloseRightPanel = useCallback(() => {
    setIsRightPanelOpen(false)
  }, [])

  const handleCloseBottomPanel = useCallback(() => {
    setIsBottomPanelOpen(false)
  }, [])

  // Run pipeline
  const handleRun = useCallback(() => {
    const errors = canvas.validatePipeline()
    if (errors.length > 0) {
      // Highlight first error node
      canvas.selectNode(errors[0].nodeId)
      alert(`Pipeline validation failed: ${errors[0].message}`)
      return
    }
    onRun?.({ nodes: canvas.nodes, connections: canvas.connections, name })
  }, [canvas, name, onRun])

  // Save pipeline
  const handleSave = useCallback(() => {
    onSave?.({ nodes: canvas.nodes, connections: canvas.connections, name })
  }, [canvas.nodes, canvas.connections, name, onSave])

  const selectedNode = canvas.getSelectedNode()

  return (
    <div className="pipeline-builder" ref={containerRef}>
      <PipelineToolbar
        name={name}
        onNameChange={setName}
        zoom={canvas.viewport.zoom}
        onZoomIn={() => canvas.zoomViewport(0.1)}
        onZoomOut={() => canvas.zoomViewport(-0.1)}
        onZoomReset={canvas.resetViewport}
        onFitToView={canvas.fitToView}
        onUndo={canvas.undo}
        onRedo={canvas.redo}
        canUndo={canvas.canUndo}
        canRedo={canvas.canRedo}
        onRun={handleRun}
        onSave={handleSave}
        onTogglePalette={() => setIsPaletteOpen(!isPaletteOpen)}
        isPaletteOpen={isPaletteOpen}
      />

      <div className="pipeline-main">
        <PipelineNodePalette 
          isOpen={isPaletteOpen} 
          onNodeDrop={handleNodeDrop}
        />

        <div className="pipeline-content">
          <div 
            className={`pipeline-canvas-container ${isBottomPanelOpen ? 'with-bottom-panel' : ''}`}
            style={{ height: isBottomPanelOpen ? `${100 - bottomPanelHeight}%` : '100%' }}
          >
            <div
              ref={canvas.canvasRef}
              className={`pipeline-canvas ${canvas.dragState?.type === 'canvas' ? 'dragging' : ''} ${canvas.dragState?.type === 'connection' ? 'connecting' : ''}`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleWheel}
            >
              <div 
                className="pipeline-canvas-inner"
                style={{
                  transform: `translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.zoom})`
                }}
              >
                {/* Connections SVG layer */}
                <svg className="pipeline-connections">
                  {canvas.connections.map(conn => {
                    const sourceNode = canvas.getNode(conn.sourceId)
                    const targetNode = canvas.getNode(conn.targetId)
                    if (!sourceNode || !targetNode) return null
                    
                    return (
                      <PipelineConnection
                        key={conn.id}
                        connection={conn}
                        sourceNode={sourceNode}
                        targetNode={targetNode}
                        isSelected={canvas.selectedConnectionId === conn.id}
                        onClick={() => canvas.setSelectedConnectionId(conn.id)}
                      />
                    )
                  })}
                  
                  {/* Temporary connection while dragging */}
                  {canvas.tempConnection && (
                    <path
                      className="connection-temp"
                      d={`M ${canvas.tempConnection.startX} ${canvas.tempConnection.startY} 
                          C ${canvas.tempConnection.startX + 50} ${canvas.tempConnection.startY},
                            ${canvas.tempConnection.endX - 50} ${canvas.tempConnection.endY},
                            ${canvas.tempConnection.endX} ${canvas.tempConnection.endY}`}
                    />
                  )}
                </svg>

                {/* Nodes layer */}
                {canvas.nodes.map(node => (
                  <PipelineNode
                    key={node.id}
                    node={node}
                    isSelected={canvas.selectedNodeId === node.id}
                    onSelect={() => canvas.selectNode(node.id)}
                    onDragStart={(e) => handleNodeDragStart(node.id, e)}
                    onConnectionStart={(port, portType, e) => handleConnectionStart(node.id, port, portType, e)}
                    onDelete={() => canvas.removeNode(node.id)}
                  />
                ))}

                {/* Empty state */}
                {canvas.nodes.length === 0 && (
                  <div className="canvas-empty-state">
                    <i className="fas fa-project-diagram"></i>
                    <h3>Start building your pipeline</h3>
                    <p>Drag nodes from the palette on the left, or click a node type to add it to the canvas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom config panel for complex nodes */}
          {isBottomPanelOpen && selectedNode && BOTTOM_PANEL_NODES.includes(selectedNode.type) && (
            <BottomConfigPanel
              node={selectedNode}
              height={bottomPanelHeight}
              onHeightChange={setBottomPanelHeight}
              onClose={handleCloseBottomPanel}
              onUpdateConfig={(config) => canvas.updateNodeConfig(selectedNode.id, config)}
            />
          )}
        </div>

        {/* Right config panel for simple nodes */}
        {isRightPanelOpen && selectedNode && RIGHT_PANEL_NODES.includes(selectedNode.type) && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={handleCloseRightPanel}
            onUpdateConfig={(config) => canvas.updateNodeConfig(selectedNode.id, config)}
          />
        )}
      </div>
    </div>
  )
}

export default PipelineCanvas
