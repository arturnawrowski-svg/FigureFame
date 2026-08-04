import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import KartaFigurki from './KartaFigurki';
import { ileFigurek } from '../lib/grupujPostaci';
import '../styles/postacie.css';

// ============================================================================
// STRONA POSTACI — `figurefame.com/postac/super-sonico`
// ----------------------------------------------------------------------------
// Najmocniejszy materiał pod wyszukiwarki, jaki ten serwis może mieć. Karta
// pojedynczego produktu nigdy nie wygra frazy „Super Sonico figurka", bo mówi
// o jednym wydaniu; strona postaci mówi o wszystkich naraz i to ona ma szansę
// stanąć wysoko. Jest też naturalnym miejscem lądowania widza z shorta: film
// pokazuje jedną figurkę, a człowiek chce zobaczyć, co jeszcze jest.
//
// Strona pokazuje WYŁĄCZNIE figurki zatwierdzone. Postać sama w sobie nie jest
// tajemnicą, ale lista jej figurek nie może ujawniać zgłoszeń czekających
// na moderację — ta sama granica co w Gablocie i w czacie.
// ============================================================================

const KOLUMNY =
  'id, slug, short_code, name, japanese_name, series, japanese_series, ' +
  'manufacturer, scale, version, original_price, official_image_url, ' +
  'light_class, image_credit, character_id, character_name';

export default function StronaPostaci() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [postac, setPostac] = useState(null);
  const [figurki, setFigurki] = useState([]);
  const [stan, setStan] = useState('ladowanie'); // ladowanie | gotowe | brak | blad

  useEffect(() => {
    let aktualne = true;

    async function pobierz() {
      setStan('ladowanie');
      try {
        const { data: p, error: bladPostaci } = await supabase
          .from('characters')
          .select('id, slug, name, japanese_name, series, japanese_series')
          .eq('slug', slug)
          .maybeSingle();

        if (bladPostaci) throw bladPostaci;
        if (!aktualne) return;
        if (!p) { setStan('brak'); return; }

        const { data: f, error: bladFigurek } = await supabase
          .from('figures_full')
          .select(KOLUMNY)
          .eq('character_id', p.id)
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: true });

        if (bladFigurek) throw bladFigurek;
        if (!aktualne) return;

        setPostac(p);
        setFigurki(f || []);
        setStan('gotowe');
      } catch (err) {
        console.warn('Nie udało się pobrać strony postaci.', err);
        if (aktualne) setStan('blad');
      }
    }

    pobierz();
    return () => { aktualne = false; };
  }, [slug]);

  // Tytuł i opis strony ustawiamy tutaj, bo to one trafiają do wyników
  // wyszukiwania i do podglądu linku. Po wyjściu przywracamy poprzednie —
  // inaczej tytuł postaci zostałby na Gablocie.
  useEffect(() => {
    if (!postac) return;

    const poprzedniTytul = document.title;
    const znacznik = document.querySelector('meta[name="description"]');
    const poprzedniOpis = znacznik?.getAttribute('content') || '';

    const ile = figurki.length;
    const jp = postac.japanese_name ? ` (${postac.japanese_name})` : '';
    document.title = `${postac.name}${jp} — figurki kolekcjonerskie | FigureFame`;
    znacznik?.setAttribute(
      'content',
      ile > 0
        ? `${postac.name}${jp}${postac.series ? ` z serii ${postac.series}` : ''} — ${ileFigurek(ile)} w bazie FigureFame: producent, skala, wersja i gdzie ich szukać.`
        : `${postac.name}${jp} w bazie FigureFame.`
    );

    return () => {
      document.title = poprzedniTytul;
      znacznik?.setAttribute('content', poprzedniOpis);
    };
  }, [postac, figurki.length]);

  if (stan === 'ladowanie') {
    return <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>Ładowanie…</div>;
  }

  if (stan === 'blad') {
    return (
      <div className="no-results" style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Nie udało się teraz połączyć z naszą bazą. Odśwież stronę za chwilę.</p>
      </div>
    );
  }

  if (stan === 'brak') {
    return (
      <div className="no-results" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Nie mamy takiej postaci</h2>
        <p>Sprawdź pisownię albo poszukaj w Gablocie.</p>
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>
          Wróć do Gabloty
        </button>
      </div>
    );
  }

  const ile = figurki.length;

  return (
    <div className="showcase-container animate-fade-in strona-postaci">
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={18} /> Gablota
      </button>

      <header className="postac-naglowek">
        <h1 style={{ margin: 0 }}>{postac.name}</h1>
        {postac.japanese_name && <p className="postac-jp">{postac.japanese_name}</p>}
        <p className="postac-seria">
          {postac.series || 'seria nieznana'}
          {postac.japanese_series ? ` · ${postac.japanese_series}` : ''}
        </p>
        <p className="postac-licznik">
          {ile === 0
            ? 'Nie mamy jeszcze figurek tej postaci w Gablocie.'
            : `${ileFigurek(ile)} w naszej bazie`}
        </p>
      </header>

      {ile > 0 && (
        <div className="showcase-track-static">
          {/* Nazwa postaci stoi w nagłówku strony — kafelki pokazują to,
              co je od siebie odróżnia: wersję, producenta i skalę. */}
          {figurki.map((fig) => (
            <KartaFigurki key={fig.id} fig={fig} pokazPostac={false} />
          ))}
        </div>
      )}
    </div>
  );
}
