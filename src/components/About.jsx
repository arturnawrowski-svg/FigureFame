import { ArrowLeft, Database, Sparkles, ShieldAlert, TrendingUp, Film, Info, HelpCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

// ============================================================================
// O aplikacji — statyczna strona informacyjna (bez bazy). Odblokowuje dawny
// przycisk „Soon" w Navbarze.
// ============================================================================

const FEATURES = [
  { icon: Database, title: 'Baza i agregator', desc: 'Uporządkowane dane o japońskich figurkach: producent, seria, skala, cena pierwotna i wartość rynkowa — w jednym miejscu.' },
  { icon: Sparkles, title: 'Asystent AI', desc: '„Zapytaj AI o tę figurkę" — kontekstowy doradca kolekcjonera: autentyczność, ceny, gdzie kupić, strategia zakupu.' },
  { icon: ShieldAlert, title: 'Bootleg Radar', desc: 'Ocena, jak często dany model bywa podrabiany, plus generowana lista cech oryginału.' },
  { icon: TrendingUp, title: 'Price Watch', desc: 'Docelowo: śledzenie realnych ofert i cen rynkowych z aukcji i sklepów (w przygotowaniu).' },
  { icon: Film, title: 'Krótkie filmy', desc: 'Docelowo: automatyczne shorty prowadzące z social media wprost do karty figurki (w przygotowaniu).' },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="dossier-container animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem' }}>
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <h1 style={{ color: 'var(--color-text-highlight)' }}>O aplikacji FigureFame</h1>
      <p style={{ opacity: 0.85, lineHeight: 1.7, fontSize: '1.05rem' }}>
        FigureFame to baza danych i agregator informacji o japońskich figurkach kolekcjonerskich.
        Naszym celem jest miejsce, które łączy rzetelne dane, wartość rynkową, ochronę przed podróbkami
        oraz pomoc AI — tak, aby kolekcjonowanie było prostsze i bezpieczniejsze.
      </p>

      <h2 style={{ marginTop: '2.5rem', color: 'var(--color-text-highlight)' }}>Co znajdziesz</h2>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{ display: 'flex', gap: '14px', background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1.25rem' }}>
            <Icon size={24} style={{ color: 'var(--color-text-highlight)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ margin: '0 0 0.25rem' }}>{title}</h3>
              <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: '2.5rem', color: 'var(--color-text-highlight)' }}>Jak to działa</h2>
      <ol style={{ lineHeight: 1.8, opacity: 0.9, paddingLeft: '1.4rem' }}>
        <li>Użytkownicy i moderatorzy dodają figurki do bazy.</li>
        <li>System wspiera uzupełnianie danych (źródła kolekcjonerskie + AI) i optymalizuje zdjęcia.</li>
        <li>Zweryfikowane pozycje trafiają do publicznej <strong>Gabloty</strong> z pełnym dossier.</li>
        <li>Przy każdej figurce masz asystenta AI i Bootleg Radar.</li>
      </ol>

      <div style={{ marginTop: '2.5rem', background: 'rgba(128,128,128,0.08)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '12px' }}>
        <Info size={22} style={{ flexShrink: 0, opacity: 0.7, marginTop: '2px' }} />
        <div style={{ fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.6 }}>
          <strong>Ważne:</strong> dane i oceny (w tym wskazania AI oraz Bootleg Radar) mają charakter
          orientacyjny i pomocniczy — nie stanowią gwarancji autentyczności ani porady inwestycyjnej.
          Część funkcji (Price Watch, shorty) jest w przygotowaniu. Projekt rozwijany jest stopniowo.
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link to="/faq" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <HelpCircle size={18} /> FAQ i poradnik kolekcjonera
        </Link>
      </div>

      <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', fontSize: '0.85rem' }}>
        FigureFame — tworzone z pasji do kolekcjonerstwa.
      </p>
    </div>
  );
}
