import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Tag, Building2, Ruler, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getImageUrl } from '../lib/getImageUrl';
import { prawaDoZdjecia } from '../lib/prawaDoZdjecia';
import { looksLikeShortCode } from '../lib/figureIdentity';
import AuctionDeals from './AuctionDeals';
import OfficialShops from './OfficialShops';
import AskAI from './AskAI';
import BootlegRisk from './BootlegRisk';

// Danych zastępczych „na sztywno" tu nie ma świadomie — stała, która tu stała,
// zawierała render AI i zmyśloną wartość rynkową. Gdy baza milczy, mówimy to
// wprost, zamiast pokazywać wymyśloną figurkę.

// Czy tekst z adresu to identyfikator techniczny (stary link /dossier/<uuid>).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Dossier() {
  const { key } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [figure, setFigure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFigure() {
      try {
        // Jeden adres, trzy sposoby trafienia w figurkę:
        //   • czytelny adres      /f/izumi-konata-clayz-1-8   (opisy pod filmami, Google)
        //   • krótki kod          /f/7K2M                     (wypalony w obrazie shorta)
        //   • identyfikator       /dossier/39acbb1a-...       (linki sprzed zmiany)
        let query = supabase.from('figures').select('*');
        if (UUID.test(key)) query = query.eq('id', key);
        else if (looksLikeShortCode(key)) query = query.eq('short_code', key.toUpperCase());
        else query = query.eq('slug', key);

        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (!data) { setFigure(null); return; }

        // Zawsze sprowadzamy odwiedzającego na adres kanoniczny. Dzięki temu
        // wyszukiwarki widzą jedną stronę zamiast trzech kopii tej samej treści,
        // a udostępniony link zawsze wygląda tak samo.
        if (data.slug && key !== data.slug) {
          navigate(`/f/${data.slug}`, { replace: true });
          return;
        }

        setFigure({
          ...data,
          japaneseName: data.japanese_name,
          japaneseSeries: data.japanese_series,
          originalPrice: data.original_price,
          image: getImageUrl(data.official_image_url),
          lightClass: data.light_class,
          additionalInfo: Array.isArray(data.additional_info) ? data.additional_info : (data.additional_info ? String(data.additional_info).split('\n') : []),
          marketValue: typeof data.market_value === 'string' ? { average: data.market_value } : data.market_value,
          whereToSearch: Array.isArray(data.where_to_search) ? data.where_to_search : (data.where_to_search ? String(data.where_to_search).split('\n') : []),
          strategy: Array.isArray(data.strategy) ? data.strategy : (data.strategy ? String(data.strategy).split('\n') : [])
        });
      } catch (err) {
        console.warn('Nie udało się pobrać figurki z bazy.', err);
        setFigure(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFigure();
  }, [key, navigate]);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Ładowanie dossier...</div>;
  if (!figure) {
    // Ktoś przyszedł tu z linku pod filmem — nie zostawiamy go z samym błędem.
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Nie znaleziono tej figurki</h2>
        <p style={{ marginBottom: '2rem' }}>
          Adres <code>{location.pathname}</code> nie prowadzi do żadnej pozycji w naszej bazie.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>Przejdź do Gabloty</button>
      </div>
    );
  }

  return (
    <div className="dossier-view animate-fade-in">
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <div className="dossier-layout">
        {/* Left column: Image */}
        <div className="dossier-image-section">
          <div className={`ambient-light ${figure.lightClass} dossier-ambient`}></div>
          <img
            src={figure.image?.startsWith('http') || /\.(png|jpe?g|webp|avif)$/i.test(figure.image || '') ? figure.image : `${figure.image}.png`}
            alt={figure.name}
            className="dossier-main-img"
          />
          {/* Podpis praw — pod zdjęciem, nie na nim: w dossier zdjęcie jest
              duże i oglądane uważnie, więc napis na nim tylko by przeszkadzał. */}
          {prawaDoZdjecia(figure) && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', opacity: 0.55, textAlign: 'center' }}>
              {prawaDoZdjecia(figure)}
            </p>
          )}

          <div style={{ marginTop: '3rem', width: '100%' }}>
            <AuctionDeals figure={figure} />
          </div>
        </div>

        {/* Right column: Data and Auctions */}
        <div className="dossier-info-section">
          <div className="dossier-header">
            <h2>{figure.name} <span className="japanese-text" style={{ opacity: 0.7, fontSize: '0.8em' }}>({figure.japaneseName})</span></h2>
            <div className="dossier-tags">
              <span className="tag"><Tag size={12}/> {figure.series} {figure.japaneseSeries && <span className="japanese-text" style={{opacity: 0.8}}>({figure.japaneseSeries})</span>}</span>
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

          <BootlegRisk figure={figure} />

          <AskAI figure={figure} />

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
