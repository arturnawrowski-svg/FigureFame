import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getImageUrl } from '../lib/getImageUrl';
import { generateGlowColor } from '../lib/glowColor';

// Stały adres figurki — ten sam, który trafia pod filmy na TikToka i YouTube'a.
// Czytelny, gdy już nadany; inaczej krótki kod, a w ostateczności identyfikator
// techniczny, żeby świeżo dodana pozycja też dała się otworzyć.
const figurePath = (fig) => `/f/${fig.slug || fig.short_code || fig.id}`;

// Samo przewijanie ma sens tylko tam, gdzie jest myszka i kursor może je
// zatrzymać najechaniem. Na telefonie i tablecie to zbędna praca dla procesora:
// palec i tak przesuwa listę sam, a animacja w tle zabiera klatki i baterię.
// Szanujemy też systemowe „ogranicz animacje".
function useMarqueeAllowed() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setAllowed(fine.matches && !calm.matches);
    update();

    calm.addEventListener?.('change', update);
    fine.addEventListener?.('change', update);
    return () => {
      calm.removeEventListener?.('change', update);
      fine.removeEventListener?.('change', update);
    };
  }, []);

  return allowed;
}
// Awaryjnej listy "na sztywno" tu nie ma i być nie może.
// Stała wcześniej w kodzie zawierała RENDERY AI zamiast zdjęć produktów oraz
// zmyślone wartości rynkowe (np. ~170 000 JPY dla figurki wartej ~98 000).
// Gdy baza nie odpowiada, uczciwiej powiedzieć "nie mam danych" niż pokazać
// wymyślone — cała obietnica tej strony to dane, którym można wierzyć.

