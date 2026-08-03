import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, X, Loader2, Trash2 } from 'lucide-react';

// ============================================================================
// ChatKatalogu — asystent znający zatwierdzony katalog FigureFame.
// ----------------------------------------------------------------------------
// Montowany RAZ, w App.jsx. Otwierany zdarzeniem, nie propsem:
//
//     window.dispatchEvent(new Event('open-chat'))
//     window.dispatchEvent(new CustomEvent('open-chat', { detail: { figureId } }))
//
// Dzięki temu przycisk w nagłówku, odnośnik w stopce i przycisk przy figurce
// robią dokładnie to samo, nie wiedząc o sobie nawzajem i nie przekazując
// niczego przez drzewo komponentów.
//
// Rozmowa siedzi w localStorage, NIE w profilu użytkownika — świadomie:
// to notatnik na tym urządzeniu, a nie dane konta. Nie trzeba być zalogowanym,
// nie trzeba nic kasować przy usuwaniu konta.
//
// Wzorzec otwierania zdarzeniem przejęty z Impresji. Sam mechanizm odpowiedzi
// jest inny: tam czat dopasowuje słowa kluczowe do lokalnych danych, tutaj
// odpowiada AI na podstawie katalogu.
//
// Pływającego przycisku w rogu tu NIE MA — patrz komentarz przy `return`.
// ============================================================================

const KLUCZ = 'ff_chat';
const MAX_HISTORII = 30;   // starsze wiadomości odpadają — inaczej rośnie bez końca

const PODPOWIEDZI = [
  'Jakie figurki macie w bazie?',
  'Jak rozpoznać podróbkę?',
  'Która jest najdroższa?',
];

function wczytaj() {
  try {
    const s = localStorage.getItem(KLUCZ);
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v.slice(-MAX_HISTORII) : [];
  } catch {
    return [];   // uszkodzony wpis nie może wywalić całej strony
  }
}

export default function ChatKatalogu() {
  const [otwarty, setOtwarty] = useState(false);
  const [wiadomosci, setWiadomosci] = useState(wczytaj);
  const [tekst, setTekst] = useState('');
  const [czeka, setCzeka] = useState(false);
  const [figureId, setFigureId] = useState(null);
  const watekRef = useRef(null);
  const poleRef = useRef(null);

  // Jedno wejście dla wszystkich przycisków w serwisie.
  useEffect(() => {
    const otworz = (e) => {
      setFigureId(e.detail?.figureId ?? null);
      setOtwarty(true);
    };
    window.addEventListener('open-chat', otworz);
    return () => window.removeEventListener('open-chat', otworz);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KLUCZ, JSON.stringify(wiadomosci.slice(-MAX_HISTORII))); } catch { /* brak miejsca nie może psuć rozmowy */ }
  }, [wiadomosci]);

  useEffect(() => {
    if (watekRef.current) watekRef.current.scrollTop = watekRef.current.scrollHeight;
  }, [wiadomosci, czeka, otwarty]);

  useEffect(() => {
    if (otwarty) poleRef.current?.focus();
  }, [otwarty]);

  // Escape zamyka — odruch, którego ludzie oczekują po każdym oknie.
  useEffect(() => {
    if (!otwarty) return;
    const naKlawisz = (e) => { if (e.key === 'Escape') setOtwarty(false); };
    window.addEventListener('keydown', naKlawisz);
    return () => window.removeEventListener('keydown', naKlawisz);
  }, [otwarty]);

  const wyslij = useCallback(async (tresc) => {
    const pytanie = (tresc ?? tekst).trim();
    if (!pytanie || czeka) return;
    setTekst('');
    const historia = wiadomosci.map((m) => ({ role: m.role, content: m.content }));
    setWiadomosci((p) => [...p, { role: 'user', content: pytanie }]);
    setCzeka(true);
    try {
      const res = await fetch('/api/ask-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pytanie, history: historia, figureId }),
      });
      const dane = await res.json();
      if (!res.ok) throw new Error(dane.error || 'Asystent nie odpowiedział');
      setWiadomosci((p) => [...p, { role: 'assistant', content: dane.answer }]);
    } catch (e) {
      setWiadomosci((p) => [...p, { role: 'assistant', content: `Przepraszam, coś poszło nie tak: ${e.message}`, blad: true }]);
    } finally {
      setCzeka(false);
    }
  }, [tekst, czeka, wiadomosci, figureId]);

  return (
    <>
      {/* Własnego przycisku ten komponent NIE MA — i to jest celowe.
          Pływające kółko w rogu było czwartym wejściem do tej samej rozmowy
          obok nagłówka, stopki i karty figurki, a przy tym jedynym elementem
          serwisu leżącym na treści. Zostały wejścia, które stoją w układzie
          strony; wszystkie wołają to samo zdarzenie `open-chat`. */}
      {otwarty && (
        <div className="chat-okno" role="dialog" aria-label="Czat o figurkach">
          <header className="chat-belka">
            <span className="chat-tytul">
              <MessageCircle size={18} /> Zapytaj o figurki
            </span>
            <span style={{ display: 'flex', gap: '4px' }}>
              {wiadomosci.length > 0 && (
                <button
                  className="chat-ikona"
                  onClick={() => setWiadomosci([])}
                  aria-label="Wyczyść rozmowę"
                  title="Wyczyść rozmowę"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button className="chat-ikona" onClick={() => setOtwarty(false)} aria-label="Zamknij czat">
                <X size={18} />
              </button>
            </span>
          </header>

          <div className="chat-watek" ref={watekRef}>
            {wiadomosci.length === 0 && (
              <div className="chat-powitanie">
                <p>
                  Pytaj o figurki, które mamy w bazie — dane, ceny, ryzyko podróbki.
                  Odpowiadam na podstawie <strong>zatwierdzonego katalogu</strong>.
                </p>
                <div className="chat-podpowiedzi">
                  {PODPOWIEDZI.map((s) => (
                    <button key={s} onClick={() => wyslij(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {wiadomosci.map((m, i) => (
              <div key={i} className={`chat-wiadomosc chat-${m.role}${m.blad ? ' chat-blad' : ''}`}>
                {m.content}
              </div>
            ))}

            {czeka && (
              <div className="chat-wiadomosc chat-assistant chat-czeka">
                <Loader2 size={16} className="chat-obrot" /> Szukam w katalogu…
              </div>
            )}
          </div>

          <form
            className="chat-pole"
            onSubmit={(e) => { e.preventDefault(); wyslij(); }}
          >
            <input
              ref={poleRef}
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              placeholder="Zapytaj o figurkę…"
              maxLength={500}
              aria-label="Treść pytania"
            />
            <button type="submit" disabled={czeka || !tekst.trim()} aria-label="Wyślij pytanie">
              <Send size={18} />
            </button>
          </form>

          <p className="chat-stopka">
            Odpowiedzi mają charakter pomocniczy. Rozmowa zostaje w tej przeglądarce.
          </p>
        </div>
      )}
    </>
  );
}
