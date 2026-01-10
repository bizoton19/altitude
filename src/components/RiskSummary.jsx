/**
 * RiskSummary Component
 * Displays risk distribution overview with glowing indicators
 * Accepts counts directly from API or calculates from recalls array
 */
function RiskSummary({ recalls, high, medium, low }) {
  // Use direct counts if provided, otherwise calculate from recalls
  let counts = { high: high || 0, medium: medium || 0, low: low || 0 }

  if (recalls && !high && !medium && !low) {
    counts = { high: 0, medium: 0, low: 0 }
    recalls.forEach(recall => {
      const risk = (recall.riskLevel || recall.risk_level || 'low').toLowerCase()
      if (counts[risk] !== undefined) {
        counts[risk]++
      }
    })
  }

  const total = counts.high + counts.medium + counts.low

  return (
    <div className="risk-summary glass-panel">
      <span className="risk-summary-title">Risk Overview</span>
      <div className="risk-summary-stats">
        <div className="risk-stat high">
          <span className="risk-dot high"></span>
          <span>{counts.high} HIGH</span>
        </div>
        <div className="risk-stat medium">
          <span className="risk-dot medium"></span>
          <span>{counts.medium} MEDIUM</span>
        </div>
        <div className="risk-stat low">
          <span className="risk-dot low"></span>
          <span>{counts.low} LOW</span>
        </div>
        {total > 0 && (
          <div style={{ color: 'var(--text-muted)', marginLeft: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {total} total
          </div>
        )}
      </div>
    </div>
  )
}

export default RiskSummary
