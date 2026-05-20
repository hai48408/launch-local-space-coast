import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { Plus, Trash2, CheckCircle, XCircle, Globe, RefreshCw } from 'lucide-react'
import './Admin.css'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState('submissions')
  const [submissions, setSubmissions] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', url: '', scraper_type: 'generic' })

  const login = () => {
    if (pw === ADMIN_PASSWORD) setAuthed(true)
    else alert('Wrong password')
  }

  useEffect(() => {
    if (authed) {
      fetchSubmissions()
      fetchSources()
    }
  }, [authed])

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
  }

  async function fetchSources() {
    const { data } = await supabase
      .from('sources')
      .select('*')
      .order('created_at', { ascending: false })
    setSources(data || [])
  }

  async function approveSubmission(sub) {
    setLoading(true)
    // Move to events table
    const { error } = await supabase.from('events').insert([{
      title: sub.title,
      description: sub.description,
      start_date: sub.start_date,
      end_date: sub.end_date,
      location_name: sub.location_name,
      address: sub.address,
      city: sub.city,
      category: sub.category,
      event_url: sub.event_url,
      is_free: sub.is_free,
      cost_info: sub.cost_info,
      source_name: 'Community Submission',
      status: 'published',
      submitted_by: sub.submitter_email,
    }])

    if (!error) {
      await supabase.from('submissions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', sub.id)
      fetchSubmissions()
    }
    setLoading(false)
  }

  async function rejectSubmission(id) {
    await supabase.from('submissions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id)
    fetchSubmissions()
  }

  async function addSource() {
    if (!newSource.name || !newSource.url) return alert('Name and URL are required')
    const { error } = await supabase.from('sources').insert([newSource])
    if (!error) {
      setNewSource({ name: '', url: '', scraper_type: 'generic' })
      fetchSources()
    } else {
      alert(error.message)
    }
  }

  async function toggleSource(id, current) {
    await supabase.from('sources').update({ is_active: !current }).eq('id', id)
    fetchSources()
  }

  async function deleteSource(id) {
    if (!confirm('Delete this source?')) return
    await supabase.from('sources').delete().eq('id', id)
    fetchSources()
  }

  if (!authed) return (
    <div className="admin-login">
      <div className="login-card">
        <h2>Admin Access</h2>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          className="form-input"
        />
        <button className="btn btn-primary" onClick={login} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Enter
        </button>
      </div>
    </div>
  )

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p className="admin-sub">Manage submissions, event sources, and scrapers</p>
        </div>

        <div className="admin-tabs">
          <button className={`tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>
            Submissions {submissions.length > 0 && <span className="badge">{submissions.length}</span>}
          </button>
          <button className={`tab ${tab === 'sources' ? 'active' : ''}`} onClick={() => setTab('sources')}>
            Sources
          </button>
        </div>

        {/* SUBMISSIONS TAB */}
        {tab === 'submissions' && (
          <div className="admin-section">
            {submissions.length === 0 ? (
              <div className="empty-admin">No pending submissions 🎉</div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className="submission-card">
                  <div className="sub-header">
                    <div>
                      <h3>{sub.title}</h3>
                      <p className="sub-meta">
                        {sub.category} · {new Date(sub.start_date).toLocaleString()} · {sub.city}
                        {sub.is_free && ' · Free'}
                      </p>
                      {sub.submitter_name && <p className="sub-meta">Submitted by: {sub.submitter_name} ({sub.submitter_email})</p>}
                    </div>
                    <div className="sub-actions">
                      <button className="btn btn-primary" onClick={() => approveSubmission(sub)} disabled={loading}>
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button className="btn btn-outline" onClick={() => rejectSubmission(sub.id)}>
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </div>
                  {sub.description && <p className="sub-desc">{sub.description}</p>}
                  {sub.event_url && <a href={sub.event_url} target="_blank" rel="noopener" className="sub-url">{sub.event_url}</a>}
                </div>
              ))
            )}
          </div>
        )}

        {/* SOURCES TAB */}
        {tab === 'sources' && (
          <div className="admin-section">
            {/* Add source form */}
            <div className="add-source-form">
              <h3>Add New Source</h3>
              <div className="form-row-3">
                <input
                  type="text"
                  placeholder="Source name (e.g. Cocoa Beach Chamber)"
                  value={newSource.name}
                  onChange={e => setNewSource(s => ({ ...s, name: e.target.value }))}
                  className="form-input"
                />
                <input
                  type="url"
                  placeholder="URL (e.g. https://...)"
                  value={newSource.url}
                  onChange={e => setNewSource(s => ({ ...s, url: e.target.value }))}
                  className="form-input"
                />
                <select
                  value={newSource.scraper_type}
                  onChange={e => setNewSource(s => ({ ...s, scraper_type: e.target.value }))}
                  className="form-input"
                >
                  <option value="generic">Generic (auto-detect)</option>
                <option value="puppeteer">Puppeteer (JS sites)</option>
               <option value="ical">iCal feed (.ics)</option>
                  <option value="rss">RSS feed</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={addSource}>
                <Plus size={15} /> Add Source
              </button>
            </div>

            {/* Sources list */}
            <div className="sources-list">
              {sources.map(src => (
                <div key={src.id} className={`source-row ${!src.is_active ? 'inactive' : ''}`}>
                  <Globe size={16} strokeWidth={1.8} className="source-icon" />
                  <div className="source-info">
                    <span className="source-name">{src.name}</span>
                    <a href={src.url} target="_blank" rel="noopener" className="source-url">{src.url}</a>
                    {src.last_scraped_at && (
                      <span className="source-last-scraped">
                        Last scraped: {new Date(src.last_scraped_at).toLocaleDateString()}
                        {src.last_scrape_status && ` — ${src.last_scrape_status}`}
                      </span>
                    )}
                  </div>
                  <div className="source-meta">
                    <span className="scraper-type">{src.scraper_type}</span>
                  </div>
                  <div className="source-actions">
                    <button
                      className={`btn ${src.is_active ? 'btn-outline' : 'btn-primary'}`}
                      onClick={() => toggleSource(src.id, src.is_active)}
                    >
                      {src.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-outline danger-btn" onClick={() => deleteSource(src.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="scraper-note">
              <RefreshCw size={14} />
              <span>Scrapers run automatically via GitHub Actions every night at midnight. You can also trigger a manual run from your GitHub repository's Actions tab.</span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
