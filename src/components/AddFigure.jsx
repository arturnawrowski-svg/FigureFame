import { ArrowLeft, Save, User, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function AddFigure() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    manufacturer: '',
    scale: '1/7',
    type: 'Prepainted',
    releaseDate: '',
    originalPrice: '',
    additionalInfo: '',
    marketValueAverage: '',
    whereToSearch: '',
    strategy: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('figures').insert({
        name: formData.name,
        series: formData.series || null,
        manufacturer: formData.manufacturer || null,
        scale: formData.scale || null,
        type: formData.type || null,
        release_date: formData.releaseDate || null,
        status: 'PENDING',
        submitted_by: user?.id || null,
        additional_info: formData.additionalInfo ? formData.additionalInfo.split('\n').filter(s => s.trim() !== '') : null,
        where_to_search: formData.whereToSearch ? formData.whereToSearch.split('\n').filter(s => s.trim() !== '') : null,
        strategy: formData.strategy ? formData.strategy.split('\n').filter(s => s.trim() !== '') : null,
        market_value: formData.marketValueAverage ? { average: formData.marketValueAverage } : null
      });

      if (error) throw error;

      alert(`Dziękujemy! Figurka "${formData.name}" została wysłana i oczekuje na zatwierdzenie (PENDING). Backend automatycznie uzupełni resztę danych i zdjęcia!`);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd podczas dodawania figurki: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-figure-view add-form-container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', borderRadius: '24px' }}>
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Dodaj nową figurkę do Gabloty</h2>
          <p style={{ opacity: 0.7 }}>Wypełnij formularz, aby dodać pozycję do katalogu. Oferty zostaną znalezione automatycznie przez nasz serwer.</p>
        </div>
        <div style={{ background: 'rgba(46, 213, 115, 0.1)', color: '#2ed573', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <User size={18}/> Zalogowano: {user?.email}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Nazwa postaci (Wymagane)</label>
            <input required type="text" className="form-input" placeholder="np. Hatsune Miku, Super Sonico" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Seria / Anime (Opcjonalne)</label>
            <input type="text" className="form-input" placeholder="np. Vocaloid, SoniAni" value={formData.series} onChange={(e) => setFormData({...formData, series: e.target.value})} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Producent (Opcjonalne)</label>
            <input type="text" className="form-input" placeholder="np. Good Smile, Alter" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Skala</label>
            <select className="form-input" value={formData.scale} onChange={(e) => setFormData({...formData, scale: e.target.value})}>
              <option>1/8</option>
              <option>1/7</option>
              <option>1/6</option>
              <option>1/4 (Bunny)</option>
              <option>Non-scale (Nendoroid)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Typ</label>
            <select className="form-input" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
              <option>Prepainted</option>
              <option>Action Figure</option>
              <option>Trading Figure</option>
              <option>Model Kit</option>
              <option>Prize Figure</option>
              <option>Resin Kit</option>
              <option>Nendoroid</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Data Wydania (Opcjonalne)</label>
            <input type="month" className="form-input" value={formData.releaseDate} onChange={(e) => setFormData({...formData, releaseDate: e.target.value})} />
          </div>
        </div>

        <div className="divider" style={{ margin: '1rem 0' }}></div>
        <h3 style={{ margin: 0 }}>Encyklopedia (Opcjonalne, ale zalecane)</h3>
        <p style={{ opacity: 0.7, marginTop: 0 }}>Możesz dodać własne opisy i strategie dla tej figurki. Każda linijka w polu to jeden punkt widoczny później na liście w encyklopedii.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Dodatkowe informacje (Linijka po linijce)</label>
            <textarea className="form-input" rows="4" placeholder="np. Figurka w wersji klasycznej...&#10;Wykorzystano przezroczyste elementy..." value={formData.additionalInfo} onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}></textarea>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Gdzie szukać (Linijka po linijce)</label>
            <textarea className="form-input" rows="4" placeholder="np. Solaris Japan&#10;Mandarake&#10;Yahoo Auctions" value={formData.whereToSearch} onChange={(e) => setFormData({...formData, whereToSearch: e.target.value})}></textarea>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Strategia zakupowa (Linijka po linijce)</label>
            <textarea className="form-input" rows="4" placeholder="np. Ustaw alerty na Yahoo Auctions&#10;Korzystaj z Neokyo" value={formData.strategy} onChange={(e) => setFormData({...formData, strategy: e.target.value})}></textarea>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Wartość Rynkowa (Opisówka - jedno zdanie)</label>
            <textarea className="form-input" rows="4" placeholder="np. około 15 000 JPY za egzemplarz w bardzo dobrym stanie." value={formData.marketValueAverage} onChange={(e) => setFormData({...formData, marketValueAverage: e.target.value})}></textarea>
          </div>
        </div>

        <div className="divider" style={{ margin: '1rem 0' }}></div>

        <div className="info-box" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '16px' }}>
          <div className="form-info-box">
            <Info className="info-icon" size={24} />
            <div>
              <h4>Ceny i oferty (Automatyzacja)</h4>
              <p>Nie musisz ręcznie dodawać ofert ze sklepów. Nasz inteligentny system agregatora (Backend), bazując na wprowadzonych przez Ciebie danych (Nazwa, Seria, Producent), w nocy automatycznie przeszuka internet, aukcje, sklepy internetowe, fora kolekcjonerskie i inne globalne rynki. O poranku system zaktualizuje profil figurki o wyselekcjonowane, interesujące oferty, informacje oraz zawartość multimedialną.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" disabled={!formData.name.trim() || isSubmitting} className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', opacity: (!formData.name.trim() || isSubmitting) ? 0.5 : 1, cursor: (!formData.name.trim() || isSubmitting) ? 'not-allowed' : 'pointer' }}>
            <Save size={20} /> {isSubmitting ? 'Wysyłanie...' : 'Zapisz do weryfikacji'}
          </button>
        </div>
      </form>
    </div>
  );
}
