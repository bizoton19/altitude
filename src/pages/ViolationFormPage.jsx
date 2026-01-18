/**
 * ViolationFormPage - Create new violation
 */
import { useNavigate } from 'react-router-dom'
import ProductBanForm from '../components/ProductBanForm'

function ViolationFormPage() {
  const navigate = useNavigate()

  const handleSuccess = (violation) => {
    navigate('/violations', { 
      state: { successMessage: `Violation "${violation.title}" created successfully!` }
    })
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <div className="content-area">
      <ProductBanForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default ViolationFormPage

