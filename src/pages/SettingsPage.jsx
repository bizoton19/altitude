/**
 * SettingsPage - Settings and configuration
 */
import { useNavigate, useParams } from 'react-router-dom'
import MarketplaceManager from '../components/MarketplaceManager'

function SettingsPage() {
  const navigate = useNavigate()
  const { section } = useParams()

  return (
    <div className="content-area">
      <MarketplaceManager 
        onBack={() => navigate('/')}
        initialSection={section}
      />
    </div>
  )
}

export default SettingsPage

