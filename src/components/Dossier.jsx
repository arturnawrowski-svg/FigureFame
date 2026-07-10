import { ArrowLeft, Tag, Calendar, Building2, Ruler, HelpCircle } from 'lucide-react';
import AuctionDeals from './AuctionDeals';
import OfficialShops from './OfficialShops';

export default function Dossier({ figure, onBack }) {
  return (
    <div className="dossier-view animate-fade-in">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <div className="dossier-layout">
        {/* Left column: Image */}
        <div className="dossier-image-section">
          <div className={`ambient-light ${figure.lightClass} dossier-ambient`}></div>
          <img src={figure.image} alt={figure.name} className="dossier-main-img" />
          
          <div style={{ marginTop: '3rem', width: '100%' }}>
            <AuctionDeals figure={figure} />
          </div>
        </div>

        {/* Right column: Data and Auctions */}
        <div className="dossier-info-section">
          <div className="dossier-header">
            <h2>{figure.name} <span style={{ opacity: 0.7, fontSize: '0.8em' }}>({figure.japaneseName})</span></h2>
            <div className="dossier-tags">
              <span className="tag"><Tag size={12}/> {figure.series} ({figure.japaneseSeries})</span>
            </div>
          </div>

          <div className="dossier-meta-grid">
            <div className="meta-card">
              <Building2 size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">
                  Producent 
                  <HelpCircle size={12} style={{marginLeft: '4px', cursor: 'help'}} title="Firma odpowiedzialna za fizyczną produkcję figurki."/>
                </span>
                <strong className="meta-value">{figure.manufacturer}</strong>
              </div>
            </div>
            
            <div className="meta-card">
              <Ruler size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">
                  Skala
                  <HelpCircle size={12} style={{marginLeft: '4px', cursor: 'help'}} title="Wielkość fizyczna względem oryginalnej postaci."/>
                </span>
                <strong className="meta-value">{figure.scale}</strong>
              </div>
            </div>

            <div className="meta-card highlight">
              <Tag size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">Oryginalna cena</span>
                <strong className="meta-value">{figure.originalPrice}</strong>
              </div>
            </div>
          </div>

          <div className="dossier-description">
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-highlight)' }}>To jest:</h3>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              <li><strong>Postać:</strong> {figure.name} ({figure.japaneseName})</li>
              <li><strong>Seria:</strong> {figure.series} ({figure.japaneseSeries})</li>
              <li><strong>Producent figurki:</strong> {figure.manufacturer}</li>
              <li><strong>Skala:</strong> {figure.scale}</li>
              <li><strong>Typ:</strong> {figure.type}</li>
              <li><strong>Status:</strong> {figure.status}</li>
            </ul>

            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-highlight)' }}>Kilka dodatkowych informacji:</h3>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              {figure.additionalInfo?.map((info, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{info}</li>
              ))}
            </ul>
          </div>

          <div className="dossier-description">
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-highlight)' }}>Aktualna wartość rynkowa</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Według serwisów śledzących ceny kolekcjonerskie:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              <li><strong>średnia wartość:</strong> {figure.marketValue?.average}</li>
            </ul>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Społeczność kolekcjonerów podaje, że:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              {figure.marketValue?.community?.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          <div className="dossier-description">
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-highlight)' }}>Gdzie jej szukać</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Największe szanse masz na:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              {figure.whereToSearch?.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>

          <div className="dossier-description" style={{ background: 'var(--color-glass-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-glass-border)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-highlight)' }}>Co bym zrobił na Twoim miejscu</h3>
            <ol style={{ paddingLeft: '1.5rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
              {figure.strategy?.map((s, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>
              ))}
            </ol>
          </div>

          <div className="divider"></div>

          <OfficialShops figure={figure} />
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <AuctionDeals figure={figure} type="all" />
      </div>
    </div>
  );
}
