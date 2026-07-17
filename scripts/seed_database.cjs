const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");
require('dotenv').config({ path: '.env.local' });

// -------------------------------------------------------------
// SCRIPT: Figure Database Seeder
// Run via: node seed_database.js
// -------------------------------------------------------------

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("=== START SEEDING FIGURES ===");
  
  if (!process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error("Brak klucza Gemini API w .env.local!");
    return;
  }
  
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Brak konfiguracji Supabase w .env.local!");
    return;
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  // Pytamy Gemini o listę topowych figurek. By uniknąć limitów, zrobimy to w małych paczkach (np. 10 naraz).
  const prompt = `Zwróć tablicę JSON zawierającą dane 10 najpopularniejszych i kultowych japońskich figurek PVC (np. Hatsune Miku, Saber, Asuka, Rem).
Wymagania krytyczne:
1. Nie zmyślaj linków. Pole "official_image_url" MUSI prowadzić bezpośrednio do pliku .jpg lub .png. Jeśli nie masz pewności, wstaw "".
2. Zwróć CZYSTY JSON bez znaczników formatowania (bez \`\`\`json).
Format:
[
  {
    "name": "Imię Postaci",
    "japanese_name": "Japońska nazwa",
    "series": "Seria",
    "manufacturer": "Producent",
    "scale": "Skala",
    "original_price": "Cena JPY",
    "official_image_url": "URL zdjęcia w JPG"
  }
]`;

  console.log("Generowanie listy przez AI...");
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  let figuresList = [];
  try {
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    figuresList = JSON.parse(cleanJson);
  } catch (err) {
    console.error("Błąd parsowania JSON od AI:", text);
    return;
  }

  console.log(`Wygenerowano ${figuresList.length} figurek do pobrania.`);

  for (const fig of figuresList) {
    console.log(`Przetwarzanie: ${fig.name}`);
    
    let imageUrl = '';
    if (fig.official_image_url && fig.official_image_url.startsWith('http')) {
      try {
        console.log(`Pobieranie zdjęcia z ${fig.official_image_url}...`);
        const imgRes = await fetch(fig.official_image_url);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
          
          const filename = `${fig.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.webp`;
          const { error: uploadError } = await supabase.storage.from('figure-images').upload(filename, webpBuffer, { contentType: 'image/webp' });
          
          if (!uploadError) {
            const { data } = supabase.storage.from('figure-images').getPublicUrl(filename);
            imageUrl = data.publicUrl;
            console.log("Zapisano WebP w Supabase.");
          } else {
            console.log("Błąd uploadu: ", uploadError.message);
          }
        }
      } catch (err) {
        console.log("Nie udało się pobrać zdjęcia: ", err.message);
      }
    }

    // Insert do tabeli figures
    const { error: dbError } = await supabase.from('figures').insert({
      name: fig.name,
      japanese_name: fig.japanese_name,
      series: fig.series,
      manufacturer: fig.manufacturer,
      scale: fig.scale,
      original_price: fig.original_price,
      official_image_url: imageUrl,
      status: 'APPROVED',
      submitted_by: null
    });

    if (dbError) {
      console.error(`Błąd bazy danych dla ${fig.name}: `, dbError.message);
    } else {
      console.log(`✅ Zapisano ${fig.name} w bazie!`);
    }

    // Opóźnienie by nie dostać bana na API lub rate limit
    await delay(3000); 
  }
  
  console.log("=== ZAKOŃCZONO SEEDOWANIE ===");
  console.log("UWAGA: Możesz uruchomić ten skrypt ponownie, aby dodać kolejne 10 figurek.");
}

main();
