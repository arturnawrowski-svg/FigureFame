import { useState } from 'react'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import { User, Info, LogOut } from 'lucide-react'

function App() {
  const [selectedFigure, setSelectedFigure] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleSelectFigure = (figure) => {
    setSelectedFigure(figure)
  }

  const handleBackToShowcase = () => {
    setSelectedFigure(null)
  }

  return (
    <div className="app-container">
      <nav className="top-nav animate-fade-in">
        <div className="nav-links">
          <button className="nav-btn" onClick={() => alert("FigureFame\n\nBaza wiedzy o figurkach anime oraz agregator aukcji i ofert.")}>
            <Info size={18} /> O aplikacji
          </button>
          <button className="nav-btn" onClick={() => setIsLoggedIn(!isLoggedIn)}>
            {isLoggedIn ? <><LogOut size={18} /> Konto (Wyloguj)</> : <><User size={18} /> Konto (Zaloguj)</>}
          </button>
        </div>
      </nav>

      <header>
        <h1>FigureFame</h1>
        <p>Baza Danych Figurek i Agregator Ofert</p>
      </header>

      <main>
        {!selectedFigure && (
          <Showcase onSelectFigure={handleSelectFigure} />
        )}

        {selectedFigure && (
          <Dossier 
            figure={selectedFigure} 
            onBack={handleBackToShowcase}
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
