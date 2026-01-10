import { useState, useEffect } from 'react'

/**
 * Theme Toggle Component
 * Allows switching between Light, Auto (system), and Dark themes
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    // Get saved theme or default to 'auto'
    return localStorage.getItem('altitude-theme') || 'auto'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('altitude-theme', theme)
  }, [theme])

  // Listen for system theme changes when on 'auto'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'auto') {
        // Force re-render by toggling the attribute
        document.documentElement.setAttribute('data-theme', 'auto')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const themes = [
    { value: 'light', icon: '☀️', title: 'Light theme' },
    { value: 'auto', icon: '🔄', title: 'System theme' },
    { value: 'dark', icon: '🌙', title: 'Dark theme' },
  ]

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selector">
      {themes.map(({ value, icon, title }) => (
        <button
          key={value}
          className={`theme-toggle-btn ${theme === value ? 'active' : ''}`}
          onClick={() => setTheme(value)}
          title={title}
          aria-label={title}
          aria-pressed={theme === value}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
