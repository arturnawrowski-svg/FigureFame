import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Info, Plus, Sun, Moon, ShieldAlert } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation, LOCALES } from '../lib/i18n'
import Flaga from './Flaga'

// Okno logowania ciągnie za sobą sporą bibliotekę formularzy Supabase.
// Doczytujemy je dopiero po kliknięciu „Zaloguj", a nie przy każdym wejściu
// na stronę — większość odwiedzających nigdy się nie loguje.
const Login = lazy(() => import('./Login'))

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
        <Suspense fallback={null}>
          <Login onClose={() => setShowLoginModal(false)} />
        </Suspense>
      )}

      {/* TRZY STREFY, nie jeden rząd.
          lewa   — marka i to, czym serwis jest
          środek — jak wygląda (język, motyw)
          prawa  — konto i społeczność
          Anonimowy odwiedzający widzi tylko: znak, „O aplikacji", język, motyw,
          „Zaloguj". Reszta dochodzi dopiero po zalogowaniu — nagłówek zostaje
          lekki dla większości ruchu. */}
      <nav className="top-nav animate-fade-in">
        <div className="nav-strefa nav-lewo">
          {/* Znak marki wraca na Gablotę. `favicon.png` to ten sam plik, który
              generuje design/zbuduj-znaki.mjs — nie podmieniać go ręcznie. */}
          <Link to="/" className="nav-znak" aria-label="FigureFame — strona główna">
            <img src="/favicon.png" alt="" width="28" height="28" />
          </Link>

          {/* `state.tlo` otwiera stronę jako okno nad bieżącym widokiem,
              bez opuszczania Gabloty. Wejście wprost na /o-aplikacji dalej działa. */}
          <Link to="/o-aplikacji" state={{ tlo: location }} className="nav-btn" style={{ textDecoration: 'none' }}>
            <Info size={18} /> {t('nav.about')}
          </Link>
        </div>

        <div className="nav-strefa nav-srodek">
          <button
            className="nav-btn nav-btn-ikona"
            onClick={cycleLocale}
            title={`Język: ${current.label} (kliknij, by zmienić)`}
          >
            <Flaga kod={current.code} /> {current.code.toUpperCase()}
          </button>

          {/* Napis „Motyw" nic nie wnosi — słońce i księżyc mówią wszystko,
              a nazwa zajmowała miejsce potrzebne po prawej. Nazwa dla czytnika
              ekranu zostaje w aria-label. */}
          <button
            className="nav-btn nav-btn-ikona"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Włącz motyw jasny' : 'Włącz motyw ciemny'}
            title={theme === 'dark' ? 'Motyw jasny' : 'Motyw ciemny'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="nav-strefa nav-prawo">
          {isAdmin && (
            <Link to="/admin" className="nav-btn" style={{ color: '#ff4757', fontWeight: 'bold', textDecoration: 'none' }}>
              <ShieldAlert size={18} /> <span className="nav-napis">{t('nav.admin')}</span>
            </Link>
          )}

          {user && (
            <Link to="/add" className="nav-btn" style={{ color: '#2ed573', textDecoration: 'none' }}>
              <Plus size={18} /> <span className="nav-napis">{t('nav.add')}</span>
            </Link>
          )}

          {user ? (
            <Link to="/profile" className="nav-btn" style={{ color: 'var(--color-text-highlight)', fontWeight: 'bold', textDecoration: 'none' }}>
              <User size={18} /> <span className="nav-napis">{t('nav.profile')}</span>
            </Link>
          ) : (
            <button className="nav-btn" onClick={() => setShowLoginModal(true)}>
              <User size={18} /> <span className="nav-napis">{t('nav.login')}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
