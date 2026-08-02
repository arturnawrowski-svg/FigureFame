import { Link, useLocation } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { kontaDoStopki } from '../lib/social';

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
// 3. ODNOŚNIK DO MEDIÓW TYLKO DLA ISTNIEJĄCEGO KONTA (patrz src/lib/social.js).
//    Konto bez adresu rysuje się jako wyszarzony `span`, NIE jako `a` — bo
//    szkodę robi klik prowadzący w pustkę, nie sam znaczek. Nie zamieniaj
//    tego z powrotem na `a` z `href="#"`.
//
// Odnośniki do dokumentów niosą `state.tlo` — dzięki temu otwierają się jako
// okno nad stroną, a nie przeładowaniem. Wejście wprost na /prywatnosc dalej
// pokazuje pełną stronę. Patrz App.jsx i OknoDokumentu.jsx.
// ============================================================================

export default function Footer() {
  const location = useLocation();
  const konta = kontaDoStopki();
  // Gdy nie ma ani jednego prawdziwego konta, cała lista jest dekoracją —
  // czytnik ekranu nie ma po co ogłaszać „media społecznościowe: pusto".
  const maPrawdziwe = konta.some((k) => k.gotowe);

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
          <ul
            className="footer-social"
            aria-label={maPrawdziwe ? 'FigureFame w mediach społecznościowych' : undefined}
            aria-hidden={maPrawdziwe ? undefined : 'true'}
          >
            {konta.map(({ klucz, nazwa, url, d, gotowe }) => {
              const znak = (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={d} />
                </svg>
              );
              return (
                <li key={klucz}>
                  {gotowe ? (
                    // `data-social` niesie klucz platformy do CSS — stąd bierze się
                    // kolor marki na najechanie (patrz index.css, sekcja stopki).
                    <a href={url} target="_blank" rel="noopener noreferrer" data-social={klucz} aria-label={`FigureFame na ${nazwa}`}>
                      {znak}
                    </a>
                  ) : (
                    <span className="social-podglad" title={`${nazwa} — konto jeszcze nie założone`} aria-hidden="true">
                      {znak}
                    </span>
                  )}
                </li>
              );
            })}
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
