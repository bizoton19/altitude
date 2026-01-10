import { useState, useEffect } from 'react'
import * as api from '../services/api'

/**
 * RiskClassificationSettings Component
 * Configuration UI for risk classification rules, levels, and scoring
 */
function RiskClassificationSettings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('levels') // 'levels', 'rules', 'keywords', 'thresholds', 'test'
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRiskClassificationConfig()
      setConfig(data)
    } catch (err) {
      setError(err.message || 'Failed to load risk classification config')
      console.error('Error loading risk classification config:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      const updated = await api.updateRiskClassificationConfig(config)
      setConfig(updated)
      alert('Risk classification configuration saved successfully!')
    } catch (err) {
      alert('Error saving config: ' + err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (updates) => {
    setConfig({ ...config, ...updates })
  }

  const addRiskLevel = () => {
    const newLevel = {
      name: 'NEW_LEVEL',
      score_threshold: 0.0,
      color: '#888888',
      badge: 'NEW',
      priority: config.risk_levels.length + 1
    }
    updateConfig({
      risk_levels: [...config.risk_levels, newLevel]
    })
  }

  const updateRiskLevel = (index, updates) => {
    const levels = [...config.risk_levels]
    levels[index] = { ...levels[index], ...updates }
    updateConfig({ risk_levels: levels })
  }

  const deleteRiskLevel = (index) => {
    if (config.risk_levels.length <= 1) {
      alert('At least one risk level is required')
      return
    }
    const levels = config.risk_levels.filter((_, i) => i !== index)
    updateConfig({ risk_levels: levels })
  }

  const addScoreRule = () => {
    const newRule = {
      rule_id: `rule_${Date.now()}`,
      name: 'New Rule',
      field_path: 'injuries',
      operator: '>=',
      value: 0,
      score_contribution: 0.0,
      score_per_unit: null,
      max_contribution: null,
      force_level: null,
      enabled: true
    }
    updateConfig({
      score_rules: [...config.score_rules, newRule]
    })
  }

  const updateScoreRule = (index, updates) => {
    const rules = [...config.score_rules]
    rules[index] = { ...rules[index], ...updates }
    updateConfig({ score_rules: rules })
  }

  const deleteScoreRule = (index) => {
    const rules = config.score_rules.filter((_, i) => i !== index)
    updateConfig({ score_rules: rules })
  }

  const addKeywordRule = () => {
    const newRule = {
      rule_id: `keyword_${Date.now()}`,
      name: 'New Keyword Rule',
      keywords: [],
      score_per_match: 0.1,
      max_contribution: 0.3,
      enabled: true
    }
    updateConfig({
      keyword_rules: [...config.keyword_rules, newRule]
    })
  }

  const updateKeywordRule = (index, updates) => {
    const rules = [...config.keyword_rules]
    rules[index] = { ...rules[index], ...updates }
    updateConfig({ keyword_rules: rules })
  }

  const deleteKeywordRule = (index) => {
    const rules = config.keyword_rules.filter((_, i) => i !== index)
    updateConfig({ keyword_rules: rules })
  }

  const addUnitsSoldThreshold = () => {
    const newThreshold = {
      threshold: 0,
      score_contribution: 0.0
    }
    updateConfig({
      units_sold_thresholds: [...config.units_sold_thresholds, newThreshold]
    })
  }

  const updateUnitsSoldThreshold = (index, updates) => {
    const thresholds = [...config.units_sold_thresholds]
    thresholds[index] = { ...thresholds[index], ...updates }
    updateConfig({ units_sold_thresholds: thresholds })
  }

  const deleteUnitsSoldThreshold = (index) => {
    const thresholds = config.units_sold_thresholds.filter((_, i) => i !== index)
    updateConfig({ units_sold_thresholds: thresholds })
  }

  const testClassification = async () => {
    const testViolation = {
      violation_id: 'test-001',
      violation_number: 'TEST-001',
      title: 'Test Violation',
      url: 'https://example.com',
      agency_name: 'Test Agency',
      injuries: 5,
      deaths: 0,
      incidents: 2,
      units_affected: 50000,
      hazards: [{ description: 'Fire hazard and burn risk' }]
    }

    try {
      const result = await api.testRiskClassification(testViolation)
      setTestResult(result)
    } catch (err) {
      alert('Error testing classification: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="glass-panel alert-error" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error || 'Failed to load risk classification configuration'}</span>
        </div>
      </div>
    )
  }

  const operators = ['>', '>=', '<', '<=', '==', '!=', 'is_null', 'is_not_null']
  const fieldPaths = [
    'injuries', 'deaths', 'incidents', 'units_affected', 'illnesses',
    'violation_type', 'country', 'agency_name'
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
            ⚠️ Risk Classification Rules
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure how violations are classified by risk level
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '10px 20px' }}
        >
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)' }}>
        {[
          { id: 'levels', label: '📊 Risk Levels' },
          { id: 'rules', label: '📋 Score Rules' },
          { id: 'keywords', label: '🔤 Keywords' },
          { id: 'thresholds', label: '📈 Units Thresholds' },
          { id: 'test', label: '🧪 Test' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`filter-btn ${activeTab === tab.id ? 'active' : ''}`}
            style={{ padding: '10px 20px', borderBottom: activeTab === tab.id ? '2px solid var(--neon-cyan)' : 'none' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Risk Levels Tab */}
      {activeTab === 'levels' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Risk Levels</h4>
            <button onClick={addRiskLevel} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              + Add Level
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {config.risk_levels.map((level, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderRadius: '8px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input"
                    value={level.name}
                    onChange={(e) => updateRiskLevel(index, { name: e.target.value })}
                    placeholder="Level name"
                    style={{ fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={level.score_threshold}
                    onChange={(e) => updateRiskLevel(index, { score_threshold: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="1"
                    step="0.01"
                    placeholder="Threshold"
                    style={{ fontSize: '13px' }}
                  />
                  <input
                    type="text"
                    className="input"
                    value={level.color || ''}
                    onChange={(e) => updateRiskLevel(index, { color: e.target.value })}
                    placeholder="Color"
                    style={{ fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={level.priority}
                    onChange={(e) => updateRiskLevel(index, { priority: parseInt(e.target.value) || 1 })}
                    placeholder="Priority"
                    style={{ fontSize: '13px' }}
                  />
                  <button
                    onClick={() => deleteRiskLevel(index)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Rules Tab */}
      {activeTab === 'rules' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Score Rules</h4>
            <button onClick={addScoreRule} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              + Add Rule
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {config.score_rules.map((rule, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderRadius: '8px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    value={rule.name}
                    onChange={(e) => updateScoreRule(index, { name: e.target.value })}
                    placeholder="Rule name"
                    style={{ fontSize: '12px' }}
                  />
                  <select
                    className="input"
                    value={rule.field_path}
                    onChange={(e) => updateScoreRule(index, { field_path: e.target.value })}
                    style={{ fontSize: '12px' }}
                  >
                    {fieldPaths.map(fp => (
                      <option key={fp} value={fp}>{fp}</option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={rule.operator}
                    onChange={(e) => updateScoreRule(index, { operator: e.target.value })}
                    style={{ fontSize: '12px' }}
                  >
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    value={rule.value || ''}
                    onChange={(e) => updateScoreRule(index, { value: parseFloat(e.target.value) || 0 })}
                    placeholder="Value"
                    disabled={rule.operator === 'is_null' || rule.operator === 'is_not_null'}
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={rule.score_contribution || 0}
                    onChange={(e) => updateScoreRule(index, { score_contribution: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="1"
                    step="0.01"
                    placeholder="Base score"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={rule.score_per_unit || ''}
                    onChange={(e) => updateScoreRule(index, { score_per_unit: parseFloat(e.target.value) || null })}
                    placeholder="Per unit"
                    min="0"
                    step="0.01"
                    style={{ fontSize: '12px' }}
                  />
                  <button
                    onClick={() => deleteScoreRule(index)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="number"
                    className="input"
                    value={rule.max_contribution || ''}
                    onChange={(e) => updateScoreRule(index, { max_contribution: parseFloat(e.target.value) || null })}
                    placeholder="Max contribution"
                    min="0"
                    max="1"
                    step="0.01"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    className="input"
                    value={rule.force_level || ''}
                    onChange={(e) => updateScoreRule(index, { force_level: e.target.value || null })}
                    placeholder="Force level (optional)"
                    style={{ fontSize: '12px' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => updateScoreRule(index, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Keyword Rules</h4>
            <button onClick={addKeywordRule} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              + Add Rule
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {config.keyword_rules.map((rule, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderRadius: '8px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    value={rule.name}
                    onChange={(e) => updateKeywordRule(index, { name: e.target.value })}
                    placeholder="Rule name"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={rule.score_per_match}
                    onChange={(e) => updateKeywordRule(index, { score_per_match: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    placeholder="Score per match"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    className="input"
                    value={rule.max_contribution}
                    onChange={(e) => updateKeywordRule(index, { max_contribution: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="1"
                    step="0.01"
                    placeholder="Max contribution"
                    style={{ fontSize: '12px' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => updateKeywordRule(index, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => deleteKeywordRule(index)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Keywords (comma-separated)
                  </label>
                  <textarea
                    className="input"
                    value={rule.keywords.join(', ')}
                    onChange={(e) => updateKeywordRule(index, { 
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                    })}
                    placeholder="death, fatal, fire, burn..."
                    style={{ fontSize: '12px', minHeight: '60px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Units Sold Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Units Sold Thresholds</h4>
            <button onClick={addUnitsSoldThreshold} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              + Add Threshold
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {config.units_sold_thresholds.map((threshold, index) => (
              <div key={index} style={{ 
                padding: '16px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '12px',
                alignItems: 'center'
              }}>
                <input
                  type="number"
                  className="input"
                  value={threshold.threshold}
                  onChange={(e) => updateUnitsSoldThreshold(index, { threshold: parseInt(e.target.value) || 0 })}
                  placeholder="Units threshold"
                  style={{ fontSize: '13px' }}
                />
                <input
                  type="number"
                  className="input"
                  value={threshold.score_contribution}
                  onChange={(e) => updateUnitsSoldThreshold(index, { score_contribution: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="Score contribution"
                  style={{ fontSize: '13px' }}
                />
                <button
                  onClick={() => deleteUnitsSoldThreshold(index)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Test Classification</h4>
          <button onClick={testClassification} className="btn btn-primary" style={{ marginBottom: '16px' }}>
            🧪 Test with Sample Violation
          </button>
          {testResult && (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(0, 240, 255, 0.1)', 
              borderRadius: '8px',
              border: '1px solid var(--neon-cyan)'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Result:</strong> Risk Level = <span style={{ color: 'var(--neon-cyan)' }}>{testResult.risk_level}</span>, 
                Score = <span style={{ color: 'var(--neon-cyan)' }}>{testResult.risk_score.toFixed(3)}</span>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                  View test violation details
                </summary>
                <pre style={{ 
                  marginTop: '8px', 
                  fontSize: '11px', 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  padding: '12px', 
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(testResult.original_violation, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RiskClassificationSettings






