import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Compass } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Events' },
    { to: '/submit', label: 'Submit an Event' },
  ]

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <Compass size={22} strokeWidth={1.8} />
          <span className="logo-text">Launch Local <em>Space Coast</em></span>
        </Link>

        <div className={`navbar-links ${open ? 'open' : ''}`}>
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${pathname === to ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link to="/submit" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>
            + Add Event
          </Link>
        </div>

        <button className="nav-hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </nav>
  )
}

