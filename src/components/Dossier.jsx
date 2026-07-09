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
        </div>

        {/* Right column: Data and Auctions */}
        <div className="dossier-info-section">
          <div className="dossier-header">
            <h2>{figure.name}</h2>
            <div className="dossier-tags">
              <span className="tag"><Tag size={12}/> {figure.series || 'Vocaloid'}</span>
            </div>
          </div>

          <div className="dossier-meta-grid">
            <div className="meta-card">
              <Building2 size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">
                  Producent 
                  <HelpCircle size={12} style={{marginLeft: '4px', cursor: 'help'}} title="Firma odpowiedzialna za fizyczną produkcję figurki, np. Good Smile Company, Alter."/>
                </span>
                <strong className="meta-value">{figure.manufacturer}</strong>
              </div>
            </div>
            
            <div className="meta-card">
              <Ruler size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">
                  Skala
                  <HelpCircle size={12} style={{marginLeft: '4px', cursor: 'help'}} title="Wielkość fizyczna względem oryginalnej postaci. 1/7 oznacza, że figurka jest 7 razy mniejsza od realnego odpowiednika (zazwyczaj ok. 24 cm)."/>
                </span>
                <strong className="meta-value">{figure.scale}</strong>
              </div>
            </div>
            
            <div className="meta-card">
              <Calendar size={18} className="meta-icon"/>
              <div>
                <span className="meta-label">Data wydania</span>
                <strong className="meta-value">{figure.releaseDate}</strong>
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
            <h3>O figurce</h3>
            <p>
              {figure.description || `Klasyczna, przepięknie wykonana figurka ${figure.name}. 
              Cieszy się ogromnym uznaniem na rynku wtórnym ze względu na jakość detali i ograniczone nakłady produkcyjne.`}
            </p>
          </div>

          <div className="divider"></div>

          <OfficialShops figure={figure} />
          
          <div className="divider"></div>

          <AuctionDeals figure={figure} />
        </div>
      </div>
    </div>
  );
}
