import { Store, ExternalLink, AlertTriangle } from 'lucide-react';
import { STORE_GROUPS } from '../lib/affiliateStores';

// ============================================================================
// OfficialShops (Etap 3) — „Gdzie kupić": kurowane, pogrupowane deep-linki
// wyszukiwania danej figurki. Realne linki (nie alert), gotowe pod afiliację
// (ID w src/lib/affiliateStores.js). Kurowane 8–12 sklepów, nie farma linków.
// ============================================================================

export default function OfficialShops({ figure }) {
  return (
    <div className="official-shops animate-fade-in">
      <div className="shops-header">
        <h3><Store size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} />Gdzie kupić</h3>
      </div>
      <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
        Wyszukaj <strong>{figure.name}</strong> w zaufanych sklepach i na rynku wtórnym:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {STORE_GROUPS.map(({ group, stores, warn }) => (
          <div key={group}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '0.6rem', color: warn ? '#ffa502' : 'inherit' }}>
              {warn && <AlertTriangle size={14} />} {group}
            </div>
            <div className="shops-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {stores.map((s) => (
                <a
                  key={s.id}
                  href={s.build(figure)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="shop-btn"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit', border: s.warn ? '1px solid #ffa50255' : undefined }}
                  title={s.warn ? 'Uwaga: wysokie ryzyko podróbek' : `Szukaj na ${s.name}`}
                >
                  <div>
                    <div className="shop-name">{s.name}</div>
                    <div className="shop-type" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{s.warn ? '⚠ ryzyko podróbek' : 'Szukaj'}</div>
                  </div>
                  <ExternalLink size={16} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '1.25rem' }}>
        Część linków może być powiązana z programami afiliacyjnymi. Ceny i dostępność weryfikuj w sklepie.
      </p>
    </div>
  );
}
