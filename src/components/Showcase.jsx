import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const generateGlowColor = (name) => {
  const colors = ['#00d2d3', '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff3f34'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const fallbackFiguresData = [
  {
    id: 1,
    name: 'Hatsune Miku',
    japaneseName: '初音ミク',
    series: 'Vocaloid',
    japaneseSeries: 'ボーカロイド',
    manufacturer: 'Good Smile Company',
    scale: '1/7',
    type: 'gotowa figurka kolekcjonerska (PVC)',
    status: 'wydanie archiwalne, obecnie zwykle dostępna tylko na rynku wtórnym',
    originalPrice: '15 000 JPY',
    image: '/images/official/miku_figure', // base name without extension
    lightClass: 'light-miku',
    additionalInfo: [
      'Figurka w wersji klasycznej, wyrzeźbiona z niezwykłą dbałością o detale.',
      'Jej słynne, turkusowe kucyki (twintails) zostały odtworzone z wykorzystaniem przezroczystych elementów PVC.'
    ],
    marketValue: {
      average: 'około 15 000 JPY (ok. 400 zł) za egzemplarz w bardzo dobrym stanie.',
      community: [
        'okazje zdarzają się od 300 USD',
        'typowe oferty mieszczą się w okolicach 400 USD'
      ]
    },
    whereToSearch: [
      'Solaris Japan',
      'Mandarake',
      'Yahoo! Auctions Japan'
    ],
    strategy: [
      'ustawić alerty na Yahoo Auctions Japan',
      'korzystać z pośrednika typu Neokyo lub Buyee'
    ]
  },
  {
    id: 2,
    name: 'Super Sonico',
    japaneseName: 'すーぱーそに子',
    series: 'Nitroplus',
    japaneseSeries: 'ニトロプラス',
    manufacturer: 'Alter',
    scale: '1/7',
    type: 'gotowa figurka kolekcjonerska (PVC)',
    status: 'wydanie archiwalne, obecnie zwykle dostępna tylko na rynku wtórnym',
    originalPrice: '18 500 JPY',
    image: '/images/official/sonico_figure',
    lightClass: 'light-sonico',
    additionalInfo: [
      'Zjawiskowa figurka wirtualnej idolki w letnim stroju z zarzuconą kurtką.',
      'Gra cieni na skórze postaci jest po prostu zdumiewająca. Skala 1/7 pozwala na imponującą prezencję na półce.'
    ],
    marketValue: {
      average: 'około 20 000 JPY (ok. 530 zł) za egzemplarz w bardzo dobrym stanie.',
      community: [
        'okazje zdarzają się od 150 USD',
        'typowe oferty mieszczą się w okolicach 200-250 USD'
      ]
    },
    whereToSearch: [
      'Solaris Japan',
      'AmiAmi Pre-owned',
      'Mandarake'
    ],
    strategy: [
      'obserwować AmiAmi Pre-owned',
      'ustawić alert na Mandarake'
    ]
  },
  {
    id: 3,
    name: 'Miyuki Sone',
    japaneseName: '曾根 美雪',
    series: 'Kimi to Kanojo to Kanojo no Koi',
    japaneseSeries: '君と彼女と彼女の恋。',
    manufacturer: 'Griffon Enterprises',
    scale: '1/8',
    type: 'gotowa figurka kolekcjonerska (PVC)',
    status: 'wydanie archiwalne ("Released"), obecnie zwykle dostępna tylko na rynku wtórnym.',
    originalPrice: '7 250 JPY',
    image: '/images/official/miyuki_figure',
    lightClass: 'light-sonico',
    additionalInfo: [
      'Jest to figurka pochodząca z japońskiej gry visual novel dla dorosłych (18+), choć sama figurka nie przedstawia żadnych treści erotycznych.',
      'Griffon Enterprises zakończyło działalność wiele lat temu, dlatego oryginały są obecnie kolekcjonerskie.',
      'Cena na zrzucie (7250 JPY) była ceną archiwalną sklepu AmiAmi z okresu sprzedaży. Dzisiaj ceny zależą od stanu i mogą być zarówno niższe, jak i znacznie wyższe.'
    ],
    marketValue: {
      average: 'około 170 000 JPY (ok. 4300–4500 zł) za egzemplarz w bardzo dobrym stanie, choć ceny mocno się wahają.',
      community: [
        'okazje zdarzają się od 400–600 USD,',
        'typowe oferty mieszczą się w okolicach 700–1500 USD,',
        'najładniejsze egzemplarze bywają jeszcze droższe.'
      ]
    },
    whereToSearch: [
      'Solaris Japan – obecnie wyprzedana, ale warto obserwować.',
      'HobbySearch (1999.co.jp) – archiwalna karta produktu.',
      'HLJ – produkt wycofany.',
      'Yahoo! Auctions Japan',
      'Mercari Japan',
      'Suruga-ya',
      'Mandarake',
      'MyFigureCollection (ogłoszenia kolekcjonerów)',
      'eBay (trzeba bardzo uważać na podróbki)'
    ],
    strategy: [
      'Z uwagi na to że figurka jest rzadka, warto ustawić powiadomienia na Yahoo Auctions oraz Mercari.',
      'Nie przepłacaj na eBay, ceny bywają tam znacznie zawyżone (nawet o 100%).',
      'Szukaj ofert od zaufanych użytkowników na MyFigureCollection.'
    ]
  }
];

export default function Showcase() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [figures, setFigures] = useState(fallbackFiguresData);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scrollLeftBtn = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -368, behavior: 'smooth' });
    }
  };

  const scrollRightBtn = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 368, behavior: 'smooth' });
    }
  };

  // Usunięto ciężką pętlę requestAnimationFrame, animacja odbywa się przez CSS

  useEffect(() => {
    async function fetchFigures() {
      try {
        const { data, error } = await supabase
          .from('figures')
          .select('*')
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          const mappedData = data.map(fig => {
            const isHttp = fig.official_image_url && fig.official_image_url.startsWith('http');
            return {
              ...fig,
              japaneseName: fig.japanese_name,
              japaneseSeries: fig.japanese_series,
              originalPrice: fig.original_price,
              image: isHttp ? fig.official_image_url : `/images/${fig.official_image_url}`,
              isHttpImage: isHttp,
              lightClass: fig.light_class,
              additionalInfo: Array.isArray(fig.additional_info) ? fig.additional_info : (fig.additional_info ? String(fig.additional_info).split('\n') : []),
              marketValue: typeof fig.market_value === 'string' ? { average: fig.market_value } : fig.market_value,
              whereToSearch: Array.isArray(fig.where_to_search) ? fig.where_to_search : (fig.where_to_search ? String(fig.where_to_search).split('\n') : []),
              strategy: Array.isArray(fig.strategy) ? fig.strategy : (fig.strategy ? String(fig.strategy).split('\n') : [])
            };
          });
          setFigures(mappedData);
        }
      } catch (err) {
        console.warn('Nie udało się pobrać z Supabase, używam danych lokalnych.', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFigures();
  }, []);

  const filteredFigures = figures.filter(fig => 
    fig.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    fig.series?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="showcase-container animate-fade-in">
      <div className="search-bar-wrapper">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Wyszukaj po nazwie, serii lub tagach..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>Ładowanie bazy figurek...</div>
      ) : (
        <div 
          className="showcase-wrapper" 
          onMouseEnter={() => setIsHovered(true)} 
          onMouseLeave={() => setIsHovered(false)}
        >
          {searchTerm !== '' && (
            <button 
              onClick={scrollLeftBtn} 
              style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', zIndex: 100, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '10px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ChevronLeft size={30} />
            </button>
          )}

          <div className={searchTerm === '' ? 'showcase-viewport' : 'showcase-grid'} ref={sliderRef} style={{ perspective: '1000px' }}>
            <div className={searchTerm === '' ? `showcase-track ${isHovered ? 'paused' : ''}` : 'showcase-track-static'} style={{ display: 'flex', gap: '3rem' }}>
              {(searchTerm === '' ? [...filteredFigures, ...filteredFigures] : filteredFigures).map((fig, index) => (
                <div 
                  key={`${fig.id}-${index}`} 
                  className="figure-card"
                >
                  <div className="figure-name-badge">{fig.name}</div>
                  <div className={`ambient-light ${fig.lightClass || ''}`} style={!fig.lightClass ? { background: generateGlowColor(fig.name) } : {}}></div>
                  <div className="figure-image-container">
                    {fig.isHttpImage ? (
                      <img src={fig.image} alt={fig.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <img src={`${fig.image}.png`} alt={fig.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    )}
                  </div>
                  <div className="hover-panel">
                  <div className="market-value">
                    <span>Najlepsza oferta:</span>
                    <strong>~ {fig.originalPrice ? (fig.originalPrice.replace('¥', '').trim() + (fig.originalPrice.includes('JPY') ? '' : ' JPY')) : 'Brak danych'}</strong>
                  </div>
                  <button className="btn-primary" onClick={() => navigate(`/dossier/${fig.id}`)} style={{ width: '100%', marginTop: '1rem' }}>
                    Szczegóły i Oferty <ArrowRight size={16} />
                  </button>
                </div>
                </div>
              ))}
            </div>
            {filteredFigures.length === 0 && (
              <div className="no-results">
                <p>Nie znaleziono figurek pasujących do "{searchTerm}".</p>
              </div>
            )}
          </div>

          {searchTerm !== '' && (
            <button 
              onClick={scrollRightBtn} 
              style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', zIndex: 100, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '10px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ChevronRight size={30} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
