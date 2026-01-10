/**
 * InvestigationsPage - Investigations list and management
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InvestigationList from '../components/InvestigationList'
import InvestigationForm from '../components/InvestigationForm'

function InvestigationsPage() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editingInvestigation, setEditingInvestigation] = useState(null)

  const handleInvestigationClick = (investigation) => {
    navigate(`/investigations/${investigation.investigation_id}`)
  }

  const handleCreateInvestigation = () => {
    setEditingInvestigation(null)
    setShowForm(true)
  }

  const handleEditInvestigation = (investigation) => {
    setEditingInvestigation(investigation)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingInvestigation(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingInvestigation(null)
  }

  return (
    <div className="content-area">
      {showForm ? (
        <InvestigationForm
          investigation={editingInvestigation}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <InvestigationList
          onInvestigationClick={handleInvestigationClick}
          onCreateInvestigation={handleCreateInvestigation}
          onEditInvestigation={handleEditInvestigation}
        />
      )}
    </div>
  )
}

export default InvestigationsPage

