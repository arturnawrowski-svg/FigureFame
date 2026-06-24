import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function AffiliateLinks({ figure }) {
  const shops = [
    { name: 'Mandarake', desc: 'Rzadkie i zweryfikowane' },
    { name: 'AmiAmi', desc: 'Największy wybór' },
    { name: 'Solaris Japan', desc: 'Out of print' },
    { name: 'Buyee', desc: 'Yahoo! Auctions proxy' },
    { name: 'eBay', desc: 'Top Rated Japan' }
  ];

  return (
    <div className="affiliate-section animate-fade-in">
      <h3><ShoppingBag size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }}/>Kup oryginał: {figure.name}</h3>
      <p style={{ opacity: 0.8 }}>Zdobądź fizyczną wersję tej figurki bezpośrednio z zaufanych japońskich platform.</p>
      
      <div className="affiliate-grid">
        {shops.map(shop => (
          <a href="#" key={shop.name} className="affiliate-btn">
            <div>
              <div style={{ fontWeight: 'bold' }}>{shop.name}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{shop.desc}</div>
            </div>
            <ArrowRight size={16} />
          </a>
        ))}
      </div>
    </div>
  );
}
