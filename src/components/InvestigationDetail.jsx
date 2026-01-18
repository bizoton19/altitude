import { useState, useEffect } from 'react'
import InvestigationForm from './InvestigationForm'
import * as api from '../services/api'

function InvestigationDetail({ investigationId, onBack }) {
  const [investigation, setInvestigation] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [linkViolationId, setLinkViolationId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    loadInvestigation()
    loadListings()
  }, [investigationId])

  const loadInvestigation = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInvestigation(investigationId)
      setInvestigation(data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading investigation:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadListings = async () => {
    try {
      const data = await api.getInvestigationListings(investigationId)
      setListings(data.listings || [])
    } catch (err) {
      console.error('Error loading listings:', err)
    }
  }

  const handleFormSuccess = () => {
    setEditing(false)
    loadInvestigation()
  }

  const handlePasteImport = async () => {
    if (!pasteText.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await api.importListingsBulk({
        source: 'text_paste',
        text_content: pasteText,
        investigation_id: investigationId,
        violation_id: linkViolationId || null,
        source_name: `Investigation ${investigationId} - manual paste`,
      })
      setImportResult(result)
      setPasteText('')
      await loadListings()
      await loadInvestigation()
    } catch (err) {
      setImportResult({ status: 'failed', error: err.message || String(err) })
    } finally {
      setImporting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'running':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="loading">Loading investigation...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back
          </button>
        )}
      </div>
    )
  }

  if (!investigation) {
    return <div className="p-6">Investigation not found</div>
  }

  if (editing) {
    return (
      <InvestigationForm
        investigation={investigation}
        onSuccess={handleFormSuccess}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="investigation-detail p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{investigation.name}</h2>
          {investigation.description && (
            <p className="text-gray-600 dark:text-gray-400">{investigation.description}</p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            investigation.status
          )}`}
        >
          {investigation.status}
        </span>
      </div>

      {/* Add Listings (paste URLs) */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>📋 Add Listing URLs</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Paste URLs from email/text and attach them to this investigation (deduped by URL).
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Optional: Link imported URLs to a specific product ban in this investigation
            </label>
            <select
              value={linkViolationId}
              onChange={(e) => setLinkViolationId(e.target.value)}
              className="input"
              style={{ marginTop: '6px' }}
            >
              <option value="">None</option>
              {investigation.violation_ids.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Listing URLs (one per line or embedded)
            </label>
            <textarea
              className="input"
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`https://facebook.com/marketplace/item/123\nhttps://ebay.com/itm/456`}
              style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <button
              onClick={handlePasteImport}
              disabled={importing || !pasteText.trim()}
              className="glass-panel"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                background: 'rgba(0, 240, 255, 0.1)',
                cursor: importing || !pasteText.trim() ? 'not-allowed' : 'pointer',
                opacity: importing || !pasteText.trim() ? 0.6 : 1,
              }}
            >
              {importing ? 'Importing…' : 'Import URLs into this investigation'}
            </button>
          </div>

          {importResult && (
            <div className="glass-panel" style={{ padding: 'var(--space-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Import result: {importResult.status || 'unknown'}
              </div>
              {importResult.successful != null && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Successful: {importResult.successful} • Failed: {importResult.failed || 0} • Total: {importResult.total_items || 0}
                </div>
              )}
              {importResult.error && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--risk-high)' }}>
                  {importResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Schedule</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Frequency:</span>{' '}
              <span className="font-medium">{investigation.schedule}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Next Run:</span>{' '}
              <span className="font-medium">
                {new Date(investigation.scheduled_start_time).toLocaleString()}
              </span>
            </div>
            {investigation.start_time && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Started:</span>{' '}
                <span className="font-medium">
                  {new Date(investigation.start_time).toLocaleString()}
                </span>
              </div>
            )}
            {investigation.end_time && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Completed:</span>{' '}
                <span className="font-medium">
                  {new Date(investigation.end_time).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Results</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Listings Found:</span>{' '}
              <span className="font-medium">{investigation.listings_found}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Queued for Review:</span>{' '}
              <span className="font-medium">{investigation.listings_queued}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <h3 className="font-semibold mb-3">Scope</h3>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Product Bans ({investigation.violation_ids?.length || investigation.product_ban_ids?.length || 0})
            </div>
            <div className="flex flex-wrap gap-2">
              {(investigation.violation_ids || investigation.product_ban_ids || []).map((id) => (
                <span
                  key={id}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Marketplaces ({investigation.marketplace_ids.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {investigation.marketplace_ids.map((id) => (
                <span
                  key={id}
                  className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
          {investigation.region_ids && Object.keys(investigation.region_ids).length > 0 && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Regions</div>
              <div className="space-y-2">
                {Object.entries(investigation.region_ids).map(([marketplaceId, regionIds]) => (
                  <div key={marketplaceId}>
                    <span className="text-xs font-medium">{marketplaceId}:</span>{' '}
                    <span className="text-xs">{regionIds.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {listings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h3 className="font-semibold mb-3">Found Listings ({listings.length})</h3>
          <div className="space-y-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-3 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="font-medium" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span>{listing.title}</span>
                  {listing.listing_url && (
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: 'var(--neon-cyan)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open ↗
                    </a>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {listing.marketplace_name}
                  {listing.region_name && ` • ${listing.region_name}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

export default InvestigationDetail




