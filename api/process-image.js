import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PROXY_URL = process.env.PROXY_URL; // e.g. "https://api.scraperapi.com?api_key=KEY&url="

// Helper do odpytywania stron z ominięciem Cloudflare (jeśli proxy ustalone)
async function fetchWithProxy(url, options = {}) {
  if (PROXY_URL && !url.includes('supabase.co')) {
    const fullUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    console.log("Fetching image via proxy:", fullUrl);
    return fetch(fullUrl, options);
  }
  return fetch(url, options);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    const imageResponse = await fetchWithProxy(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image. Status: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
    const { data, error } = await supabase.storage
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
