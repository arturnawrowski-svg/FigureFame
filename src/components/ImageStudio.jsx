import { useState } from 'react';
import { Wand2, Sparkles, Check, Loader2, RotateCcw } from 'lucide-react';

// ============================================================================
// ImageStudio (Etap 2, finał) — obróbka zdjęcia figurki:
//   • Usuwanie tła — @imgly/background-removal (WASM, w przeglądarce, DARMOWE).
//   • Światła gabloty — kompozycja na Canvas (ciemne tło + poświata + cień).
// FREE-FIRST: całość liczona po stronie klienta. Wynik wysyłany jako nowy
// kandydat do folderu roboczego (/api/upload-work-image).
// Uwaga: wymaga weryfikacji w przeglądarce (WASM/Canvas nie da się przetestować
// z terminala) — logika przygotowana, do sprawdzenia po odblokowaniu Storage.
// ============================================================================

function hexA(hex, a) {
  const h = (hex || '#ff9a3c').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Kompozycja „gabloty": ciemne tło, poświata za figurką, miękki cień, figurka na środku.
async function composeLights(sourceBlob, glowHex) {
  const bmp = await createImageBitmap(sourceBlob);
  const W = 900, H = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b1e25');
  bg.addColorStop(1, '#0b0c10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const gx = W / 2, gy = H * 0.42;
  const glow = ctx.createRadialGradient(gx, gy, 20, gx, gy, W * 0.62);
  glow.addColorStop(0, hexA(glowHex, 0.55));
  glow.addColorStop(0.5, hexA(glowHex, 0.16));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const pad = 0.82;
  const scale = Math.min((W * pad) / bmp.width, (H * pad) / bmp.height);
  const dw = bmp.width * scale, dh = bmp.height * scale;
  const dx = (W - dw) / 2, dy = (H - dh) / 2;

  // miękki cień pod figurką
  ctx.save();
  ctx.filter = 'blur(20px)';
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(W / 2, dy + dh - 8, dw * 0.34, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(bmp, dx, dy, dw, dh);
  bmp.close?.();

  return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/webp', 0.9));
}

export default function ImageStudio({ figureId, imageUrl, glowHex, onProcessed, onError }) {
  const [busy, setBusy] = useState('');            // '' | 'bg' | 'lights' | 'save'
  const [preview, setPreview] = useState(null);    // dataURL podglądu
  const [workingBlob, setWorkingBlob] = useState(null);

  const setResult = (blob) => {
    setWorkingBlob(blob);
    setPreview(URL.createObjectURL(blob));
  };

  const currentSource = async () => {
    if (workingBlob) return workingBlob;
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`Nie udało się pobrać zdjęcia (${res.status})`);
    return await res.blob();
  };

  const removeBg = async () => {
    setBusy('bg');
    try {
      const src = await currentSource();
      const { removeBackground } = await import('@imgly/background-removal'); // lazy — nie obciąża startu
      const out = await removeBackground(src);
      setResult(out);
    } catch (e) {
      console.error(e);
      onError?.(`Usuwanie tła nie powiodło się: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const addLights = async () => {
    setBusy('lights');
    try {
      const src = await currentSource();
      const out = await composeLights(src, glowHex);
      setResult(out);
    } catch (e) {
      console.error(e);
      onError?.(`Dodanie świateł nie powiodło się: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const reset = () => { setWorkingBlob(null); setPreview(null); };

  const useResult = async () => {
    if (!workingBlob) return;
    setBusy('save');
    try {
      const imageBase64 = await blobToBase64(workingBlob);
      const res = await fetch('/api/upload-work-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId, imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Zapis nie powiódł się');
      onProcessed?.(data.url);
      reset();
    } catch (e) {
      onError?.(`Zapis obrobionego zdjęcia nie powiódł się: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const Btn = ({ onClick, active, icon: Icon, children }) => (
    <button className="btn-secondary" onClick={onClick} disabled={!!busy}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
      {active ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />} {children}
    </button>
  );

  return (
    <div style={{ background: 'var(--color-bg-shelf)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1rem', margin: '0.5rem 0 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', opacity: 0.85 }}>
        <Wand2 size={18} /> <strong style={{ fontSize: '0.95rem' }}>Studio zdjęcia</strong>
        <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>usuwanie tła + światła gabloty (darmowe, w przeglądarce)</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: preview ? '1rem' : 0 }}>
        <Btn onClick={removeBg} active={busy === 'bg'} icon={Wand2}>Usuń tło</Btn>
        <Btn onClick={addLights} active={busy === 'lights'} icon={Sparkles}>Dodaj światła gabloty</Btn>
        {preview && <Btn onClick={reset} active={false} icon={RotateCcw}>Cofnij</Btn>}
      </div>

      {preview && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: '180px', height: '240px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-glass-border)', background: 'repeating-conic-gradient(#8883 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}>
            <img src={preview} alt="Podgląd obróbki" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <button className="btn-primary" onClick={useResult} disabled={!!busy}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Użyj tego zdjęcia
          </button>
        </div>
      )}
    </div>
  );
}
