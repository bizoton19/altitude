import { useState, useEffect } from 'react'
import { useMarketplace } from '../context/MarketplaceContext'
import AgentSettings from './AgentSettings'
import AgentMonitoring from './AgentMonitoring'
import AgentSkillsManager from './AgentSkillsManager'
import ToolIntegrations from './ToolIntegrations'
import RiskClassificationSettings from './RiskClassificationSettings'
import MarketplaceDetailView from './MarketplaceDetailView'
import MarketplaceEditForm from './MarketplaceEditForm'
import MyOrganizationSection from './MyOrganizationSection'
import * as api from '../services/api'

/**
 * MarketplaceManager Component
 * Full settings page for marketplace platforms, agent, and tool integrations
 */
function MarketplaceManager({ onBack, initialSection }) {
  const [activeSection, setActiveSection] = useState(initialSection || 'platforms')
  const [selectedMarketplace, setSelectedMarketplace] = useState(null)
  const [editingMarketplace, setEditingMarketplace] = useState(null)
  const [marketplaces, setMarketplaces] = useState([])
  
  // Update active section when initialSection prop changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])
  const {
    availablePlatforms,
    activePlatforms,
    addPlatform,
    removePlatform,
    isPlatformActive,
    hasActivePlatforms
  } = useMarketplace()

  // Load marketplaces from API
  useEffect(() => {
    const loadMarketplaces = async () => {
      try {
        const data = await api.getMarketplaces()
        setMarketplaces(data)
      } catch (err) {
        console.error('Error loading marketplaces:', err)
      }
    }
    loadMarketplaces()
  }, [])

  const commonPlatforms = ['facebook', 'ebay', 'amazon', 'craigslist', 'offerup', 'mercari']
  const commonPlatformsList = availablePlatforms.filter(p => commonPlatforms.includes(p.id))
  const otherPlatforms = availablePlatforms.filter(p => !commonPlatforms.includes(p.id))

  const sections = [
    { id: 'platforms', label: '🛒 Marketplaces', count: activePlatforms.length },
    { id: 'my-org', label: '🏢 My Organization' },
    { id: 'violations', label: '📋 Violations' },
    { id: 'listings', label: '🛒 Listings' },
    { id: 'agent', label: '🤖 Agent' },
    { id: 'skills', label: '🧠 Skills' },
    { id: 'risk', label: '⚠️ Risk Classification' },
    { id: 'tools', label: '🛠️ Tool Integrations' }
  ]

  const [agentSubsection, setAgentSubsection] = useState('monitoring') // 'monitoring' or 'settings'

  const handleMarketplaceClick = async (marketplaceId) => {
    try {
      const marketplace = await api.getMarketplace(marketplaceId)
      setSelectedMarketplace(marketplace)
      setEditingMarketplace(null)
    } catch (err) {
      console.error('Error loading marketplace:', err)
      alert('Failed to load marketplace details')
    }
  }

  const handleEditMarketplace = () => {
    setEditingMarketplace(selectedMarketplace)
  }

  const handleEditSuccess = async (updatedMarketplace) => {
    setEditingMarketplace(null)
    setSelectedMarketplace(updatedMarketplace)
    // Reload marketplaces list
    const data = await api.getMarketplaces()
    setMarketplaces(data)
  }

  const handleEditCancel = () => {
    setEditingMarketplace(null)
  }

  const handleBackFromDetail = () => {
    setSelectedMarketplace(null)
    setEditingMarketplace(null)
  }

  // Show detail/edit view if marketplace is selected
  if (editingMarketplace) {
    return (
      <MarketplaceEditForm
        marketplace={editingMarketplace}
        onSuccess={handleEditSuccess}
        onCancel={handleEditCancel}
      />
    )
  }

  if (selectedMarketplace) {
    return (
      <MarketplaceDetailView
        marketplaceId={selectedMarketplace.id}
        onEdit={handleEditMarketplace}
        onBack={handleBackFromDetail}
      />
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          className="btn btn-secondary"
          onClick={onBack}
          style={{ marginRight: '16px' }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '500' }}>Settings</h1>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`filter-btn ${activeSection === section.id ? 'active' : ''}`}
            style={{ 
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {section.label}
            {section.count !== undefined && (
              <span style={{
                background: activeSection === section.id ? 'rgba(0, 240, 255, 0.3)' : 'var(--glass-bg)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px'
              }}>
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Platforms Section */}
      {activeSection === 'platforms' && (
        <>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Add marketplaces to monitor for recalled products. The agent will only search platforms you've added.
          </p>

          {!hasActivePlatforms() && (
            <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
              <strong>⚠️ No Marketplaces Added</strong>
              <p style={{ marginTop: '8px', marginBottom: 0 }}>
                Add at least one marketplace to enable the search agent.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Popular Platforms
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {commonPlatformsList.map(platform => {
                const marketplace = marketplaces.find(m => m.id === platform.id)
                return (
                  <div 
                    key={platform.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    onClick={() => handleMarketplaceClick(platform.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--glass-bg-hover)'
                      e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--glass-bg)'
                      e.currentTarget.style.borderColor = 'var(--glass-border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>{platform.icon}</span>
                        <span style={{ fontWeight: '500' }}>{platform.name}</span>
                      </div>
                      {isPlatformActive(platform.id) ? (
                        <button
                          className="btn btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            removePlatform(platform.id)
                          }}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            addPlatform(platform.id)
                          }}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                    {isPlatformActive(platform.id) && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 8px', 
                          background: 'rgba(0, 255, 136, 0.2)', 
                          color: 'var(--risk-low)',
                          borderRadius: '4px'
                        }}>
                          ACTIVE
                        </span>
                        {marketplace && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Click to view/edit
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {otherPlatforms.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Other Platforms
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {otherPlatforms.map(platform => {
                  const marketplace = marketplaces.find(m => m.id === platform.id)
                  return (
                    <div 
                      key={platform.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onClick={() => handleMarketplaceClick(platform.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--glass-bg-hover)'
                        e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--glass-bg)'
                        e.currentTarget.style.borderColor = 'var(--glass-border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{platform.icon}</span>
                          <span style={{ fontWeight: '500' }}>{platform.name}</span>
                        </div>
                        {isPlatformActive(platform.id) ? (
                          <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              removePlatform(platform.id)
                            }}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              addPlatform(platform.id)
                            }}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Add
                          </button>
                        )}
                      </div>
                      {isPlatformActive(platform.id) && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            padding: '2px 8px', 
                            background: 'rgba(0, 255, 136, 0.2)', 
                            color: 'var(--risk-low)',
                            borderRadius: '4px'
                          }}>
                            ACTIVE
                          </span>
                          {marketplace && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Click to view/edit
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasActivePlatforms() && (
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Active Marketplaces ({activePlatforms.length})
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activePlatforms.map(platformId => {
                  const platform = availablePlatforms.find(p => p.id === platformId)
                  return platform ? (
                    <span 
                      key={platformId}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--neon-cyan)',
                        borderRadius: '20px',
                        fontSize: '13px'
                      }}
                    >
                      {platform.icon} {platform.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Agent Section */}
      {activeSection === 'agent' && (
        <div>
          {/* Agent Subsection Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button
              onClick={() => setAgentSubsection('monitoring')}
              className={`filter-btn ${agentSubsection === 'monitoring' ? 'active' : ''}`}
              style={{ 
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📊 Monitoring
            </button>
            <button
              onClick={() => setAgentSubsection('settings')}
              className={`filter-btn ${agentSubsection === 'settings' ? 'active' : ''}`}
              style={{ 
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Agent Monitoring */}
          {agentSubsection === 'monitoring' && <AgentMonitoring />}

          {/* Agent Settings */}
          {agentSubsection === 'settings' && <AgentSettings />}
        </div>
      )}

      {/* Imports Section */}
      {/* Violations Settings Section */}
      {activeSection === 'violations' && (
        <div style={{ padding: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
            Violations Settings
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Configure violation import settings, field mappings, and import methods.
          </p>
          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Violation import functionality has been moved to the <strong>Violations</strong> section.
              Use the Import tab in the Violations page to import violation data.
            </p>
          </div>
        </div>
      )}

      {/* Listings Settings Section */}
      {activeSection === 'listings' && (
        <div style={{ padding: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
            Listings Settings
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Configure listing import settings, marketplace configurations, and import methods.
          </p>
          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Listing import functionality has been moved to the <strong>Listings</strong> section.
              Use the Import tab in the Listings page to import listing URLs.
            </p>
          </div>
        </div>
      )}

      {/* Skills Section */}
      {activeSection === 'skills' && (
        <AgentSkillsManager />
      )}

      {/* Risk Classification Section */}
      {activeSection === 'risk' && (
        <RiskClassificationSettings />
      )}

      {/* Tool Integrations Section */}
      {activeSection === 'tools' && (
        <ToolIntegrations />
      )}
    </div>
  )
}

export default MarketplaceManager
