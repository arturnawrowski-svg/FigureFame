import sharp from "sharp";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { BROWSER_UA } from "../server-lib/lookupShared.js";
import { wymagajModeratora } from "../server-lib/wymagajModeratora.js";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB — ochrona przed nadużyciem

const PROXY_URL = process.env.PROXY_URL; // e.g. "https://api.scraperapi.com?api_key=KEY&url="

// Pobranie zdjęcia: NAJPIERW wprost, pośrednik dopiero gdy się nie uda.
//
// Wcześniej było odwrotnie — wszystko szło przez płatnego pośrednika. To błąd
// z dwóch powodów. Serwery ze zdjęciami produktów (Good Smile, Kotobukiya)
// oddają pliki każdemu, bo chcą, żeby sklepy je pokazywały; Cloudflare broni
// stron HTML, nie obrazków. Więc pośrednik nic tu nie dawał, a kosztował.
// Gorzej: gdy jego klucz wygasł, zwracał 401 i zapis figurki wywalał się
// komunikatem „Failed to fetch image", mimo że zdjęcie było dostępne wprost.
async function fetchImage(url, options = {}) {
  try {
    const direct = await fetch(url, options);
    if (direct.ok) return direct;
    console.log(`Bezpośrednio ${direct.status} — próbuję przez pośrednika`);
  } catch (e) {
    console.log(`Bezpośrednio nie wyszło (${e.message}) — próbuję przez pośrednika`);
  }

  if (!PROXY_URL || url.includes('supabase.co')) {
    // Nie ma czym ponowić — oddajemy uczciwą porażkę zamiast udawać.
    return fetch(url, options);
  }
  return fetch(`${PROXY_URL}${encodeURIComponent(url)}`, options);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Jak w finalize-image: serwer ściąga podany adres i zapisuje u nas.
  if (!(await wymagajModeratora(req, res))) return;

  try {
    const supabase = getSupabaseAdmin();
    let body = req.body;
    // Vite middleware dostarcza body w różny sposób, czasem jako Buffer, czasem parsuje.
    // Upewniamy się, że mamy obiekt JSON.
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    }

    const { imageUrl, figureName } = body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl' });
    }

    console.log(`Pobieranie obrazu: ${imageUrl}`);

    // Pobierz obraz z zewnętrznego adresu
    const imageResponse = await fetchImage(imageUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image. Status: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: `Obraz za duży (${Math.round(buffer.length / 1024 / 1024)} MB, limit 15 MB)` });
    }

    // Konwersja na webp za pomocą sharp
    console.log("Konwersja obrazu do WEBP...");
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    // Wygeneruj unikalną nazwę pliku
    const timestamp = Date.now();
    const sanitizedName = (figureName || 'figure')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    
    const fileName = `${sanitizedName}_${timestamp}.webp`;
    console.log(`Wgrywanie pliku do Supabase Storage: ${fileName}`);

    // Upload do Supabase Storage
    const { error } = await supabase.storage
      .from('figure-images')
      .upload(fileName, webpBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Supabase storage error:", error);
      throw error;
    }

    // Zdobądź publiczny URL
    const { data: publicUrlData } = supabase.storage
      .from('figure-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Sukces! Nowy URL: ${publicUrl}`);

    return res.status(200).json({ url: publicUrl });

  } catch (err) {
    console.error("Błąd podczas przetwarzania obrazu:", err);
    return res.status(500).json({ error: err.message });
  }
}
