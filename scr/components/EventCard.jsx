import { Link } from 'react-router-dom'
import { MapPin, Calendar, ExternalLink, Tag } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import './EventCard.css'

function getDateLabel(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d)) return { label: 'Today', hot: true }
  if (isTomorrow(d)) return { label: 'Tomorrow', hot: true }
  if (isThisWeek(d, { weekStartsOn: 1 })) return { label: format(d, 'EEEE'), hot: false }
  return { label: format(d, 'MMM d'), hot: false }
}

const CATEGORY_COLORS = {
  'Networking': 'teal',
  'Community': 'purple',
  'Health & Wellness': 'green',
  'Arts & Culture': 'pink',
  'Business': 'blue',
  'Music & Entertainment': 'orange',
  'Food & Drink': 'amber',
  'Outdoors': 'lime',
  'Education': 'cyan',
  'Other': 'gray',
}

export default function EventCard({ event }) {
  const { label, hot } = getDateLabel(event.start_date)
  const catColor = CATEGORY_COLORS[event.category] || 'gray'

  return (
    <Link to={`/event/${event.id}`} className="event-card fade-in">
      {event.image_url && (
        <div className="event-card-img">
          <img src={event.image_url} alt={event.title} loading="lazy" />
        </div>
      )}
      {!event.image_url && (
        <div className={`event-card-img-placeholder cat-${catColor}`}>
          <span>{event.category?.[0] || '★'}</span>
        </div>
      )}

      <div className="event-card-body">
        <div className="event-card-meta">
          <span className={`date-badge ${hot ? 'hot' : ''}`}>{label}</span>
          {event.category && (
            <span className={`tag cat-tag-${catColor}`}>{event.category}</span>
          )}
          {event.is_free && <span className="tag gold">Free</span>}
        </div>

        <h3 className="event-card-title">{event.title}</h3>

        {event.location_name && (
          <p className="event-card-location">
            <MapPin size={13} strokeWidth={2} />
            {event.location_name}{event.city ? `, ${event.city}` : ''}
          </p>
        )}

        {event.description && (
          <p className="event-card-desc">
            {event.description.slice(0, 100)}{event.description.length > 100 ? '…' : ''}
          </p>
        )}

        <div className="event-card-footer">
          <span className="source-label">
            {event.source_name || 'Community'}
          </span>
          {event.event_url && (
            <ExternalLink size={14} strokeWidth={2} className="ext-icon" />
          )}
        </div>
      </div>
    </Link>
  )
}
