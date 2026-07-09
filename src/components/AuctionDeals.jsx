import { ShoppingBag, ArrowRight, ExternalLink, Clock } from 'lucide-react';

export default function AuctionDeals({ figure }) {
  // Symulowane dane z "API"
  const deals = [
    { id: 1, platform: 'eBay', condition: 'S (Nowa, Zafoliowana)', price: '22 500 JPY', seller: 'Akiba_Deals', time: 'Kończy się za 2h' },
    { id: 2, platform: 'Mandarake', condition: 'A (Stan idealny)', price: '19 000 JPY', seller: 'Nakano Store', time: 'Kup Teraz' },
    { id: 3, platform: 'AmiAmi', condition: 'B+ (Drobne ślady na pudełku)', price: '17 800 JPY', seller: 'Pre-owned Section', time: 'Kup Teraz' },
    { id: 4, platform: 'Yahoo! Auctions', condition: 'C (Brak pudełka)', price: '12 000 JPY', seller: 'hobby_japan', time: 'Licytacja (5 ofert)' },
  ];

  return (
    <div className="auction-deals animate-fade-in">
      <div className="auction-header">
        <h3><ShoppingBag size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>Aktywne Oferty i Aukcje</h3>
        <span className="live-status"><div className="dot pulse"></div> Na żywo</span>
      </div>
      
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Znaleźliśmy 4 najlepsze oferty dla {figure.name} w zweryfikowanych sklepach.</p>
      
      <div className="deals-list">
        {deals.map(deal => (
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
              <button className="btn-buy" onClick={() => alert(`Przejście do ${deal.platform} (Link Afiliacyjny)`)}>
                Sprawdź <ExternalLink size={14} style={{marginLeft: '4px'}}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
