/**
 * RiskBadge Component
 * Displays a glowing risk level badge
 */
function RiskBadge({ riskLevel }) {
  const level = riskLevel?.toUpperCase() || 'LOW'
  const className = `risk-badge ${level.toLowerCase()}`
  
  const labels = {
    HIGH: '🔴 HIGH RISK',
    MEDIUM: '🟡 MEDIUM RISK',
    LOW: '🟢 LOW RISK'
  }

  return (
    <span className={className}>
      {labels[level] || labels.LOW}
    </span>
  )
}

export default RiskBadge
