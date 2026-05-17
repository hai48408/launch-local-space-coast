import { Search, SlidersHorizontal, X } from 'lucide-react'
import './FilterBar.css'

const CATEGORIES = [
  'All', 'Networking', 'Community', 'Health & Wellness', 'Arts & Culture',
  'Business', 'Music & Entertainment', 'Food & Drink', 'Outdoors', 'Education', 'Other'
]

const DATE_FILTERS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_weekend', label: 'This Weekend' },
  { value: 'this_month', label: 'This Month' },
]

export default function FilterBar({ filters, onChange }) {
  const { search, category, dateRange, freeOnly } = filters

  const handleSearch = (e) => onChange({ ...filters, search: e.target.value })
  const handleCategory = (cat) => onChange({ ...filters, category: cat === 'All' ? '' : cat })
  const handleDate = (e) => onChange({ ...filters, dateRange: e.target.value })
  const handleFree = (e) => onChange({ ...filters, freeOnly: e.target.checked })
  const clearSearch = () => onChange({ ...filters, search: '' })

  const hasActiveFilters = search || category || dateRange !== 'upcoming' || freeOnly

  return (
    <div className="filter-bar">
      {/* Search */}
      <div className="search-row">
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} className="search-icon" />
          <input
            type="text"
            placeholder="Search events, venues, topics…"
            value={search}
            onChange={handleSearch}
            className="search-input"
          />
          {search && (
            <button className="search-clear" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <select
            value={dateRange}
            onChange={handleDate}
            className="date-select"
          >
            {DATE_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="free-toggle">
            <input type="checkbox" checked={freeOnly} onChange={handleFree} />
            <span>Free only</span>
          </label>
        </div>
      </div>

      {/* Category pills */}
      <div className="category-pills">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-pill ${(cat === 'All' && !category) || cat === category ? 'active' : ''}`}
            onClick={() => handleCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}
