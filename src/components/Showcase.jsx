import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';

const figuresData = [
  {
    id: 1,
    name: 'Hatsune Miku',
    series: 'Vocaloid',
    manufacturer: 'Good Smile Company',
    scale: '1/7',
    releaseDate: 'Listopad 2021',
    originalPrice: '15 000 JPY',
    image: '/images/miku_figure.png',
    lightClass: 'light-miku',
    description: 'Figurka Hatsune Miku w wersji klasycznej. Niezwykle szczegółowe wykonanie włosów i kultowego stroju.'
  },
  {
    id: 2,
    name: 'Super Sonico',
    series: 'Nitroplus',
    manufacturer: 'Alter',
    scale: '1/7',
    releaseDate: 'Sierpień 2020',
    originalPrice: '18 500 JPY',
    image: '/images/sonico_figure.png',
    lightClass: 'light-sonico',
    description: 'Sonico w letnim stroju z charakterystycznymi słuchawkami. Wysoka jakość malowania detali i dynamiczna poza.'
  }
];

export default function Showcase({ onSelectFigure }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFigures = figuresData.filter(fig => 
    fig.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    fig.series.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="showcase-container animate-fade-in">
      <div className="search-bar-wrapper">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Szukaj figurek (np. Hatsune, Miku, Sonico)..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="showcase-grid">
        {filteredFigures.map(fig => (
          <div key={fig.id} className="figure-card">
            <div className="figure-name-badge">{fig.name}</div>
            <div className={`ambient-light ${fig.lightClass}`}></div>
            <div className="figure-image-container">
              <img src={fig.image} alt={fig.name} loading="lazy" />
            </div>
            <div className="hover-panel">
              <div className="market-value">
                <span>Najlepsza oferta:</span>
                <strong>~ {fig.originalPrice}</strong>
              </div>
              <button className="btn-primary" onClick={() => onSelectFigure(fig)}>
                Otwórz Dossier
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
        {filteredFigures.length === 0 && (
          <div className="no-results">
            <p>Nie znaleziono figurek pasujących do "{searchTerm}".</p>
          </div>
        )}
      </div>
    </div>
  );
}
