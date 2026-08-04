import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import KartaFigurki from './KartaFigurki';
import { grupujPoPostaci, ileFigurek } from '../lib/grupujPostaci';

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
  const [postacie, setPostacie] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rozwiniete, setRozwiniete] = useState({});
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

  useEffect(() => {
    async function fetchFigures() {
      try {
        // ⚠️ Czytamy WIDOK `figures_full`, nie tabelę `figures`.
        //
        // Po rozdzieleniu postaci od produktu nazwa japońska i seria mieszkają
        // w tabeli `characters`, a w `figures` są puste. Gablota czytająca samą
        // tabelę pokazywałaby figurki bez nazw japońskich, a wyszukiwanie po
        // 初音ミク przestałoby cokolwiek znajdować — bez jednego błędu na ekranie.
        // Widok składa jedno i drugie i podaje nazwę już złożoną z postaci
        // i wersji („Levi: Fortitude Ver.").
        //
        // Pobieramy WYŁĄCZNIE to, co karta rysuje albo czego szuka wyszukiwarka.
        // Przy pięciuset figurkach `select('*')` to megabajty encyklopedii na
        // każde wejście na stronę — z darmowego limitu transferu.
        const KOLUMNY =
          'id, slug, short_code, name, japanese_name, series, japanese_series, ' +
          'manufacturer, scale, version, original_price, official_image_url, ' +
          'light_class, image_credit, character_id, character_name';

        const [wynikFigurek, wynikPostaci] = await Promise.all([
          supabase.from('figures_full').select(KOLUMNY)
            .eq('status', 'APPROVED')
            .order('created_at', { ascending: true }),
          // Adresy postaci — potrzebne, żeby z wyniku wyszukiwania dało się
          // przejść na stronę postaci. Tabela jest mała (jeden wiersz na postać),
          // więc to tani dodatek do jednego zapytania.
          supabase.from('characters').select('id, slug, name, japanese_name, series'),
        ]);

        if (wynikFigurek.error) throw wynikFigurek.error;

        const mapaPostaci = {};
        for (const p of wynikPostaci.data || []) mapaPostaci[p.id] = p;
        setPostacie(mapaPostaci);
        setFigures(wynikFigurek.data || []);
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
    [fig.name, fig.character_name, fig.series, fig.japanese_name, fig.japanese_series, fig.manufacturer, fig.version]
      .some(field => String(field || '').toLowerCase().includes(q))
  );

  // ==========================================================================
  // WYNIKI KUMULUJĄ SIĘ POD POSTACIĄ.
  // --------------------------------------------------------------------------
  // Bez tego wpisanie „Miku" wyrzucało pięć niemal identycznych kafelków, na
  // których różnicę widać dopiero po producencie i skali. Teraz odpowiedź brzmi
  // „Hatsune Miku — 5 figurek" i dopiero po rozwinięciu widać, czym się różnią.
  // Grupa jednoelementowa jest rozwinięta od razu — nie ma czego zwijać.
  // ==========================================================================
  const grupy = useMemo(
    () => grupujPoPostaci(filteredFigures, postacie),
    [filteredFigures, postacie]
  );

  // Karuzela w pętli wymaga dwóch kopii listy — ale tylko wtedy, gdy naprawdę
  // się kręci. Na telefonie druga kopia oznaczałaby dwa razy więcej kart
  // i zdjęć w pamięci bez żadnego pożytku.
  const marqueeMode = q === '' && marqueeAllowed;
  const visibleFigures = useMemo(
    () => (marqueeMode ? [...filteredFigures, ...filteredFigures] : filteredFigures),
    [marqueeMode, filteredFigures]
  );

  const przelacz = (klucz) => setRozwiniete((p) => ({ ...p, [klucz]: !p[klucz] }));

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
      ) : q ? (
        // ---------------------------------------------------------------
        // TRYB WYSZUKIWANIA — wyniki zebrane pod postaciami.
        // ---------------------------------------------------------------
        <div className="wyniki-postaci">
          {grupy.length === 0 ? (
            <div className="no-results">
              <p>Nie znaleziono figurek pasujących do „{searchTerm}".</p>
            </div>
          ) : (
            grupy.map((g) => {
              const ile = g.figurki.length;
              const otwarta = ile === 1 || rozwiniete[g.klucz];
              return (
                <div key={g.klucz} className="grupa-postaci">
                  <div className="grupa-naglowek">
                    <button
                      type="button"
                      className="grupa-tytul"
                      onClick={() => ile > 1 && przelacz(g.klucz)}
                      aria-expanded={otwarta}
                      style={{ cursor: ile > 1 ? 'pointer' : 'default' }}
                    >
                      <strong>{g.nazwa}</strong>
                      {g.postac?.japanese_name && (
                        <span className="grupa-jp">{g.postac.japanese_name}</span>
                      )}
                      <span className="grupa-licznik">{ileFigurek(ile)}</span>
                      {ile > 1 && (otwarta ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                    </button>

                    {g.postac?.slug && (
                      <button
                        type="button"
                        className="btn-secondary grupa-link"
                        onClick={() => navigate(`/postac/${g.postac.slug}`)}
                      >
                        Strona postaci
                      </button>
                    )}
                  </div>

                  {otwarta && (
                    <div className="showcase-track-static">
                      {g.figurki.map((fig) => (
                        // Nazwa postaci stoi już w nagłówku grupy — kafelek
                        // pokazuje to, co figurki od siebie ODRÓŻNIA.
                        <KartaFigurki key={fig.id} fig={fig} pokazPostac={false} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
                <KartaFigurki key={`${fig.id}-${index}`} fig={fig} />
              ))}
            </div>
            {filteredFigures.length === 0 && (
              <div className="no-results">
                <p>Gablota jest na razie pusta.</p>
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
