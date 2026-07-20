import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Info, Plus, Sun, Moon, ShieldAlert } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Login from './Login'

export default function Navbar() {
  const { user, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Auto-close login modal when user logs in
  useEffect(() => {
    if (user) setShowLoginModal(false)
  }, [user])

  return (
    <>
      {showLoginModal && (
        <Login onClose={() => setShowLoginModal(false)} />
      )}

      <nav className="top-nav animate-fade-in">
        <div className="nav-links">
          <button className="nav-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} Motyw
          </button>

          <button className="nav-btn" title="Język Polski" style={{ border: '1px solid var(--color-glass-border)', borderRadius: '20px', padding: '4px 12px', background: 'rgba(255, 255, 255, 0.05)' }}>
            <img src="https://flagcdn.com/w20/pl.png" alt="PL" style={{ width: '20px', borderRadius: '2px' }} /> PL
          </button>

          <button className="nav-btn" onClick={() => alert("FigureFame\n\nBaza wiedzy o figurkach anime oraz agregator aukcji i ofert.")}>
            <Info size={18} /> O aplikacji
          </button>

          {isAdmin && (
            <Link to="/admin" className="nav-btn" style={{ color: '#ff4757', fontWeight: 'bold', textDecoration: 'none' }}>
              <ShieldAlert size={18} /> Panel Moderatora
            </Link>
          )}

          {user && (
            <Link to="/add" className="nav-btn" style={{ color: '#2ed573', textDecoration: 'none' }}>
              <Plus size={18} /> Dodaj Figurkę do bazy
            </Link>
          )}

          {user ? (
            <Link to="/profile" className="nav-btn" style={{ color: 'var(--color-text-highlight)', fontWeight: 'bold', textDecoration: 'none' }}>
              <User size={18} /> Mój Profil
            </Link>
          ) : (
            <button className="nav-btn" onClick={() => setShowLoginModal(true)}>
              <User size={18} /> Zaloguj / Załóż konto
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
