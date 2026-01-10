import { useState, useEffect } from 'react'
import * as api from '../services/api'

function ImportHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all', 'listing', 'violation'
  const [filterSource, setFilterSource] = useState('all')

  useEffect(() => {
    loadHistory()
  }, [filterType, filterSource])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const type = filterType === 'all' ? null : filterType
      const source = filterSource === 'all' ? null : filterSource
      const data = await api.getImportHistory(type, source, 100, 0)
      setHistory(data)
    } catch (err) {
      setError(err.message || 'Failed to load import history')
      console.error('Error loading import history:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      completed: { color: 'var(--risk-low)', bg: 'rgba(0, 255, 136, 0.1)', icon: '✅' },
      partial: { color: 'var(--neon-yellow)', bg: 'rgba(255, 193, 7, 0.1)', icon: '⚠️' },
      failed: { color: 'var(--risk-high)', bg: 'rgba(255, 51, 102, 0.1)', icon: '❌' },
      processing: { color: 'var(--neon-cyan)', bg: 'rgba(0, 240, 255, 0.1)', icon: '⏳' },
      pending: { color: 'var(--text-secondary)', bg: 'var(--glass-bg)', icon: '⏸️' }
    }
    const style = styles[status] || styles.pending
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>{style.icon}</span>
        {status.toUpperCase()}
      </span>
    )
  }

  const getSourceIcon = (source) => {
    const icons = {
      manual: '✋',
      csv_upload: '📄',
      text_paste: '📋',
      api: '🔌',
      database: '💾',
      browser_extension: '🔌',
      agent_automated: '🤖'
    }
    return icons[source] || '📦'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
            📊 Import History
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            View all import operations and their results
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="glass-panel"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ flex: 1 }}>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 'var(--space-xs)'
          }}>
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input"
            style={{ cursor: 'pointer' }}
          >
            <option value="all">All Types</option>
            <option value="listing">Listings</option>
            <option value="violation">Violations</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 'var(--space-xs)'
          }}>
            Source
          </label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="input"
            style={{ cursor: 'pointer' }}
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="csv_upload">CSV Upload</option>
            <option value="text_paste">Text Paste</option>
            <option value="api">API</option>
            <option value="database">Database</option>
            <option value="browser_extension">Browser Extension</option>
            <option value="agent_automated">Agent Automated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="glass-panel alert-error" style={{
          padding: 'var(--space-md)',
          border: '1px solid var(--risk-high)',
          background: 'rgba(255, 51, 102, 0.1)',
          marginBottom: 'var(--space-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-xl)',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          No import history found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {history.map((item) => (
            <div
              key={item.import_id}
              className="glass-panel"
              style={{
                padding: 'var(--space-lg)',
                border: `1px solid ${item.status === 'completed' ? 'var(--risk-low)' : item.status === 'partial' ? 'var(--neon-yellow)' : item.status === 'failed' ? 'var(--risk-high)' : 'var(--glass-border)'}`,
                background: item.status === 'completed' ? 'rgba(0, 255, 136, 0.05)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontSize: '20px' }}>{getSourceIcon(item.source)}</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {item.source_name || item.import_type} Import
                    </h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {item.import_id} | Type: {item.import_type} | Source: {item.source}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDate(item.created_at)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.total_items}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Successful</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--risk-low)' }}>{item.successful}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--risk-high)' }}>{item.failed}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {item.completed_at ? (
                      (new Date(item.completed_at) - new Date(item.created_at)) / 1000 + 's'
                    ) : '—'}
                  </div>
                </div>
              </div>

              {item.error_summary && (
                <div style={{
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-sm)',
                  background: 'var(--glass-bg)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--risk-high)'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Errors:</div>
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {item.error_summary}
                  </div>
                  {item.status === 'partial' && item.failed > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px',
                      background: 'rgba(255, 193, 7, 0.1)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)'
                    }}>
                      ⚠️ Note: Some violations may have been created despite errors. Check the violations list to verify.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImportHistory

