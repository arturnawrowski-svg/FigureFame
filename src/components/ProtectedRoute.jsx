import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PotwierdzAdres from './PotwierdzAdres';

// Strażnik tras (Etap 1). Chroni ścieżki wymagające logowania / uprawnień admina.
//   <ProtectedRoute><AddFigure/></ProtectedRoute>                   → tylko zalogowani
//   <ProtectedRoute wymagaPotwierdzenia>…</ProtectedRoute>          → + potwierdzony adres
//   <ProtectedRoute requireAdmin><AdminDashboard/></ProtectedRoute> → tylko admin
export default function ProtectedRoute({ children, requireAdmin = false, wymagaPotwierdzenia = false }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Sprawdzanie uprawnień...</div>;
  }

  // Niezalogowany → strona główna z prośbą o otwarcie logowania.
  if (!user) {
    return <Navigate to="/" replace state={{ openLogin: true, from: location.pathname }} />;
  }

  // Zalogowany, ale bez uprawnień admina na trasie admińskiej → strona główna.
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Brama potwierdzonego adresu. Dotyczy WYŁĄCZNIE osób z rejestracji hasłem —
  // kto wszedł przez Google, Discorda czy X, ma adres potwierdzony przez
  // dostawcę i `email_confirmed_at` jest już ustawione.
  //
  // Zamiast cichego odesłania na stronę główną (człowiek nie wie, co się stało)
  // pokazujemy dymek z powodem i przyciskiem „wyślij link ponownie".
  if (wymagaPotwierdzenia && !user.email_confirmed_at) {
    return <PotwierdzAdres email={user.email} />;
  }

  return children;
}
