import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { format } from 'date-fns'
import { MapPin, Calendar, Clock, ExternalLink, ArrowLeft, Tag, DollarSign } from 'lucide-react'
import './EventDetail.css'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()
      if (!error) setEvent(data)
      setLoading(false)
    }
    fetchEvent()
  }, [id])

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!event) return (
    <div className="page-loading">
      <p style={{ color: 'var(--muted)' }}>Event not found.</p>
      <Link to="/" className="btn btn-outline" style={{ marginTop: 16 }}>← Back to Events</Link>
    </div>
  )

  return (
    <main className="detail-page">
      <div className="container">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <div className="detail-layout">
          <div className="detail-main">
            {event.image_url && (
              <div className="detail-hero-img">
                <img src={event.image_url} alt={event.title} />
              </div>
            )}

            <div className="detail-header">
              <div className="detail-tags">
                {event.category && <span className="tag">{event.category}</span>}
                {event.is_free && <span className="tag gold">Free</span>}
              </div>
              <h1 className="detail-title">{event.title}</h1>
              {event.source_name && (
                <p className="detail-source">via {event.source_name}</p>
              )}
            </div>

            {event.description && (
              <div className="detail-description">
                <p>{event.description}</p>
              </div>
            )}

            {event.event_url && (
              <a
                href={event.event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary detail-cta"
              >
                View Full Event Details <ExternalLink size={15} />
              </a>
            )}
          </div>

          <aside className="detail-sidebar">
            <div className="sidebar-card">
              <h3 className="sidebar-title">Event Details</h3>

              <div className="detail-info-list">
                <div className="detail-info-item">
                  <Calendar size={16} strokeWidth={1.8} />
                  <div>
                    <span className="info-label">Date</span>
                    <span className="info-value">
                      {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="detail-info-item">
                  <Clock size={16} strokeWidth={1.8} />
                  <div>
                    <span className="info-label">Time</span>
                    <span className="info-value">
                      {format(new Date(event.start_date), 'h:mm a')}
                      {event.end_date && ` – ${format(new Date(event.end_date), 'h:mm a')}`}
                    </span>
                  </div>
                </div>

                {event.location_name && (
                  <div className="detail-info-item">
                    <MapPin size={16} strokeWidth={1.8} />
                    <div>
                      <span className="info-label">Location</span>
                      <span className="info-value">{event.location_name}</span>
                      {event.address && <span className="info-sub">{event.address}</span>}
                      {event.city && <span className="info-sub">{event.city}, {event.state}</span>}
                    </div>
                  </div>
                )}

                <div className="detail-info-item">
                  <DollarSign size={16} strokeWidth={1.8} />
                  <div>
                    <span className="info-label">Cost</span>
                    <span className="info-value">
                      {event.is_free ? 'Free' : event.cost_info || 'See event details'}
                    </span>
                  </div>
                </div>
              </div>

              {event.location_name && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [event.location_name, event.address, event.city, 'FL'].filter(Boolean).join(', ')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline sidebar-map-btn"
                >
                  <MapPin size={14} /> Open in Maps
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
