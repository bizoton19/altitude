import { useState, useEffect } from 'react'
import * as api from '../services/api'

const SKILL_TYPES = {
  risk_classification: { label: 'Risk Classification', icon: '🎯' },
  query_building: { label: 'Query Building', icon: '🔍' },
  match_analysis: { label: 'Match Analysis', icon: '📊' },
  data_extraction: { label: 'Data Extraction', icon: '📝' },
  notification: { label: 'Notification', icon: '🔔' },
  custom: { label: 'Custom', icon: '⚙️' }
}

function AgentSkillsManager() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAgentSkills()
      setSkills(data)
    } catch (err) {
      setError(err.message || 'Failed to load skills')
      console.error('Error loading skills:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (skillId) => {
    if (!confirm(`Are you sure you want to delete skill "${skillId}"?`)) {
      return
    }

    try {
      await api.deleteAgentSkill(skillId)
      await loadSkills()
    } catch (err) {
      alert('Error deleting skill: ' + err.message)
    }
  }

  const handleToggleEnabled = async (skill) => {
    try {
      await api.updateAgentSkill(skill.skill_id, { enabled: !skill.enabled })
      await loadSkills()
    } catch (err) {
      alert('Error updating skill: ' + err.message)
    }
  }

  const handleEdit = (skill) => {
    setEditingSkill({ ...skill })
    setShowAddForm(false)
  }

  const handleSave = async (skillData) => {
    try {
      if (editingSkill && editingSkill.skill_id) {
        // Update existing
        await api.updateAgentSkill(editingSkill.skill_id, skillData)
      } else {
        // Create new
        await api.createAgentSkill(skillData)
      }
      setEditingSkill(null)
      setShowAddForm(false)
      await loadSkills()
    } catch (err) {
      alert('Error saving skill: ' + err.message)
    }
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

  if (error && skills.length === 0) {
    return (
      <div className="glass-panel alert-error" style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
        <button
          onClick={loadSkills}
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
      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--space-lg)'
        }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
              🧠 Agent Skills
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Configure and manage agent skills for processing violations and recalls
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSkill(null)
              setShowAddForm(true)
            }}
            className="glass-panel"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              background: 'rgba(0, 240, 255, 0.1)',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            <span>+</span> Add Skill
          </button>
        </div>

        {/* Skills List */}
        {skills.length === 0 && !showAddForm && !editingSkill ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--space-xl)', 
            color: 'var(--text-muted)',
            fontSize: '14px'
          }}>
            No skills configured. Click "Add Skill" to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {skills.map((skill) => (
              <div
                key={skill.skill_id}
                className="glass-panel"
                style={{
                  padding: 'var(--space-lg)',
                  border: `1px solid ${skill.enabled ? 'var(--risk-low)' : 'var(--glass-border)'}`,
                  background: skill.enabled ? 'rgba(0, 255, 136, 0.05)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                      <span style={{ fontSize: '20px' }}>
                        {SKILL_TYPES[skill.skill_type]?.icon || '⚙️'}
                      </span>
                      <h4 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        margin: 0,
                        color: 'var(--text-primary)'
                      }}>
                        {skill.name}
                      </h4>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'rgba(191, 0, 255, 0.2)',
                        color: 'var(--neon-purple)',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {SKILL_TYPES[skill.skill_type]?.label || skill.skill_type}
                      </span>
                      {skill.enabled && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: 'rgba(0, 255, 136, 0.2)',
                          color: 'var(--risk-low)',
                          borderRadius: '4px'
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-secondary)',
                      marginBottom: 'var(--space-sm)',
                      marginTop: 0
                    }}>
                      {skill.description || 'No description'}
                    </p>
                    {Object.keys(skill.settings || {}).length > 0 && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--glass-bg)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        marginTop: 'var(--space-xs)'
                      }}>
                        {Object.entries(skill.settings).slice(0, 3).map(([key, value]) => (
                          <span key={key} style={{ marginRight: 'var(--space-md)' }}>
                            {key}: {typeof value === 'object' ? JSON.stringify(value).substring(0, 20) : String(value)}
                          </span>
                        ))}
                        {Object.keys(skill.settings).length > 3 && '...'}
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--text-muted)',
                      marginTop: 'var(--space-xs)'
                    }}>
                      Priority: {skill.priority} | ID: {skill.skill_id}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginLeft: 'var(--space-md)' }}>
                    <div 
                      onClick={() => handleToggleEnabled(skill)}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        background: skill.enabled ? 'var(--risk-low)' : 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--text-primary)',
                        position: 'absolute',
                        top: '2px',
                        left: skill.enabled ? '22px' : '2px',
                        transition: 'all 0.2s ease'
                      }} />
                    </div>
                    <button
                      onClick={() => handleEdit(skill)}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(skill.skill_id)}
                      className="glass-panel"
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        border: '1px solid var(--risk-high)',
                        color: 'var(--risk-high)',
                        background: 'rgba(255, 51, 102, 0.1)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingSkill) && (
          <SkillForm
            skill={editingSkill}
            onSave={handleSave}
            onCancel={() => {
              setEditingSkill(null)
              setShowAddForm(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

function SkillForm({ skill, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    skill_id: skill?.skill_id || '',
    skill_type: skill?.skill_type || 'custom',
    name: skill?.name || '',
    description: skill?.description || '',
    enabled: skill?.enabled ?? true,
    priority: skill?.priority || 50,
    settings: skill?.settings || {}
  })

  const [settingsString, setSettingsString] = useState(
    JSON.stringify(formData.settings, null, 2)
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    
    try {
      const settings = JSON.parse(settingsString)
      const skillData = {
        ...formData,
        settings
      }
      onSave(skillData)
    } catch (err) {
      alert('Invalid JSON in settings: ' + err.message)
    }
  }

  return (
    <div className="glass-panel" style={{ 
      padding: 'var(--space-xl)',
      marginTop: 'var(--space-lg)',
      border: '1px solid var(--neon-purple)',
      background: 'rgba(191, 0, 255, 0.05)'
    }}>
      <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: 'var(--space-lg)' }}>
        {skill ? 'Edit Skill' : 'Add New Skill'}
      </h4>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
            Skill ID
          </label>
          <input
            type="text"
            value={formData.skill_id}
            onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
            disabled={!!skill}
            className="input"
            placeholder="risk_classifier"
            required
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
            Unique identifier (lowercase, underscores only)
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
            Skill Type
          </label>
          <select
            value={formData.skill_type}
            onChange={(e) => setFormData({ ...formData, skill_type: e.target.value })}
            className="input"
            style={{ cursor: 'pointer' }}
            required
          >
            {Object.entries(SKILL_TYPES).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="Risk Classification"
            required
          />
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
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            placeholder="What does this skill do?"
          />
        </div>

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
              Priority (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="input"
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Enabled
              </span>
            </div>
            <div 
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: formData.enabled ? 'var(--neon-cyan)' : 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--text-primary)',
                position: 'absolute',
                top: '2px',
                left: formData.enabled ? '22px' : '2px',
                transition: 'all 0.2s ease'
              }} />
            </div>
          </div>
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
            Settings (JSON)
          </label>
          <textarea
            value={settingsString}
            onChange={(e) => setSettingsString(e.target.value)}
            className="input"
            rows={6}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            placeholder='{\n  "key": "value",\n  "number": 123\n}'
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
            Skill-specific configuration as JSON object
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="glass-panel"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="glass-panel"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              border: '1px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)',
              background: 'rgba(0, 240, 255, 0.1)',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {skill ? 'Update Skill' : 'Create Skill'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AgentSkillsManager



