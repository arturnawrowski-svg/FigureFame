import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';

// ============================================================================
// AskAI — „Ask AI about this figure" (flagowy wyróżnik z PDF).
// Kontekstowy czat kolekcjonera: pyta o autentyczność, cenę, gdzie kupić itd.
// Wysyła dane figurki + pytanie do /api/ask-figure (darmowa warstwa multi-AI).
// ============================================================================

const SUGGESTIONS = [
  'Jak rozpoznać oryginał od podróbki?',
  'Czy to dobra cena?',
  'Gdzie najlepiej ją teraz kupić?',
  'Czy warto czekać na re-release?',
];

export default function AskAI({ figure }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput('');
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ask-figure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figure, question, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd asystenta');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Przepraszam, coś poszło nie tak: ${e.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ask-ai" style={{ background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', borderRadius: '16px', padding: '1.5rem', marginTop: '2rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, color: 'var(--color-text-highlight)' }}>
        <Sparkles size={22} /> Zapytaj AI o tę figurkę
      </h3>
      <p style={{ opacity: 0.7, marginTop: 0, fontSize: '0.9rem' }}>
        Asystent kolekcjonera — autentyczność, ceny, gdzie kupić, strategia. Odpowiedzi mają charakter pomocniczy.
      </p>

      {messages.length > 0 && (
        <div
          ref={threadRef}
          style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', margin: '1rem 0', paddingRight: '4px' }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--color-text-highlight)' : 'var(--color-bg-shelf)',
                color: m.role === 'user' ? 'var(--color-bg-shelf)' : (m.error ? '#ff6b6b' : 'var(--color-text-main)'),
                border: m.role === 'user' ? 'none' : '1px solid var(--color-glass-border)',
                borderRadius: '12px',
                padding: '10px 14px',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                fontSize: '0.92rem',
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, padding: '10px 14px' }}>
              <Loader2 size={16} className="animate-spin" /> Asystent myśli...
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '1rem 0' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 12px', borderRadius: '20px', opacity: 0.9 }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
        <input
          className="form-input"
          type="text"
          placeholder="Zadaj pytanie o tę figurkę..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          maxLength={500}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Send size={16} /> Wyślij
        </button>
      </form>
    </div>
  );
}
