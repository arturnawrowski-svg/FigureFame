import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, Trash2, Clock, AlertCircle, Edit3, X, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../lib/getImageUrl';
import ImageUploader from './ImageUploader';
import ImageStudio from './ImageStudio';
import { PRESETS, ACCENTS, MUSIC_TRACKS, RESOLUTIONS, LANGS, defaultShortOptions, QUEUE_MAX, BUFFER_WARN } from '../lib/shortOptions';
import { generateGlowColor } from '../lib/glowColor';
import { streamLookup, mergeLookupIntoForm } from '../lib/figureLookup';

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
  const [isSaved] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [shortOpts, setShortOpts] = useState(defaultShortOptions());
  const [bufferCount, setBufferCount] = useState(0); // ile MP4 zajmuje bufor Supabase (ready + approved)
  const [shortsFilter, setShortsFilter] = useState('all'); // filtr statusu w zakładce Shorty
  // Czy zdjęcie z pola URL faktycznie się wczytuje: null = sprawdzam, true/false = wynik.
  // Sam niepusty tekst nie wystarczy — Studio i podgląd potrzebują ŻYWEGO obrazka.
  const [imageStatus, setImageStatus] = useState(false);
  // Skąd przyszły dane z ostatniego wyszukiwania (przejrzystość dla moderatora).
  const [lastLookup, setLastLookup] = useState(null);
  // Postęp wyszukiwania: { percent, label, log[] } albo null gdy nic nie trwa.
  const [progress, setProgress] = useState(null);
  // Pochodzenie pól z ostatniego wyszukiwania: { pole: 'catalog' | 'ai' }.
  const [provenance, setProvenance] = useState({});
  // Czy któryś domowy komputer (Studio) właśnie pracuje.
  const [studio, setStudio] = useState({ online: false, stations: [] });

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Znacznik przy etykiecie pola. Rozróżnia dane PEWNE od domysłu modelu —
  // bez tego pole wypełnione przez AI wygląda identycznie jak zweryfikowane,
  // a właśnie takie potrafi zawierać nieprawdę.
  const FieldMark = ({ field }) => {
    const src = provenance[field];
    if (!src) return null;
    const catalog = src === 'catalog';
    return (
      <span
        title={catalog
          ? 'Potwierdzone przez katalog figurek — dane pewne'
          : 'Uzupełnione przez AI — sprawdź przed dodaniem do Gabloty'}
        style={{
          marginLeft: '6px',
          fontSize: '0.78rem',
          color: catalog ? '#2ed573' : '#ffa502',
          cursor: 'help',
        }}
      >
        {catalog ? '✅' : '⚠️'}
      </span>
    );
  };

  // Wyszukiwanie danych figurki. opts.deep = tryb TOP (więcej wariantów nazwy,
  // dłużej i drożej), opts.refresh = pomiń pamięć podręczną i pobierz na nowo.
  const runLookup = async (fig, opts = {}) => {
    const originalName = editForm.name || fig.name;
    // Seria mocno poprawia trafność w katalogach (indeksują postać + serię,
    // a nie nazwy wersji typu „Fortitude Ver.").
    const knownSeries = editForm.series || fig.series || '';

    setIsSearching(true);
    setProgress({ percent: 0, label: 'Zaczynam…', log: [] });
    try {
      // Strumień SSE — pasek postępu pokazuje PRAWDZIWE kroki
      // (każde zdarzenie = faktycznie zakończony etap).
      const data = await streamLookup(
        originalName,
        knownSeries,
        (p) => {
          // W panelu pokazujemy dokładne nazwy źródeł; wersja ogólna (p.label)
          // jest dla odwiedzających stronę.
          const text = p.adminLabel || p.label;
          setProgress(prev => ({
            percent: p.percent,
            label: text,
            log: text.startsWith('✓') ? [...(prev?.log || []), text] : (prev?.log || []),
          }));
        },
        opts
      );

      if (data) {
        setEditForm(prev => mergeLookupIntoForm(prev, data));

        setProvenance(data._provenance || {});
        setLastLookup({
          sources: data._sources || null,
          bootleg: data._bootlegWarning || null,
          fromCache: !!data._fromCache,
        });

        if (data._queued) {
          showToast(`⏳ ${data._queued}`);
        } else if (data._japaneseMissing) {
          showToast(`🇯🇵 ${data._japaneseMissing}`);
        } else if (data._aiError) {
          showToast(`Uwaga: Wyszukiwarka AI napotkała problem. Szczegóły: ${data._aiError}`);
        } else if (data._imageError) {
          showToast(`🖼️ ${data._imageError}`);
        }
      } else {
        showToast('Nie udało się pobrać danych figurki.');
      }
    } catch (err) {
      console.error(err);
      showToast('Wystąpił nieoczekiwany błąd podczas szukania danych. Sprawdź konsolę.');
    } finally {
      setIsSearching(false);
      setProgress(null);
    }
  };


  // Weryfikacja zdjęcia przy każdej zmianie adresu (także po wyszukiwaniu AI).
  useEffect(() => {
    const url = editForm.official_image_url;
    if (!url) { setImageStatus(false); return; }
    setImageStatus(null);
    let alive = true;
    const probe = new Image();
    probe.onload = () => { if (alive) setImageStatus(true); };
    probe.onerror = () => { if (alive) setImageStatus(false); };
    probe.src = getImageUrl(url);
    return () => { alive = false; };
  }, [editForm.official_image_url]);

  // Stan Studia: sygnał świeższy niż 3 minuty = komputer domowy pracuje.
  // Odpytujemy co minutę, bo samo Studio melduje się w tym rytmie.
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.from('studio_status').select('*');
        const swieze = (data || []).filter(
          (s) => Date.now() - new Date(s.last_seen).getTime() < 3 * 60 * 1000
        );
        setStudio({ online: swieze.length > 0, stations: swieze });
      } catch { /* brak tabeli — traktujemy jak wyłączone */ }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  // Licznik bufora: shorty trzymane w Supabase Storage (jeszcze nieopublikowane na Drive)
  const fetchBufferCount = async () => {
    try {
      const { count } = await supabase
        .from('figures')
        .select('id', { count: 'exact', head: true })
        .in('video_status', ['ready', 'approved_for_publish']);
      setBufferCount(count || 0);
    } catch { /* ignoruj */ }
  };

  useEffect(() => {
    fetchFigures();
    fetchBufferCount();
  }, [activeTab]);

  // Ciche odświeżanie listy: aktualizuje dane BEZ zamykania otwartej edycji
  // i bez migotania „Ładowanie…". Używane przez auto-odświeżanie.
  const refreshFiguresQuiet = async () => {
    try {
      const { data, error } = await supabase
        .from('figures')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });
      if (!error) setFigures(data || []);
    } catch { /* ignoruj */ }
  };

  // Auto-odświeżanie: gdy jakiś short jest w kolejce/renderuje się, dopytuj co 8 s,
  // aż worker skończy — wideo pojawi się w panelu samo, bez ręcznego odświeżania
  // i BEZ zamykania edycji (dlatego refreshFiguresQuiet, nie fetchFigures).
  useEffect(() => {
    const pending = figures.some(f => f.video_status === 'queued' || f.video_status === 'rendering');
    if (!pending) return;
    const t = setInterval(() => { refreshFiguresQuiet(); fetchBufferCount(); }, 8000);
    return () => clearInterval(t);
  }, [figures]);

  const fetchFigures = async () => {
    setLoading(true);
    setEditingId(null);
    try {
      let query = supabase.from('figures').select('*');
      if (activeTab === 'SHORTS') {
        // Zakładka Shorty: wszystkie figurki, które mają jakiś short (dowolny status)
        query = query.not('video_status', 'is', null).order('created_at', { ascending: false });
      } else {
        query = query.eq('status', activeTab).order('created_at', { ascending: false });
      }
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
      image_source_type: fig.image_source_type || '',
      image_rights_ack: fig.image_rights_ack || false,
      source_url: fig.source_url || '',
      original_price: fig.original_price || '',
      additional_info: fig.additional_info || null,
      where_to_search: fig.where_to_search || null,
      strategy: fig.strategy || null,
      market_value: typeof fig.market_value === 'string' ? { average: fig.market_value } : fig.market_value || null
    });
  };

  const processImageIfNeeded = async (formObj) => {
    const url = formObj.official_image_url;
    if (url && url.startsWith('http') && !url.includes('supabase.co')) {
      showToast('Przetwarzanie i optymalizacja obrazka...');
      try {
        const response = await fetch('/api/process-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url, figureName: formObj.name || 'figure' })
        });
        const data = await response.json();
        if (response.ok && data.url) {
          formObj.official_image_url = data.url;
          // Aktualizuj również lokalny stan, żeby podgląd "na żywo" natychmiast załapał nowy link
          setEditForm(prev => ({ ...prev, official_image_url: data.url }));
        } else {
          throw new Error(data.error || 'Unknown API error');
        }
      } catch (err) {
        showToast(`Błąd konwersji obrazka: ${err.message}`);
        throw err;
      }
    }
    return formObj;
  };

  // Finalizacja: kanoniczny webp + skasowanie folderu roboczego (serwer, service_role).
  const finalizeImage = async (figureId, imageUrl, figureName) => {
    const res = await fetch('/api/finalize-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ figureId, imageUrl, figureName }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Finalizacja zdjęcia nieudana');
    return data.url;
  };

  const handleChangeStatus = async (fig, newStatus) => {
    const id = fig.id;
    const editing = editingId === id;
    const src = editing ? editForm : fig;
    try {
      let updates = { status: newStatus };
      if (editing) {
        Object.assign(updates, { ...editForm });
        delete updates._aiError;
      }

      // Wejście do Gabloty (APPROVED) = brama praw + finalizacja zdjęcia.
      if (newStatus === 'APPROVED') {
        if (!src.official_image_url) {
          showToast('Brak zdjęcia — dodaj i wybierz jedno przed dodaniem do Gabloty.');
          return;
        }
        if (!src.image_rights_ack) {
          showToast('Zaznacz oświadczenie o prawach do zdjęcia, żeby dodać do Gabloty.');
          return;
        }
        const url = src.official_image_url;
        // Finalizujemy tylko realne URL-e (http). Lokalne nazwy plików (np. "miku_figure",
        // seed data z /public/images) zostawiamy — to statyczne assety, nie do finalizacji.
        const isHttp = url.startsWith('http');
        const needsFinalize = isHttp && (url.includes('/_work/') || !url.includes('supabase.co'));
        if (needsFinalize) {
          showToast('Finalizacja zdjęcia (kompresja + sprzątanie)...');
          const canonical = await finalizeImage(id, url, src.name || fig.name);
          updates.official_image_url = canonical;
          if (editing) setEditForm(prev => ({ ...prev, official_image_url: canonical }));
        }
      }

      const { error } = await supabase
        .from('figures')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      showToast(`Zmieniono status na ${newStatus}: ${src.name || fig.name}`);
      if (newStatus === 'APPROVED') {
        setActiveTab('APPROVED');
        setEditingId(null);
      }
      fetchFigures();
    } catch (err) {
      showToast(`Błąd podczas zmiany statusu: ${err.message}`);
    }
  };

  const handleSaveEdits = async (id) => {
    try {
      let dataToSave = { ...editForm };
      delete dataToSave._aiError; // just in case

      dataToSave = await processImageIfNeeded(dataToSave);

      const { error } = await supabase
        .from('figures')
        .update(dataToSave)
        .eq('id', id);

      if (error) throw error;
      
      showToast('Zapisano edycję pomyślnie!');
      setEditingId(null);
      fetchFigures();
    } catch (err) {
      showToast(`Błąd zapisu: ${err.message}`);
    }
  };

  const handleRefreshPrices = async (fig) => {
    const query = [editForm.name || fig.name, editForm.series || fig.series].filter(Boolean).join(' ');
    showToast('Odświeżam oferty (eBay)...');
    try {
      const res = await fetch('/api/refresh-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId: fig.id, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd');
      if (data.count > 0) showToast(`Zebrano ${data.count} ofert dla „${query}".`);
      else showToast(`Brak ofert (eBay: ${data.providers?.ebay || 'nieaktywny'}).`);
    } catch (e) {
      showToast(`Błąd odświeżania cen: ${e.message}`);
    }
  };

  const handleGenerateShort = async (fig) => {
    showToast('Generuję short teraz (render trwa kilkadziesiąt s)...');
    try {
      const res = await fetch('/api/generate-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId: fig.id, options: shortOpts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd');
      showToast('Short gotowy! 🎬');
      fetchFigures();
    } catch (e) {
      showToast(`Błąd generowania shorta: ${e.message}`);
    }
  };

  // Kolejka oparta o bazę: zapis BEZPOŚREDNIO do Supabase (działa z żywej strony,
  // zero wywołań funkcji Vercela). Lokalny worker (npm run render-queue:watch)
  // odpytuje video_status='queued' i renderuje na kompie admina.
  const handleEnqueueShort = async (fig) => {
    try {
      const already = fig.video_status === 'queued';
      if (!already) {
        const { count, error: cErr } = await supabase
          .from('figures')
          .select('id', { count: 'exact', head: true })
          .eq('video_status', 'queued');
        if (cErr) throw cErr;
        if ((count || 0) >= QUEUE_MAX) {
          showToast(`Kolejka pełna (${count}/${QUEUE_MAX}). Poczekaj aż worker przerobi zadania.`);
          return;
        }
      }
      const { error } = await supabase
        .from('figures')
        .update({ video_status: 'queued', video_options: shortOpts })
        .eq('id', fig.id);
      if (error) throw error;
      showToast(already
        ? 'Zaktualizowano opcje w kolejce. Worker: npm run worker:watch'
        : 'Dodano do kolejki. Uruchom worker: npm run worker:watch');
      fetchFigures();
      fetchBufferCount();
    } catch (e) {
      showToast(`Błąd kolejki: ${e.message}`);
    }
  };

  // Moderacja wideo: admin akceptuje gotowy short do publikacji albo zleca ponowny render.
  // 'approved_for_publish' = brama do kolejki na Google Drive (Etap 5, pipeline publikacji).
  const handleModerateVideo = async (fig, decision) => {
    if (decision === 're-render') return handleGenerateShort(fig);
    try {
      const { error } = await supabase
        .from('figures')
        .update({ video_status: 'approved_for_publish' })
        .eq('id', fig.id);
      if (error) throw error;
      showToast('Zatwierdzono do publikacji ✅ (worker przeniesie na Drive)');
      fetchFigures();
      fetchBufferCount();
    } catch (e) {
      showToast(`Błąd zatwierdzania: ${e.message}`);
    }
  };

  // Etykieta/kolor statusu wideo dla plakietki w panelu
  const videoStatusMeta = (s) => ({
    queued: ['#94a3b8', '⏳ W kolejce'],
    rendering: ['#f5a623', '🎬 Renderuję...'],
    ready: ['#3b82f6', '👁️ Gotowy do przeglądu'],
    approved_for_publish: ['#2ecc71', '✅ Zatwierdzony do publikacji'],
    published: ['#8b5cf6', '📢 Opublikowany'],
    failed: ['#ff4757', '⚠️ Render nieudany'],
  }[s] || ['#94a3b8', s || 'brak']);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Czy na pewno chcesz TRWALE USUNĄĆ zgłoszenie dla "${name}" z bazy?`)) return;

    try {
      const { error } = await supabase
        .from('figures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showToast(`Usunięto: ${name}`);
      fetchFigures();
    } catch (err) {
      showToast(`Błąd podczas usuwania: ${err.message}`);
    }
  };

  // Masowe zatwierdzenie wszystkich gotowych shortów do publikacji
  const handleApproveAllReady = async () => {
    const ready = figures.filter(f => f.video_status === 'ready');
    if (ready.length === 0) { showToast('Brak gotowych shortów do zatwierdzenia.'); return; }
    try {
      const { error } = await supabase.from('figures').update({ video_status: 'approved_for_publish' }).eq('video_status', 'ready');
      if (error) throw error;
      showToast(`Zatwierdzono ${ready.length} shortów do publikacji.`);
      fetchFigures();
      fetchBufferCount();
    } catch (e) {
      showToast(`Błąd: ${e.message}`);
    }
  };

  // Ponowne wrzucenie do kolejki z zachowaniem zapisanych opcji shorta
  const handleRequeue = async (fig) => {
    try {
      const { error } = await supabase.from('figures').update({ video_status: 'queued' }).eq('id', fig.id);
      if (error) throw error;
      showToast('Ponownie w kolejce. Worker: FigureFame-Studio (dwuklik).');
      fetchFigures();
    } catch (e) {
      showToast(`Błąd: ${e.message}`);
    }
  };

  const filteredFigures = figures.filter(fig => {
    const matchesSearch =
      fig.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fig.series?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fig.japanese_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab !== 'SHORTS' || shortsFilter === 'all') return matchesSearch;
    if (shortsFilter === 'inprogress') return matchesSearch && ['queued', 'rendering'].includes(fig.video_status);
    return matchesSearch && fig.video_status === shortsFilter;
  });

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
          <button
            onClick={() => setActiveTab('SHORTS')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'SHORTS' ? 'var(--color-text-highlight)' : 'transparent', color: activeTab === 'SHORTS' ? 'var(--color-bg-shelf)' : 'var(--color-text-highlight)', fontWeight: 'bold' }}
          >
            🎬 Shorty
          </button>
        </div>
      </div>
      <h2>🛡️ Panel Moderatora</h2>

      {/* Stan komputera domowego. Bez tego moderator nie wie, czy „nic się nie
          dzieje" znaczy awarię, czy po prostu wyłączone Studio. */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        padding: '0.5rem 0.9rem', borderRadius: '999px', marginBottom: '1rem',
        background: studio.online ? 'rgba(46,213,115,0.12)' : 'rgba(255,71,87,0.10)',
        border: `1px solid ${studio.online ? 'rgba(46,213,115,0.35)' : 'rgba(255,71,87,0.30)'}`,
        fontSize: '0.85rem',
      }}>
        <span>{studio.online ? '🟢' : '🔴'}</span>
        {studio.online ? (
          <>
            <strong>FigureFame Studio aktywne</strong>
            <span style={{ opacity: 0.75 }}>
              ({studio.stations.map((s) => s.station).join(', ')}) — dane pobiera Twój komputer, bez limitów
            </span>
          </>
        ) : (
          <>
            <strong>FigureFame Studio wyłączone</strong>
            <span style={{ opacity: 0.75 }}>
              Zlecenia poczekają w kolejce. Uruchom Studio na komputerze, żeby je pobrać.
            </span>
            <button
              className="btn-secondary"
              style={{ padding: '2px 10px', fontSize: '0.8rem', border: '1px solid #ffa502', color: '#ffa502' }}
              onClick={() => { window.location.href = 'figurefame://start'; }}
              title="Zadziała, jeśli Studio zostało raz zainstalowane na tym komputerze (skrypty w folderze instalacja/)"
            >
              ▶ Uruchom Studio
            </button>
          </>
        )}
      </div>

      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
        {activeTab === 'PENDING' && 'Przeglądaj, edytuj i zatwierdzaj zgłoszenia od użytkowników.'}
        {activeTab === 'APPROVED' && 'Zarządzaj figurkami widocznymi w głównej Gablocie.'}
        {activeTab === 'ARCHIVED' && 'Przeglądaj usunięte z widoku publicznego figurki.'}
        {activeTab === 'SHORTS' && 'Wszystkie shorty w jednym miejscu — status, język, moderacja i publikacja na Google Drive.'}
      </p>

      {activeTab === 'APPROVED' && (
        <div style={{ padding: '0.9rem 1.25rem', background: 'rgba(168, 85, 247, 0.10)', borderLeft: '4px solid #a855f7', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🖥️</span>
          <span>
            <strong>Render lokalny:</strong> aby Twój komputer produkował shorty i wysyłał je na Google Drive,
            kliknij dwukrotnie plik <code>FigureFame-Studio</code> (w folderze projektu — możesz przeciągnąć skrót na pulpit).
            Zostaw jego okno otwarte. Wtedy przyciski „Dodaj do kolejki" i „Zatwierdź do publikacji" po prostu działają — panel odświeży się sam.
          </span>
        </div>
      )}

      {bufferCount > BUFFER_WARN && (
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(245, 166, 35, 0.12)', borderLeft: '4px solid #f5a623', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} style={{ color: '#f5a623', flexShrink: 0 }} />
          <span>
            <strong>Bufor Supabase: {bufferCount} shortów</strong> (próg {BUFFER_WARN}) — zatwierdź shorty „do publikacji", żeby zwolnić miejsce.
            Zaakceptowane trafią na Google Drive i zwolnią Supabase (wymaga uruchomionego <code>FigureFame-Studio</code>).
          </span>
        </div>
      )}

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
      ) : activeTab === 'SHORTS' ? (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
            {[
              ['all', 'Wszystkie'], ['inprogress', 'W toku'], ['ready', 'Gotowe'],
              ['approved_for_publish', 'Zatwierdzone'], ['published', 'Opublikowane'], ['failed', 'Błędy'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setShortsFilter(key)}
                style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold',
                  border: '1px solid var(--color-glass-border)',
                  background: shortsFilter === key ? 'var(--color-text-highlight)' : 'transparent',
                  color: shortsFilter === key ? 'var(--color-bg-shelf)' : 'var(--color-text-highlight)' }}>
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="btn-primary" onClick={handleApproveAllReady}
              style={{ background: '#2ecc71', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> Zatwierdź wszystkie gotowe
            </button>
          </div>

          {filteredFigures.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-glass-bg)', borderRadius: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>🎬</span>
              <h3>Brak shortów w tym filtrze</h3>
              <p style={{ opacity: 0.7 }}>Wygeneruj short przy figurce (Gablota → edycja → „Generuj teraz" lub „Dodaj do kolejki").</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredFigures.map(fig => {
                const [color, label] = videoStatusMeta(fig.video_status);
                const lang = (fig.video_options?.lang || 'pl').toUpperCase();
                return (
                  <div key={fig.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--color-glass-bg)', borderRadius: '12px', borderLeft: `4px solid ${color}`, flexWrap: 'wrap' }}>
                    <img src={getImageUrl(fig.official_image_url)} alt="" loading="lazy" style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} onError={(e) => { e.target.style.visibility = 'hidden'; }} />
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ fontWeight: 'bold' }}>{fig.name}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{fig.series || '—'}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--color-glass-border)' }}>🌐 {lang}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color, border: `1px solid ${color}`, padding: '2px 10px', borderRadius: '999px' }}>{label}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {fig.video_url && (
                        <a href={fig.video_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', border: '1px solid #3b82f6', color: '#3b82f6' }}>▶ Podgląd</a>
                      )}
                      {fig.video_status === 'ready' && (
                        <button onClick={() => handleModerateVideo(fig, 'approve')} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', background: '#2ecc71', border: 'none' }}>✓ Zatwierdź</button>
                      )}
                      {fig.video_status === 'published' && fig.drive_url && (
                        <a href={fig.drive_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', border: '1px solid #8b5cf6', color: '#8b5cf6' }}>▶ Drive</a>
                      )}
                      {(fig.video_status === 'failed' || fig.video_status === 'ready') && (
                        <button onClick={() => handleRequeue(fig)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', border: '1px solid #a855f7', color: '#a855f7' }}>🔄 Ponów</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                  
                  {activeTab === 'PENDING' && (() => {
                    const rightsOk = (editingId === fig.id ? editForm.image_rights_ack : fig.image_rights_ack);
                    return (
                      <button
                        className="btn-primary"
                        style={{ background: rightsOk ? '#2ed573' : '#95a5a6', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', opacity: rightsOk ? 1 : 0.7 }}
                        onClick={() => handleChangeStatus(fig, 'APPROVED')}
                        disabled={!rightsOk}
                        title={rightsOk ? 'Dodaj do Gabloty' : 'Najpierw dodaj zdjęcie i zaznacz prawa do niego'}
                      >
                        <Check size={18} /> Dodaj do Gabloty
                      </button>
                    );
                  })()}
                  
                  {activeTab === 'APPROVED' && (
                    <>
                      <button
                        className="btn-secondary"
                        style={{ background: '#ffa502', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig, 'PENDING')}
                      >
                        Wycofaj z Gabloty (Do poprawy)
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ background: '#f39c12', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig, 'ARCHIVED')}
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
                        onClick={() => handleChangeStatus(fig, 'APPROVED')}
                      >
                        Przywróć do Gabloty
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ background: '#ffa502', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleChangeStatus(fig, 'PENDING')}
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn-secondary"
                        disabled={isSearching}
                        style={{ border: '1px solid #3b82f6', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => runLookup(fig, {})}
                      >
                        {isSearching ? <span className="animate-pulse">FigureFame szuka danych...</span> : '🤖 Szukaj Danych'}
                      </button>
                      {/* Tryb dokładny: więcej wariantów nazwy i świeże pobranie
                          (pomija pamięć podręczną). Wolniejszy i zużywa więcej
                          zapytań u pośrednika — dlatego to świadomy wybór. */}
                      <button
                        className="btn-secondary"
                        disabled={isSearching}
                        title="Dokładne szukanie: więcej wariantów nazwy, pomija zapisany wynik. Wolniejsze i zużywa więcej zapytań."
                        style={{ border: '1px solid #a55eea', color: '#a55eea', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => runLookup(fig, { deep: true, refresh: true })}
                      >
                        ⭐ TOP
                      </button>
                    </div>
                  </div>

                  {/* Pasek postępu — pokazuje, CO właśnie sprawdzamy. Czekanie jest
                      znośne, gdy widać, że dane są zbierane z konkretnych katalogów. */}
                  {progress && (
                    <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', background: 'var(--color-bg-shelf)', border: '1px solid var(--color-glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span>{progress.label}</span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>{progress.percent}%</strong>
                      </div>
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress.percent}%`, height: '100%', borderRadius: '999px',
                          background: 'linear-gradient(90deg,#3b82f6,#2ed573)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      {progress.log?.length > 0 && (
                        <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#2ed573' }}>
                          {progress.log.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pochodzenie danych — moderator ma wiedzieć, co jest z katalogu,
                      a co dopisała AI. Katalogi są pewne, AI bywa omylna. */}
                  {lastLookup && !progress && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--color-bg-shelf)', border: '1px solid var(--color-glass-border)', fontSize: '0.82rem' }}>
                      {lastLookup.sources && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <span style={{ opacity: 0.7 }}>Źródła danych:</span>
                          {Object.entries(lastLookup.sources).map(([src, state]) => (
                            <span key={src} style={{
                              padding: '2px 8px', borderRadius: '999px', fontSize: '0.76rem',
                              background: state === 'ok' ? 'rgba(46,213,115,0.15)' : 'rgba(255,255,255,0.06)',
                              color: state === 'ok' ? '#2ed573' : 'inherit',
                              opacity: state === 'ok' ? 1 : 0.55,
                            }}>
                              {state === 'ok' ? '✓' : '—'} {src}
                            </span>
                          ))}
                        </div>
                      )}
                      {lastLookup.bootleg && (
                        <div style={{ marginTop: '0.6rem', color: '#ffa502' }}>⚠️ {lastLookup.bootleg}</div>
                      )}
                      {lastLookup.fromCache && (
                        <div style={{ marginTop: '0.6rem', color: '#3b82f6' }}>
                          💾 Z naszej bazy (bez odpytywania źródeł). „⭐ TOP" wymusza świeże pobranie.
                        </div>
                      )}
                      <div style={{ marginTop: '0.6rem', opacity: 0.7, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span><span style={{ color: '#2ed573' }}>✅</span> potwierdzone przez katalog</span>
                        <span><span style={{ color: '#ffa502' }}>⚠️</span> domysł AI — sprawdź</span>
                        <span><span style={{ color: '#ff4757' }}>🔒</span> brak danych</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label>Nazwa postaci <FieldMark field="name" /></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', borderColor: !editForm.name ? '#ff4757' : undefined }} />
                        {!editForm.name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Nazwa Japońska <FieldMark field="japanese_name" /></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.japanese_name} onChange={e => setEditForm({...editForm, japanese_name: e.target.value})} style={{ width: '100%', borderColor: !editForm.japanese_name ? '#ff4757' : undefined }} />
                        {!editForm.japanese_name && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Seria <FieldMark field="series" /></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.series} onChange={e => setEditForm({...editForm, series: e.target.value})} style={{ width: '100%', borderColor: !editForm.series ? '#ff4757' : undefined }} />
                        {!editForm.series && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Producent <FieldMark field="manufacturer" /></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" value={editForm.manufacturer} onChange={e => setEditForm({...editForm, manufacturer: e.target.value})} style={{ width: '100%', borderColor: !editForm.manufacturer ? '#ff4757' : undefined }} />
                        {!editForm.manufacturer && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Skala <FieldMark field="scale" /></label>
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
                      <label>Cena pierwotna <FieldMark field="original_price" /></label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input className="form-input" type="text" placeholder="np. 15 000 JPY" value={editForm.original_price} onChange={e => setEditForm({...editForm, original_price: e.target.value})} style={{ width: '100%', borderColor: !editForm.original_price ? '#ff4757' : undefined }} />
                        {!editForm.original_price && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                      </div>
                    </div>
                  </div>
                  <h5 style={{ margin: '1.5rem 0 0.5rem 0', opacity: 0.8 }}>Zdjęcie figurki (folder roboczy → jedno finalne)</h5>
                  <ImageUploader
                    figureId={fig.id}
                    onUploaded={(url) => { setEditForm(prev => ({ ...prev, official_image_url: url })); showToast('Dodano kandydata do folderu roboczego.'); }}
                    onError={(msg) => showToast(msg)}
                  />
                  {/* Studio ma sens tylko dla zdjęcia, które da się pobrać i obrobić. */}
                  {imageStatus === true && (
                    <ImageStudio
                      figureId={fig.id}
                      imageUrl={getImageUrl(editForm.official_image_url)}
                      glowHex={generateGlowColor(editForm.name || 'x')}
                      onProcessed={(url) => { setEditForm(prev => ({ ...prev, official_image_url: url })); showToast('Zapisano obrobione zdjęcie jako kandydata.'); }}
                      onError={(msg) => showToast(msg)}
                    />
                  )}
                  {imageStatus === false && (
                    <div style={{ background: 'var(--color-bg-shelf)', border: '1px dashed #ffa502', borderRadius: '12px', padding: '0.9rem 1rem', margin: '0.5rem 0 1rem', fontSize: '0.88rem', opacity: 0.9 }}>
                      🖼️ <strong>Brak zdjęcia do obróbki.</strong>{' '}
                      {editForm.official_image_url
                        ? 'Adres w polu „URL Obrazka" nie prowadzi do wczytywalnego zdjęcia — wgraj plik z dysku lub popraw adres.'
                        : 'Dodaj zdjęcie z dysku powyżej — wtedy odblokują się Studio zdjęcia i podgląd w Gablocie.'}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
                    <div className="form-group">
                      <label>Źródło / prawa do zdjęcia</label>
                      <select className="form-input" value={editForm.image_source_type || ''} onChange={e => setEditForm({...editForm, image_source_type: e.target.value})} style={{ width: '100%', borderColor: !editForm.image_source_type ? '#ffa502' : undefined }}>
                        <option value="">— wybierz —</option>
                        <option value="producent">Prawa należą do producenta figurki</option>
                        <option value="zdjecie_produktu_oryginalnego">Zdjęcie oryginalnego produktu</option>
                        <option value="pobrane_z_sieci">Plik pobrany z sieci</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Źródłowy URL (skąd zdjęcie)</label>
                      <input className="form-input" type="text" placeholder="https://..." value={editForm.source_url || ''} onChange={e => setEditForm({...editForm, source_url: e.target.value})} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem', color: !editForm.image_rights_ack ? '#ff4757' : 'inherit' }}>
                    <input type="checkbox" checked={!!editForm.image_rights_ack} onChange={e => setEditForm({...editForm, image_rights_ack: e.target.checked})} />
                    Oświadczam, że mam podstawę do użycia tego zdjęcia (producent / oryginał produktu / dozwolone źródło). Wymagane, by dodać do Gabloty.
                  </label>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>URL Obrazka (np. miku_figure, albo pełny link http...) <FieldMark field="official_image_url" /></label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input className="form-input" type="text" value={editForm.official_image_url} onChange={e => setEditForm({...editForm, official_image_url: e.target.value})} style={{ width: '100%', borderColor: !editForm.official_image_url ? '#ff4757' : undefined }} />
                      {!editForm.official_image_url && <Lock size={16} color="#ff4757" style={{ position: 'absolute', right: '10px' }} title="Brak danych" />}
                    </div>
                    {imageStatus === true && (
                      <div style={{ marginTop: '1.5rem', width: '320px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Podgląd karty w Gablocie (Live):</label>
                        <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '368px', height: '500px' }}>
                          <div className="figure-card">
                            <div className="figure-name-badge">{editForm.name || 'Nazwa figurki'}</div>
                            <div className="ambient-light" style={{ background: generateGlowColor(editForm.name || 'x') }}></div>
                            <div className="figure-image-container">
                              <img src={getImageUrl(editForm.official_image_url)} alt="Podgląd" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = 'block'; }} />
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
                      <label>Dodatkowe informacje (Linijka po linijce) <FieldMark field="additional_info" /></label>
                      <textarea className="form-input" rows="3" value={editForm.additional_info ? editForm.additional_info.join('\n') : ''} onChange={e => setEditForm({...editForm, additional_info: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Gdzie szukać (Linijka po linijce) <FieldMark field="where_to_search" /></label>
                      <textarea className="form-input" rows="3" value={editForm.where_to_search ? editForm.where_to_search.join('\n') : ''} onChange={e => setEditForm({...editForm, where_to_search: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Strategia zakupowa (Linijka po linijce) <FieldMark field="strategy" /></label>
                      <textarea className="form-input" rows="3" value={editForm.strategy ? editForm.strategy.join('\n') : ''} onChange={e => setEditForm({...editForm, strategy: e.target.value ? e.target.value.split('\n') : null})} style={{ width: '100%' }}></textarea>
                    </div>
                    <div className="form-group">
                      <label>Wartość Rynkowa (Średnia) <FieldMark field="market_value" /></label>
                      <textarea className="form-input" rows="3" value={editForm.market_value?.average || ''} onChange={e => setEditForm({...editForm, market_value: { average: e.target.value }})} style={{ width: '100%' }}></textarea>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(168,85,247,0.35)', borderRadius: '12px', background: 'rgba(168,85,247,0.05)' }}>
                    <h5 style={{ margin: '0 0 0.75rem 0', opacity: 0.85 }}>🎬 Opcje shorta</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Scenariusz (tempo)</label>
                        <select className="form-input" value={shortOpts.preset} onChange={e => setShortOpts({ ...shortOpts, preset: e.target.value })} style={{ width: '100%' }}>
                          {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Kolor akcentu</label>
                        <select className="form-input" value={shortOpts.accent} onChange={e => setShortOpts({ ...shortOpts, accent: e.target.value })} style={{ width: '100%' }}>
                          {ACCENTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Muzyka</label>
                        <select className="form-input" value={shortOpts.music} onChange={e => setShortOpts({ ...shortOpts, music: e.target.value })} style={{ width: '100%' }}>
                          {MUSIC_TRACKS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Rozdzielczość</label>
                        <select className="form-input" value={shortOpts.resolution} onChange={e => setShortOpts({ ...shortOpts, resolution: e.target.value })} style={{ width: '100%' }}>
                          {RESOLUTIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Język shorta</label>
                        <select className="form-input" value={shortOpts.lang} onChange={e => setShortOpts({ ...shortOpts, lang: e.target.value })} style={{ width: '100%' }}>
                          {LANGS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Tekst CTA (outro) — puste = domyślny w wybranym języku</label>
                        <input className="form-input" type="text" value={shortOpts.cta} onChange={e => setShortOpts({ ...shortOpts, cta: e.target.value })} style={{ width: '100%' }} placeholder="(domyślny wg języka)" />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={() => handleRefreshPrices(fig)} style={{ border: '1px solid #3b82f6', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔄 Odśwież oferty (eBay)
                    </button>
                    <button className="btn-secondary" onClick={() => handleGenerateShort(fig)} style={{ border: '1px solid #a855f7', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🎬 Generuj teraz
                    </button>
                    <button className="btn-secondary" onClick={() => handleEnqueueShort(fig)} style={{ border: '1px solid #22c55e', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ➕ Dodaj do kolejki
                    </button>
                    <button className="btn-primary" onClick={() => setEditingId(null)} style={{ background: '#ff4757', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <X size={16} /> Anuluj Edycję
                    </button>
                  </div>

                  {(fig.video_url || fig.video_status) && (() => {
                    const [color, label] = videoStatusMeta(fig.video_status);
                    return (
                      <div style={{ marginTop: '1.5rem', padding: '1rem', border: `1px solid ${color}40`, borderRadius: '12px', background: 'rgba(128,128,128,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <h5 style={{ margin: 0, opacity: 0.85 }}>🎬 Moderacja shorta</h5>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color, border: `1px solid ${color}`, padding: '2px 10px', borderRadius: '999px' }}>{label}</span>
                        </div>

                        {fig.video_url ? (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <video
                              src={fig.video_url}
                              controls
                              playsInline
                              style={{ width: '200px', maxWidth: '100%', borderRadius: '10px', background: '#000', aspectRatio: '9 / 16' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: '220px' }}>
                              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
                                Obejrzyj i zdecyduj. Zatwierdzenie oznaczy short jako gotowy do kolejki publikacji (Google Drive).
                              </p>
                              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleModerateVideo(fig, 'approve')}
                                  disabled={fig.video_status === 'approved_for_publish' || fig.video_status === 'published'}
                                  style={{ background: '#2ecc71', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', opacity: (fig.video_status === 'approved_for_publish' || fig.video_status === 'published') ? 0.5 : 1 }}
                                >
                                  <Check size={16} /> Zatwierdź do publikacji
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleModerateVideo(fig, 're-render')}
                                  style={{ border: '1px solid #a855f7', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  🔄 Renderuj ponownie
                                </button>
                                <a href={fig.video_url} download style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#3b82f6' }}>
                                  ⬇️ Pobierz MP4
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : fig.video_status === 'published' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
                              📢 Opublikowany na Google Drive (skasowany z Supabase — bufor zwolniony).
                            </p>
                            {fig.drive_url && (
                              <a href={fig.drive_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                                ▶ Otwórz na Google Drive
                              </a>
                            )}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
                            {fig.video_status === 'rendering' ? 'Trwa renderowanie — odśwież za chwilę.'
                              : fig.video_status === 'queued' ? 'W kolejce renderu. Uruchom worker: npm run worker:watch'
                              : 'Brak wideo. Ustaw opcje i kliknij „Generuj teraz" lub „Dodaj do kolejki".'}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--color-bg-shelf)', border: '1px solid var(--color-text-highlight)', padding: '12px 24px', borderRadius: '8px', color: 'var(--color-text-highlight)', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s', fontWeight: 'bold' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
