/**
 * ProductBanFormPage - Create new product ban
 */
import { useNavigate } from 'react-router-dom'
import ProductBanForm from '../components/ProductBanForm'

function ProductBanFormPage() {
  const navigate = useNavigate()

  const handleSuccess = (productBan) => {
    navigate('/product-bans', { 
      state: { successMessage: `Product ban "${productBan.title}" created successfully!` }
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

export default ProductBanFormPage
