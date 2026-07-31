import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Przewija na górę przy każdej zmianie trasy (typowy problem SPA — router
// zachowuje pozycję scrolla z poprzedniej strony). Nic nie renderuje.
export default function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    // Wyjątek: otwarcie dokumentu jako OKNA nad stroną. Adres się zmienia,
    // ale strona pod spodem zostaje ta sama — przewinięcie jej na górę
    // zabrałoby czytelnikowi miejsce, w którym był, i po zamknięciu okna
    // wracałby na początek Gabloty. Patrz App.jsx (`tlo`).
    if (state?.tlo) return;
    window.scrollTo(0, 0);
  }, [pathname, state]);
  return null;
}
