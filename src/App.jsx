import { useState, useEffect } from 'react'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import AddFigure from './components/AddFigure'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import { User, Info, LogOut, Plus, Sun, Moon, ShieldAlert } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

function App() {
  const [view, setView] = useState('home')
  const [selectedFigure, setSelectedFigure] = useState(null)
  
  const [user, setUser] = useState(null) 
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'

  const checkAdmin = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setIsAdmin(data.is_admin)
      } else {
        setIsAdmin(false)
      }
    } catch (err) {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser)
      if (currentUser) checkAdmin(currentUser.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser)
      if (currentUser) {
        setShowLoginModal(false) // Close modal on successful login
        checkAdmin(currentUser.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light-mode', theme === 'light')
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleSelectFigure = (figure) => {
    setSelectedFigure(figure)
    setView('dossier')
  }

  const handleBackToHome = () => {
    setSelectedFigure(null)
    setView('home')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    if (view === 'add') setView('home')
  }

  return (
    <div className="app-container">
      {showLoginModal && (
        <Login onClose={() => setShowLoginModal(false)} />
      )}

      <nav className="top-nav animate-fade-in">
        <div className="nav-links">
          <button className="nav-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} Motyw
          </button>
          
          <button className="nav-btn" title="Język Polski" style={{ border: '1px solid var(--color-glass-border)', borderRadius: '20px', padding: '4px 12px', background: 'rgba(255, 255, 255, 0.05)' }}>
            🇵🇱 PL
          </button>

          <button className="nav-btn" onClick={() => alert("FigureFame\n\nBaza wiedzy o figurkach anime oraz agregator aukcji i ofert.")}>
            <Info size={18} /> O aplikacji
          </button>
          
          {isAdmin && (
            <button className="nav-btn" onClick={() => setView('admin')} style={{ color: '#ff4757', fontWeight: 'bold' }}>
              <ShieldAlert size={18} /> Panel Moderatora
            </button>
          )}

          {user && (
            <button className="nav-btn" onClick={() => setView('add')} style={{ color: '#2ed573' }}>
              <Plus size={18} /> Dodaj Figurkę do bazy
            </button>
          )}

          {user ? (
            <button className="nav-btn" onClick={handleLogout}>
              <LogOut size={18} /> Wyloguj
            </button>
          ) : (
            <button className="nav-btn" onClick={() => setShowLoginModal(true)}>
              <User size={18} /> Zaloguj / Załóż konto
            </button>
          )}
        </div>
      </nav>

      <header style={{ cursor: 'pointer' }} onClick={handleBackToHome}>
        <h1>FigureFame</h1>
        <p>Baza Danych Figurek i Agregator Ofert</p>
      </header>

      <main>
        {view === 'home' && (
          <Showcase onSelectFigure={handleSelectFigure} />
        )}

        {view === 'dossier' && selectedFigure && (
          <Dossier 
            figure={selectedFigure} 
            onBack={handleBackToHome}
          />
        )}

        {view === 'add' && (
          <AddFigure 
            onBack={handleBackToHome}
            user={user}
          />
        )}

        {view === 'admin' && isAdmin && (
          <AdminDashboard 
            onBack={handleBackToHome}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-left">2026 Copyright by Klara Julia Nawrowska</div>
        <div className="footer-right">Created by <a href="mailto:artur.nawrowski@gmail.com">ArChi</a></div>
      </footer>
    </div>
  )
}

export default App
