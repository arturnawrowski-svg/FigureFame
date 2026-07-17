import { ArrowLeft, Save, User, Info } from 'lucide-react';
import { useState } from 'react';

import { supabase } from '../lib/supabaseClient';

export default function AddFigure({ onBack, user }) {
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    manufacturer: '',
    scale: '1/7',
    releaseDate: '',
    originalPrice: '',
    description: ''
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
        status: 'PENDING',
        submitted_by: user?.id || null
      });

      if (error) throw error;

      alert(`Dziękujemy! Figurka "${formData.name}" została wysłana i oczekuje na zatwierdzenie (PENDING). Backend automatycznie uzupełni resztę danych i zdjęcia!`);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd podczas dodawania figurki: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-figure-view add-form-container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', borderRadius: '24px' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
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
            <label style={{ fontWeight: 'bold', opacity: 0.9 }}>Data Wydania (Opcjonalne)</label>
            <input type="month" className="form-input" value={formData.releaseDate} onChange={(e) => setFormData({...formData, releaseDate: e.target.value})} />
          </div>
        </div>

        <div style={{ padding: '1rem', border: '1px solid rgba(46, 213, 115, 0.3)', borderRadius: '12px', textAlign: 'center', background: 'rgba(46, 213, 115, 0.05)' }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#2ed573' }}>Zdjęcia i Encyklopedia</h4>
          <p style={{ opacity: 0.7, margin: 0, fontSize: '0.9rem' }}>Nasz system backendowy samodzielnie pobierze oficjalne Stock Photo oraz detale po zatwierdzeniu wpisu!</p>
        </div>

        <div className="divider" style={{ margin: '1rem 0' }}></div>

        <div className="info-box" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '16px' }}>
          <Info size={32} style={{ color: '#ffb142', flexShrink: 0 }}/>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            <strong>Ceny i oferty:</strong> Zauważ, że nie dodajesz tu żadnych ofert ze sklepów. System Agregatora (Backend) sam na podstawie Nazwy, Serii i Producenta przeczesze w nocy 50 sklepów z Japonii i rano automatycznie podepnie tu oferty kupna!
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
