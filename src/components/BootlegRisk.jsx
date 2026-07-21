import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Shield, Sparkles, Loader2 } from 'lucide-react';
import { computeBootlegRisk, RISK_META } from '../lib/bootlegRisk';

// ============================================================================
// BootlegRisk — panel „Bootleg Radar" (wyróżnik z PDF).
// Pokazuje prewalencję podróbek dla modelu (rule-based) + na żądanie generuje
// listę cech oryginału przez AI (/api/ask-figure). Bez bazy, bez zapisów.
// ============================================================================

export default function BootlegRisk({ figure }) {
  const { score, level, reasons } = computeBootlegRisk(figure);
  const meta = RISK_META[level];
  const [aiChecklist, setAiChecklist] = useState('');
  const [loading, setLoading] = useState(false);

  const Icon = level === 'high' ? ShieldAlert : level === 'medium' ? Shield : ShieldCheck;

  const askChecklist = async () => {
    if (loading || aiChecklist) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ask-figure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figure,
          question: 'Podaj krótką, punktową listę konkretnych cech, po których rozpoznam ORYGINAŁ tej figurki i odróżnię go od podróbki (bootlega). Skup się na tej figurce/serii.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd AI');
      setAiChecklist(data.answer);
    } catch (e) {
      setAiChecklist(`Nie udało się wygenerować listy: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--color-glass-bg)', border: `1px solid ${meta.color}55`, borderLeft: `4px solid ${meta.color}`, borderRadius: '16px', padding: '1.5rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
        <Icon size={26} color={meta.color} />
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: 'var(--color-text-highlight)' }}>Bootleg Radar</h3>
          <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Jak często ten model bywa podrabiany</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: meta.color, fontSize: '1.1rem' }}>Ryzyko: {meta.label}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{score}/100</div>
        </div>
      </div>

      {/* Pasek ryzyka */}
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(128,128,128,0.2)', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ width: `${score}%`, height: '100%', background: meta.color, transition: 'width 0.5s' }}></div>
      </div>

      <p style={{ fontSize: '0.9rem', opacity: 0.85, marginTop: 0 }}>{meta.hint}</p>

      <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0 1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.9rem' }}>
        {reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>

      {!aiChecklist && (
        <button className="btn-secondary" onClick={askChecklist} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generuję listę cech oryginału...' : 'Poproś AI o cechy oryginału'}
        </button>
      )}

      {aiChecklist && (
        <div style={{ marginTop: '0.5rem', background: 'var(--color-bg-shelf)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9rem' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-highlight)', marginBottom: '0.5rem' }}>
            <Sparkles size={16} /> Cechy oryginału (AI)
          </strong>
          {aiChecklist}
        </div>
      )}

      <p style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '1rem', marginBottom: 0 }}>
        Ocena orientacyjna na poziomie modelu, nie konkretnej oferty. Nie zastępuje weryfikacji sprzedawcy i zdjęć.
      </p>
    </div>
  );
}
