import { useState, useEffect } from 'react'
import RiskBadge from './RiskBadge'
import * as api from '../services/api'

const MonitoringFrequency = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
}

const NotificationType = {
  EMAIL: 'email',
  PORTAL: 'portal',
  WEBHOOK: 'webhook',
  SMS: 'sms',
}

function MarketplaceDetailView({ marketplaceId, onEdit, onBack }) {
  const [marketplace, setMarketplace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calculatingRisk, setCalculatingRisk] = useState(false)

  useEffect(() => {
    loadMarketplace()
  }, [marketplaceId])

  const loadMarketplace = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getMarketplace(marketplaceId)
      setMarketplace(data)
    } catch (err) {
      setError(err.message || 'Failed to load marketplace')
      console.error('Error loading marketplace:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateRisk = async () => {
    setCalculatingRisk(true)
    try {
      const response = await fetch(`http://localhost:8000/api/marketplaces/${marketplaceId}/calculate-risk`, {
        method: 'POST',
      })
      if (response.ok) {
        await loadMarketplace() // Reload to get updated risk data
      } else {
        throw new Error('Failed to calculate risk')
      }
    } catch (err) {
      alert('Error calculating risk: ' + err.message)
    } finally {
      setCalculatingRisk(false)
    }
  }

  const handleTestNotification = async (notificationType) => {
    try {
      const response = await fetch(`http://localhost:8000/api/marketplaces/${marketplaceId}/test-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_type: notificationType }),
      })
      if (response.ok) {
        const result = await response.json()
        alert(`Test notification sent successfully via ${notificationType}!\n${result.message}`)
      } else {
        throw new Error('Failed to send test notification')
      }
    } catch (err) {
      alert('Error sending test notification: ' + err.message)
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
          <div style={{ color: 'var(--text-secondary)' }}>Loading marketplace...</div>
        </div>
      </div>
    )
  }

  if (error || !marketplace) {
    return (
      <div className="glass-panel alert-error" style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error || 'Marketplace not found'}</span>
        </div>
        {onBack && (
          <button
            onClick={onBack}
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
            ← Back
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ 
      padding: 'var(--space-xl)', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="glass-panel" style={{ 
        padding: 'var(--space-xl)', 
        marginBottom: 'var(--space-lg)',
        borderBottom: '2px solid var(--neon-purple)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              marginBottom: 'var(--space-sm)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)'
            }}>
              <span style={{ fontSize: '32px' }}>🛒</span>
              {marketplace.name}
            </h1>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)'
            }}>
              <a 
                href={marketplace.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}
              >
                {marketplace.url}
              </a>
              <span style={{ 
                padding: 'var(--space-xs) var(--space-sm)',
                background: marketplace.enabled ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                border: `1px solid ${marketplace.enabled ? 'var(--risk-low)' : 'var(--risk-high)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '500',
                color: marketplace.enabled ? 'var(--risk-low)' : 'var(--risk-high)'
              }}>
                {marketplace.enabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {onBack && (
              <button
                onClick={onBack}
                className="glass-panel"
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                ← Back
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="glass-panel"
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  border: '1px solid var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  background: 'rgba(0, 240, 255, 0.1)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                ✏️ Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Basic Information */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Basic Information
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Marketplace ID
              </div>
              <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                {marketplace.id}
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
                Status
              </div>
              <div style={{ 
                display: 'inline-block',
                padding: 'var(--space-xs) var(--space-sm)',
                background: marketplace.status === 'active' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 170, 0, 0.1)',
                border: `1px solid ${marketplace.status === 'active' ? 'var(--risk-low)' : 'var(--risk-medium)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '500',
                color: marketplace.status === 'active' ? 'var(--risk-low)' : 'var(--risk-medium)',
                textTransform: 'uppercase'
              }}>
                {marketplace.status}
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
                Rate Limit
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {marketplace.rate_limit_per_minute} requests/minute
              </div>
            </div>
            {marketplace.last_search_at && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Last Search
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(marketplace.last_search_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Monitoring Configuration */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>⏰</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Monitoring
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Frequency
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {marketplace.monitoring_frequency ? 
                  marketplace.monitoring_frequency.charAt(0).toUpperCase() + marketplace.monitoring_frequency.slice(1) 
                  : 'Not set'}
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
                Monitoring Status
              </div>
              <div style={{ 
                display: 'inline-block',
                padding: 'var(--space-xs) var(--space-sm)',
                background: marketplace.monitoring_enabled ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                border: `1px solid ${marketplace.monitoring_enabled ? 'var(--risk-low)' : 'var(--risk-high)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: '500',
                color: marketplace.monitoring_enabled ? 'var(--risk-low)' : 'var(--risk-high)',
                textTransform: 'uppercase'
              }}>
                {marketplace.monitoring_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            {marketplace.last_monitored_at && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Last Monitored
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(marketplace.last_monitored_at).toLocaleString()}
                </div>
              </div>
            )}
            {marketplace.next_monitoring_at && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Next Monitoring
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(marketplace.next_monitoring_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Risk Level */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '20px' }}>📊</span>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                Risk Level
              </h2>
            </div>
            <button
              onClick={handleCalculateRisk}
              disabled={calculatingRisk}
              className="glass-panel"
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                background: 'rgba(0, 240, 255, 0.1)',
                cursor: calculatingRisk ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                opacity: calculatingRisk ? 0.6 : 1
              }}
            >
              {calculatingRisk ? 'Calculating...' : 'Recalculate'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-sm)'
              }}>
                Current Risk Level
              </div>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <RiskBadge level={marketplace.risk_level || 'unknown'} />
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
                Violation Listings Found
              </div>
              <div style={{ 
                color: 'var(--text-primary)', 
                fontSize: '24px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)'
              }}>
                {marketplace.violation_listings_count || 0}
              </div>
            </div>
            {marketplace.risk_calculation_date && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Last Calculated
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(marketplace.risk_calculation_date).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Notification Configuration */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Notifications
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-sm)'
              }}>
                Notification Types
              </div>
              {marketplace.notification_types && marketplace.notification_types.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {marketplace.notification_types.map(type => (
                    <span
                      key={type}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--neon-cyan)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: '500',
                        color: 'var(--neon-cyan)',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)'
                      }}
                    >
                      {type}
                      <button
                        onClick={() => handleTestNotification(type)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--neon-cyan)',
                          cursor: 'pointer',
                          fontSize: '10px',
                          padding: 0,
                          marginLeft: '4px'
                        }}
                        title="Test notification"
                      >
                        🧪
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  No notification types configured
                </div>
              )}
            </div>
            {marketplace.notification_email && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Email
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                  {marketplace.notification_email}
                </div>
              </div>
            )}
            {marketplace.notification_portal_url && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Portal URL
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                  <a 
                    href={marketplace.notification_portal_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}
                  >
                    {marketplace.notification_portal_url}
                  </a>
                </div>
              </div>
            )}
            {marketplace.notification_portal_credentials && Object.keys(marketplace.notification_portal_credentials).length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Portal Credentials
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  {Object.keys(marketplace.notification_portal_credentials).length} credential(s) configured
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Platform Agreements */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)', gridColumn: 'span 2' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>📄</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Platform Agreements
            </h2>
          </div>
          {marketplace.platform_agreements && marketplace.platform_agreements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {marketplace.platform_agreements.map((agreement, index) => (
                <div key={agreement.agreement_id || index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                    <div>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '500',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Agreement Type
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                        {agreement.agreement_type}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '500',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Agreement Date
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {new Date(agreement.agreement_date).toLocaleDateString()}
                      </div>
                    </div>
                    {agreement.agreement_url && (
                      <div>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: '500',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 'var(--space-xs)'
                        }}>
                          URL
                        </div>
                        <div style={{ fontSize: '13px' }}>
                          <a 
                            href={agreement.agreement_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}
                          >
                            View Agreement
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  {agreement.email_attachments && agreement.email_attachments.length > 0 && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '500',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Email Attachments
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                        {agreement.email_attachments.map((attachment, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: 'var(--space-xs) var(--space-sm)',
                              background: 'rgba(191, 0, 255, 0.1)',
                              border: '1px solid var(--neon-purple)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              color: 'var(--neon-purple)'
                            }}
                          >
                            {attachment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {agreement.metadata && Object.keys(agreement.metadata).length > 0 && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '500',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Additional Metadata
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-xs)' }}>
                        {Object.entries(agreement.metadata).map(([key, value]) => (
                          <div key={key} style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{key}:</span>{' '}
                            <span style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No platform agreements configured
            </div>
          )}
        </section>

        {/* Statistics */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>📈</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Statistics
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 'var(--space-xs)'
              }}>
                Total Searches
              </div>
              <div style={{ 
                color: 'var(--text-primary)', 
                fontSize: '24px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)'
              }}>
                {marketplace.total_searches || 0}
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
                Total Listings Found
              </div>
              <div style={{ 
                color: 'var(--text-primary)', 
                fontSize: '24px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)'
              }}>
                {marketplace.total_listings_found || 0}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default MarketplaceDetailView



