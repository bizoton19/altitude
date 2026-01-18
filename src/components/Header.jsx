import { Link } from 'react-router-dom'
import { useMarketplace } from '../context/MarketplaceContext'

/**
 * Header Component
 * Application header with navigation
 */
function Header() {
  const { hasActivePlatforms } = useMarketplace()

  return (
    <header className="usa-header usa-header--extended" role="banner">
      <div className="usa-navbar">
        <div className="usa-logo" id="extended-logo">
          <em className="usa-logo__text">
            <Link to="/" title="Home" aria-label="Home">
              Product Ban Monitoring Browser
            </Link>
          </em>
        </div>
        <button className="usa-menu-btn">Menu</button>
      </div>
      <nav aria-label="Primary navigation" className="usa-nav">
        <div className="usa-nav__inner">
          <button className="usa-nav__close" aria-label="Close menu">
            <span>×</span>
          </button>
          <ul className="usa-nav__primary usa-accordion">
            <li className="usa-nav__primary-item">
              <Link to="/" className="usa-nav__link">
                <span>Search Product Bans</span>
              </Link>
            </li>
            <li className="usa-nav__primary-item">
              <Link to="/settings" className="usa-nav__link">
                <span>Marketplace Settings</span>
                {!hasActivePlatforms() && (
                  <span className="usa-tag usa-tag--new margin-left-1">No platforms added</span>
                )}
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

export default Header

