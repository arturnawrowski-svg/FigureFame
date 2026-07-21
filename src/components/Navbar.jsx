import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Info, Plus, Sun, Moon, ShieldAlert } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation, LOCALES } from '../lib/i18n'
import Login from './Login'

export default function Navbar() {
  const { user, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, locale, setLocale } = useTranslation()
  // Przełącznik cyklicznie przechodzi przez dostępne języki (PL → EN → …)
  const cycleLocale = () => {
    const i = LOCALES.findIndex((l) => l.code === locale)
    setLocale(LOCALES[(i + 1) % LOCALES.length].code)
  }
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0]
  const [showLoginModal, setShowLoginModal] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // If navigated here with a request to open login modal
    if (location.state?.openLogin) {
      setShowLoginModal(true)
      // Clear the state so it doesn't pop up again on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

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
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {t('nav.theme')}
          </button>

          <button className="nav-btn" onClick={cycleLocale} title={`Język: ${current.label} (kliknij, by zmienić)`} style={{ border: '1px solid var(--color-glass-border)', borderRadius: '20px', padding: '4px 12px', background: 'rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '16px' }}>{current.flag}</span> {current.code.toUpperCase()}
          </button>

          <Link to="/about" className="nav-btn" style={{ textDecoration: 'none' }}>
            <Info size={18} /> {t('nav.about')}
          </Link>

          {isAdmin && (
            <Link to="/admin" className="nav-btn" style={{ color: '#ff4757', fontWeight: 'bold', textDecoration: 'none' }}>
              <ShieldAlert size={18} /> {t('nav.admin')}
            </Link>
          )}

          {user && (
            <Link to="/add" className="nav-btn" style={{ color: '#2ed573', textDecoration: 'none' }}>
              <Plus size={18} /> {t('nav.add')}
            </Link>
          )}

          {user ? (
            <Link to="/profile" className="nav-btn" style={{ color: 'var(--color-text-highlight)', fontWeight: 'bold', textDecoration: 'none' }}>
              <User size={18} /> {t('nav.profile')}
            </Link>
          ) : (
            <button className="nav-btn" onClick={() => setShowLoginModal(true)}>
              <User size={18} /> {t('nav.login')}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
