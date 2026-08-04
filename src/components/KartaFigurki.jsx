import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getImageUrl } from '../lib/getImageUrl';
import { generateGlowColor } from '../lib/glowColor';
import { prawaDoZdjecia } from '../lib/prawaDoZdjecia';
import '../styles/postacie.css';

// ============================================================================
// Karta figurki — jedna, wspólna dla Gabloty i strony postaci.
// ----------------------------------------------------------------------------
// Wydzielona z Showcase.jsx przy rozdzieleniu postaci od produktu. Powód nie
// jest estetyczny: dwie kopie tego samego kafelka rozjechałyby się przy
// pierwszej poprawce, a wtedy ta sama figurka wyglądałaby inaczej w Gablocie
// i inaczej na stronie swojej postaci.
// ============================================================================

// Stały adres figurki — ten sam, który trafia pod filmy na TikToka i YouTube'a.
// Czytelny, gdy już nadany; inaczej krótki kod, a w ostateczności identyfikator
// techniczny, żeby świeżo dodana pozycja też dała się otworzyć.
const sciezkaFigurki = (fig) => `/f/${fig.slug || fig.short_code || fig.id}`;

/**
 * @param {object}  fig          wiersz z widoku `figures_full`
 * @param {boolean} pokazPostac  czy nagłówek ma nieść nazwę postaci
 *
 * `pokazPostac = false` używamy tam, gdzie nazwa postaci stoi już w nagłówku
 * sekcji: na stronie postaci i w zwiniętych wynikach wyszukiwania. Kafelek
 * pokazuje wtedy to, co RÓŻNI tę figurkę od pozostałych figurek tej postaci —
 * wersję, producenta i skalę. Powtarzanie „Super Sonico" pięć razy pod
 * nagłówkiem „Super Sonico" nie niesie żadnej informacji.
 */
export default function KartaFigurki({ fig, pokazPostac = true }) {
  const navigate = useNavigate();
  const adres = sciezkaFigurki(fig);

  // `name` z widoku jest już złożone („Levi: Fortitude Ver."), więc w Gablocie
  // wystarcza samo. Bez postaci schodzimy do samej wersji, a gdy figurka wersji
  // nie ma — do producenta, żeby nagłówek nigdy nie był pusty.
  const naglowek = pokazPostac
    ? fig.name
    : fig.version || fig.manufacturer || fig.name;

  const podpis = [fig.manufacturer, fig.scale].filter(Boolean).join(' · ');
  const obraz = getImageUrl(fig.official_image_url);
  const cena = fig.original_price;

  const otworz = () => navigate(adres);

  return (
    <div
      className="figure-card"
      role="link"
      tabIndex={0}
      onClick={otworz}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otworz(); } }}
      aria-label={`Szczegóły i oferty: ${fig.name}`}
    >
      <div className="figure-name-badge">{naglowek}</div>
      <div
        className={`ambient-light ${fig.light_class || ''}`}
        style={!fig.light_class ? { background: generateGlowColor(fig.name || '') } : {}}
      ></div>
      <div className="figure-image-container">
        <img
          src={obraz}
          alt={fig.name}
          loading="lazy"
          decoding="async"
          width="320"
          height="500"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
        />
        {/* Podpis praw wprost na zdjęciu — musi jechać razem z nim,
            także gdy ktoś zrobi zrzut ekranu karty. */}
        {prawaDoZdjecia(fig) && (
          <span className="podpis-praw">{prawaDoZdjecia(fig)}</span>
        )}
      </div>
      <div className="hover-panel">
        {/* Producent i skala pod spodem, gdy nagłówek ich nie niesie —
            to one odróżniają wydania tej samej postaci. */}
        {podpis && <div className="karta-podpis">{podpis}</div>}
        <div className="market-value">
          <span>Najlepsza oferta:</span>
          <strong>~ {cena ? (cena.replace('¥', '').trim() + (cena.includes('JPY') ? '' : ' JPY')) : 'Brak danych'}</strong>
        </div>
        <span className="btn-primary" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
          Szczegóły i Oferty <ArrowRight size={16} />
        </span>
      </div>
    </div>
  );
}
