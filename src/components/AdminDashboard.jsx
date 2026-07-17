import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, Trash2, Clock, AlertCircle, Edit3, X, Lock } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [pendingFigures, setPendingFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setEditingId(null);
    try {
      const { data, error } = await supabase
        .from('figures')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingFigures(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (fig) => {
    setEditingId(fig.id);
    setEditForm({
      name: fig.name || '',
      japanese_name: fig.japanese_name || '',
      series: fig.series || '',
      manufacturer: fig.manufacturer || '',
      scale: fig.scale || '1/7',
      official_image_url: fig.official_image_url || '',
      original_price: fig.original_price || ''
    });
  };

  const handleApprove = async (id, name) => {
    try {
      // If we are approving the currently edited figure, save the edited data
      const updates = { status: 'APPROVED' };
      if (editingId === id) {
        Object.assign(updates, editForm);
      }

      const { error } = await supabase
        .from('figures')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      alert(`Zatwierdzono zgłoszenie: ${name}`);
      fetchPending(); // Refresh list
    } catch (err) {
      alert(`Błąd podczas zatwierdzania: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Czy na pewno chcesz ODRZUCIĆ i USUNĄĆ zgłoszenie dla "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('figures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert(`Odrzucono zgłoszenie: ${name}`);
      fetchPending(); // Refresh list
    } catch (err) {
      alert(`Błąd podczas usuwania: ${err.message}`);
    }
  };

  return (
    <div className="dossier-container animate-fade-in" style={{ padding: '2rem' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
        &larr; Wróć do Gabloty
      </button>

      <h2>🛡️ Panel Moderatora</h2>
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
        Zarządzanie figurkami oczekującymi na weryfikację. Możesz je od razu zedytować przed zatwierdzeniem.
      </p>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255, 71, 87, 0.2)', color: '#ff4757', borderRadius: '8px', marginBottom: '1rem' }}>
          <AlertCircle size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Błąd pobierania danych: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Ładowanie zgłoszeń...</div>
      ) : pendingFigures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
          <Clock size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>Brak zgłoszeń</h3>
          <p style={{ opacity: 0.7 }}>Wszystkie zgłoszenia zostały już przetworzone.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {pendingFigures.map(fig => (
            <div key={fig.id} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              borderLeft: '4px solid #ffa502',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem',
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{fig.name}</h3>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    <strong>ID Zgłaszającego:</strong> <span style={{ fontFamily: 'monospace' }}>{fig.submitted_by}</span><br />
                    <strong>Data dodania:</strong> {new Date(fig.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingId !== fig.id && (
                    <button 
                      className="btn-secondary" 
                      style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}
                      onClick={() => handleEditClick(fig)}
                    >
                      <Edit3 size={18} /> Edytuj
                    </button>
                  )}
                  {editingId === fig.id && (
                    <button 
                      className="btn-primary" 
                      style={{ background: '#2ed573', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => handleApprove(fig.id, editForm.name || fig.name)}
                    >
                      <Check size={18} /> Zatwierdź Zmiany (dodaj do Gabloty)
                    </button>
                  )}
                  {editingId !== fig.id && (
                    <button 
                      className="btn-primary" 
                      style={{ background: '#ff4757', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => handleDelete(fig.id, fig.name)}
                    >
                      <Trash2 size={18} /> Odrzuć
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Form Expansion */}
              {editingId === fig.id && (
                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: 0, opacity: 0.8 }}>Weryfikacja i uzupełnianie danych</h4>
                    <button 
                      className="btn-secondary" 
                      disabled={isSearching}
                      style={{ border: '1px solid #3b82f6', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={async () => {
                        const originalName = editForm.name || fig.name;
                        setIsSearching(true);
                        try {
                          const response = await fetch(`/api/fetch-figure?name=${encodeURIComponent(originalName)}`);
                          const data = await response.json();
                          if (response.ok) {
                            // Merge all truthy values, don't overwrite if data has empty string
                            setEditForm(prev => {
                              const newForm = { ...prev };
                              for (const key in data) {
                                if (data[key] && data[key].trim() !== '') {
                                  newForm[key] = data[key];
                                }
                              }
                              return newForm;
                            });
                          } else {
                            console.error(data.error || 'Błąd API');
                          }
                        } catch(err) {
                          console.error(err);
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                    >
                      {isSearching ? <span className="animate-pulse">ff Szukam...</span> : '🤖 Szukaj Danych (AI/Scraping)'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label>Nazwa postaci</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', borderColor: !editForm.name ? '#ff4757' : undefined }} />
                        {!editForm.name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Nazwa Japońska</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" value={editForm.japanese_name} onChange={e => setEditForm({...editForm, japanese_name: e.target.value})} style={{ width: '100%', borderColor: !editForm.japanese_name ? '#ff4757' : undefined }} />
                        {!editForm.japanese_name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Seria</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" value={editForm.series} onChange={e => setEditForm({...editForm, series: e.target.value})} style={{ width: '100%', borderColor: !editForm.series ? '#ff4757' : undefined }} />
                        {!editForm.series && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Producent</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" value={editForm.manufacturer} onChange={e => setEditForm({...editForm, manufacturer: e.target.value})} style={{ width: '100%', borderColor: !editForm.manufacturer ? '#ff4757' : undefined }} />
                        {!editForm.manufacturer && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Skala</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" value={editForm.scale} onChange={e => setEditForm({...editForm, scale: e.target.value})} style={{ width: '100%', borderColor: !editForm.scale ? '#ff4757' : undefined }} />
                        {!editForm.scale && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Cena pierwotna</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="text" placeholder="np. 15 000 JPY" value={editForm.original_price} onChange={e => setEditForm({...editForm, original_price: e.target.value})} style={{ width: '100%', borderColor: !editForm.original_price ? '#ff4757' : undefined }} />
                        {!editForm.original_price && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>URL Obrazka (np. miku_figure, albo pełny link http...)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input type="text" value={editForm.official_image_url} onChange={e => setEditForm({...editForm, official_image_url: e.target.value})} style={{ width: '100%', borderColor: !editForm.official_image_url ? '#ff4757' : undefined }} />
                      {!editForm.official_image_url && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <X size={16} /> Anuluj Edycję
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
