import { useState } from 'react'
import Showcase from './components/Showcase'
import ComicCreator from './components/ComicCreator'
import AffiliateLinks from './components/AffiliateLinks'

function App() {
  const [selectedFigure, setSelectedFigure] = useState(null)
  const [comicResult, setComicResult] = useState(null)

  const handleSelectFigure = (figure) => {
    setSelectedFigure(figure)
    setComicResult(null)
  }

  const handleBackToShowcase = () => {
    setSelectedFigure(null)
    setComicResult(null)
  }

  const handleComicComplete = (result) => {
    setComicResult(result)
  }

  return (
    <div className="app-container">
      <header>
        <h1>FigureFrame</h1>
        <p>Cyfrowa gablota i AI Comic Creator</p>
      </header>

      <main>
        {!selectedFigure && (
          <Showcase onSelectFigure={handleSelectFigure} />
        )}

        {selectedFigure && !comicResult && (
          <ComicCreator 
            figure={selectedFigure} 
            onBack={handleBackToShowcase}
            onComplete={handleComicComplete}
          />
        )}

        {selectedFigure && comicResult && (
          <div className="result-view animate-fade-in">
            <h2>Twój Komiks</h2>
            <img src="/images/comic_preview.png" alt="Generated Comic" className="final-comic" />
            
            <button className="btn-secondary" onClick={handleBackToShowcase} style={{ marginTop: '2rem' }}>
              Powrót do Gabloty
            </button>

            <AffiliateLinks figure={selectedFigure} />
          </div>
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
