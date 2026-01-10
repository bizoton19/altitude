import { useState, useEffect } from 'react'

/**
 * ToolIntegrations Component
 * Configuration for external tools like Google Lens, reverse image search, etc.
 */

const AVAILABLE_TOOLS = [
  {
    id: 'google_lens',
    name: 'Google Lens',
    icon: '🔍',
    description: 'Visual product search using Google\'s image recognition',
    requiresKey: true,
    keyPlaceholder: 'Google Cloud Vision API Key'
  },
  {
    id: 'google_vision',
    name: 'Google Vision API',
    icon: '👁️',
    description: 'Advanced image analysis for product matching',
    requiresKey: true,
    keyPlaceholder: 'Google Cloud Vision API Key'
  },
  {
    id: 'tineye',
    name: 'TinEye',
    icon: '🖼️',
    description: 'Reverse image search to find product listings',
    requiresKey: true,
    keyPlaceholder: 'TinEye API Key'
  },
  {
    id: 'bing_visual',
    name: 'Bing Visual Search',
    icon: '🔎',
    description: 'Microsoft\'s visual search for product discovery',
    requiresKey: true,
    keyPlaceholder: 'Bing Search API Key'
  },
  {
    id: 'custom_webhook',
    name: 'Custom Webhook',
    icon: '🔗',
    description: 'Connect your own visual search endpoint',
    requiresKey: true,
    keyPlaceholder: 'Webhook URL'
  }
]

function ToolIntegrations() {
  const [integrations, setIntegrations] = useState({})
  const [expandedTool, setExpandedTool] = useState(null)

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('toolIntegrations')
    if (stored) {
      try {
        setIntegrations(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading tool integrations:', e)
      }
    }
  }, [])

  // Save settings to localStorage
  const saveIntegrations = (newIntegrations) => {
    setIntegrations(newIntegrations)
    localStorage.setItem('toolIntegrations', JSON.stringify(newIntegrations))
  }

  const toggleTool = (toolId) => {
    const current = integrations[toolId] || { enabled: false, apiKey: '' }
    saveIntegrations({
      ...integrations,
      [toolId]: { ...current, enabled: !current.enabled }
    })
  }

  const updateApiKey = (toolId, apiKey) => {
    const current = integrations[toolId] || { enabled: false, apiKey: '' }
    saveIntegrations({
      ...integrations,
      [toolId]: { ...current, apiKey }
    })
  }

  const getToolState = (toolId) => {
    return integrations[toolId] || { enabled: false, apiKey: '' }
  }

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
          🛠️ Tool Integrations
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Connect external tools to enhance product detection on marketplaces
        </p>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {AVAILABLE_TOOLS.map((tool) => {
          const state = getToolState(tool.id)
          const isExpanded = expandedTool === tool.id
          
          return (
            <div 
              key={tool.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                overflow: 'hidden'
              }}
            >
              {/* Tool Header */}
              <div 
                onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{tool.icon}</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{tool.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tool.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {state.enabled && state.apiKey && (
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '2px 8px',
                      background: 'rgba(0, 255, 136, 0.2)',
                      color: 'var(--risk-low)',
                      borderRadius: '4px'
                    }}>
                      CONFIGURED
                    </span>
                  )}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTool(tool.id)
                    }}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      background: state.enabled ? 'var(--neon-cyan)' : 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: 'var(--text-primary)',
                      position: 'absolute',
                      top: '2px',
                      left: state.enabled ? '18px' : '2px',
                      transition: 'all 0.2s ease'
                    }} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Tool Configuration */}
              {isExpanded && (
                <div style={{ 
                  padding: '12px 16px', 
                  borderTop: '1px solid var(--glass-border)',
                  background: 'rgba(0, 0, 0, 0.2)'
                }}>
                  {tool.requiresKey && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        {tool.id === 'custom_webhook' ? 'Webhook URL' : 'API Key'}
                      </label>
                      <input
                        type={tool.id === 'custom_webhook' ? 'url' : 'password'}
                        className="input"
                        placeholder={tool.keyPlaceholder}
                        value={state.apiKey || ''}
                        onChange={(e) => updateApiKey(tool.id, e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {state.enabled 
                        ? (state.apiKey ? '✓ Ready to use' : '⚠️ API key required')
                        : 'Disabled'}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '11px' }}
                      onClick={() => {
                        // Test connection (placeholder)
                        alert(`Testing ${tool.name} connection...`)
                      }}
                      disabled={!state.enabled || !state.apiKey}
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          💡 How it works
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          When enabled, the agent will use these tools to visually search for recalled products on each marketplace.
          Upload recall product images to find similar listings across platforms.
        </p>
      </div>
    </div>
  )
}

export default ToolIntegrations
