import { Link, useLocation } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { kontaAktywne } from '../lib/social';

// ============================================================================
// Stopka — dwa wiersze. Górny robi robotę (prywatność, dokumenty, media),
// dolny jest podpisem. Rozdziela je linia --color-glass-border, ta sama,
// którą serwis rozdziela wszystko inne.
//
// TRZY RZECZY, KTÓRE ŁATWO ZEPSUĆ Z POWROTEM:
//
// 1. ŻADNEGO `opacity` NA CAŁOŚCI. Poprzednia stopka miała `opacity: .6`
//    i przez to tekst #a0aab2 schodził z 7,5:1 do 3,5:1 — poniżej progu WCAG AA.
//    Stonowanie robimy jawnym kolorem (--footer-text), który da się zmierzyć.
//
// 2. ROK LICZONY Z DATY. Wpisany na sztywno zestarzeje się 1 stycznia.
//
// 3. IKONY MEDIÓW TYLKO DLA ISTNIEJĄCYCH KONT (patrz src/lib/social.js).
//    Odnośnik do pustego kanału szkodzi bardziej niż jego brak.
//
// Odnośniki do dokumentów niosą `state.tlo` — dzięki temu otwierają się jako
// okno nad stroną, a nie przeładowaniem. Wejście wprost na /prywatnosc dalej
// pokazuje pełną stronę. Patrz App.jsx i OknoDokumentu.jsx.
// ============================================================================

export default function Footer() {
  const location = useLocation();
  const konta = kontaAktywne();

  // `tlo` mówi trasie: „pokaż mnie jako okno, a pod spodem zostaw to, co jest".
  const jakoOkno = { tlo: location };

  return (
    <footer className="app-footer">
      <div className="footer-gora">
        <div className="footer-lewo">
          {/* Docelowo otwiera panel zgód. Dopóki go nie ma, prowadzi do sekcji
              o cookies w polityce — bo tam stoi prawda o tym, co trzymamy.
              Przycisk, który nic nie robi, byłby cichą awarią. */}
          <Link to="/prywatnosc" state={jakoOkno} className="footer-prywatnosc">
            <Fingerprint size={17} aria-hidden="true" />
            Prywatność i cookies
          </Link>

          <nav className="footer-linki" aria-label="Dokumenty">
            <Link to="/prywatnosc" state={jakoOkno}>Polityka prywatności</Link>
            <span aria-hidden="true">·</span>
            <Link to="/regulamin" state={jakoOkno}>Regulamin</Link>
            <span aria-hidden="true">·</span>
            <Link to="/about" state={jakoOkno}>O aplikacji</Link>
          </nav>
        </div>

        {konta.length > 0 && (
          <ul className="footer-social" aria-label="FigureFame w mediach społecznościowych">
            {konta.map(({ klucz, nazwa, url, d }) => (
              <li key={klucz}>
                <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`FigureFame na ${nazwa}`}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={d} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <hr className="footer-linia" />

      <div className="footer-dol">
        <p className="footer-prawa">
          <span className="footer-znak" aria-hidden="true" />
          © {new Date().getFullYear()} FigureFame.com
        </p>
        <p className="footer-autor">
          Created by <a href="mailto:artur.nawrowski@gmail.com">ArChi</a>
        </p>
      </div>
    </footer>
  );
}
