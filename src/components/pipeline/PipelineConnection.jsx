import { useMemo } from 'react'

/**
 * Calculate bezier curve control points for smooth connections
 */
function calculatePath(sourceNode, targetNode) {
  // Port positions (output on right of source, input on left of target)
  const sourceX = sourceNode.position.x + 200 // Node width
  const sourceY = sourceNode.position.y + 50  // Approximate center
  const targetX = targetNode.position.x
  const targetY = targetNode.position.y + 50

  // Control point offset based on distance
  const dx = Math.abs(targetX - sourceX)
  const offset = Math.min(dx * 0.5, 150)

  // Bezier control points
  const cp1x = sourceX + offset
  const cp1y = sourceY
  const cp2x = targetX - offset
  const cp2y = targetY

  return {
    path: `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`,
    sourceX,
    sourceY,
    targetX,
    targetY
  }
}

function PipelineConnection({ 
  connection, 
  sourceNode, 
  targetNode, 
  isSelected,
  isRunning,
  hasError,
  onClick 
}) {
  const { path } = useMemo(() => 
    calculatePath(sourceNode, targetNode),
    [sourceNode.position, targetNode.position]
  )

  const className = [
    'pipeline-connection',
    isSelected && 'active',
    isRunning && 'running',
    hasError && 'error'
  ].filter(Boolean).join(' ')

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: 'stroke' }}
      />
      
      {/* Visible connection line */}
      <path
        className={className}
        d={path}
      />
      
      {/* Animated flow overlay (visible when running) */}
      <path
        className="pipeline-connection-flow"
        d={path}
        style={{ opacity: isRunning ? 1 : 0 }}
      />
    </g>
  )
}

export default PipelineConnection
