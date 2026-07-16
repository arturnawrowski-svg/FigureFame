import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, Trash2, Clock, AlertCircle } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [pendingFigures, setPendingFigures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
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

  const handleApprove = async (id, name) => {
    try {
      const { error } = await supabase
        .from('figures')
        .update({ status: 'APPROVED' })
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
        Zarządzanie figurkami oczekującymi na weryfikację.
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              borderLeft: '4px solid #ffa502'
            }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{fig.name}</h3>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  <strong>ID Zgłaszającego:</strong> <span style={{ fontFamily: 'monospace' }}>{fig.submitted_by}</span><br />
                  <strong>Data dodania:</strong> {new Date(fig.created_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ background: '#2ed573', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => handleApprove(fig.id, fig.name)}
                >
                  <Check size={18} /> Zatwierdź
                </button>
                <button 
                  className="btn-primary" 
                  style={{ background: '#ff4757', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => handleDelete(fig.id, fig.name)}
                >
                  <Trash2 size={18} /> Odrzuć
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
