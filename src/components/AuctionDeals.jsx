import { ShoppingBag, ExternalLink, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function AuctionDeals({ type = 'top' }) {
  const [showOthers, setShowOthers] = useState(false);

  // Symulowane dane z "API" - Top 10 (najbardziej trafne)
  const topDeals = [
    { id: 1, platform: 'eBay', condition: 'S (Nowa, Zafoliowana)', price: '22 500 JPY', seller: 'Akiba_Deals', time: 'Kończy się za 2h' },
    { id: 2, platform: 'Mandarake', condition: 'A (Stan idealny)', price: '19 000 JPY', seller: 'Nakano Store', time: 'Kup Teraz' },
    { id: 3, platform: 'AmiAmi', condition: 'B+ (Drobne ślady)', price: '17 800 JPY', seller: 'Pre-owned', time: 'Kup Teraz' },
    { id: 4, platform: 'Yahoo! Auctions', condition: 'C (Brak pudełka)', price: '12 000 JPY', seller: 'hobby_japan', time: 'Licytacja (5 ofert)' },
    { id: 5, platform: 'Mercari JP', condition: 'A (Stan idealny)', price: '19 500 JPY', seller: 'MikuFan99', time: 'Kup Teraz' },
    { id: 6, platform: 'Solaris Japan', condition: 'S (Nowa)', price: '24 000 JPY', seller: 'Solaris', time: 'Kup Teraz' },
    { id: 7, platform: 'eBay', condition: 'B (Kurz)', price: '15 000 JPY', seller: 'US_Seller', time: 'Kończy się za 10h' },
    { id: 8, platform: 'Suruga-ya', condition: 'B (Drobne ślady)', price: '16 500 JPY', seller: 'Surugaya Shizuoka', time: 'Kup Teraz' },
    { id: 9, platform: 'Yahoo! Auctions', condition: 'S (Nowa)', price: '21 000 JPY', seller: 'jp_collect', time: 'Licytacja (1 oferta)' },
    { id: 10, platform: 'Rakuma', condition: 'A (Idealna)', price: '18 000 JPY', seller: 'OtaKing', time: 'Kup Teraz' },
  ];

  // Baza do wygenerowania 40 unikalnych ofert
  const baseOtherDeals = [
    { platform: 'AliExpress', condition: 'Nowa (Bootleg?)', price: 4000, seller: 'China_Toy' },
    { platform: 'Amazon JP', condition: 'Używana', price: 26000, seller: 'Amazon Warehouse' },
    { platform: 'Buyee', condition: 'Proxy', price: 20000, seller: 'Różni' },
    { platform: 'eBay', condition: 'Używana', price: 14500, seller: 'UK_Collector' },
    { platform: 'Neokyo', condition: 'Proxy', price: 18000, seller: 'Różni' },
    { platform: 'Mercari', condition: 'Brak pudełka', price: 11000, seller: 'JP_Seller' },
    { platform: 'ZenMarket', condition: 'Proxy', price: 19500, seller: 'Różni' },
    { platform: 'From Japan', condition: 'Proxy', price: 21000, seller: 'Różni' },
    { platform: 'Nin-Nin Game', condition: 'Używana (B+)', price: 17500, seller: 'Sklep' },
    { platform: 'Hobby-Genki', condition: 'Nowa', price: 22000, seller: 'Sklep' }
  ];

  // Generowanie pełnych 40 ofert
  const otherDeals = Array.from({ length: 40 }).map((_, index) => {
    const base = baseOtherDeals[index % baseOtherDeals.length];
    return {
      id: 11 + index,
      platform: base.platform,
      condition: base.condition,
      price: `${(base.price + (Math.floor(Math.random() * 50) * 100)).toLocaleString('pl-PL')} JPY`,
      seller: `${base.seller}_${Math.floor(Math.random() * 9999)}`
    };
  }).sort((a, b) => a.platform.localeCompare(b.platform)); // Alfabetycznie

  if (type === 'all') {
    return (
      <div className="animate-fade-in" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <button className="btn-secondary" onClick={() => setShowOthers(!showOthers)} style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-shelf)' }}>
            <span style={{ fontWeight: 'bold' }}>Pozostałe oferty (Zgromadzono 40 ofert z rynków wtórnych)</span>
            <ChevronDown size={20} style={{ transform: showOthers ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}/>
          </button>
        </div>

        {showOthers && (
          <div className="other-deals-container" style={{ marginTop: '1rem', background: 'var(--color-bg-shelf)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-glass-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {otherDeals.map(deal => (
                <div key={deal.id} className="other-deal-item" style={{ padding: '12px', borderBottom: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong className="deal-platform-text" style={{ fontSize: '1rem' }}>{deal.platform}</strong>
                    <div className="seller" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>{deal.seller}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="price" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{deal.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="auction-deals animate-fade-in">
      <div className="auction-header">
        <h3><ShoppingBag size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>Aktywne Oferty (Top 10)</h3>
        <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
          <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12}/> Ostatnia weryfikacja: 10 min temu
          </span>
          <span className="live-status"><div className="dot pulse"></div> Na żywo</span>
        </div>
      </div>
      
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Przeskanowaliśmy 50 sklepów. Oto 10 najbardziej trafnych ofert pod względem jakości i ceny.</p>
      
      <div className="deals-list">
        {topDeals.map(deal => (
          <div key={deal.id} className="deal-row">
            <div className="deal-platform">
              <strong>{deal.platform}</strong>
              <span className="seller">Sprzedawca: {deal.seller}</span>
            </div>
            
            <div className="deal-condition">
              <span className="badge">{deal.condition}</span>
            </div>
            
            <div className="deal-time">
              <Clock size={14} /> {deal.time}
            </div>
            
            <div className="deal-action">
              <div className="price">{deal.price}</div>
              <button className="btn-buy" onClick={() => alert(`Ping do API -> Przejście do ${deal.platform} (Link Afiliacyjny)`)}>
                Sprawdź <ExternalLink size={14} style={{marginLeft: '4px'}}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
