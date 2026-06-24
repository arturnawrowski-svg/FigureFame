import { Sparkles } from 'lucide-react';

const figures = [
  {
    id: 1,
    name: 'Hatsune Miku',
    price: '18 000 JPY',
    image: '/images/miku_figure.png',
    lightClass: 'light-miku'
  },
  {
    id: 2,
    name: 'Super Sonico',
    price: '21 500 JPY',
    image: '/images/sonico_figure.png',
    lightClass: 'light-sonico'
  }
];

export default function Showcase({ onSelectFigure }) {
  return (
    <div className="showcase-grid animate-fade-in">
      {figures.map(fig => (
        <div key={fig.id} className="figure-card">
          <div className={`ambient-light ${fig.lightClass}`}></div>
          <div className="figure-image-container">
            <img src={fig.image} alt={fig.name} loading="lazy" />
          </div>
          <div className="hover-panel">
            <div className="market-value">
              <span>Wycena rynkowa:</span>
              <strong>{fig.price}</strong>
            </div>
            <button className="btn-primary" onClick={() => onSelectFigure(fig)}>
              <Sparkles size={18} />
              Stwórz Historię
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
