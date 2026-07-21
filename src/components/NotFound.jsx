import { Link } from 'react-router-dom';
import { Home, PackageSearch } from 'lucide-react';

// Strona 404 — trasa catch-all. Bez bazy.
export default function NotFound() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '560px', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
      <PackageSearch size={64} style={{ color: 'var(--color-text-highlight)', opacity: 0.7, marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', color: 'var(--color-text-highlight)' }}>404</h1>
      <h2 style={{ margin: '0 0 1rem' }}>Nie znaleziono takiej strony</h2>
      <p style={{ opacity: 0.75, marginBottom: '2rem', lineHeight: 1.6 }}>
        Ta figurka wymknęła się z gabloty. Sprawdź adres lub wróć do bazy — może znajdziesz coś ciekawszego.
      </p>
      <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <Home size={18} /> Wróć do Gabloty
      </Link>
    </div>
  );
}
