import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// ============================================================================
// OknoDokumentu — okno nakładane na stronę, z prawdziwym adresem pod spodem.
//
// PO CO TAK, A NIE `window.open`:
// prawdziwe okno przeglądarki blokują wtyczki, na telefonie go nie ma, a przede
// wszystkim — polityka prywatności MUSI mieć stały, linkowalny adres. Potrzebują
// go programy afiliacyjne przy weryfikacji, wyszukiwarki i sam panel zgód.
// Dokument żyjący wyłącznie w wyskakującym okienku to problem prawny.
//
// Rozwiązanie: /prywatnosc jest zwyczajną trasą. Kliknięcie w stopce nakłada ją
// na Gablotę (adres się zmienia, strona pod spodem zostaje), a wejście wprost
// albo odświeżenie pokazuje pełną stronę. Patrz App.jsx — przekazywanie `tlo`.
//
// DOSTĘPNOŚĆ — to nie jest ozdobnik, tylko powód, dla którego ten komponent
// istnieje osobno. Modal bez tych czterech rzeczy jest pułapką dla klawiatury:
//   1. fokus wchodzi do środka i NIE WYCHODZI tabulatorem (pułapka fokusa),
//   2. Esc zamyka,
//   3. po zamknięciu fokus wraca na element, który okno otworzył,
//   4. tło nie przewija się pod oknem.
// Ten sam komponent obsłuży później panel zgód — najdroższa część tamtej
// roboty jest więc zrobiona tutaj, raz.
// ============================================================================

const FOKUSOWALNE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function OknoDokumentu({ tytul, onClose, children }) {
  const oknoRef = useRef(null);
  const tytulId = useRef(`okno-tytul-${Math.random().toString(36).slice(2, 9)}`);

  // Element, który miał fokus PRZED otwarciem. Po zamknięciu fokus musi tam
  // wrócić, inaczej czytnik ekranu ląduje na początku strony i użytkownik traci
  // miejsce, w którym był.
  const pooprzedni = useRef(null);

  const zamknij = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    pooprzedni.current = document.activeElement;

    // Fokus na okno, żeby czytnik od razu odczytał tytuł, a Tab zaczął krążyć
    // wewnątrz. Nie na pierwszy odnośnik — wtedy tytuł zostałby pominięty.
    oknoRef.current?.focus();

    const przewijanieTla = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const naKlawisz = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        zamknij();
        return;
      }
      if (e.key !== 'Tab') return;

      // Pułapka fokusa. Listę liczymy przy każdym naciśnięciu, bo treść okna
      // może się zmieniać (spis treści, rozwijane sekcje).
      const pola = oknoRef.current?.querySelectorAll(FOKUSOWALNE);
      if (!pola || pola.length === 0) {
        e.preventDefault();
        return;
      }
      const pierwszy = pola[0];
      const ostatni = pola[pola.length - 1];

      if (e.shiftKey && document.activeElement === pierwszy) {
        e.preventDefault();
        ostatni.focus();
      } else if (!e.shiftKey && document.activeElement === ostatni) {
        e.preventDefault();
        pierwszy.focus();
      }
    };

    document.addEventListener('keydown', naKlawisz, true);
    return () => {
      document.removeEventListener('keydown', naKlawisz, true);
      document.body.style.overflow = przewijanieTla;
      // Element mógł zniknąć razem z przerysowaniem strony — stąd `?.`
      pooprzedni.current?.focus?.();
    };
  }, [zamknij]);

  return (
    <div
      className="okno-tlo"
      onClick={(e) => {
        // Kliknięcie POZA treść zamyka. Warunek na `currentTarget` jest
        // konieczny: bez niego zamykałoby też kliknięcie w środku okna.
        if (e.target === e.currentTarget) zamknij();
      }}
    >
      <div
        className="okno"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tytulId.current}
        tabIndex={-1}
        ref={oknoRef}
      >
        <header className="okno-belka">
          <h2 id={tytulId.current}>{tytul}</h2>
          <button type="button" className="okno-x" onClick={zamknij} aria-label="Zamknij okno">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="okno-tresc">{children}</div>

        <footer className="okno-stopka">
          <button type="button" className="btn-zamknij" onClick={zamknij}>
            Zamknij
          </button>
        </footer>
      </div>
    </div>
  );
}
