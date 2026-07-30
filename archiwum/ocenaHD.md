# Dodatkowa ocena HD — FigureFame.com (poza wcześniejszym planem)

Rzeczy, które sam z siebie zauważyłem przeglądając Twój projekt, a które nie padły wcześniej w planie rozwojowym.

---

## 1. 🔴 BŁĄD W index.html — canonical URL

```html
<link rel="canonical" href="https://figure-fame.vercel.app/" />
```

To adres Vercel, **nie figurefame.com**. Google zaindeksuje `figure-fame.vercel.app` zamiast Twojej domeny. Obrazek `og-image.png` też wskazuje na Vercel. Przez to:
- Osoba klikająca w link z Discorda wyląduje na Vercel.app, nie na Twojej domenie
- Google uzna figure-fame.vercel.app za główny adres strony
- Przy przekierowaniu na figurefame.com stracisz SEO

**Fix:** zmień na `https://figurefame.com/` przed premierą. Dotyczy to 3 miejsc w `index.html`:
- canonical
- og:url
- og:image

---

## 2. 🟡 Brak favicon.ico (stary standard)

Masz `favicon.png` w public/, ale brak `favicon.ico`. Niektóre przeglądarki (Internet Explorer, starsze Androida, zakładki w pasku Windows) nie czytają PNG jako favicon.

**Fix:** przekonwertuj favicon.png → favicon.ico (16×16 lub 32×32) i dodaj do `index.html`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

---

## 3. 🔴 Zero statystyk — Google Analytics / Vercel Analytics

Ani GA4, ani Plausible, ani żadnego licznika. Bez danych nie wiesz:
- Skąd przychodzą użytkownicy
- Które figurki oglądają najczęściej
- Gdzie odchodzą (drop-off)
- Czy shorty faktycznie kierują ruch na stronę

Vercel Analytics jest **darmowy** i nie wymaga ciasteczek (nie narusza RODO). Możesz go włączyć w dashboardzie Vercel bez zmiany kodu (jedna linia w `index.html`).

---

## 4. 🟡 Schema.org / JSON-LD dla wyszukiwarek

Brak znaczników schema.org. Figurki kolekcjonerskie to produkt — Google ma dedykowany schema `Product` z polami `brand`, `sku`, `offers`, `aggregateRating`. Dla każdej figurki w bazie możesz generować JSON-LD dynamicznie.

**Przykład:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Izumi Konata 1/8 Clayz",
  "brand": "Clayz",
  "category": "Anime Figure",
  "offers": { "@type": "Offer", "price": "6000", "priceCurrency": "JPY" }
}
```

To daje **rich snippets** w Google (zdjęcie, cena, rating) co zwiększa CTR o 20-40%. Możesz generować JSON-LD w `api/fetch-figure.js` przy zwracaniu danych figurki.

---

## 5. 🟢 Google News / Discover — przygotuj feed

Po premierze Google Discover może podbierać Twoje treści. Wymaga:
- Sitemap.xml z datami modyfikacji (masz endpoint `api/sitemap.js` — sprawdź czy generuje daty)
- Wyraźnej daty publikacji w HTML (`<time>` tag)
- Obrazków w odpowiedniej rozdzielczości (co najmniej 1200px szerokości)

---

## 6. 🟡 WebP nie jest wspierane wszędzie

W `server-lib/figureImage.js` konwertujesz zdjęcia do WebP. To działa w ~97% przeglądarek, ale Safari na iOS 14 i starsze oraz Samsung Internet nie obsługują WebP. Brak fallbacku do JPEG.

**Fix prosty:** przy uploadzie trzymaj dwie wersje — `nazwa.webp` + `nazwa.jpg` (sharp umie zrobić obie za jednym razem). W komponencie obrazka:
```jsx
<picture>
  <source srcset={img.webp} type="image/webp" />
  <img src={img.jpg} alt={name} />
