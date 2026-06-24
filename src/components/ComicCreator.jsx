import { useState } from 'react';
import { ArrowLeft, Wand2 } from 'lucide-react';

export default function ComicCreator({ figure, onBack, onComplete }) {
  const [step, setStep] = useState(1);
  const [scenario, setScenario] = useState(null);
  const [style, setStyle] = useState(null);

  const scenarios = [
    { id: 'cyber', name: 'Cyberpunk', img: '/images/scenario_cyberpunk.png' },
    { id: 'concert', name: 'Idol Concert', img: '/images/scenario_concert.png' },
    { id: 'escape', name: 'Nocna Ucieczka', img: '/images/scenario_escape.png' }
  ];

  const charCode = figure.id === 1 ? 'miku' : 'sonico';
  const styles = [
    { id: 'sketch', name: 'Szkic / Lineart', premium: false, img: `/images/${charCode}_style_sketch.png` },
    { id: 'manga', name: 'Klasyczna Manga', premium: false, img: `/images/${charCode}_style_manga.png` },
    { id: 'color', name: 'Pełny Kolor (Anime)', premium: true, img: `/images/${charCode}_style_color.png` },
    { id: 'macro', name: 'Makrofotografia', premium: true, img: `/images/${charCode}_style_macro.png` }
  ];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleGenerate = () => {
    onComplete({ scenario, style });
  };

  return (
    <div className="animate-fade-in">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Wróć do gabloty
      </button>

      <div className="creator-layout">
        <div className="creator-sidebar">
          <h3>Kreator Komiksów</h3>
          <p>Bohater: <strong>{figure.name}</strong></p>
          
          <div className="step-indicator" style={{ marginTop: '2rem' }}>
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
          </div>

          <div style={{ flex: 1 }}>
            {step === 1 && (
              <div className="animate-fade-in">
                <h4>Krok 1: Wybierz Scenariusz</h4>
                <div className="tiles-grid">
                  {scenarios.map(s => (
                    <div 
                      key={s.id} 
                      className={`tile ${scenario?.id === s.id ? 'selected' : ''}`}
                      onClick={() => { setScenario(s); handleNext(); }}
                    >
                      <img src={s.img} alt={s.name} />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h4>Krok 2: Wybierz Styl Graficzny</h4>
                <div className="tiles-grid">
                  {styles.map(s => (
                    <div 
                      key={s.id} 
                      className={`tile ${style?.id === s.id ? 'selected' : ''}`}
                      onClick={() => { setStyle(s); handleNext(); }}
                    >
                      <img src={s.img} alt={s.name} />
                      <span>{s.name}</span>
                      {s.premium && <span className="tile-badge premium">Power</span>}
                      {!s.premium && <span className="tile-badge">Slot</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h4>Krok 3: Generowanie</h4>
                <p>Twój komiks jest gotowy do wyrenderowania w oparciu o wybrane parametry.</p>
                <ul style={{ color: '#ccc', marginBottom: '2rem' }}>
                  <li>Scenariusz: {scenario?.name}</li>
                  <li>Styl: {style?.name}</li>
                </ul>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleGenerate}>
                  <Wand2 size={18} />
                  Generuj Komiks
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="preview-area">
          <div className="live-badge">Live Preview</div>
          {step === 1 && scenario && <img src={scenario.img} alt="preview" className="animate-fade-in" />}
          {step === 2 && style && <img src={style.img} alt="preview" className="animate-fade-in" />}
          {step === 3 && <img src="/images/comic_preview.png" alt="preview" className="animate-fade-in" />}
          {!scenario && <p style={{ opacity: 0.5 }}>Wybierz scenariusz aby zobaczyć podgląd</p>}
        </div>
      </div>
    </div>
  );
}
