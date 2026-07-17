import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import * as cheerio from "cheerio";

const PROXY_URL = process.env.PROXY_URL; // np. "https://api.scraperapi.com?api_key=TWÓJ_KLUCZ&url="

// Helper do odpytywania stron z ominięciem Cloudflare jeśli ustalone jest PROXY
async function fetchWithProxy(url, options = {}) {
  if (PROXY_URL) {
    const fullUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    console.log("Fetching via proxy:", fullUrl);
    return fetch(fullUrl, options);
  }
  return fetch(url, options);
}

async function scrapeMFC(name) {
  try {
    const searchUrl = `https://myfigurecollection.net/browse.v4.php?keywords=${encodeURIComponent(name)}`;
    const res = await fetchWithProxy(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.item-icon a').attr('href');
    if (!firstLink) return null;

    const itemUrl = `https://myfigurecollection.net${firstLink}`;
    const itemRes = await fetchWithProxy(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!itemRes.ok) return null;
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const data = {
      japanese_name: $item('.form-field:contains("Japanese") .value').text().trim() || "",
      manufacturer: $item('.form-field:contains("Manufacturer") .value').text().trim() || "",
      series: $item('.form-field:contains("Origin") .value').text().trim() || "",
      scale: $item('.form-field:contains("Scale") .value').text().trim() || "",
      original_price: $item('.form-field:contains("Price") .value').text().trim() || "",
      official_image_url: $item('.item-picture img').attr('src') || ""
    };
    return data;
  } catch (e) {
    return null;
  }
}

async function scrapeGoodSmile(name) {
  try {
    const searchUrl = `https://www.goodsmile.info/en/products/search?utf8=%E2%9C%93&search%5Bquery%5D=${encodeURIComponent(name)}`;
    const res = await fetchWithProxy(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.hitItem a').attr('href');
    if (!firstLink) return null;

    const itemUrl = firstLink.startsWith('http') ? firstLink : `https://www.goodsmile.info${firstLink}`;
    const itemRes = await fetchWithProxy(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!itemRes.ok) return null;
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const priceMatch = $item('.detailBox dt:contains("Price")').next('dd').text().trim();
    const specMatch = $item('.detailBox dt:contains("Specifications")').next('dd').text();
    const scale = specMatch ? (specMatch.match(/(1\/\d+)/)?.[1] || "") : "";
    const imgUrl = $item('img[itemprop="image"]').attr('src');

    return {
      japanese_name: "", // Czasem brak na wersji EN
      manufacturer: "Good Smile Company",
      series: $item('.detailBox dt:contains("Series")').next('dd').text().trim() || "",
      scale: scale,
      original_price: priceMatch,
      official_image_url: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `https:${imgUrl}`) : ""
    };
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Missing figure name' });
  }

  console.log(`Rozpoczęto kaskadowe pobieranie danych dla: ${name}`);

  try {
    let figureData = {
      name: name,
      japanese_name: "",
      series: "",
      manufacturer: "",
      scale: "",
      original_price: "",
      official_image_url: ""
    };

    // OPCJA 1: MyFigureCollection
    console.log("-> Opcja 1: MyFigureCollection...");
    const mfcData = await scrapeMFC(name);
    if (mfcData) {
      console.log("Znaleziono w MFC!");
      Object.keys(mfcData).forEach(k => {
        if (mfcData[k]) figureData[k] = mfcData[k];
      });
    }

    // Sprawdzenie czy mamy braki
    const hasMissingFields = Object.values(figureData).some(val => !val);

    // OPCJA 2: GoodSmile Company
    if (hasMissingFields) {
      console.log("-> Opcja 2: GoodSmile...");
      const gscData = await scrapeGoodSmile(name);
      if (gscData) {
        console.log("Znaleziono w GSC!");
        Object.keys(gscData).forEach(k => {
          if (!figureData[k] && gscData[k]) figureData[k] = gscData[k];
        });
      }
    }

    // Sprawdzenie czy NADAL mamy braki
    const stillHasMissingFields = Object.values(figureData).some(val => !val);

    // OPCJA 3: AI (Gemini)
    if (stillHasMissingFields) {
      console.log("-> Opcja 3: AI Gemini (Wypełnianie braków)...");
      try {
        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-flash-latest",
          tools: [{ googleSearch: {} }]
        });

        const prompt = `Jesteś ekspertem ds. figurek anime. Uzupełnij brakujące dane (jeśli możliwe i wyszukaj je korzystając z wyszukiwarki Google) dla figurki anime z poniższych danych: ${JSON.stringify(figureData)}.
        Wyszukaj również po japońskiej nazwie aby mieć pewność.
        Zwróć wynik TYLKO jako czysty obiekt JSON (bez znaczników markdown typu \`\`\`json i bez dodatkowego tekstu), z ewentualnie poprawionymi lub uzupełnionymi kluczami:
        - name (angielska nazwa postaci i wersji)
        - japanese_name (jeśli puste, znajdź japońskie znaki)
        - series (pełna nazwa serii anime/mangi)
        - manufacturer (np. Good Smile Company, Kotobukiya)
        - scale (jeśli dotyczy)
        - original_price (np. 14800 JPY)
        - official_image_url (bezpośredni link do największego oficjalnego zdjęcia produktu, absolutnie kluczowe)
        - additional_info (krótki, 2-zdaniowy zarys kim jest ta postać lub z czego słynie figurka)
        - market_value_average (jaka jest jej średnia wartość rynkowa na rynku wtórnym obecnie, wpisz kwotę w PLN lub USD lub JPY)
        - where_to_search (gdzie obecnie najlepiej szukać tej figurki żeby ją kupić, wymień ze 3 serwisy)
        - strategy (czy radzisz kupić teraz bo drożeje, czy poczekać na re-release itp.)
        Klucze muszą być dokładnie w języku angielskim jak wyżej. Nie pomijaj żadnego klucza. Jeśli nie znalazłeś info - zostaw wartość jako pusty string.`;
        
        let responseText = "";
        try {
            const result = await model.generateContent(prompt);
            responseText = result.response.text();
        } catch (err1) {
            console.error("Pierwszy klucz API padł:", err1.message);
            if (process.env.VITE_GEMINI_API_KEY_2) {
                console.log("Próbuję z użyciem klucza zapasowego...");
                const genAI2 = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY_2);
                const model2 = genAI2.getGenerativeModel({ 
                  model: "gemini-flash-latest",
                  tools: [{ googleSearch: {} }]
                });
                const result2 = await model2.generateContent(prompt);
                responseText = result2.response.text();
            } else {
                throw err1; // brak drugiego klucza, rzucamy dalej
            }
        }

        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJsonStr);
        
        Object.keys(aiData).forEach(k => {
          if (k === 'market_value_average') {
            figureData.marketValueAverage = aiData[k];
          } else if (k === 'additional_info') {
            figureData.additionalInfo = aiData[k];
          } else if (k === 'where_to_search') {
            figureData.whereToSearch = aiData[k];
          } else if (k === 'strategy') {
            figureData.strategy = aiData[k];
          } else if (!figureData[k] && aiData[k]) {
            figureData[k] = aiData[k];
          }
        });
      } catch (aiError) {
        console.error("Błąd AI podczas dopełniania:", aiError.message);
        figureData._aiError = aiError.message;
      }
    }

    // Przetwarzanie i konwersja obrazka WebP
    let supabaseImageUrl = '';
    
    if (figureData.official_image_url && figureData.official_image_url.startsWith('http') && !figureData.official_image_url.includes('supabase.co')) {
      console.log(`Pobieranie obrazka z URL: ${figureData.official_image_url}`);
      
      try {
        const imgResponse = await fetchWithProxy(figureData.official_image_url);
        
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          console.log('Konwersja na WebP...');
          const webpBuffer = await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer();
          
          const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.webp`;
          const supabaseUrl = process.env.VITE_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
          
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          const { error: uploadError } = await supabase
            .storage
            .from('figure-images')
            .upload(filename, webpBuffer, {
              contentType: 'image/webp',
              upsert: true
            });
            
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('figure-images').getPublicUrl(filename);
            supabaseImageUrl = publicUrlData.publicUrl;
            figureData.official_image_url = supabaseImageUrl;
          }
        }
      } catch (imgError) {
        console.error('Błąd konwersji obrazka:', imgError.message);
      }
    }

    res.status(200).json(figureData);
  } catch (error) {
    console.error("Błąd głównej funkcji API:", error);
    res.status(500).json({ error: error.message });
  }
}
