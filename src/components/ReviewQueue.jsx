import { useState, useEffect } from 'react'
import RiskBadge from './RiskBadge'

const ReviewStatus = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
}

function ReviewQueue() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [filters, setFilters] = useState({
    marketplace_id: '',
    region_id: '',
    status: ReviewStatus.PENDING,
  })
  const [marketplaces, setMarketplaces] = useState([])

  useEffect(() => {
    loadMarketplaces()
    loadReviews()
  }, [filters])

  const loadMarketplaces = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/marketplaces/')
      if (response.ok) {
        const data = await response.json()
        setMarketplaces(data)
      }
    } catch (err) {
      console.error('Error loading marketplaces:', err)
    }
  }

  const loadReviews = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.marketplace_id) params.append('marketplace_id', filters.marketplace_id)
      if (filters.region_id) params.append('region_id', filters.region_id)
      if (filters.status) params.append('status', filters.status)

      const token = localStorage.getItem('firebase_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch(`http://localhost:8000/api/reviews/queue?${params}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      } else if (response.status === 401) {
        setError('Please log in to view your review queue')
      } else {
        throw new Error('Failed to load reviews')
      }
    } catch (err) {
      setError(err.message)
      console.error('Error loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewUpdate = async (reviewId, status, humanConfidenceScore, notes) => {
    try {
      const token = localStorage.getItem('firebase_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          review_status: status,
          human_confidence_score: humanConfidenceScore,
          reviewer_notes: notes,
        }),
      })

      if (response.ok) {
        loadReviews()
        setSelectedReview(null)
      } else {
        throw new Error('Failed to update review')
      }
    } catch (err) {
      alert('Error updating review: ' + err.message)
    }
  }

  const handleAssign = async (reviewId) => {
    try {
      const token = localStorage.getItem('firebase_token')
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}/assign`, {
        method: 'POST',
        headers,
      })

      if (response.ok) {
        loadReviews()
      } else {
        throw new Error('Failed to assign review')
      }
    } catch (err) {
      alert('Error assigning review: ' + err.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case ReviewStatus.PENDING:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case ReviewStatus.IN_REVIEW:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case ReviewStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case ReviewStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case ReviewStatus.FLAGGED:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="loading">Loading review queue...</div>
  }

  return (
    <div className="review-queue p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Review Queue</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review and approve/reject marketplace listings found by investigations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Marketplace</label>
            <select
              value={filters.marketplace_id}
              onChange={(e) => setFilters({ ...filters, marketplace_id: e.target.value })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              {marketplaces.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <input
              type="text"
              value={filters.region_id}
              onChange={(e) => setFilters({ ...filters, region_id: e.target.value })}
              placeholder="Filter by region"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              {Object.values(ReviewStatus).map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="empty-state glass-panel p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-lg mb-2">No reviews in queue</div>
          <div className="text-sm text-gray-500">
            All reviews have been processed or no reviews match your filters
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <div
              key={review.review_id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedReview(review)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-semibold mb-1">Review #{review.review_id.slice(-8)}</div>
                  <div className="text-sm text-gray-500">
                    {review.marketplace_name}
                    {review.region_name && ` • ${review.region_name}`}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    review.review_status
                  )}`}
                >
                  {review.review_status}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">AI Confidence:</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${review.ai_confidence_score * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {(review.ai_confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              {review.ai_match_reasons.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  Reasons: {review.ai_match_reasons.slice(0, 2).join(', ')}
                  {review.ai_match_reasons.length > 2 && '...'}
                </div>
              )}
              {!review.reviewer_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssign(review.review_id)
                  }}
                  className="w-full mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Assign to Me
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onUpdate={handleReviewUpdate}
        />
      )}
    </div>
  )
}

function ReviewDetailModal({ review, onClose, onUpdate }) {
  const [status, setStatus] = useState(review.review_status)
  const [confidenceScore, setConfidenceScore] = useState(
    review.human_confidence_score || review.ai_confidence_score
  )
  const [notes, setNotes] = useState(review.reviewer_notes || '')

  const handleSubmit = () => {
    onUpdate(review.review_id, status, confidenceScore, notes)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">Review Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Marketplace</div>
              <div className="font-medium">
                {review.marketplace_name}
                {review.region_name && ` • ${review.region_name}`}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">AI Confidence Score</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${review.ai_confidence_score * 100}%` }}
                  />
                </div>
                <span className="font-medium">{(review.ai_confidence_score * 100).toFixed(1)}%</span>
              </div>
            </div>

            {review.ai_match_reasons.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">AI Match Reasons</div>
                <ul className="list-disc list-inside text-sm">
                  {review.ai_match_reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Review Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {Object.values(ReviewStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Human Confidence Score</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="font-medium w-16 text-right">
                  {(confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="Add review notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewQueue
















