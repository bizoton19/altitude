import { useState, useEffect } from 'react'
import * as api from '../services/api'

function BulkListingImport() {
  const [textContent, setTextContent] = useState('')
  const [violationId, setViolationId] = useState('')
  const [recallId, setRecallId] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [violations, setViolations] = useState([])
  const [recalls, setRecalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadViolationsAndRecalls()
  }, [])

  const loadViolationsAndRecalls = async () => {
    try {
      const [vData, rData] = await Promise.all([
        api.getViolations(100, 0),
        api.getRecalls(100, 0)
      ])
      setViolations(vData || [])
      setRecalls(rData || [])
    } catch (err) {
      console.error('Error loading violations/recalls:', err)
    }
  }

  const extractUrlsFromText = (text) => {
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi
    const urls = text.match(urlPattern) || []
    return urls.length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const request = {
        source: 'text_paste',
        text_content: textContent,
        violation_id: violationId || null,
        recall_id: recallId || null,
        source_name: sourceName || 'Manual Import'
      }

      const data = await api.importListingsBulk(request)
      setResult(data)
      setTextContent('') // Clear after successful import
    } catch (err) {
      setError(err.message || 'Failed to import listings')
      console.error('Import error:', err)
    } finally {
      setLoading(false)
    }
  }

  const urlCount = extractUrlsFromText(textContent)

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
          📋 Bulk Listing Import
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Paste URLs from emails, text files, or any source. One URL per line or embedded in text.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Text Area for URLs */}
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
            Listing URLs
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="input"
            rows={8}
            placeholder="Paste listing URLs here...&#10;&#10;Example:&#10;https://facebook.com/marketplace/item/123&#10;https://ebay.com/itm/456&#10;https://craigslist.org/tst/d/789"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              resize: 'vertical'
            }}
            required
          />
          {urlCount > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--neon-cyan)', marginTop: 'var(--space-xs)' }}>
              ✓ {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
            </p>
          )}
        </div>

        {/* Link to Violation/Recall */}
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
              Link to Violation (Optional)
            </label>
            <select
              value={violationId}
              onChange={(e) => setViolationId(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">None</option>
              {violations.slice(0, 50).map(v => (
                <option key={v.violation_id} value={v.violation_id}>
                  {v.violation_id} - {v.title}
                </option>
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
              Link to Recall (Optional)
            </label>
            <select
              value={recallId}
              onChange={(e) => setRecallId(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">None</option>
              {recalls.slice(0, 50).map(r => (
                <option key={r.recall_id} value={r.recall_id}>
                  {r.recall_id} - {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source Name */}
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
            Source Name (Optional)
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="input"
            placeholder="e.g., Email from John Doe, Manual search results"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !textContent.trim()}
          className="glass-panel"
          style={{
            padding: 'var(--space-md)',
            border: '1px solid var(--neon-cyan)',
            color: 'var(--neon-cyan)',
            background: 'rgba(0, 240, 255, 0.1)',
            cursor: loading || !textContent.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            opacity: loading || !textContent.trim() ? 0.5 : 1
          }}
        >
          {loading ? 'Importing...' : `Import ${urlCount > 0 ? urlCount : ''} Listing${urlCount !== 1 ? 's' : ''}`}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="glass-panel" style={{
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-lg)',
          border: `1px solid ${result.status === 'completed' ? 'var(--risk-low)' : result.status === 'partial' ? 'var(--neon-yellow)' : 'var(--risk-high)'}`,
          background: result.status === 'completed' ? 'rgba(0, 255, 136, 0.05)' : result.status === 'partial' ? 'rgba(255, 193, 7, 0.05)' : 'rgba(255, 51, 102, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: '20px' }}>
              {result.status === 'completed' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'}
            </span>
            <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
              Import {result.status === 'completed' ? 'Completed' : result.status === 'partial' ? 'Partially Completed' : 'Failed'}
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>{result.total_items}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Successful</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--risk-low)' }}>{result.successful}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--risk-high)' }}>{result.failed}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-secondary)' }}>{result.skipped || 0}</div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>Errors:</div>
              <div style={{
                background: 'var(--glass-bg)',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px'
              }}>
                {result.errors.map((err, i) => (
                  <div key={i} style={{ marginBottom: 'var(--space-xs)', color: 'var(--risk-high)' }}>
                    {err.item}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.created_listing_ids && result.created_listing_ids.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Created {result.created_listing_ids.length} listing{result.created_listing_ids.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="glass-panel alert-error" style={{
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md)',
          border: '1px solid var(--risk-high)',
          background: 'rgba(255, 51, 102, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkListingImport

