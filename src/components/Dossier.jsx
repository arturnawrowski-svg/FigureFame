import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Building2, Ruler, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import AuctionDeals from './AuctionDeals';
import OfficialShops from './OfficialShops';

// Fallback data for when DB is unavailable
const fallbackFigures = {
  1: {
    id: 1, name: 'Hatsune Miku', japaneseName: '初音ミク', series: 'Vocaloid',
    japaneseSeries: 'ボーカロイド', manufacturer: 'Good Smile Company', scale: '1/7',
    type: 'gotowa figurka kolekcjonerska (PVC)',
    status: 'wydanie archiwalne, obecnie zwykle dostępna tylko na rynku wtórnym',
    originalPrice: '15 000 JPY', image: '/images/official/miku_figure',
    lightClass: 'light-miku',
    additionalInfo: ['Figurka w wersji klasycznej, wyrzeźbiona z niezwykłą dbałością o detale.', 'Jej słynne, turkusowe kucyki (twintails) zostały odtworzone z wykorzystaniem przezroczystych elementów PVC.'],
    marketValue: { average: 'około 15 000 JPY (ok. 400 zł) za egzemplarz w bardzo dobrym stanie.', community: ['okazje zdarzają się od 300 USD', 'typowe oferty mieszczą się w okolicach 400 USD'] },
    whereToSearch: ['Solaris Japan', 'Mandarake', 'Yahoo! Auctions Japan'],
    strategy: ['ustawić alerty na Yahoo Auctions Japan', 'korzystać z pośrednika typu Neokyo lub Buyee']
  }
};

export default function Dossier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [figure, setFigure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFigure() {
      try {
        const { data, error } = await supabase
          .from('figures')
          .select('*')
          .eq('id', parseInt(id))
          .single();

        if (error) throw error;

        if (data) {
          const isHttp = data.official_image_url && data.official_image_url.startsWith('http');
          setFigure({
            ...data,
            japaneseName: data.japanese_name,
            japaneseSeries: data.japanese_series,
            originalPrice: data.original_price,
            image: isHttp ? data.official_image_url : `/images/official/${data.official_image_url}`,
            isHttpImage: isHttp,
            lightClass: data.light_class,
            additionalInfo: Array.isArray(data.additional_info) ? data.additional_info : (data.additional_info ? String(data.additional_info).split('\n') : []),
            marketValue: typeof data.market_value === 'string' ? { average: data.market_value } : data.market_value,
            whereToSearch: Array.isArray(data.where_to_search) ? data.where_to_search : (data.where_to_search ? String(data.where_to_search).split('\n') : []),
            strategy: Array.isArray(data.strategy) ? data.strategy : (data.strategy ? String(data.strategy).split('\n') : [])
          });
        }
      } catch (err) {
        console.warn('Nie udało się pobrać z Supabase, próbuję fallback.', err);
        const fallback = fallbackFigures[parseInt(id)];
        if (fallback) setFigure(fallback);
      } finally {
        setLoading(false);
      }
    }

    fetchFigure();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Ładowanie dossier...</div>;
  if (!figure) return <div style={{ textAlign: 'center', padding: '4rem' }}>Nie znaleziono figurki o ID: {id}</div>;

  return (
    <div className="dossier-view animate-fade-in">
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <div className="dossier-layout">
        {/* Left column: Image */}
        <div className="dossier-image-section">
          <div className={`ambient-light ${figure.lightClass} dossier-ambient`}></div>
          {figure.image && figure.image.startsWith('http') ? (
            <img src={figure.image} alt={figure.name} className="dossier-main-img" />
          ) : (
            <picture>
              <source srcSet={`${figure.image}.avif`} type="image/avif" />
              <source srcSet={`${figure.image}.webp`} type="image/webp" />
              <img src={`${figure.image}.jpg`} alt={figure.name} className="dossier-main-img" />
            </picture>
          )}
          
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
                <strong className="meta-value">{figure.originalPrice ? (figure.originalPrice.replace('¥', '').trim() + (figure.originalPrice.includes('JPY') ? '' : ' JPY')) : 'Brak danych'}</strong>
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
              <li><strong>Średnia wartość:</strong> {figure.marketValue?.average ? (figure.marketValue.average.replace('¥', '').trim() + (figure.marketValue.average.includes('JPY') ? '' : ' JPY')) : 'Brak danych'}</li>
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
