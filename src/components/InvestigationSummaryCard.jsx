import { useState } from 'react'

/**
 * InvestigationSummaryCard Component
 * Displays a summary card for an investigation with key metrics
 */
function InvestigationSummaryCard({ investigation, onClick }) {
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'var(--risk-low)'
      case 'running':
        return 'var(--neon-cyan)'
      case 'scheduled':
        return 'var(--text-muted)'
      case 'failed':
        return 'var(--risk-high)'
      case 'cancelled':
        return 'var(--text-muted)'
      default:
        return 'var(--text-secondary)'
    }
  }

  const getStatusBadge = (status) => {
    const color = getStatusColor(status)
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        {status || 'Unknown'}
      </span>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid var(--glass-border)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '12px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
        e.currentTarget.style.borderColor = 'var(--neon-cyan)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
        e.currentTarget.style.borderColor = 'var(--glass-border)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '12px', 
              color: 'var(--text-muted)',
              fontWeight: '600'
            }}>
              {investigation.investigation_id}
            </span>
            {getStatusBadge(investigation.status)}
          </div>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: 'var(--text-primary)',
            margin: 0
          }}>
            {investigation.name}
          </h4>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div>
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            display: 'block',
            marginBottom: '2px'
          }}>
            Start Date
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)'
          }}>
            {formatDateTime(investigation.start_time || investigation.scheduled_start_time)}
          </span>
        </div>

        <div>
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            display: 'block',
            marginBottom: '2px'
          }}>
            End Date
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)'
          }}>
            {formatDateTime(investigation.end_time)}
          </span>
        </div>

        <div>
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            display: 'block',
            marginBottom: '2px'
          }}>
            Started By
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-primary)'
          }}>
            {investigation.created_by || 'System'}
          </span>
        </div>

        <div>
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            display: 'block',
            marginBottom: '2px'
          }}>
            Platforms
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-primary)'
          }}>
            {investigation.marketplace_ids?.length || 0}
          </span>
        </div>
      </div>

      {/* Listings Found */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(0, 240, 255, 0.1)',
        borderRadius: '4px',
        border: '1px solid var(--neon-cyan)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ 
          fontSize: '12px', 
          color: 'var(--text-primary)',
          fontWeight: '600'
        }}>
          Listings Found
        </span>
        <span style={{ 
          fontSize: '16px', 
          color: 'var(--neon-cyan)',
          fontWeight: '700',
          fontFamily: 'var(--font-mono)'
        }}>
          {investigation.listings_found || 0}
        </span>
      </div>
    </div>
  )
}

export default InvestigationSummaryCard






