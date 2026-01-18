/**
 * ViolationDetailPage - Single product ban detail view
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProductBanDetailView from '../components/ProductBanDetailView'
import * as api from '../services/api'

function ViolationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [violation, setViolation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadViolation = async () => {
      try {
        const data = await api.getViolation(id)
        setViolation(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadViolation()
  }, [id])

  const handleInvestigationClick = (investigation) => {
    navigate(`/investigations/${investigation.investigation_id}`)
  }

  const handleDelete = async () => {
    const productBanId = violation?.product_ban_id || violation?.violation_id
    if (!window.confirm(`Are you sure you want to delete product ban "${productBanId}"? This will also delete all associated products, hazards, remedies, images, and listings. This action cannot be undone.`)) {
      return
    }

    try {
      await api.deleteViolation(id)
      navigate('/violations')
    } catch (err) {
      setError(err.message || 'Failed to delete product ban')
    }
  }

  if (loading) {
    return (
      <div className="content-area">
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content-area">
        <div className="alert alert-error">
          <strong>⚠️ Error:</strong> {error}
        </div>
      </div>
    )
  }

  return (
    <div className="content-area">
      <ProductBanDetailView
        productBan={violation}
        onClose={() => navigate('/violations')}
        onInvestigationClick={handleInvestigationClick}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default ViolationDetailPage

