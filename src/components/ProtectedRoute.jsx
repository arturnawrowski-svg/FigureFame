import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Strażnik tras (Etap 1). Chroni ścieżki wymagające logowania / uprawnień admina.
//   <ProtectedRoute><AddFigure/></ProtectedRoute>                → tylko zalogowani
//   <ProtectedRoute requireAdmin><AdminDashboard/></ProtectedRoute> → tylko admin
export default function ProtectedRoute({ children, requireAdmin = false }) {
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

  return children;
}
