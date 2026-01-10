import { useState, useEffect } from 'react'

/**
 * RegionSelector component for selecting marketplace regions.
 * Used in investigation forms to specify which regions to search.
 */
function RegionSelector({ 
  marketplaceId, 
  selectedRegions = [], 
  onChange,
  disabled = false 
}) {
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRegions = async () => {
      if (!marketplaceId) {
        setRegions([])
        setLoading(false)
        return
      }

      try {
        // Get marketplace details to check if it supports regions
        const response = await fetch(`http://localhost:8000/api/marketplaces/${marketplaceId}`)
        if (response.ok) {
          const marketplace = await response.json()
          if (marketplace.supports_regions && marketplace.regions) {
            setRegions(marketplace.regions)
          } else {
            setRegions([])
          }
        } else {
          setRegions([])
        }
      } catch (error) {
        console.error('Error loading regions:', error)
        setRegions([])
      } finally {
        setLoading(false)
      }
    }

    loadRegions()
  }, [marketplaceId])

  const handleRegionToggle = (regionId) => {
    if (disabled) return
    
    const newSelected = selectedRegions.includes(regionId)
      ? selectedRegions.filter(id => id !== regionId)
      : [...selectedRegions, regionId]
    
    onChange(newSelected)
  }

  const handleSelectAll = () => {
    if (disabled) return
    onChange(regions.map(r => r.region_id))
  }

  const handleDeselectAll = () => {
    if (disabled) return
    onChange([])
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading regions...</div>
  }

  if (!marketplaceId) {
    return <div className="text-sm text-gray-500">Select a marketplace first</div>
  }

  if (regions.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        This marketplace does not support regions
      </div>
    )
  }

  return (
    <div className="region-selector">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium">Regions</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={disabled}
            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
          >
            Deselect All
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded p-2 dark:border-gray-600">
        {regions.map((region) => (
          <label
            key={region.region_id}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedRegions.includes(region.region_id)}
              onChange={() => handleRegionToggle(region.region_id)}
              disabled={disabled}
              className="rounded"
            />
            <span className="text-sm">{region.region_name}</span>
          </label>
        ))}
      </div>
      {selectedRegions.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {selectedRegions.length} of {regions.length} regions selected
        </div>
      )}
    </div>
  )
}

export default RegionSelector
















