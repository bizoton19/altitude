import { useState, useEffect } from 'react'
import * as api from '../services/api'

const InvestigationStatus = {
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

function InvestigationList({ 
  onInvestigationClick, 
  onCreateInvestigation, 
  onEditInvestigation 
}) {
  const [investigations, setInvestigations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadInvestigations()
  }, [])

  // Reload investigations when form closes (handled by parent)
  // This ensures list refreshes after create/edit

  const loadInvestigations = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInvestigations()
      setInvestigations(data)
    } catch (err) {
      setError(err.message || 'Failed to load investigations')
      console.error('Error loading investigations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    if (onCreateInvestigation) {
      onCreateInvestigation()
    }
  }

  const handleEdit = (investigation) => {
    if (onEditInvestigation) {
      onEditInvestigation(investigation)
    }
  }

  const handleDelete = async (investigationId) => {
    if (!confirm('Are you sure you want to delete this investigation?')) {
      return
    }

    try {
      await api.deleteInvestigation(investigationId)
      loadInvestigations()
    } catch (err) {
      alert('Error deleting investigation: ' + err.message)
    }
  }

  const handleRun = async (investigationId) => {
    try {
      await api.runInvestigation(investigationId)
      loadInvestigations()
    } catch (err) {
      alert('Error running investigation: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
        padding: 'var(--space-xl)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-md)' }}></div>
          <div style={{ color: 'var(--text-secondary)' }}>Loading investigations...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: 'var(--space-xl)', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="glass-panel" style={{ 
        padding: 'var(--space-xl)', 
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--neon-purple)'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '600', 
            marginBottom: 'var(--space-xs)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)'
          }}>
            <span style={{ fontSize: '32px' }}>🔍</span>
            Investigations
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '14px',
            margin: 0
          }}>
            Schedule automated searches for product bans on marketplaces
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="glass-panel"
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            border: '1px solid var(--neon-purple)',
            color: 'var(--neon-purple)',
            background: 'rgba(191, 0, 255, 0.1)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(191, 0, 255, 0.2)'
            e.target.style.boxShadow = '0 0 20px rgba(191, 0, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(191, 0, 255, 0.1)'
            e.target.style.boxShadow = 'none'
          }}
        >
          <span>+</span> Create Investigation
        </button>
      </div>

      {error && (
        <div className="glass-panel alert-error" style={{ 
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {investigations.length === 0 ? (
        <div className="glass-panel" style={{ 
          padding: 'var(--space-xxl)', 
          textAlign: 'center',
          border: '2px dashed var(--glass-border)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-lg)' }}>🔍</div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            marginBottom: 'var(--space-sm)',
            color: 'var(--text-primary)'
          }}>
            No investigations yet
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-lg)'
          }}>
            Create an investigation to start monitoring marketplaces for product bans
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {investigations.map((investigation) => (
            <div
              key={investigation.investigation_id}
              className="glass-panel"
              style={{
                padding: 'var(--space-xl)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                border: '1px solid var(--glass-border)'
              }}
              onClick={() => onInvestigationClick && onInvestigationClick(investigation)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-cyan)'
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 'var(--space-md)'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    marginBottom: 'var(--space-sm)',
                    color: 'var(--text-primary)'
                  }}>
                    {investigation.name}
                  </h3>
                  {investigation.description && (
                    <p style={{ 
                      color: 'var(--text-secondary)', 
                      marginBottom: 'var(--space-sm)',
                      fontSize: '14px'
                    }}>
                      {investigation.description}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: investigation.status === InvestigationStatus.COMPLETED 
                      ? 'rgba(0, 255, 100, 0.2)' 
                      : investigation.status === InvestigationStatus.RUNNING
                      ? 'rgba(255, 200, 0, 0.2)'
                      : investigation.status === InvestigationStatus.FAILED
                      ? 'rgba(255, 51, 102, 0.2)'
                      : 'rgba(0, 240, 255, 0.2)',
                    color: investigation.status === InvestigationStatus.COMPLETED 
                      ? 'var(--neon-green)' 
                      : investigation.status === InvestigationStatus.RUNNING
                      ? '#ffc800'
                      : investigation.status === InvestigationStatus.FAILED
                      ? 'var(--risk-high)'
                      : 'var(--neon-cyan)',
                    border: `1px solid ${investigation.status === InvestigationStatus.COMPLETED 
                      ? 'var(--neon-green)' 
                      : investigation.status === InvestigationStatus.RUNNING
                      ? '#ffc800'
                      : investigation.status === InvestigationStatus.FAILED
                      ? 'var(--risk-high)'
                      : 'var(--neon-cyan)'}`
                  }}
                >
                  {investigation.status}
                </span>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)'
              }}>
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Schedule
                  </div>
                  <div style={{ 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {investigation.schedule}
                  </div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Next Run
                  </div>
                  <div style={{ 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {new Date(investigation.scheduled_start_time).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Product Bans
                  </div>
                  <div style={{ 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {investigation.violation_ids?.length || investigation.product_ban_ids?.length || 0}
                  </div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Marketplaces
                  </div>
                  <div style={{ 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {investigation.marketplace_ids.length}
                  </div>
                </div>
              </div>

              {investigation.listings_found > 0 && (
                <div style={{ 
                  marginBottom: 'var(--space-md)', 
                  padding: 'var(--space-md)',
                  background: 'rgba(0, 240, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neon-cyan)'
                }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: '600' }}>{investigation.listings_found}</span> listings found,
                    {' '}
                    <span style={{ fontWeight: '600' }}>{investigation.listings_queued}</span> queued for review
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {investigation.status === InvestigationStatus.SCHEDULED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRun(investigation.investigation_id)
                    }}
                    className="glass-panel"
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'rgba(0, 255, 100, 0.1)',
                      border: '1px solid var(--neon-green)',
                      color: 'var(--neon-green)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 255, 100, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(0, 255, 100, 0.1)'
                    }}
                  >
                    Run Now
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(investigation)
                  }}
                  className="glass-panel"
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--glass-bg-hover)'
                    e.target.style.borderColor = 'var(--glass-border-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.borderColor = 'var(--glass-border)'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(investigation.investigation_id)
                  }}
                  className="glass-panel"
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(255, 51, 102, 0.1)',
                    border: '1px solid var(--risk-high)',
                    color: 'var(--risk-high)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 51, 102, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 51, 102, 0.1)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InvestigationList


