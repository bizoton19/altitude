import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for managing pipeline canvas state
 * Handles nodes, connections, viewport, selection, and drag operations
 */
export function usePipelineCanvas(initialNodes = [], initialConnections = []) {
  // Core state
  const [nodes, setNodes] = useState(initialNodes)
  const [connections, setConnections] = useState(initialConnections)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  
  // Viewport state (pan/zoom)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  
  // Drag state
  const [dragState, setDragState] = useState(null) // { type: 'node' | 'canvas' | 'connection', ... }
  
  // History for undo/redo
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Temporary connection while dragging from port
  const [tempConnection, setTempConnection] = useState(null)
  
  // Refs for tracking mouse positions
  const lastMousePos = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  // Generate unique ID
  const generateId = useCallback(() => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Save state to history
  const saveToHistory = useCallback(() => {
    const state = { nodes: [...nodes], connections: [...connections] }
    setHistory(prev => [...prev.slice(0, historyIndex + 1), state])
    setHistoryIndex(prev => prev + 1)
  }, [nodes, connections, historyIndex])

  // Add a new node
  const addNode = useCallback((type, position, config = {}) => {
    const newNode = {
      id: generateId(),
      type,
      position,
      config,
      status: 'idle' // idle, configured, running, success, error
    }
    setNodes(prev => [...prev, newNode])
    saveToHistory()
    return newNode.id
  }, [generateId, saveToHistory])

  // Update node
  const updateNode = useCallback((nodeId, updates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ))
  }, [])

  // Update node config
  const updateNodeConfig = useCallback((nodeId, configUpdates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, config: { ...node.config, ...configUpdates } } 
        : node
    ))
  }, [])

  // Update node position
  const updateNodePosition = useCallback((nodeId, position) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ))
  }, [])

  // Remove node and its connections
  const removeNode = useCallback((nodeId) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId))
    setConnections(prev => prev.filter(
      conn => conn.sourceId !== nodeId && conn.targetId !== nodeId
    ))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
    saveToHistory()
  }, [selectedNodeId, saveToHistory])

  // Add connection
  const addConnection = useCallback((sourceId, sourcePort, targetId, targetPort) => {
    // Prevent duplicate connections
    const exists = connections.some(
      conn => conn.sourceId === sourceId && conn.targetId === targetId
    )
    if (exists) return null

    // Prevent self-connections
    if (sourceId === targetId) return null

    // Prevent cycles (simple check - could be more sophisticated)
    const wouldCreateCycle = (source, target) => {
      const visited = new Set()
      const queue = [target]
      while (queue.length > 0) {
        const current = queue.shift()
        if (current === source) return true
        if (visited.has(current)) continue
        visited.add(current)
        connections
          .filter(c => c.sourceId === current)
          .forEach(c => queue.push(c.targetId))
      }
      return false
    }

    if (wouldCreateCycle(sourceId, targetId)) return null

    const newConnection = {
      id: `conn_${Date.now()}`,
      sourceId,
      sourcePort: sourcePort || 'output',
      targetId,
      targetPort: targetPort || 'input'
    }
    setConnections(prev => [...prev, newConnection])
    saveToHistory()
    return newConnection.id
  }, [connections, saveToHistory])

  // Remove connection
  const removeConnection = useCallback((connectionId) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId))
    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null)
    }
    saveToHistory()
  }, [selectedConnectionId, saveToHistory])

  // Select node
  const selectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId)
    setSelectedConnectionId(null)
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedConnectionId(null)
  }, [])

  // Get selected node
  const getSelectedNode = useCallback(() => {
    return nodes.find(n => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  // Viewport controls
  const panViewport = useCallback((dx, dy) => {
    setViewport(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }))
  }, [])

  const zoomViewport = useCallback((delta, centerX = 0, centerY = 0) => {
    setViewport(prev => {
      const newZoom = Math.max(0.25, Math.min(2, prev.zoom + delta))
      return { ...prev, zoom: newZoom }
    })
  }, [])

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 })
  }, [])

  const fitToView = useCallback(() => {
    if (nodes.length === 0) {
      resetViewport()
      return
    }

    const padding = 50
    const minX = Math.min(...nodes.map(n => n.position.x)) - padding
    const maxX = Math.max(...nodes.map(n => n.position.x + 200)) + padding
    const minY = Math.min(...nodes.map(n => n.position.y)) - padding
    const maxY = Math.max(...nodes.map(n => n.position.y + 100)) + padding

    const canvasEl = canvasRef.current
    if (!canvasEl) return

    const canvasWidth = canvasEl.clientWidth
    const canvasHeight = canvasEl.clientHeight
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    const zoom = Math.min(
      canvasWidth / contentWidth,
      canvasHeight / contentHeight,
      1
    )

    const x = (canvasWidth - contentWidth * zoom) / 2 - minX * zoom
    const y = (canvasHeight - contentHeight * zoom) / 2 - minY * zoom

    setViewport({ x, y, zoom })
  }, [nodes, resetViewport])

  // Screen to canvas coordinates
  const screenToCanvas = useCallback((screenX, screenY) => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return { x: screenX, y: screenY }

    const rect = canvasEl.getBoundingClientRect()
    return {
      x: (screenX - rect.left - viewport.x) / viewport.zoom,
      y: (screenY - rect.top - viewport.y) / viewport.zoom
    }
  }, [viewport])

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setConnections(prevState.connections)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setConnections(nextState.connections)
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

  // Clear all
  const clearAll = useCallback(() => {
    saveToHistory()
    setNodes([])
    setConnections([])
    setSelectedNodeId(null)
    setSelectedConnectionId(null)
  }, [saveToHistory])

  // Get node by ID
  const getNode = useCallback((nodeId) => {
    return nodes.find(n => n.id === nodeId) || null
  }, [nodes])

  // Get connections for a node
  const getNodeConnections = useCallback((nodeId) => {
    return {
      inputs: connections.filter(c => c.targetId === nodeId),
      outputs: connections.filter(c => c.sourceId === nodeId)
    }
  }, [connections])

  // Validate pipeline (check all required connections)
  const validatePipeline = useCallback(() => {
    const errors = []
    
    nodes.forEach(node => {
      const nodeConns = getNodeConnections(node.id)
      
      // Check if source nodes have outputs
      if (['file-source', 'api-source', 'database-source', 'agency-feed'].includes(node.type)) {
        if (nodeConns.outputs.length === 0) {
          errors.push({ nodeId: node.id, message: 'Source node has no output connections' })
        }
      }
      
      // Check if transform/destination nodes have inputs
      if (['field-mapper', 'risk-classifier', 'filter', 'validation', 'import-dest', 'export-dest', 'webhook-dest'].includes(node.type)) {
        if (nodeConns.inputs.length === 0) {
          errors.push({ nodeId: node.id, message: 'Node has no input connection' })
        }
      }

      // Check if node is configured
      if (node.status === 'idle' && Object.keys(node.config).length === 0) {
        errors.push({ nodeId: node.id, message: 'Node is not configured' })
      }
    })

    return errors
  }, [nodes, getNodeConnections])

  return {
    // State
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    viewport,
    dragState,
    tempConnection,
    canvasRef,
    
    // Node operations
    addNode,
    updateNode,
    updateNodeConfig,
    updateNodePosition,
    removeNode,
    getNode,
    getSelectedNode,
    
    // Connection operations
    addConnection,
    removeConnection,
    getNodeConnections,
    setTempConnection,
    
    // Selection
    selectNode,
    clearSelection,
    setSelectedConnectionId,
    
    // Viewport
    viewport,
    setViewport,
    panViewport,
    zoomViewport,
    resetViewport,
    fitToView,
    screenToCanvas,
    
    // Drag
    dragState,
    setDragState,
    lastMousePos,
    
    // History
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // Utilities
    clearAll,
    validatePipeline,
    setNodes,
    setConnections
  }
}

export default usePipelineCanvas
