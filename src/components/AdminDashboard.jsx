import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, Trash2, Clock, AlertCircle, Edit3, X, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const generateGlowColor = (name) => {
  const colors = ['#00d2d3', '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff3f34'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | APPROVED | ARCHIVED
  const [searchQuery, setSearchQuery] = useState('');
  const [figures, setFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchFigures();
  }, [activeTab]);

  const fetchFigures = async () => {
    setLoading(true);
    setEditingId(null);
    try {
      let query = supabase
        .from('figures')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });
        
      const { data, error } = await query;

      if (error) throw error;
      setFigures(data || []);
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
      type: fig.type || 'Prepainted',
      official_image_url: fig.official_image_url || '',
      original_price: fig.original_price || '',
      additional_info: fig.additional_info || null,
      where_to_search: fig.where_to_search || null,
      strategy: fig.strategy || null,
      market_value: typeof fig.market_value === 'string' ? { average: fig.market_value } : fig.market_value || null
    });
  };

  const handleChangeStatus = async (id, name, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (editingId === id) {
        Object.assign(updates, editForm);
      }

      const { error } = await supabase
        .from('figures')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      alert(`Zmieniono status na ${newStatus}: ${name}`);
      fetchFigures();
    } catch (err) {
      alert(`Błąd podczas zmiany statusu: ${err.message}`);
    }
  };

  const handleSaveEdits = async (id) => {
    try {
      const dataToSave = { ...editForm };
      delete dataToSave._aiError; // just in case

      const { error } = await supabase
        .from('figures')
        .update(dataToSave)
        .eq('id', id);

      if (error) throw error;
      
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setEditingId(null);
      }, 2000);
      fetchFigures();
    } catch (err) {
      alert(`Błąd podczas zapisywania: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Czy na pewno chcesz TRWALE USUNĄĆ zgłoszenie dla "${name}" z bazy?`)) return;

    try {
      const { error } = await supabase
        .from('figures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert(`Usunięto: ${name}`);
      fetchFigures();
    } catch (err) {
      alert(`Błąd podczas usuwania: ${err.message}`);
    }
  };

  const filteredFigures = figures.filter(fig => 
    fig.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    fig.series?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fig.japanese_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dossier-container animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
        </button>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(128,128,128,0.1)', padding: '0.5rem', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveTab('PENDING')} 
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'PENDING' ? 'var(--color-text-highlight)' : 'transparent', color: activeTab === 'PENDING' ? 'var(--color-bg-shelf)' : 'var(--color-text-highlight)', fontWeight: 'bold' }}
          >
            Do Weryfikacji
          </button>
          <button 
            onClick={() => setActiveTab('APPROVED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'APPROVED' ? 'var(--color-text-highlight)' : 'transparent', color: activeTab === 'APPROVED' ? 'var(--color-bg-shelf)' : 'var(--color-text-highlight)', fontWeight: 'bold' }}
          >
            Gablota
          </button>
          <button 
            onClick={() => setActiveTab('ARCHIVED')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'ARCHIVED' ? 'var(--color-text-highlight)' : 'transparent', color: activeTab === 'ARCHIVED' ? 'var(--color-bg-shelf)' : 'var(--color-text-highlight)', fontWeight: 'bold' }}
          >
            Zarchiwizowane
          </button>
        </div>
      </div>
      <h2>🛡️ Panel Moderatora</h2>
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
        {activeTab === 'PENDING' && 'Przeglądaj, edytuj i zatwierdzaj zgłoszenia od użytkowników.'}
        {activeTab === 'APPROVED' && 'Zarządzaj figurkami widocznymi w głównej Gablocie.'}
        {activeTab === 'ARCHIVED' && 'Przeglądaj usunięte z widoku publicznego figurki.'}
      </p>

      {activeTab !== 'PENDING' && (
        <div style={{ marginBottom: '2rem' }}>
          <input 
            type="text" 
            placeholder="Wyszukaj po nazwie lub serii..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-glass-border)', background: 'var(--color-bg-shelf)', color: 'var(--color-text-highlight)' }}
          />
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255, 71, 87, 0.2)', borderLeft: '4px solid #ff4757', borderRadius: '8px', marginBottom: '2rem' }}>
          <AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Błąd pobierania danych: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Ładowanie zgłoszeń...</div>
      ) : filteredFigures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-glass-bg)', borderRadius: '12px' }}>
          <Clock size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>Brak wyników</h3>
          <p style={{ opacity: 0.7 }}>W tej zakładce nie ma żadnych figurek.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredFigures.filter(fig => editingId ? fig.id === editingId : true).map(fig => (
            <div key={fig.id} style={{
              background: 'var(--color-glass-bg)',
              borderRadius: '12px',
              borderLeft: `4px solid ${activeTab === 'PENDING' ? '#ffa502' : activeTab === 'APPROVED' ? '#2ed573' : '#747d8c'}`,
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
                      style={{ background: isSaved ? '#2ed573' : '#3498db', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => handleSaveEdits(fig.id)}
                      disabled={isSaved}
                    >
                      <Check size={18} /> {isSaved ? 'Zapisano' : 'Zapisz Edycję'}
                    </button>
                  )}
                  
                  {activeTab === 'PENDING' && (
                    <button 
                      className="btn-primary" 
                      style={{ background: '#2ed573', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={() => handleChangeStatus(fig.id, editForm.name || fig.name, 'APPROVED')}
                    >
                      <Check size={18} /> Zatwierdź
                    </button>
                  )}
                  
                  {activeTab === 'APPROVED' && (
                    <>
                      <button 
                        className="btn-secondary" 
                        style={{ background: '#ffa502', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig.id, fig.name, 'PENDING')}
                      >
                        Cofnij do Edycji
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ background: '#f39c12', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig.id, fig.name, 'ARCHIVED')}
                      >
                        Archiwizuj
                      </button>
                    </>
                  )}

                  {activeTab === 'ARCHIVED' && (
                    <>
                      <button 
                        className="btn-secondary" 
                        style={{ background: '#2ed573', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig.id, fig.name, 'APPROVED')}
                      >
                        Przywróć do Gabloty
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ background: '#ffa502', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig.id, fig.name, 'PENDING')}
                      >
                        Cofnij do Poczekalni
                      </button>
                    </>
                  )}

                  <button 
                    className="btn-primary" 
                    style={{ background: '#ff4757', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => handleDelete(fig.id, fig.name)}
                  >
                    <Trash2 size={18} /> Usuń
                  </button>
                </div>
              </div>

              {/* Edit Form Expansion */}
              {editingId === fig.id && (
                <div style={{ padding: '1.5rem', background: 'var(--color-bg-shelf)', border: '1px solid var(--color-text-main)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
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
                            // Merge all truthy values (and map them properly)
                            setEditForm(prev => {
                              const newForm = { ...prev };
                              const safeAssign = (targetKey, val, isArrayField) => {
                                if (val === null || val === undefined || val === '') return;
                                if (isArrayField) {
                                  if (typeof val === 'string' && val.trim() !== '') {
                                    newForm[targetKey] = val.split('\n').filter(line => line.trim() !== '');
                                  } else if (Array.isArray(val) && val.length > 0) {
                                    newForm[targetKey] = val;
                                  }
                                } else {
                                  if (typeof val === 'string' && val.trim() !== '') {
                                    newForm[targetKey] = val;
                                  } else if (typeof val !== 'string') {
                                    newForm[targetKey] = val;
                                  }
                                }
                              };

                              for (const key in data) {
                                if (key === '_aiError') continue;
                                // Zabezpieczenie przed dziwnymi kluczami od AI
                                if (key === 'additionalInfo' || key === 'additional_info') safeAssign('additional_info', data[key], true);
                                else if (key === 'whereToSearch' || key === 'where_to_search') safeAssign('where_to_search', data[key], true);
                                else if (key === 'strategy') safeAssign('strategy', data[key], true);
                                else if (key === 'marketValueAverage' || key === 'market_value_average') {
                                  if (data[key]) newForm['market_value'] = { average: data[key] };
                                }
                                else safeAssign(key, data[key], false);
                              }
                              return newForm;
                            });

                            if (data._aiError) {
                              alert(`Uwaga: Wyszukiwarka AI napotkała problem. Szczegóły: ${data._aiError}`);
                            }
                          } else {
                            console.error(data.error || 'Błąd API');
                          }
                        } catch(err) {
                          console.error(err);
                          alert("Wystąpił nieoczekiwany błąd podczas szukania danych. Sprawdź konsolę.");
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                    >
                      {isSearching ? <span className="animate-pulse">FigureFame szuka danych...</span> : '🤖 Szukaj Danych (AI/Scraping)'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label>Nazwa postaci</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', borderColor: !editForm.name ? '#ff4757' : undefined }} />
                        {!editForm.name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Nazwa Japońska</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.japanese_name} onChange={e => setEditForm({...editForm, japanese_name: e.target.value})} style={{ width: '100%', borderColor: !editForm.japanese_name ? '#ff4757' : undefined }} />
                        {!editForm.japanese_name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Seria</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.series} onChange={e => setEditForm({...editForm, series: e.target.value})} style={{ width: '100%', borderColor: !editForm.series ? '#ff4757' : undefined }} />
                        {!editForm.series && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Producent</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.manufacturer} onChange={e => setEditForm({...editForm, manufacturer: e.target.value})} style={{ width: '100%', borderColor: !editForm.manufacturer ? '#ff4757' : undefined }} />
                        {!editForm.manufacturer && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Skala</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.scale} onChange={e => setEditForm({...editForm, scale: e.target.value})} style={{ width: '100%', borderColor: !editForm.scale ? '#ff4757' : undefined }} />
                        {!editForm.scale && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Typ figurki</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select className="form-input" value={editForm.type || 'Prepainted'} onChange={e => setEditForm({...editForm, type: e.target.value})} style={{ width: '100%', borderColor: !editForm.type ? '#ff4757' : undefined }}>
                          <option>Prepainted</option>
                          <option>Action Figure</option>
                          <option>Trading Figure</option>
                          <option>Model Kit</option>
                          <option>Prize Figure</option>
                          <option>Resin Kit</option>
                          <option>Nendoroid</option>
                        </select>
                        {!editForm.type && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '30px' }} title="Brak danych" />}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Cena pierwotna</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" placeholder="np. 15 000 JPY" value={editForm.original_price} onChange={e => setEditForm({...editForm, original_price: e.target.value})} style={{ width: '100%', borderColor: !editForm.original_price ? '#ff4757' : undefined }} />
                        {!editForm.original_price && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>URL Obrazka (np. miku_figure, albo pełny link http...)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input className="form-input" type="text" value={editForm.official_image_url} onChange={e => setEditForm({...editForm, official_image_url: e.target.value})} style={{ width: '100%', borderColor: !editForm.official_image_url ? '#ff4757' : undefined }} />
                      {!editForm.official_image_url && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                    </div>
                    {editForm.official_image_url && (
                      <div style={{ marginTop: '1.5rem', width: '320px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Podgląd karty w Gablocie (Live):</label>
                        <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '368px', height: '500px' }}>
                          <div className="figure-card">
                            <div className="figure-name-badge">{editForm.name || 'Nazwa figurki'}</div>
                            <div className="ambient-light" style={{ background: generateGlowColor(editForm.name || 'x') }}></div>
                            <div className="figure-image-container">
                              <img src={editForm.official_image_url.startsWith('http') ? editForm.official_image_url : `https://images.myfigurecollection.net/item/original/${editForm.official_image_url}.jpg`} alt="Podgląd" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} onLoad={(e) => e.target.style.display = 'block'} />
                            </div>
                            <div className="hover-panel">
                              <div className="market-value">
                                <span>Najlepsza oferta:</span>
                                <strong>~ {editForm.original_price || 'Brak danych'}</strong>
                              </div>
                              <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled>
                                Szczegóły i Oferty
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <h5 style={{ margin: '1.5rem 0 0.5rem 0', opacity: 0.8 }}>Encyklopedia</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label>Dodatkowe informacje (Linijka po linijce)</label>
                      <textarea className="form-input" rows="3" value={editForm.additional_info ? editForm.additional_info.join('\n') : ''} onChange={e => setEditForm({...editForm, additional_info: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Gdzie szukać (Linijka po linijce)</label>
                      <textarea className="form-input" rows="3" value={editForm.where_to_search ? editForm.where_to_search.join('\n') : ''} onChange={e => setEditForm({...editForm, where_to_search: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Strategia zakupowa (Linijka po linijce)</label>
                      <textarea className="form-input" rows="3" value={editForm.strategy ? editForm.strategy.join('\n') : ''} onChange={e => setEditForm({...editForm, strategy: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Wartość Rynkowa (Średnia)</label>
                      <textarea className="form-input" rows="3" value={editForm.market_value?.average || ''} onChange={e => setEditForm({...editForm, market_value: { average: e.target.value }})} style={{ width: '100%' }}></textarea>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={() => setEditingId(null)} style={{ background: '#ff4757', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
