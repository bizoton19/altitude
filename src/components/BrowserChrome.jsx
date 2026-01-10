import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

/**
 * BrowserChrome Component
 * Provides browser-like interface with tabs, navigation, and address bar
 */
function BrowserChrome({ 
  tabs, 
  activeTabId, 
  onTabChange, 
  onNewTab, 
  onCloseTab,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onBack,
  onForward,
  onRefresh,
  canGoBack,
  canGoForward,
  onSettingsClick,
  onListingsClick,
  showListingsActive = false
}) {
  const [inputValue, setInputValue] = useState(searchValue || '')

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    onSearchChange?.(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.(inputValue)
    }
  }

  const handleClear = () => {
    setInputValue('')
    onSearchChange?.('')
  }

  return (
    <>
      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div 
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">
              {tab.icon || '🔍'}
            </span>
            <span className="tab-title">{tab.title || 'New Tab'}</span>
            {tabs.length > 1 && (
              <button 
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="new-tab-btn" onClick={onNewTab}>
          +
        </button>
      </div>

      {/* Navigation Bar */}
      <div className="nav-bar">
        <button 
          className="nav-btn" 
          onClick={onBack}
          disabled={!canGoBack}
          title="Go back"
        >
          ◀
        </button>
        <button 
          className="nav-btn" 
          onClick={onForward}
          disabled={!canGoForward}
          title="Go forward"
        >
          ▶
        </button>
        <button 
          className="nav-btn" 
          onClick={onRefresh}
          title="Refresh"
        >
          ⟳
        </button>

        <div className="address-bar">
          <span className="address-bar-icon">🔍</span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search recalls by number, product, manufacturer, hazard..."
          />
          {inputValue && (
            <button className="address-bar-clear" onClick={handleClear}>
              ✕
            </button>
          )}
        </div>

        <ThemeToggle />

        <button 
          className={`nav-btn listings-btn ${showListingsActive ? 'active' : ''}`}
          onClick={onListingsClick}
          title="All Listings"
          style={{
            fontSize: '14px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: showListingsActive ? 'var(--neon-cyan)' : 'var(--glass-bg)',
            color: showListingsActive ? '#000' : 'var(--text-primary)',
            border: showListingsActive ? 'none' : '1px solid var(--glass-border)'
          }}
        >
          🛒 Listings
        </button>

        <button 
          className="settings-btn" 
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </>
  )
}

export default BrowserChrome
