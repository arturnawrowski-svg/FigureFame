import { useState, useEffect } from 'react'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import AddFigure from './components/AddFigure'
import { User, Info, LogOut, Plus, X, Sun, Moon } from 'lucide-react'

function App() {
  const [view, setView] = useState('home')
  const [selectedFigure, setSelectedFigure] = useState(null)
  
  const [user, setUser] = useState(null) 
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'

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

  const handleLogin = (provider) => {
    setUser(`ArturNawrowski (Zalogowany przez ${provider})`)
    setShowLoginModal(false)
  }

  const handleLogout = () => {
    setUser(null)
    if (view === 'add') setView('home')
  }

  return (
    <div className="app-container">
      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1a1c23', padding: '3rem', borderRadius: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#fff', opacity: 0.5 }}>
              <X size={24}/>
            </button>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Zaloguj się</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => handleLogin('Discord')} className="btn-primary" style={{ background: '#5865F2', color: '#fff', padding: '16px' }}>
                Zaloguj przez Discord
              </button>
              <button onClick={() => handleLogin('Google')} className="btn-primary" style={{ background: '#fff', color: '#000', padding: '16px' }}>
                Zaloguj przez Google
              </button>
            </div>
            <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', marginTop: '2rem' }}>
              Zaloguj się, aby dodawać nowe figurki i budować swoją reputację w społeczności.
            </p>
          </div>
        </div>
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
      </main>

      <footer className="app-footer">
        <div className="footer-left">2026 Copyright by Klara Julia Nawrowska</div>
        <div className="footer-right">Created by <a href="mailto:artur.nawrowski@gmail.com">ArChi</a></div>
      </footer>
    </div>
  )
}

export default App
