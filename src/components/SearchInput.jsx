import { useState, useEffect } from 'react'

/**
 * SearchInput Component
 * Handles recall number input with validation and batch support
 */
function SearchInput({ onSearch }) {
  const [input, setInput] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [showRecent, setShowRecent] = useState(false)
  const [error, setError] = useState('')

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentRecalls')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading recent searches:', e)
      }
    }
  }, [])

  const validateInput = (value) => {
    if (!value || value.trim().length === 0) {
      return 'Please enter a recall number'
    }
    
    // Check for valid format (alphanumeric, commas, newlines)
    const lines = value.split(/[,\n]/).map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      return 'Please enter at least one recall number'
    }

    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const validationError = validateInput(input)
    if (validationError) {
      setError(validationError)
      return
    }

    // Parse input (comma or newline separated)
    const recallNumbers = input
      .split(/[,\n]/)
      .map(n => n.trim())
      .filter(n => n.length > 0)

    // Save to recent searches
    const updatedRecent = [
      ...recallNumbers.filter(n => !recentSearches.includes(n)),
      ...recentSearches
    ].slice(0, 10) // Keep last 10

    setRecentSearches(updatedRecent)
    localStorage.setItem('recentRecalls', JSON.stringify(updatedRecent))

    // Call search callback
    onSearch(recallNumbers)
    setShowRecent(false)
  }

  const handleRecentClick = (recallNumber) => {
    setInput(recallNumber)
    setShowRecent(false)
    onSearch([recallNumber])
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    setError('')
    setShowRecent(e.target.value.length === 0 && recentSearches.length > 0)
  }

  const handleFocus = () => {
    if (recentSearches.length > 0 && input.length === 0) {
      setShowRecent(true)
    }
  }

  return (
    <div className="usa-form">
      <form onSubmit={handleSubmit} className="margin-bottom-4">
        <div className="usa-form-group">
          <label className="usa-label" htmlFor="recall-search">
            Recall Number Search
          </label>
          <div className="usa-hint" id="recall-search-hint">
            Enter one or more recall numbers separated by commas or newlines
          </div>
          <div className="usa-input-group">
            <input
              id="recall-search"
              className="usa-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              placeholder="e.g., 26156 or 26156, 26157"
              aria-describedby="recall-search-hint"
            />
            <button className="usa-button" type="submit">
              Search
            </button>
          </div>
          {error && (
            <div className="usa-error-message" role="alert">
              {error}
            </div>
          )}
        </div>

        {showRecent && recentSearches.length > 0 && (
          <div className="usa-combo-box" style={{ position: 'relative' }}>
            <ul className="usa-list usa-list--unstyled" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #565c65',
              borderRadius: '4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              marginTop: '4px'
            }}>
              {recentSearches.map((recallNumber, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="usa-button usa-button--unstyled"
                    onClick={() => handleRecentClick(recallNumber)}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 1rem' }}
                  >
                    {recallNumber}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  )
}

export default SearchInput

