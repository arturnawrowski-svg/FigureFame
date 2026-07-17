import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Missing figure name' });
  }

  console.log(`Pobieranie danych dla: ${name}`);

  try {
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Step 1: Use Gemini to find data
    const prompt = `Jesteś ekspertem ds. figurek anime. Przeszukaj swoją bazę wiedzy i znajdź oficjalne dane o figurce o nazwie: "${name}". 
Jeżeli figurka ma wiele wersji, wybierz najbardziej standardową lub popularną (np. 1/7 scale PVC).

ZASADY KRYTYCZNE (BEZWZGLĘDNIE PRZESTRZEGAJ):
1. NIE ZMYŚLAJ DANYCH. Jeśli nie znasz oficjalnej japońskiej nazwy, zostaw pole jako pusty ciąg znaków "".
2. NIE GENERUJ FIKCYJNYCH LINKÓW DO ZDJĘĆ. Musisz znaleźć RZECZYWISTY, działający publicznie URL oryginalnego zdjęcia na stronach producenta (GoodSmile) lub baz (MyFigureCollection, AmiAmi). Jeśli nie masz 100% pewności, że link istnieje w rzeczywistości, zostaw pole "official_image_url" CAŁKOWICIE PUSTE ("").
3. Korzystaj tylko z weryfikowalnych źródeł. Nie wymyślaj cen ani dat.

Zwróć wynik TYLKO w czystym formacie JSON bez znaczników \`\`\`json. Format odpowiedzi:
{
  "name": "${name}",
  "japanese_name": "Japońska nazwa (tylko prawdziwa, inaczej \"\")",
  "series": "Seria/Anime z którego pochodzi (np. Hatsune Miku, Evangelion)",
  "manufacturer": "Producent (np. Good Smile Company, Alter)",
  "scale": "Skala (np. 1/7, 1/8, Non-scale)",
  "original_price": "Cena w JPY w momencie premiery (np. 15000 JPY)",
  "official_image_url": "Bezpośredni publiczny URL do dużego oficjalnego zdjęcia figurki w JPG/PNG. TYLKO PRAWDZIWY LINK. Inaczej zostaw puste."
}`;

    console.log('Wysyłam zapytanie do Gemini API...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('Odpowiedź Gemini:', responseText);

    let figureData;
    try {
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      figureData = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.error("Błąd parsowania JSON od AI:", e, responseText);
      return res.status(500).json({ error: 'AI returned invalid JSON format' });
    }

    // Step 2: Download and convert image if available
    let supabaseImageUrl = '';
    
    if (figureData.official_image_url && figureData.official_image_url.startsWith('http')) {
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
          
          // Generate unique filename
          const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.webp`;
          
          const supabaseUrl = process.env.VITE_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
          
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          console.log(`Upload do Supabase Storage jako: ${filename}...`);
          const { error: uploadError } = await supabase
            .storage
            .from('figure-images')
            .upload(filename, webpBuffer, {
              contentType: 'image/webp',
              upsert: true
            });
            
          if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage.from('figure-images').getPublicUrl(filename);
            supabaseImageUrl = publicUrlData.publicUrl;
            console.log('Upload zakończony sukcesem:', supabaseImageUrl);
          }
        } else {
          console.warn(`Obrazek niedostępny (HTTP ${imgResponse.status}) z podanego linku AI`);
        }
      } catch (imgError) {
        console.error('Błąd pobierania/konwersji obrazka:', imgError.message);
      }
    }
    
    // Replace the raw URL with our self-hosted WebP url
    figureData.official_image_url = supabaseImageUrl;

    res.status(200).json(figureData);
  } catch (error) {
    console.error("Błąd głównej funkcji API:", error);
    res.status(500).json({ error: error.message });
  }
}
