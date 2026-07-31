import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// UkladDokumentu — wspólna oprawa polityki prywatności i regulaminu.
//
// Ten sam komponent obsługuje dwa tryby:
//   • w oknie  (`wOknie`) — tytuł niesie belka okna, więc go tu nie powtarzamy
//   • pełna strona        — tytuł i przycisk powrotu na miejscu
//
// Spis treści przewija JavaScriptem, a nie odnośnikiem `#kotwica`. Powód jest
// konkretny: w oknie przewijanym elementem jest `.okno-tresc`, a nie strona,
// a przy okazji `#kotwica` dopisywałaby się do adresu i mieszała trasom.
// ============================================================================

export default function UkladDokumentu({ tytul, data, spis, wOknie = false, children }) {
  const navigate = useNavigate();

  const przewinDo = (id) => {
    const cel = document.getElementById(id);
    if (!cel) return;
    const spokojnie = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cel.scrollIntoView({ behavior: spokojnie ? 'auto' : 'smooth', block: 'start' });
    // Bez tego czytnik ekranu zostaje tam, gdzie był — przewinęliśmy tylko obraz.
    cel.setAttribute('tabindex', '-1');
    cel.focus({ preventScroll: true });
  };

  return (
    <div className={`dokument${wOknie ? ' dokument--w-oknie' : ''}`}>
      <nav className="dokument-spis" aria-label={`Spis treści: ${tytul}`}>
        <p>Na tej stronie</p>
        <ol>
          {spis.map(({ id, etykieta }) => (
            <li key={id}>
              <button type="button" onClick={() => przewinDo(id)}>
                {etykieta}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <article className="dokument-tresc">
        {!wOknie && (
          <>
            <button className="btn-secondary dokument-powrot" onClick={() => navigate('/')}>
              <ArrowLeft size={16} aria-hidden="true" /> Wróć do bazy
            </button>
            <h1>{tytul}</h1>
          </>
        )}
        <p className="dokument-data">Ostatnia aktualizacja: {data}</p>
        {children}
      </article>
    </div>
  );
}
