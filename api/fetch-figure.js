import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import * as cheerio from "cheerio";

async function scrapeMFC(name) {
  try {
    const searchUrl = `https://myfigurecollection.net/browse.v4.php?keywords=${encodeURIComponent(name)}`;
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.item-icon a').attr('href');
    if (!firstLink) return null;

    const itemUrl = `https://myfigurecollection.net${firstLink}`;
    const itemRes = await fetch(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
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
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.hitItem a').attr('href');
    if (!firstLink) return null;

    const itemUrl = firstLink.startsWith('http') ? firstLink : `https://www.goodsmile.info${firstLink}`;
    const itemRes = await fetch(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!itemRes.ok) return null;
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const priceMatch = $item('.detailBox dt:contains("Price")').next('dd').text().trim();
    const specMatch = $item('.detailBox dt:contains("Specifications")').next('dd').text();
    const scale = specMatch ? (specMatch.match(/(1\/\d+)/)?.[1] || "") : "";
    const imgUrl = $item('.itemImg img').attr('src');

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
        // Używamy nowszego stabilnego modelu, z włączonym wyszukiwaniem Google
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-pro",
          tools: [{ googleSearch: {} }]
        });

        const prompt = `Jesteś ekspertem ds. figurek anime. Uzupełnij brakujące dane o figurce: "${name}". 
Obecne dane: ${JSON.stringify(figureData)}
ZASADY KRYTYCZNE:
1. Masz włączone narzędzie Google Search. Użyj go, aby przeszukać internet (w tym strony producentów np. Kotobukiya, MyFigureCollection, AmiAmi, Wikipedia).
2. Uzupełnij TYLKO puste pola (""). Nie nadpisuj tych, które już mają wartość.
3. NIE ZMYŚLAJ DANYCH.
4. Link do zdjęcia MUSI być prawdziwy, publiczny (.jpg/.png) pochodzący prosto z oficjalnych sklepów lub baz figurek.
Zwróć wynik TYLKO w czystym formacie JSON bez znaczników \`\`\`json. Format musi mieć dokładnie te same klucze co "Obecne dane".`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJsonStr);
        
        Object.keys(aiData).forEach(k => {
          if (!figureData[k] && aiData[k]) figureData[k] = aiData[k];
        });
      } catch (aiError) {
        console.error("Błąd AI podczas dopełniania:", aiError.message);
        // Kontynuujemy z tym co mamy
      }
    }

    // Przetwarzanie i konwersja obrazka WebP
    let supabaseImageUrl = '';
    
    if (figureData.official_image_url && figureData.official_image_url.startsWith('http') && !figureData.official_image_url.includes('supabase.co')) {
      console.log(`Pobieranie obrazka z URL: ${figureData.official_image_url}`);
      
      try {
        const imgResponse = await fetch(figureData.official_image_url);
        
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
