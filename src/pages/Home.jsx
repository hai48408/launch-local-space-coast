import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import EventCard from '../components/EventCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, nextFriday, nextSunday, isWeekend } from 'date-fns'
import './Home.css'

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  dateRange: 'upcoming',
  freeOnly: false,
}

function getDateBounds(range) {
  const now = new Date()
  switch (range) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
    case 'this_week':
      return { from: startOfDay(now).toISOString(), to: endOfWeek(now, { weekStartsOn: 1 }).toISOString() }
    case 'this_weekend': {
      const fri = nextFriday(now)
      const sun = nextSunday(now)
      return { from: startOfDay(fri).toISOString(), to: endOfDay(sun).toISOString() }
    }
    case 'this_month':
      return { from: startOfDay(now).toISOString(), to: endOfMonth(now).toISOString() }
    case 'upcoming':
    default:
      return { from: startOfDay(now).toISOString(), to: null }
  }
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [total, setTotal] = useState(0)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { from, to } = getDateBounds(filters.dateRange)

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .gte('start_date', from)
      .order('start_date', { ascending: true })
      .limit(60)

    if (to) query = query.lte('start_date', to)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.freeOnly) query = query.eq('is_free', true)
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location_name.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query
    if (error) console.error('Error fetching events:', error)
    setEvents(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return (
    <main className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">Florida's Space Coast</div>
            <h1 className="hero-title">
              Your Local <em>Launch</em><br />Pad for What's Happening
            </h1>
            <p className="hero-subtitle">
              Networking events, community gatherings, live music, and more —
              pulled from every corner of Brevard County and curated for adults who show up.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-num">{total}</span>
                <span className="stat-label">Upcoming Events</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-num">10+</span>
                <span className="stat-label">Local Sources</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-num">Free</span>
                <span className="stat-label">Always</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-glow" />
      </section>

      {/* Events section */}
      <section className="events-section">
        <div className="container">
          <FilterBar filters={filters} onChange={setFilters} />

          {loading ? (
            <div className="page-loading">
              <div className="spinner" />
              <p className="loading-text">Finding events near you…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌊</div>
              <h3>No events found</h3>
              <p>Try adjusting your filters or <a href="/submit">submit an event</a>.</p>
            </div>
          ) : (
            <>
              <div className="events-count">
                Showing <strong>{events.length}</strong> event{events.length !== 1 ? 's' : ''}
                {filters.category ? ` in ${filters.category}` : ''}
              </div>
              <div className="events-grid">
                {events.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
