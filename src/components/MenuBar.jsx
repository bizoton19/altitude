import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { signOut } from '../services/auth'

function MenuBar({ 
  onCreateViolation,
  onInvestigations,
  onReviewQueue,
  activeView,
  onLogout
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const menuItems = [
    {
      id: 'violations',
      label: 'Product Bans',
      icon: '📋',
      onClick: onCreateViolation,
      active: activeView === 'violations' || activeView === 'violation-form',
      color: 'var(--neon-cyan)'
    },
    {
      id: 'listings',
      label: 'Listings',
      icon: '🛒',
      onClick: () => navigate('/listings'),
      active: activeView === 'listings',
      color: 'var(--neon-cyan)'
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: '🔍',
      onClick: onInvestigations,
      active: activeView === 'investigations',
      color: 'var(--neon-purple)'
    },
    {
      id: 'review-queue',
      label: 'Review Queue',
      icon: '📋',
      onClick: onReviewQueue,
      active: activeView === 'review-queue',
      color: 'var(--risk-medium)'
    }
  ]

  const handleLogout = async () => {
    try {
      await signOut()
      if (onLogout) {
        onLogout()
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <div className="menu-bar glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      padding: 'var(--space-sm) var(--space-md)',
      borderTop: '1px solid var(--glass-border)',
      borderBottom: '1px solid var(--glass-border)',
      background: 'var(--filter-bar-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)'
    }}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="glass-panel"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            border: item.active 
              ? `1px solid ${item.color}` 
              : '1px solid var(--glass-border)',
            background: item.active
              ? (item.color === 'var(--neon-cyan)' 
                  ? 'rgba(0, 240, 255, 0.15)' 
                  : item.color === 'var(--neon-purple)' 
                  ? 'rgba(191, 0, 255, 0.15)' 
                  : 'rgba(255, 170, 0, 0.15)')
              : 'transparent',
            color: item.active ? item.color : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: item.active ? '600' : '500',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!item.active) {
              e.target.style.background = 'var(--glass-bg-hover)'
              e.target.style.borderColor = 'var(--glass-border-hover)'
              e.target.style.color = 'var(--text-primary)'
            } else {
              const glowColor = item.color === 'var(--neon-cyan)' 
                ? 'var(--shadow-glow)' 
                : item.color === 'var(--neon-purple)' 
                ? 'rgba(191, 0, 255, 0.3)' 
                : 'var(--risk-medium-glow)'
              e.target.style.boxShadow = `0 0 15px ${glowColor}`
            }
          }}
          onMouseLeave={(e) => {
            if (!item.active) {
              e.target.style.background = 'transparent'
              e.target.style.borderColor = 'var(--glass-border)'
              e.target.style.color = 'var(--text-secondary)'
            } else {
              e.target.style.boxShadow = 'none'
            }
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      {user && (
        <div style={{ 
          marginLeft: 'auto', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-md)',
          paddingLeft: 'var(--space-md)',
          borderLeft: '1px solid var(--glass-border)'
        }}>
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-muted)'
          }}>
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="glass-panel"
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all var(--transition-fast)',
              borderRadius: 'var(--radius-sm)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 51, 102, 0.1)'
              e.target.style.borderColor = 'var(--risk-high)'
              e.target.style.color = 'var(--risk-high)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.borderColor = 'var(--glass-border)'
              e.target.style.color = 'var(--text-secondary)'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuBar

