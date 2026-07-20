import { Store, ArrowRight } from 'lucide-react';

export default function OfficialShops({ figure }) {
  const shops = [
    { name: 'Good Smile Global', type: 'Oficjalny Sklep' },
    { name: 'AmiAmi', type: 'Partner' },
    { name: 'Solaris Japan', type: 'Partner' },
    { name: 'Nin-Nin Game', type: 'Partner' },
    { name: 'HobbySearch', type: 'Partner' },
    { name: 'Goods Republic', type: 'Partner' }
  ];

  return (
    <div className="official-shops animate-fade-in">
      <div className="shops-header">
        <h3><Store size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>Oficjalna Dystrybucja i Sklepy Partnerskie</h3>
      </div>
      
      <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>Sprawdź dostępność {figure.name} w zweryfikowanych sklepach (katalog jak na MyFigureCollection).</p>
      
      <div className="shops-grid">
        {shops.map(shop => (
          <button key={shop.name} className="shop-btn" onClick={() => alert(`Przejście do sklepu: ${shop.name} (Link Afiliacyjny)`)}>
            <div>
              <div className="shop-name">{shop.name}</div>
              <div className="shop-type">{shop.type}</div>
            </div>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