export default function Showcase() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [figures, setFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const sliderRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const marqueeAllowed = useMarqueeAllowed();

  // O jedną kartę (szerokość + odstęp). Na wąskim ekranie karta jest węższa,
  // więc mierzymy realny element zamiast wpisywać stałą.
  const scrollByCard = (direction) => {
    const track = sliderRef.current;
    if (!track) return;
    const card = track.querySelector('.figure-card');
    const step = card ? card.getBoundingClientRect().width + 48 : 368;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  // Usunięto ciężką pętlę requestAnimationFrame, animacja odbywa się przez CSS

  useEffect(() => {
    async function fetchFigures() {
      try {
        // Pobieramy WYŁĄCZNIE to, co karta rysuje albo czego szuka wyszukiwarka.
        // Wcześniej szło tu `select('*')`, czyli razem z całą encyklopedią
        // (opis, gdzie szukać, strategia zakupowa, wartość rynkowa) — dla każdej
        // figurki naraz, po czym wszystko to lądowało w koszu, bo karta tego nie
        // pokazuje, a dossier i tak dociąga swoje dane osobno. Przy kilku
        // figurkach to niewidoczne; przy pięciuset to megabajty tekstu na każde
        // wejście na stronę główną — i to z darmowego limitu transferu.
        const { data, error } = await supabase
          .from('figures')
          .select('id, slug, short_code, name, japanese_name, series, japanese_series, manufacturer, original_price, official_image_url, light_class')
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedData = data.map(fig => {
            return {
              ...fig,
              japaneseName: fig.japanese_name,
              japaneseSeries: fig.japanese_series,
              originalPrice: fig.original_price,
              image: getImageUrl(fig.official_image_url),
              lightClass: fig.light_class
            };
          });
          setFigures(mappedData);
        }
      } catch (err) {
        // Świadomie NIE podstawiamy tu danych zastępczych — patrz komentarz
        // nad komponentem. Puste miejsce jest uczciwe, wymyślone dane nie.
        console.warn('Nie udało się pobrać Gabloty z bazy.', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchFigures();
  }, []);

  // Wyszukiwanie działa WYŁĄCZNIE po naszej zweryfikowanej bazie — natychmiast,
  // bez odpytywania serwisów zewnętrznych (żadnych limitów i kosztów na gościa).
  // Obejmuje też nazwy japońskie, bo kolekcjonerzy szukają po 初音ミク.
  const q = searchTerm.trim().toLowerCase();
  const filteredFigures = !q ? figures : figures.filter(fig =>
    [fig.name, fig.series, fig.japaneseName, fig.japaneseSeries, fig.manufacturer]
      .some(field => String(field || '').toLowerCase().includes(q))
  );

  // Karuzela w pętli wymaga dwóch kopii listy — ale tylko wtedy, gdy naprawdę
  // się kręci. Na telefonie druga kopia oznaczałaby dwa razy więcej kart
  // i zdjęć w pamięci bez żadnego pożytku.
  const marqueeMode = q === '' && marqueeAllowed;
  const visibleFigures = useMemo(
    () => (marqueeMode ? [...filteredFigures, ...filteredFigures] : filteredFigures),
    [marqueeMode, filteredFigures]
  );

  return (
    <div className="showcase-container animate-fade-in">
      <div className="search-bar-wrapper">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Wyszukaj po nazwie, serii lub tagach..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="skeleton-row" aria-busy="true" aria-label="Ładowanie bazy figurek">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : loadError ? (
        <div className="no-results">
          <p>Nie udało się teraz połączyć z naszą bazą. Odśwież stronę za chwilę.</p>
        </div>
      ) : (
        <div 
          className="showcase-wrapper" 
          onMouseEnter={() => setIsHovered(true)} 
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Strzałki są zawsze — na dotyku to jedyny pewny sposób przewijania
              obok gestu, a przy karuzeli pozwalają cofnąć się do przegapionej karty. */}
          {filteredFigures.length > 0 && !marqueeMode && (
            <button className="showcase-arrow showcase-arrow-left" onClick={() => scrollByCard(-1)} aria-label="Poprzednie figurki">
              <ChevronLeft size={30} />
            </button>
          )}

          <div className={marqueeMode ? 'showcase-viewport' : 'showcase-grid'} ref={sliderRef}>
            <div className={marqueeMode ? `showcase-track ${isHovered ? 'paused' : ''}` : 'showcase-track-static'}>
              {visibleFigures.map((fig, index) => (
                // Cała karta jest odnośnikiem. Wcześniej jedyne wejście w figurkę
                // prowadziło przez panel wysuwany na :hover — czyli na telefonie
                // nie dało się otworzyć żadnej figurki.
                <div
                  key={`${fig.id}-${index}`}
                  className="figure-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(figurePath(fig))}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(figurePath(fig)); } }}
                  aria-label={`Szczegóły i oferty: ${fig.name}`}
                >
                  <div className="figure-name-badge">{fig.name}</div>
                  <div className={`ambient-light ${fig.lightClass || ''}`} style={!fig.lightClass ? { background: generateGlowColor(fig.name) } : {}}></div>
                  <div className="figure-image-container">
                    <img
                      src={fig.image?.startsWith('http') || /\.(png|jpe?g|webp|avif)$/i.test(fig.image || '') ? fig.image : `${fig.image}.png`}
                      alt={fig.name}
                      loading="lazy"
                      decoding="async"
                      width="320"
                      height="500"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="hover-panel">
                    <div className="market-value">
                      <span>Najlepsza oferta:</span>
                      <strong>~ {fig.originalPrice ? (fig.originalPrice.replace('¥', '').trim() + (fig.originalPrice.includes('JPY') ? '' : ' JPY')) : 'Brak danych'}</strong>
                    </div>
                    <span className="btn-primary" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
                      Szczegóły i Oferty <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {filteredFigures.length === 0 && (
              <div className="no-results">
                <p>Nie znaleziono figurek pasujących do "{searchTerm}".</p>
              </div>
            )}
          </div>

          {filteredFigures.length > 0 && !marqueeMode && (
            <button className="showcase-arrow showcase-arrow-right" onClick={() => scrollByCard(1)} aria-label="Następne figurki">
              <ChevronRight size={30} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
