/**
 * ListingsPage - All marketplace listings view with tabs
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AllListingsView from '../components/AllListingsView'
import BulkListingImport from '../components/BulkListingImport'
import ImportHistory from '../components/ImportHistory'

function ListingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('list') // 'list', 'import', 'history'

  const handleViolationClick = (violation) => {
    navigate(`/violations/${violation.violation_id}`)
  }

  return (
    <div className="content-area">
      {/* Header with tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-md)',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: 'var(--space-sm)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0, marginRight: 'var(--space-md)' }}>Listings</h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'list' ? '600' : '500',
                background: activeTab === 'list' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'list' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'list' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📋 List
            </button>
            <button
              onClick={() => setActiveTab('import')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'import' ? '600' : '500',
                background: activeTab === 'import' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'import' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'import' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📥 Import
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'history' ? '600' : '500',
                background: activeTab === 'history' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                border: `1px solid ${activeTab === 'history' ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                color: activeTab === 'history' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📊 History
            </button>
            <button
              onClick={() => navigate('/settings/listings')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: '500',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                marginLeft: 'var(--space-sm)'
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
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <div style={{ padding: 0 }}>
          <AllListingsView 
            onViolationClick={handleViolationClick}
            onBack={() => navigate('/')}
          />
        </div>
      )}

      {activeTab === 'import' && (
        <div style={{ padding: 'var(--space-lg) 0' }}>
          <BulkListingImport />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ padding: 'var(--space-lg) 0' }}>
          <ImportHistory importType="listing" />
        </div>
      )}
    </div>
  )
}

export default ListingsPage

