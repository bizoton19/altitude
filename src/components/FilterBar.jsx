/**
 * FilterBar Component
 * Quick filter buttons for risk levels and sorting
 */
function FilterBar({ activeFilter, onFilterChange, sortOrder, onSortChange }) {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High Risk' },
    { id: 'medium', label: 'Medium Risk' },
    { id: 'low', label: 'Low Risk' }
  ]

  return (
    <div className="filter-bar">
      <div className="filter-buttons">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-btn ${filter.id} ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.id !== 'all' && (
              <span className={`risk-dot ${filter.id}`} style={{ width: '6px', height: '6px', marginRight: '6px', display: 'inline-block' }}></span>
            )}
            {filter.label}
          </button>
        ))}
      </div>
      <select 
        className="sort-select"
        value={sortOrder}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="risk-high">Highest Risk</option>
        <option value="risk-low">Lowest Risk</option>
      </select>
    </div>
  )
}

export default FilterBar
