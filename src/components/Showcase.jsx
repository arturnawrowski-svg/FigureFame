import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

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
    description: 'Figurka Hatsune Miku w wersji klasycznej, wyrzeźbiona z niezwykłą dbałością o detale. Ten wspaniały model 1/7 od Good Smile Company ukazuje Miku w jej ikonicznym stroju, emanując radością i dynamiką. Jej słynne, turkusowe kucyki (twintails) zostały odtworzone z wykorzystaniem przezroczystych elementów PVC, co nadaje im niesamowitą głębię i lekkość, sprawiając wrażenie jakby falowały na wietrze podczas koncertu. Detale takie jak błyszczący materiał butów, precyzyjne nadruki na rękawach czy futurystyczny mikrofon udowadniają mistrzostwo rzemieślników z GSC. Jest to jedna z najbardziej poszukiwanych i klasycznych inkarnacji Miku, która powinna znaleźć się w gablotce każdego szanującego się fana Vocaloidów.'
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
    description: 'Zjawiskowa figurka Super Sonico, wirtualnej idolki i maskotki Nitroplus, wyrzeźbiona przez mistrzów z firmy Alter. Ta edycja prezentuje Sonico w uroczej, casualowej stylizacji – w letnim stroju z zarzuconą kurtką, z ikonicznym różowym basem i charakterystycznymi słuchawkami. Rzeźbiarze z Altera, znani ze swojego perfekcjonizmu, nie zawiedli i tym razem: od subtelnych falban jej ubrań, po realistyczne ułożenie gitary z prawdziwymi strunami. Gra cieni na skórze postaci jest po prostu zdumiewająca. Skala 1/7 pozwala na imponującą prezencję na półce, a jakość malowania czyni z tego modelu absolutnego białego kruka na rynku wtórnym dla fanów SoniAni.'
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
              <button className="btn-primary" onClick={() => onSelectFigure(fig)} style={{ width: '100%', marginTop: '1rem' }}>
                Szczegóły i Oferty <ArrowRight size={16} />
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
