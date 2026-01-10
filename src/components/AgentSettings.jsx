import { useState, useEffect } from 'react'
import * as api from '../services/api'
import AgentSkillsManager from './AgentSkillsManager'

/**
 * AgentSettings Component
 * Configuration for the AI agent that searches marketplaces
 */
function AgentSettings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAgentConfig()
      setConfig(data)
    } catch (err) {
      setError(err.message || 'Failed to load agent config')
      console.error('Error loading agent config:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (updates) => {
    setSaving(true)
    try {
      const updated = await api.updateAgentConfig(updates)
      setConfig(updated)
    } catch (err) {
      alert('Error updating config: ' + err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = async (key, value) => {
    await updateConfig({ [key]: value })
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '200px',
        padding: 'var(--space-xl)'
      }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="glass-panel alert-error" style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error || 'Failed to load agent configuration'}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
              🤖 Agent Configuration
          </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure the AI agent that monitors marketplaces for recalled products
          </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* LLM/Model Provider Section */}
          <div className="glass-panel" style={{ 
            padding: 'var(--space-lg)',
            border: '1px solid var(--neon-purple)',
            background: 'rgba(191, 0, 255, 0.05)'
          }}>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-lg)',
              paddingBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <span style={{ fontSize: '20px' }}>🧠</span>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600',
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                LLM / Model Configuration
              </h4>
      </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* LLM Provider */}
        <div>
                <label style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-secondary)', 
                  display: 'block', 
                  marginBottom: 'var(--space-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  LLM Provider
          </label>
          <select
                  value={config.llm_provider || 'openai'}
                  onChange={(e) => updateSetting('llm_provider', e.target.value)}
                  disabled={saving}
                  className="input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="ollama">Ollama (Local Models)</option>
                  <option value="custom">Custom API</option>
          </select>
        </div>

              {/* Model Selection */}
        <div>
                <label style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-secondary)', 
                  display: 'block', 
                  marginBottom: 'var(--space-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Model Name
          </label>
            <input
                  type="text"
                  value={config.llm_model || 'gpt-4o'}
                  onChange={(e) => updateSetting('llm_model', e.target.value)}
                  disabled={saving}
                  className="input"
                  placeholder={config.llm_provider === 'openai' ? 'gpt-4o, gpt-4-turbo, gpt-3.5-turbo' : 
                               config.llm_provider === 'anthropic' ? 'claude-3-5-sonnet-20241022, claude-3-opus-20240229' :
                               config.llm_provider === 'ollama' ? 'llama3, mistral, codellama' :
                               'model-name'}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                  {config.llm_provider === 'openai' && 'OpenAI model name (e.g., gpt-4o, gpt-4-turbo)'}
                  {config.llm_provider === 'anthropic' && 'Anthropic model name (e.g., claude-3-5-sonnet-20241022)'}
                  {config.llm_provider === 'ollama' && 'Ollama model name (e.g., llama3, mistral)'}
                  {config.llm_provider === 'custom' && 'Custom model name for your API'}
                </p>
        </div>

              {/* API Key */}
        <div>
                <label style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: 'var(--text-secondary)', 
                  display: 'block', 
                  marginBottom: 'var(--space-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  API Key
          </label>
                <input
                  type="password"
                  value={config.llm_api_key === '***configured***' ? '' : (config.llm_api_key || '')}
                  onChange={(e) => updateSetting('llm_api_key', e.target.value)}
                  disabled={saving}
                  className="input"
                  placeholder={config.llm_api_key === '***configured***' ? 'API key is configured (enter new key to update)' : 
                               config.llm_provider === 'openai' ? 'sk-...' :
                               config.llm_provider === 'anthropic' ? 'sk-ant-...' :
                               'API key'}
                />
                {config.llm_api_key === '***configured***' && (
                  <p style={{ fontSize: '11px', color: 'var(--risk-low)', marginTop: 'var(--space-xs)' }}>
                    ✓ API key is configured. Leave blank to keep current key, or enter new key to update.
                  </p>
                )}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                  {config.llm_provider === 'openai' && 'Get your API key from https://platform.openai.com/api-keys'}
                  {config.llm_provider === 'anthropic' && 'Get your API key from https://console.anthropic.com/'}
                  {config.llm_provider === 'ollama' && 'Not required for local Ollama (leave blank)'}
                  {config.llm_provider === 'custom' && 'API key for your custom endpoint'}
          </p>
        </div>

              {/* API Base URL (for Ollama/Custom) */}
              {(config.llm_provider === 'ollama' || config.llm_provider === 'custom') && (
          <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '500',
                    color: 'var(--text-secondary)', 
                    display: 'block', 
                    marginBottom: 'var(--space-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={config.llm_api_base || ''}
                    onChange={(e) => updateSetting('llm_api_base', e.target.value)}
                    disabled={saving}
                    className="input"
                    placeholder={config.llm_provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                    {config.llm_provider === 'ollama' && 'Ollama server URL (default: http://localhost:11434)'}
                    {config.llm_provider === 'custom' && 'Base URL for your custom API endpoint'}
            </p>
          </div>
              )}

              {/* Temperature and Max Tokens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '500',
                    color: 'var(--text-secondary)', 
                    display: 'block', 
                    marginBottom: 'var(--space-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Temperature (0.0 - 2.0)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.llm_temperature || 0.7}
                      onChange={(e) => updateSetting('llm_temperature', parseFloat(e.target.value))}
                      disabled={saving}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)', minWidth: '40px', textAlign: 'right' }}>
                      {(config.llm_temperature || 0.7).toFixed(1)}
                    </span>
          </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                    Lower = more deterministic, Higher = more creative
                  </p>
    </div>

        <div>
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '500',
                    color: 'var(--text-secondary)', 
                    display: 'block', 
                    marginBottom: 'var(--space-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={config.llm_max_tokens || 4096}
                    onChange={(e) => updateSetting('llm_max_tokens', parseInt(e.target.value))}
                    disabled={saving}
                    className="input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                    Maximum tokens in response
          </p>
        </div>
              </div>
            </div>
      </div>

        {/* Search Frequency */}
        <div>
            <label style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Search Frequency (minutes)
          </label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
              <input
                type="range"
                min="5"
                max="1440"
                step="5"
                value={config.search_frequency_minutes || 60}
                onChange={(e) => updateSetting('search_frequency_minutes', parseInt(e.target.value))}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min="5"
                max="1440"
                value={config.search_frequency_minutes || 60}
                onChange={(e) => updateSetting('search_frequency_minutes', parseInt(e.target.value))}
                disabled={saving}
                className="input"
                style={{ width: '100px', fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', minWidth: '60px' }}>
                min
              </span>
            </div>
        </div>

        {/* Search Depth */}
        <div>
            <label style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
            Search Depth (pages per platform)
          </label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <input
              type="range"
              min="1"
              max="10"
                value={config.search_depth || 3}
                onChange={(e) => updateSetting('search_depth', parseInt(e.target.value))}
                disabled={saving}
              style={{ flex: 1 }}
            />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)', minWidth: '30px', textAlign: 'right' }}>
                {config.search_depth || 3}
            </span>
          </div>
        </div>

        {/* Match Sensitivity */}
        <div>
            <label style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Match Sensitivity (0.0 - 1.0)
          </label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.match_sensitivity || 0.7}
                onChange={(e) => updateSetting('match_sensitivity', parseFloat(e.target.value))}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)', minWidth: '50px', textAlign: 'right' }}>
                {(config.match_sensitivity || 0.7).toFixed(1)}
              </span>
          </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              Higher values = more lenient matching (more results, lower precision)
          </p>
        </div>

          {/* Auto Alerts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
          <div>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Auto-Alert on High-Confidence Matches
            </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                Automatically flag listings that exceed the threshold
            </p>
          </div>
          <div 
              onClick={() => !saving && updateSetting('auto_alerts_enabled', !config.auto_alerts_enabled)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
                background: config.auto_alerts_enabled ? 'var(--neon-cyan)' : 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              position: 'relative',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.5 : 1
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              position: 'absolute',
              top: '2px',
                left: config.auto_alerts_enabled ? '22px' : '2px',
              transition: 'all 0.2s ease'
            }} />
          </div>
        </div>

          {/* Auto Flag Threshold */}
        <div>
            <label style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Auto-Flag Threshold (0.0 - 1.0)
        </label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <input
              type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.auto_flag_threshold || 0.8}
                onChange={(e) => updateSetting('auto_flag_threshold', parseFloat(e.target.value))}
                disabled={saving || !config.auto_alerts_enabled}
                style={{ flex: 1, opacity: config.auto_alerts_enabled ? 1 : 0.5 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)', minWidth: '50px', textAlign: 'right' }}>
                {(config.auto_flag_threshold || 0.8).toFixed(1)}
            </span>
          </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              Match score threshold for automatic flagging (when auto-alerts enabled)
            </p>
        </div>

          {/* Email Alerts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
          <div>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Email Alerts
            </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                Send email notifications for agent alerts
            </p>
          </div>
          <div 
              onClick={() => !saving && updateSetting('email_alerts', !config.email_alerts)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
                background: config.email_alerts ? 'var(--neon-cyan)' : 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              position: 'relative',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.5 : 1
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              position: 'absolute',
              top: '2px',
                left: config.email_alerts ? '22px' : '2px',
              transition: 'all 0.2s ease'
            }} />
          </div>
        </div>

          {/* Webhook URL */}
        <div>
            <label style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Webhook URL
          </label>
            <input
              type="url"
              value={config.webhook_url || ''}
              onChange={(e) => updateSetting('webhook_url', e.target.value)}
              disabled={saving}
              className="input"
              placeholder="https://your-webhook-endpoint.com/alerts"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              Optional webhook URL for receiving agent alerts
            </p>
          </div>
        </div>
      </div>

      {/* Agent Skills Management */}
      <AgentSkillsManager />
    </div>
  )
}

export default AgentSettings