</picture>
```

To ~3% użytkowników, którzy dziś widzą pustą kartę w Gablocie.

---

## 7. 🟢 Prawdziwy API Key rotation dla AI

W `aiClient.js` trzymasz klucze 7 providerów. Jeśli klucz Gemini wygaśnie, przełączasz się w runtime. Ale **nie masz monitorowania które API jest akurat pod limitem**.

**Prosty healthcheck:**
- `api/health-ai.js` — pinguje każdego providera (szybki prompt "hi") i zwraca status
- Dashboard admina pokazuje zielone/czerwone światełka dla każdego API
- Jeśli 3 razy z rzędu któryś zwraca 429, automatycznie go wyłącz na godzinę

---

## 8. 🟢 Formularz dodawania figurki nie działa offline

`lookupWorker.mjs` działa lokalnie (Playwright). Jeśli admin uruchamia go, a potem klika "dodaj" — formularz wysyła request do API na Vercel. Jeśli akurat nie ma internetu, dane przepadają.

**Rozwiązanie:** queue offline w localStorage. Zapisuj zgłoszenie lokalnie, wyślij przy najbliższym połączeniu. `navigator.onLine` + zdarzenie `online` — ~20 linii JavaScript.

---

## 9. 🔴 Brak ostrzeżenia o ciasteczkach (RODO)

W projekcie nie ma banneru "Ta strona używa ciasteczek". Nawet jeśli nie używasz śledzących (GA4 nie wdrożone), Supabase Auth używa localStorage do sesji — a to może podlegać obowiązkowi informacyjnemu w UE.

**Fix:** prosty, statyczny banner bez zależności:
```jsx
function CookieBanner() {
  const [ok, setOk] = useState(localStorage.getItem('cookies-ok'))
  if (ok) return null
  return (
    <div className="cookie-banner">
      <p>Używamy niezbędnych ciasteczek do logowania.</p>
      <button onClick={() => { localStorage.setItem('cookies-ok', '1'); setOk(true) }}>OK</button>
    </div>
  )
}
```

---

## 10. 🟢 System notyfikacji o zmianie ceny

Skoro masz `refresh-prices.js` i będziesz odświeżał ceny codziennie — możesz dodać powiadomienie: jeśli cena figurki spadnie o X%, wyślij maila do użytkowników którzy mają tę figurkę w "obserwowanych".

To robi różnicę między "katalogiem figurek" a **"narzędziem kolekcjonera"**. MFC nie ma czegoś takiego — to Twoja przewaga konkurencyjna.

**Przewaga biznesowa:** użytkownik dostaje maila "Figurka Rem za 12000 JPY zamiast 18000 — kup teraz". Kliknięcie → link afiliacyjny → prowizja. Wszyscy wygrywają.

---

## 11. 🟡 API rate limiting na Vercel

Vercel Hobby plan ma limit ~100k requestów/miesiąc na funkcje serverless. Jeśli opublikujesz shorta który trafi (załóżmy 10k wyświetleń, 5% kliknie w link = 500 wejść), każda karta figurki to osobna funkcja serverless. Grupa znajomych z Discorda w 5 minut może zrobić 500 requestów.

**Fix:** cache'uj odpowiedzi przez `Cache-Control` header na popularnych endpointach. Dla Gabloty:
```js
res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
```

To z automatu cache'uje odpowiedzi na Vercel Edge. Darmowe, nic nie wgrywasz.

---

## 12. 🟢 Hidden content: "Figurka kontra podróbka" — content który sam się tworzy

Masz pole `bootleg_risk` i `bootleg_warning` w bazie, plus AI które umie generować treści.

**Pomysł:** automatycznie generuj posty "Jak odróżnić oryginał od podróbki [nazwa figurki]". Ten content:
- Świetnie konwertuje na Pinterest (poradniki — ludzie pinują)
- Daje długi ogon SEO (ludzie googlują "fake Miku figure" codziennie)
- Jest niskim wiszącym owocem (AI generuje punkty, Ty dodajesz zdjęcia)
- Robi z Ciebie autorytet, nie tylko katalog

Zero dodatkowego kodu — wystarczy endpoint AI + scheduled job + strona `/guide/:slug`.

---

## 13. 🟢 Backup bazy — ryzyko

`npm run kopia` robi ZIP + Google Drive. Ale czy to kopia **z produkcji** czy z **lokalnej bazy**? Jeśli lokalna ma 24 figurki, a produkcyjna 200 (potem 500), backup lokalny Cię nie uratuje.

**Fix:** dodaj `npm run kopia:prod` który robi dump przez `supabase db dump --linked` lub przez SQL export z Supabase Dashboard. Automatyzuj cronem tygodniowym.

---

## Podsumowanie — priorytety

| Priorytet | Co | Dlaczego teraz |
|---|---|---|
| 🔴 **1** | **Popraw canonical URL** (figure-fame.vercel.app → figurefame.com) | SEO — inaczej Google zaindeksuje zły adres. Raportuję na dzień przed premierą. |
| 🔴 **2** | **Vercel Analytics** | Nie wiesz skąd przychodzą użytkownicy. Darmowe, 5 minut. |
| 🔴 **3** | **Cookie banner RODO** | Warunek legalności. Bez tego ryzyko prawne. |
| 🟡 **4** | **Schema.org JSON-LD** | Rich snippets w Google = +20-40% CTR. Przewaga nad MFC w wyszukiwarce. |
| 🟡 **5** | **WebP + JPEG fallback** | ~3% użytkowników nie widzi zdjęć. |
| 🟡 **6** | **Cache-Control na API** | Ochrona przed rate limitem na Vercel. |
| 🟢 **7** | **Notyfikacje o zmianie ceny** | Przewaga konkurencyjna. Robi z katalogu narzędzie. |
| 🟢 **8** | **Content "Figurka vs podróbka"** | SEO + Pinterest + autorytet. Niski koszt. |
| 🟢 **9** | **Healthcheck AI providerów** | Żeby wiedzieć który model aktualnie działa. |
| 🟢 **10** | **Offline queue dla formularza** | Admin nie traci danych przy problemach z siecią. |