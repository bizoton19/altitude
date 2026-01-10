/**
 * InvestigationDetailPage - Single investigation detail view
 */
import { useParams, useNavigate } from 'react-router-dom'
import InvestigationDetail from '../components/InvestigationDetail'

function InvestigationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="content-area">
      <InvestigationDetail
        investigationId={id}
        onBack={() => navigate('/investigations')}
      />
    </div>
  )
}

export default InvestigationDetailPage

