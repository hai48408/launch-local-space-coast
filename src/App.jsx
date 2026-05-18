import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Submit from './pages/Submit.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}
