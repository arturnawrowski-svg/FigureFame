import { ShoppingBag, ExternalLink, RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// AuctionDeals (Etap 3) — realne oferty z tabeli price_snapshots.
// Dane zbiera endpoint /api/refresh-prices (eBay Browse API). Dopóki nic nie
// zebrano — uczciwy pusty stan (bez zmyślonych ofert).
//   type="top" → najtańsze oferty; type="all" → rozwijana reszta.
// ============================================================================

function fmtPrice(v, currency) {
  if (v == null) return 'Brak danych';
  const num = Number(v).toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  return `${num} ${currency || ''}`.trim();
}

export default function AuctionDeals({ figure, type = 'top' }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(figure?.last_price_check || null);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!figure?.id) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('price_snapshots')
          .select('*')
          .eq('figure_id', figure.id)
          .order('price_value', { ascending: true });
        if (error) throw error;
        if (active) setDeals(data || []);
      } catch (err) {
        console.warn('Nie udało się pobrać ofert:', err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [figure?.id]);

  const top = deals.slice(0, 10);
  const others = deals.slice(10);

  // --- tryb "all": rozwijana reszta ofert ---
  if (type === 'all') {
    if (others.length === 0) return null;
    return (
      <div className="animate-fade-in" style={{ width: '100%' }}>
        <button className="btn-secondary" onClick={() => setShowOthers(!showOthers)} style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-shelf)' }}>
          <span style={{ fontWeight: 'bold' }}>Pozostałe oferty ({others.length})</span>
          <ChevronDown size={20} style={{ transform: showOthers ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
        </button>
        {showOthers && (
          <div style={{ marginTop: '1rem', background: 'var(--color-bg-shelf)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-glass-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {others.map((deal) => (
                <a key={deal.id} href={deal.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', background: 'var(--color-bg-obsidian)', padding: '14px', borderRadius: '12px', border: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.95rem' }}>{deal.platform}</strong>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.condition || '—'}{deal.seller ? ` • ${deal.seller}` : ''}</div>
                  </div>
                  <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtPrice(deal.price_value, deal.currency)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- tryb "top" ---
  return (
    <div className="auction-deals animate-fade-in">
      <div className="auction-header">
        <h3><ShoppingBag size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />Aktualne oferty</h3>
        {lastCheck && (
          <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} /> Sprawdzono: {new Date(lastCheck).toLocaleDateString('pl-PL')}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ opacity: 0.7, padding: '1rem 0' }}>Ładowanie ofert...</p>
      ) : top.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--color-glass-bg)', borderRadius: '12px', border: '1px dashed var(--color-glass-border)' }}>
          <Clock size={32} style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, fontWeight: 'bold' }}>Zbieramy oferty dla tej figurki</p>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.65, fontSize: '0.9rem' }}>Price Watch (realne ceny z rynku) jest w przygotowaniu.</p>
        </div>
      ) : (
        <>
          <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Najlepsze {top.length} ofert(y) posortowane od najtańszej.</p>
          <div className="deals-list">
            {top.map((deal) => (
              <div key={deal.id} className="deal-row">
                <div className="deal-platform">
                  <strong>{deal.platform}</strong>
                  {deal.seller && <span className="seller">Sprzedawca: {deal.seller}</span>}
                </div>
                <div className="deal-condition">
                  {deal.condition && <span className="badge">{deal.condition}</span>}
                </div>
                <div className="deal-action">
                  <div className="price">{fmtPrice(deal.price_value, deal.currency)}</div>
                  <a className="btn-buy" href={deal.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    Sprawdź <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
