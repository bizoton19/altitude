import { useState } from 'react'
import { exportToCSV, exportToJSON, exportToPDF } from '../utils/exportUtils'

/**
 * ExportPanel Component
 * Provides export functionality with glass styling
 */
function ExportPanel({ recall, marketplaceResults = [] }) {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')

  if (!recall) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      switch (exportFormat) {
        case 'csv':
          exportToCSV(recall, marketplaceResults)
          break
        case 'json':
          exportToJSON(recall, marketplaceResults)
          break
        case 'pdf':
          await exportToPDF(recall, marketplaceResults)
          break
        default:
          exportToCSV(recall, marketplaceResults)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '20px', marginTop: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
        Export Data
      </h2>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          className="sort-select"
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          style={{ minWidth: '120px' }}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="pdf">PDF</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          API ENDPOINT (FUTURE)
        </div>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--neon-cyan)' }}>
          POST /api/recalls/search
        </code>
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Request: {`{ "recallNumbers": ["${recall.RecallNumber}"] }`}
        </div>
      </div>
    </div>
  )
}

export default ExportPanel
