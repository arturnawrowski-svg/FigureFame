import { useState, useRef } from 'react';
import { Upload, ImagePlus, Loader2 } from 'lucide-react';

// ============================================================================
// ImageUploader (Etap 2) — upload zdjęcia-kandydata do FOLDERU ROBOCZEGO figurki.
// FREE-FIRST: konwersja do WebP odbywa się w przeglądarce (Canvas) — serwer nic
// nie liczy, a payload jest mały. Wysyłka idzie do endpointu serwerowego
// (klucz service_role omija RLS → ZERO zmian w bazie/Supabase po Twojej stronie).
// Plik ląduje w: figure-images/_work/{figureId}/{uuid}.webp
// ============================================================================

const MAX_DIM = 1400;       // maks. dłuższy bok (px) — trzyma pliki lekkie
const WEBP_QUALITY = 0.85;

async function fileToWebpBlob(file) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (Math.max(width, height) > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Konwersja do WebP nie powiodła się'))),
      'image/webp',
      WEBP_QUALITY
    );
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]); // bez prefiksu data:
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ImageUploader({ figureId, onUploaded, onError }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    if (!figureId) {
      onError?.('Brak ID figurki — zapisz ją najpierw, potem dodaj zdjęcie.');
      return;
    }
    setBusy(true);
    try {
      const file = files[0]; // jeden kadr na raz; można wgrywać kolejne
      const webp = await fileToWebpBlob(file);
      const imageBase64 = await blobToBase64(webp);

      const res = await fetch('/api/upload-work-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId, imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload nie powiódł się');

      onUploaded?.(data.url, { path: data.path, source: 'upload' });
    } catch (e) {
      console.error(e);
      onError?.(`Błąd uploadu: ${e.message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      style={{
        border: '2px dashed var(--color-glass-border)',
        borderRadius: '12px',
        padding: '1.25rem',
        textAlign: 'center',
        background: 'rgba(128,128,128,0.05)',
        cursor: busy ? 'wait' : 'pointer',
      }}
      onClick={() => !busy && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.9 }}>
          <Loader2 size={18} className="animate-spin" /> Konwersja do WebP i wysyłka...
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: 0.85 }}>
          <ImagePlus size={20} />
          <span>Przeciągnij zdjęcie lub <strong>kliknij, aby wybrać plik</strong></span>
          <Upload size={16} style={{ opacity: 0.6 }} />
        </div>
      )}
      <div style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '8px' }}>
        Plik trafi do folderu roboczego jako kandydat. Ostateczny wybór zatwierdzasz przyciskiem „Dodaj do Gabloty".
      </div>
    </div>
  );
}
