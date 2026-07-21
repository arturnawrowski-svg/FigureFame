import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Przewija na górę przy każdej zmianie trasy (typowy problem SPA — router
// zachowuje pozycję scrolla z poprzedniej strony). Nic nie renderuje.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
