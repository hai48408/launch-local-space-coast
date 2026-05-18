import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CheckCircle } from 'lucide-react'
import './Submit.css'

const CATEGORIES = [
  'Networking', 'Community', 'Health & Wellness', 'Arts & Culture',
  'Business', 'Music & Entertainment', 'Food & Drink', 'Outdoors', 'Education', 'Other'
]

const INITIAL = {
  title: '', description: '', start_date: '', end_date: '',
  location_name: '', address: '', city: 'Melbourne',
  category: '', event_url: '', is_free: false, cost_info: '',
  submitter_name: '', submitter_email: ''
}

export default function Submit() {
  const [form, setForm] = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title || !form.start_date) {
      setError('Please fill in at least the event title and date.')
      return
    }
    setError('')
    setSubmitting(true)

    const { error: err } = await supabase
      .from('submissions')
      .insert([{
        ...form,
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        status: 'pending'
      }])

    setSubmitting(false)
    if (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } else {
      setSuccess(true)
      setForm(INITIAL)
    }
  }

  if (success) return (
    <div className="submit-page">
      <div className="container">
        <div className="success-state">
          <CheckCircle size={48} color="var(--teal)" strokeWidth={1.5} />
          <h2>Event Submitted!</h2>
          <p>Thanks for contributing to the Space Coast community. We'll review your event and publish it shortly.</p>
          <button className="btn btn-primary" onClick={() => setSuccess(false)}>Submit Another Event</button>
        </div>
      </div>
    </div>
  )

  return (
    <main className="submit-page">
      <div className="container">
        <div className="submit-header">
          <h1>Submit an Event</h1>
          <p>Know about something happening on the Space Coast? Share it with the Launch Local Space Coast community.</p>
        </div>

        <div className="submit-form">
          <div className="form-section">
            <h3 className="form-section-title">Event Info</h3>

            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                placeholder="e.g. Brevard Business Networking Mixer"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="What's the event about? Who should attend?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="form-input form-textarea"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>End Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="form-input"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Location</h3>

            <div className="form-group">
              <label>Venue Name</label>
              <input
                type="text"
                placeholder="e.g. Groundswell, EFSC Melbourne Campus"
                value={form.location_name}
                onChange={e => set('location_name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  placeholder="Melbourne"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Cost & Links</h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_free}
                  onChange={e => set('is_free', e.target.checked)}
                />
                This event is free
              </label>
            </div>

            {!form.is_free && (
              <div className="form-group">
                <label>Cost Info</label>
                <input
                  type="text"
                  placeholder="e.g. $10, Free for members, Donations welcome"
                  value={form.cost_info}
                  onChange={e => set('cost_info', e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label>Event URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.event_url}
                onChange={e => set('event_url', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">About You (optional)</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={form.submitter_name}
                  onChange={e => set('submitter_name', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Your Email</label>
                <input
                  type="email"
                  placeholder="For follow-up if needed"
                  value={form.submitter_email}
                  onChange={e => set('submitter_email', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="btn btn-primary submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Event for Review'}
          </button>
        </div>
      </div>
    </main>
  )
}
