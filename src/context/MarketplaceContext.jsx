import { createContext, useContext, useState, useEffect } from 'react'

const MarketplaceContext = createContext()

/**
 * Available marketplace platforms
 */
export const AVAILABLE_PLATFORMS = [
  { id: 'facebook', name: 'Facebook Marketplace', icon: '📘' },
  { id: 'ebay', name: 'eBay', icon: '🛒' },
  { id: 'amazon', name: 'Amazon', icon: '📦' },
  { id: 'craigslist', name: 'Craigslist', icon: '📋' },
  { id: 'offerup', name: 'OfferUp', icon: '📱' },
  { id: 'mercari', name: 'Mercari', icon: '🛍️' },
  { id: 'walmart', name: 'Walmart', icon: '🏪' },
  { id: 'wayfair', name: 'Wayfair', icon: '🪑' },
  { id: 'target', name: 'Target', icon: '🎯' },
  { id: 'etsy', name: 'Etsy', icon: '🎨' }
]

/**
 * MarketplaceProvider Component
 * Manages marketplace platform state and localStorage persistence
 */
export function MarketplaceProvider({ children }) {
  const [activePlatforms, setActivePlatforms] = useState([])

  // Load active platforms from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeMarketplaces')
    if (stored) {
      try {
        const platforms = JSON.parse(stored)
        setActivePlatforms(platforms)
      } catch (e) {
        console.error('Error loading active marketplaces:', e)
      }
    }
  }, [])

  // Save to localStorage whenever activePlatforms changes
  useEffect(() => {
    if (activePlatforms.length > 0 || localStorage.getItem('activeMarketplaces')) {
      localStorage.setItem('activeMarketplaces', JSON.stringify(activePlatforms))
    }
  }, [activePlatforms])

  const addPlatform = (platformId) => {
    if (!activePlatforms.includes(platformId)) {
      setActivePlatforms([...activePlatforms, platformId])
    }
  }

  const removePlatform = (platformId) => {
    setActivePlatforms(activePlatforms.filter(id => id !== platformId))
  }

  const isPlatformActive = (platformId) => {
    return activePlatforms.includes(platformId)
  }

  const getActivePlatforms = () => {
    return AVAILABLE_PLATFORMS.filter(p => activePlatforms.includes(p.id))
  }

  const hasActivePlatforms = () => {
    return activePlatforms.length > 0
  }

  const value = {
    activePlatforms,
    addPlatform,
    removePlatform,
    isPlatformActive,
    getActivePlatforms,
    hasActivePlatforms,
    availablePlatforms: AVAILABLE_PLATFORMS
  }

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  )
}

/**
 * useMarketplace Hook
 * Access marketplace context
 */
export function useMarketplace() {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider')
  }
  return context
}

