import { useState, useEffect } from 'react'
import * as api from '../services/api'

function AgentMonitoring() {
  const [agentStatus, setAgentStatus] = useState(null)
  const [agentConfig, setAgentConfig] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadAgentData()
    
    if (autoRefresh) {
      const interval = setInterval(loadAgentData, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAgentData = async () => {
    try {
      const [status, config] = await Promise.all([
        api.getAgentStatus(),
        api.getAgentConfig()
      ])
      setAgentStatus(status)
      setAgentConfig(config)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load agent data')
      console.error('Error loading agent data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAgent = async () => {
    try {
      await api.startAgent()
      await loadAgentData()
    } catch (err) {
      alert('Error starting agent: ' + err.message)
    }
  }

  const handleStopAgent = async () => {
    try {
      await api.stopAgent()
      await loadAgentData()
    } catch (err) {
      alert('Error stopping agent: ' + err.message)
    }
  }

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading && !agentStatus) {
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
          <div style={{ color: 'var(--text-secondary)' }}>Loading agent status...</div>
        </div>
      </div>
    )
  }

  if (error && !agentStatus) {
    return (
      <div className="glass-panel alert-error" style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
        <button
          onClick={loadAgentData}
          className="glass-panel"
          style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Status Header */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 'var(--space-md)'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <span style={{ fontSize: '28px' }}>🤖</span>
              Agent Status
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px',
              margin: 0
            }}>
              Monitor agent activity, tasks, and performance
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-xs)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Auto-refresh
            </label>
            <button
              onClick={loadAgentData}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)'
        }}>
          <div className="glass-panel" style={{ 
            padding: 'var(--space-lg)',
            border: `1px solid ${agentStatus?.is_running ? 'var(--risk-low)' : 'var(--glass-border)'}`,
            background: agentStatus?.is_running ? 'rgba(0, 255, 136, 0.05)' : 'transparent'
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Status
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-xs)',
              marginBottom: 'var(--space-sm)'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: agentStatus?.is_running ? 'var(--risk-low)' : 'var(--text-muted)',
                boxShadow: agentStatus?.is_running ? `0 0 10px var(--risk-low)` : 'none',
                animation: agentStatus?.is_running ? 'pulse 2s infinite' : 'none'
              }}></div>
              <span style={{ 
                fontSize: '18px',
                fontWeight: '600',
                color: agentStatus?.is_running ? 'var(--risk-low)' : 'var(--text-secondary)',
                textTransform: 'uppercase'
              }}>
                {agentStatus?.is_running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              {agentStatus?.is_running ? (
                <button
                  onClick={handleStopAgent}
                  className="glass-panel"
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--risk-high)',
                    color: 'var(--risk-high)',
                    background: 'rgba(255, 51, 102, 0.1)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleStartAgent}
                  className="glass-panel"
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--risk-low)',
                    color: 'var(--risk-low)',
                    background: 'rgba(0, 255, 136, 0.1)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  Start
                </button>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Pending Tasks
            </div>
            <div style={{ 
              fontSize: '32px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)'
            }}>
              {agentStatus?.pending_tasks || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Completed Today
            </div>
            <div style={{ 
              fontSize: '32px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)'
            }}>
              {agentStatus?.completed_tasks_today || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Uptime
            </div>
            <div style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)'
            }}>
              {formatUptime(agentStatus?.uptime_seconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Current Task */}
      {agentStatus?.current_task && (
        <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Current Task
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Task Type
              </div>
              <div style={{ 
                padding: 'var(--space-xs) var(--space-sm)',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid var(--neon-cyan)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--neon-cyan)',
                display: 'inline-block',
                textTransform: 'uppercase'
              }}>
                {agentStatus.current_task.task_type}
              </div>
            </div>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Progress
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{ 
                  flex: 1, 
                  height: '8px', 
                  background: 'var(--glass-bg)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(agentStatus.current_task.progress || 0) * 100}%`,
                    background: 'var(--neon-cyan)',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  minWidth: '45px',
                  textAlign: 'right'
                }}>
                  {Math.round((agentStatus.current_task.progress || 0) * 100)}%
                </span>
              </div>
              {agentStatus.current_task.items_processed && agentStatus.current_task.items_total && (
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  marginTop: 'var(--space-xs)'
                }}>
                  {agentStatus.current_task.items_processed} / {agentStatus.current_task.items_total} items
                </div>
              )}
            </div>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Started
              </div>
              <div style={{ 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}>
                {formatDate(agentStatus.current_task.started_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Info */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)'
          }}>
            Schedule
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Last Run
            </div>
            <div style={{ 
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)'
            }}>
              {formatDate(agentStatus?.last_run_at)}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 'var(--space-xs)'
            }}>
              Next Scheduled Run
            </div>
            <div style={{ 
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)'
            }}>
              {formatDate(agentStatus?.next_scheduled_run)}
            </div>
          </div>
          {agentConfig && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Search Frequency
              </div>
              <div style={{ 
                fontSize: '14px',
                color: 'var(--text-primary)'
              }}>
                Every {agentConfig.search_frequency_minutes || 60} minutes
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task History (Placeholder) */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)'
          }}>
            Recent Tasks
          </h3>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-xl)', 
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          Task history will appear here
        </div>
      </div>
    </div>
  )
}

export default AgentMonitoring



