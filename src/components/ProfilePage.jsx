import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, Globe, Hash, Save, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Wpisywane ręcznie, żeby skasowanie konta nie było odległe o jedno kliknięcie.
// Ta sama treść jest sprawdzana po stronie serwera (api/delete-account.js).
const POTWIERDZENIE = 'USUWAM KONTO';

export default function ProfilePage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: '',
    country: '',
    bio: '',
    phone: '',
    avatar_url: ''
  });
  const [figuresCount, setFiguresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Usuwanie konta: okno potwierdzenia rozwija się dopiero po kliknięciu,
  // a przycisk ostateczny odblokowuje dopiero przepisane hasło.
  const [kasowanieOtwarte, setKasowanieOtwarte] = useState(false);
  const [wpisanePotwierdzenie, setWpisanePotwierdzenie] = useState('');
  const [kasowanieTrwa, setKasowanieTrwa] = useState(false);
  const [bladKasowania, setBladKasowania] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchProfile();
      fetchFiguresCount();
    } else {
      // If user becomes null (e.g., after logout), redirect to home page and open login modal
      navigate('/', { state: { openLogin: true } });
    }
  }, [user, authLoading, navigate]);
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          username: data.username || '',
          country: data.country || '',
          bio: data.bio || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
        // Uwaga: uprawnienia admina nadaje wyłącznie baza (RLS + trigger).
        // Dawny hack auto-elewacji został usunięty (Etap 1).
      }
    } catch (error) {
      console.error('Błąd pobierania profilu:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiguresCount = async () => {
    try {
      const { count, error } = await supabase
        .from('figures')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user.id);

      if (!error) {
        setFiguresCount(count || 0);
      }
    } catch (error) {
      console.error('Błąd pobierania liczby figurek:', error.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          country: profile.country,
          bio: profile.bio,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          updated_at: new Date()
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Profil został zaktualizowany!');
    } catch (error) {
      alert('Błąd podczas aktualizacji: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Usunięcie konta (RODO). Nie wysyłamy tu żadnego identyfikatora: serwer
  // czyta go z tokenu sesji i kasuje WYŁĄCZNIE konto, do którego ten token
  // należy. Gdyby id szło w treści żądania, dałoby się skasować cudze konto.
  const handleDeleteAccount = async () => {
    setKasowanieTrwa(true);
    setBladKasowania(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesja wygasła — zaloguj się ponownie.');

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ potwierdzenie: wpisanePotwierdzenie }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Nie udało się usunąć konta (kod ${res.status}).`);

      alert('Konto zostało trwale usunięte.');
      // Najpierw wyjście z profilu, potem wylogowanie — inaczej strażnik tej
      // strony zdążyłby zobaczyć „brak użytkownika" i otworzyć okno logowania.
      navigate('/', { replace: true });
      try { await logout(); } catch { /* konta już nie ma, sesja i tak jest martwa */ }
    } catch (e) {
      setBladKasowania(e.message);
      setKasowanieTrwa(false);
    }
  };

  if (authLoading || loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Ładowanie profilu...</div>;

  return (
    <div className="admin-container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '80px' }}>
      <h1 className="text-3xl font-bold mb-8 text-center">Mój Profil</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Lewa kolumna: Awatar i Statystyki */}
        <div style={{ background: 'var(--color-bg-shelf)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-glass-border)', textAlign: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--color-glass-border)', margin: '0 auto 1.5rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={64} style={{ opacity: 0.5 }} />
            )}
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>{profile.username || 'Nieznajomy'}</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '2rem' }}>{user.email}</p>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Dodane figurki</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-text-highlight)' }}>{figuresCount}</p>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={18} /> Wyloguj się
          </button>
        </div>

        {/* Prawa kolumna: Edycja Danych */}
        <div style={{ background: 'var(--color-bg-shelf)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-glass-border)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Edytuj dane</h3>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            <div className="form-group">
              <label><User size={16} /> Nazwa użytkownika (Nick)</label>
              <input
                type="text"
                value={profile.username}
                onChange={e => setProfile({ ...profile, username: e.target.value })}
                placeholder="Twój super nick..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label><Globe size={16} /> Kraj</label>
              <input
                type="text"
                value={profile.country}
                onChange={e => setProfile({ ...profile, country: e.target.value })}
                placeholder="np. Polska, Japonia..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label><Hash size={16} /> Numer telefonu (Opcjonalny)</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+48 123 456 789"
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>Zostanie ukryty przed innymi użytkownikami.</span>
            </div>

            <div className="form-group">
              <label><Mail size={16} /> Bio (O sobie)</label>
              <textarea
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Napisz coś o swojej pasji do figurek..."
                className="form-input"
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Save size={18} /> {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </form>
        </div>
      </div>

      {/* Strefa nieodwracalna — usunięcie konta.
          Obowiązek z RODO (prawo do bycia zapomnianym): skoro można się
          zarejestrować jednym kliknięciem, musi się dać także odejść.
          Osobna ramka i czerwień, żeby nikt nie kliknął tego przez pomyłkę. */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 0.75rem 0', color: '#ef4444', fontSize: '1.1rem' }}>
          <AlertTriangle size={20} /> Usunięcie konta
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.6 }}>
          Usuwamy konto, adres e-mail i profil — <strong>trwale i bez możliwości cofnięcia</strong>.
          Dodane przez Ciebie figurki zostają w bazie jako dane katalogowe (opis produktu, nie dane
          o Tobie), ale tracą powiązanie z Twoim kontem — nikt nie odczyta już, kto je zgłosił.
        </p>

        {!kasowanieOtwarte ? (
          <button
            onClick={() => { setKasowanieOtwarte(true); setBladKasowania(null); }}
            style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
          >
            <Trash2 size={18} /> Chcę usunąć konto
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem' }}>
              Aby potwierdzić, przepisz: <strong style={{ color: '#ef4444', fontFamily: 'monospace' }}>{POTWIERDZENIE}</strong>
            </label>
            <input
              type="text"
              className="form-input"
              value={wpisanePotwierdzenie}
              onChange={e => setWpisanePotwierdzenie(e.target.value)}
              placeholder={POTWIERDZENIE}
              autoComplete="off"
              style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
            />

            {bladKasowania && (
              <div style={{ fontSize: '0.85rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                {bladKasowania}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleDeleteAccount}
                disabled={kasowanieTrwa || wpisanePotwierdzenie.trim().toUpperCase() !== POTWIERDZENIE}
                style={{
                  padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: '#ef4444', color: '#fff',
                  cursor: wpisanePotwierdzenie.trim().toUpperCase() === POTWIERDZENIE && !kasowanieTrwa ? 'pointer' : 'not-allowed',
                  opacity: wpisanePotwierdzenie.trim().toUpperCase() === POTWIERDZENIE && !kasowanieTrwa ? 1 : 0.45,
                }}
              >
                <Trash2 size={18} /> {kasowanieTrwa ? 'Usuwam konto…' : 'Usuń konto na zawsze'}
              </button>
              <button
                onClick={() => { setKasowanieOtwarte(false); setWpisanePotwierdzenie(''); setBladKasowania(null); }}
                disabled={kasowanieTrwa}
                style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: 'inherit', border: '1px solid var(--color-glass-border)', borderRadius: '8px', cursor: 'pointer' }}
              >
                Rezygnuję
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
