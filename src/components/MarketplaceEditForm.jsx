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

function MarketplaceEditForm({ marketplace, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    enabled: true,
    monitoring_frequency: MonitoringFrequency.DAILY,
    monitoring_enabled: true,
    notification_types: [],
    notification_email: '',
    notification_portal_url: '',
    notification_portal_username: '',
    notification_portal_password: '',
    notification_webhook_url: '',
    notification_sms_number: '',
    metadata: {},
  })

  const [newMetadataKey, setNewMetadataKey] = useState('')
  const [newMetadataValue, setNewMetadataValue] = useState('')
  const [agreements, setAgreements] = useState([])
  const [showAgreementForm, setShowAgreementForm] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState(null)
  const [agreementForm, setAgreementForm] = useState({
    agreement_type: '',
    agreement_date: new Date().toISOString().split('T')[0],
    agreement_url: '',
    email_attachments: [],
    metadata: {},
  })
  const [newAttachment, setNewAttachment] = useState('')
  const [agreementMetadataKey, setAgreementMetadataKey] = useState('')
  const [agreementMetadataValue, setAgreementMetadataValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (marketplace) {
      setFormData({
        enabled: marketplace.enabled ?? true,
        monitoring_frequency: marketplace.monitoring_frequency || MonitoringFrequency.DAILY,
        monitoring_enabled: marketplace.monitoring_enabled ?? true,
        notification_types: marketplace.notification_types || [],
        notification_email: marketplace.notification_email || '',
        notification_portal_url: marketplace.notification_portal_url || '',
        notification_portal_username: marketplace.notification_portal_credentials?.username || '',
        notification_portal_password: marketplace.notification_portal_credentials?.password || '',
        notification_webhook_url: marketplace.notification_webhook_url || '',
        notification_sms_number: marketplace.notification_sms_number || '',
        metadata: marketplace.metadata || {},
      })
      setAgreements(marketplace.platform_agreements || [])
    }
  }, [marketplace])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleNotificationTypeToggle = (type) => {
    const currentTypes = formData.notification_types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    handleChange('notification_types', newTypes)
  }

  const handleAddMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [newMetadataKey]: newMetadataValue
        }
      }))
      setNewMetadataKey('')
      setNewMetadataValue('')
    }
  }

  const handleRemoveMetadata = (key) => {
    setFormData(prev => {
      const newMetadata = { ...prev.metadata }
      delete newMetadata[key]
      return { ...prev, metadata: newMetadata }
    })
  }

  const handleSaveAgreement = async () => {
    try {
      const agreementData = {
        agreement_type: agreementForm.agreement_type,
        agreement_date: new Date(agreementForm.agreement_date).toISOString(),
        agreement_url: agreementForm.agreement_url || undefined,
        email_attachments: agreementForm.email_attachments,
        metadata: agreementForm.metadata,
      }

      if (editingAgreement) {
        // Update existing agreement
        const response = await fetch(
          `http://localhost:8000/api/marketplaces/${marketplace.id}/agreements/${editingAgreement.agreement_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agreementData),
          }
        )
        if (!response.ok) throw new Error('Failed to update agreement')
      } else {
        // Create new agreement
        const response = await fetch(
          `http://localhost:8000/api/marketplaces/${marketplace.id}/agreements`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agreementData),
          }
        )
        if (!response.ok) throw new Error('Failed to create agreement')
      }

      // Reload marketplace to get updated agreements
      const updated = await api.getMarketplace(marketplace.id)
      setAgreements(updated.platform_agreements || [])
      setShowAgreementForm(false)
      setEditingAgreement(null)
      setAgreementForm({
        agreement_type: '',
        agreement_date: new Date().toISOString().split('T')[0],
        agreement_url: '',
        email_attachments: [],
        metadata: {},
      })
    } catch (err) {
      alert('Error saving agreement: ' + err.message)
    }
  }

  const handleDeleteAgreement = async (agreementId) => {
    if (!confirm('Are you sure you want to delete this agreement?')) return

    try {
      const response = await fetch(
        `http://localhost:8000/api/marketplaces/${marketplace.id}/agreements/${agreementId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete agreement')

      // Reload marketplace
      const updated = await api.getMarketplace(marketplace.id)
      setAgreements(updated.platform_agreements || [])
    } catch (err) {
      alert('Error deleting agreement: ' + err.message)
    }
  }

  const handleEditAgreement = (agreement) => {
    setEditingAgreement(agreement)
    setAgreementForm({
      agreement_type: agreement.agreement_type,
      agreement_date: new Date(agreement.agreement_date).toISOString().split('T')[0],
      agreement_url: agreement.agreement_url || '',
      email_attachments: agreement.email_attachments || [],
      metadata: agreement.metadata || {},
    })
    setShowAgreementForm(true)
  }

  const handleAddAttachment = () => {
    if (newAttachment) {
      setAgreementForm(prev => ({
        ...prev,
        email_attachments: [...prev.email_attachments, newAttachment]
      }))
      setNewAttachment('')
    }
  }

  const handleRemoveAttachment = (index) => {
    setAgreementForm(prev => ({
      ...prev,
      email_attachments: prev.email_attachments.filter((_, i) => i !== index)
    }))
  }

  const handleAddAgreementMetadata = () => {
    if (agreementMetadataKey && agreementMetadataValue) {
      setAgreementForm(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [agreementMetadataKey]: agreementMetadataValue
        }
      }))
      setAgreementMetadataKey('')
      setAgreementMetadataValue('')
    }
  }

  const handleRemoveAgreementMetadata = (key) => {
    setAgreementForm(prev => {
      const newMetadata = { ...prev.metadata }
      delete newMetadata[key]
      return { ...prev, metadata: newMetadata }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const updateData = {
        enabled: formData.enabled,
        monitoring_frequency: formData.monitoring_frequency,
        monitoring_enabled: formData.monitoring_enabled,
        notification_types: formData.notification_types,
        notification_email: formData.notification_email || undefined,
        notification_portal_url: formData.notification_portal_url || undefined,
        notification_portal_credentials: (formData.notification_portal_username || formData.notification_portal_password) ? {
          username: formData.notification_portal_username,
          password: formData.notification_portal_password,
        } : undefined,
        notification_webhook_url: formData.notification_webhook_url || undefined,
        notification_sms_number: formData.notification_sms_number || undefined,
        metadata: formData.metadata,
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      const response = await fetch(`http://localhost:8000/api/marketplaces/${marketplace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update marketplace')
      }

      const result = await response.json()
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      setError(err.message || 'Failed to update marketplace')
      console.error('Error updating marketplace:', err)
    } finally {
      setSubmitting(false)
    }
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
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          marginBottom: 'var(--space-sm)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)'
        }}>
          <span style={{ fontSize: '32px' }}>✏️</span>
          Edit Marketplace: {marketplace?.name}
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '14px',
          margin: 0
        }}>
          Configure monitoring, notifications, and platform agreements
        </p>
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Basic Settings */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Basic Settings
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Marketplace Enabled
              </label>
            </div>
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.monitoring_enabled}
                  onChange={(e) => handleChange('monitoring_enabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Monitoring Enabled
              </label>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-sm)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Monitoring Frequency
              </label>
              <select
                value={formData.monitoring_frequency}
                onChange={(e) => handleChange('monitoring_frequency', e.target.value)}
                className="input"
                style={{ cursor: 'pointer' }}
              >
                {Object.values(MonitoringFrequency).map(freq => (
                  <option key={freq} value={freq}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </option>
                ))}
              </select>
            </div>
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
              Notification Configuration
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500',
                marginBottom: 'var(--space-md)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Notification Types
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {Object.values(NotificationType).map(type => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: formData.notification_types.includes(type) 
                        ? 'rgba(0, 240, 255, 0.15)' 
                        : 'transparent',
                      border: `1px solid ${formData.notification_types.includes(type) ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: formData.notification_types.includes(type) ? '600' : '500',
                      color: formData.notification_types.includes(type) ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.notification_types.includes(type)}
                      onChange={() => handleNotificationTypeToggle(type)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {formData.notification_types.includes(NotificationType.EMAIL) && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => handleChange('notification_email', e.target.value)}
                  className="input"
                  placeholder="notifications@example.com"
                />
              </div>
            )}

            {formData.notification_types.includes(NotificationType.PORTAL) && (
              <>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500',
                    marginBottom: 'var(--space-sm)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Portal URL
                  </label>
                  <input
                    type="url"
                    value={formData.notification_portal_url}
                    onChange={(e) => handleChange('notification_portal_url', e.target.value)}
                    className="input"
                    placeholder="https://portal.example.com"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: '500',
                      marginBottom: 'var(--space-sm)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Portal Username
                    </label>
                    <input
                      type="text"
                      value={formData.notification_portal_username}
                      onChange={(e) => handleChange('notification_portal_username', e.target.value)}
                      className="input"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: '500',
                      marginBottom: 'var(--space-sm)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Portal Password
                    </label>
                    <input
                      type="password"
                      value={formData.notification_portal_password}
                      onChange={(e) => handleChange('notification_portal_password', e.target.value)}
                      className="input"
                      placeholder="Password"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.notification_types.includes(NotificationType.WEBHOOK) && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.notification_webhook_url}
                  onChange={(e) => handleChange('notification_webhook_url', e.target.value)}
                  className="input"
                  placeholder="https://webhook.example.com/endpoint"
                />
              </div>
            )}

            {formData.notification_types.includes(NotificationType.SMS) && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  SMS Number
                </label>
                <input
                  type="tel"
                  value={formData.notification_sms_number}
                  onChange={(e) => handleChange('notification_sms_number', e.target.value)}
                  className="input"
                  placeholder="+1234567890"
                />
              </div>
            )}
          </div>
        </section>

        {/* Platform Agreements */}
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
            <button
              type="button"
              onClick={() => {
                setEditingAgreement(null)
                setAgreementForm({
                  agreement_type: '',
                  agreement_date: new Date().toISOString().split('T')[0],
                  agreement_url: '',
                  email_attachments: [],
                  metadata: {},
                })
                setShowAgreementForm(true)
              }}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--neon-purple)',
                color: 'var(--neon-purple)',
                background: 'rgba(191, 0, 255, 0.1)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              + Add Agreement
            </button>
          </div>

          {showAgreementForm && (
            <div className="glass-panel" style={{ 
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-md)',
              border: '1px solid var(--neon-purple)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
                {editingAgreement ? 'Edit Agreement' : 'New Agreement'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginBottom: 'var(--space-xs)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Agreement Type
                  </label>
                  <input
                    type="text"
                    value={agreementForm.agreement_type}
                    onChange={(e) => setAgreementForm(prev => ({ ...prev, agreement_type: e.target.value }))}
                    className="input"
                    placeholder="e.g., Terms of Service, API Agreement"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      marginBottom: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Agreement Date
                    </label>
                    <input
                      type="date"
                      value={agreementForm.agreement_date}
                      onChange={(e) => setAgreementForm(prev => ({ ...prev, agreement_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      marginBottom: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Agreement URL
                    </label>
                    <input
                      type="url"
                      value={agreementForm.agreement_url}
                      onChange={(e) => setAgreementForm(prev => ({ ...prev, agreement_url: e.target.value }))}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginBottom: 'var(--space-xs)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Email Attachments
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                    <input
                      type="text"
                      value={newAttachment}
                      onChange={(e) => setNewAttachment(e.target.value)}
                      className="input"
                      placeholder="File path or URL"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        border: '1px solid var(--neon-purple)',
                        color: 'var(--neon-purple)',
                        background: 'rgba(191, 0, 255, 0.1)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {agreementForm.email_attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                      {agreementForm.email_attachments.map((attachment, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: 'var(--space-xs) var(--space-sm)',
                            background: 'rgba(191, 0, 255, 0.1)',
                            border: '1px solid var(--neon-purple)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}
                        >
                          {attachment}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--neon-purple)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginBottom: 'var(--space-xs)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Additional Metadata
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                    <input
                      type="text"
                      value={agreementMetadataKey}
                      onChange={(e) => setAgreementMetadataKey(e.target.value)}
                      className="input"
                      placeholder="Key"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      value={agreementMetadataValue}
                      onChange={(e) => setAgreementMetadataValue(e.target.value)}
                      className="input"
                      placeholder="Value"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddAgreementMetadata}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        border: '1px solid var(--neon-purple)',
                        color: 'var(--neon-purple)',
                        background: 'rgba(191, 0, 255, 0.1)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {Object.keys(agreementForm.metadata).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-xs)' }}>
                      {Object.entries(agreementForm.metadata).map(([key, value]) => (
                        <div key={key} style={{ 
                          padding: 'var(--space-xs) var(--space-sm)',
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {key}: {String(value)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAgreementMetadata(key)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--risk-high)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button
                    type="button"
                    onClick={handleSaveAgreement}
                    className="glass-panel"
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      border: '1px solid var(--neon-purple)',
                      color: 'var(--neon-purple)',
                      background: 'rgba(191, 0, 255, 0.1)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Save Agreement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAgreementForm(false)
                      setEditingAgreement(null)
                    }}
                    className="glass-panel"
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {agreements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {agreements.map((agreement, index) => (
                <div key={agreement.agreement_id || index} className="glass-panel" style={{ 
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
                      {agreement.agreement_type}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Date: {new Date(agreement.agreement_date).toLocaleDateString()}
                      {agreement.agreement_url && (
                        <>
                          {' • '}
                          <a href={agreement.agreement_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)' }}>
                            View
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <button
                      type="button"
                      onClick={() => handleEditAgreement(agreement)}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        border: '1px solid var(--neon-cyan)',
                        color: 'var(--neon-cyan)',
                        background: 'rgba(0, 240, 255, 0.1)',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAgreement(agreement.agreement_id)}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
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

        {/* Additional Metadata */}
        <section className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontSize: '20px' }}>🔧</span>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Additional Metadata
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <input
                type="text"
                value={newMetadataKey}
                onChange={(e) => setNewMetadataKey(e.target.value)}
                className="input"
                placeholder="Key"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
                className="input"
                placeholder="Value"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddMetadata}
                className="glass-panel"
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  border: '1px solid var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  background: 'rgba(0, 240, 255, 0.1)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Add
              </button>
            </div>
            {Object.keys(formData.metadata).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-xs)' }}>
                {Object.entries(formData.metadata).map(([key, value]) => (
                  <div key={key} style={{ 
                    padding: 'var(--space-sm)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-xs)'
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{key}:</span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMetadata(key)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--risk-high)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: 0
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Form Actions */}
        <div className="glass-panel" style={{ 
          padding: 'var(--space-lg)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-lg)'
        }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="glass-panel"
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all var(--transition-fast)',
                minWidth: '120px'
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="glass-panel"
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              border: '1px solid var(--neon-purple)',
              color: 'var(--neon-purple)',
              background: 'rgba(191, 0, 255, 0.1)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all var(--transition-fast)',
              minWidth: '180px',
              opacity: submitting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)'
            }}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                Saving...
              </>
            ) : (
              <>
                <span>✓</span> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MarketplaceEditForm



