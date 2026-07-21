# Plan wdrożeniowy FigureFame — 21.07.2026

> Dokument roboczy syntezujący: cały wątek rozmowy z Claude (21.07.2026), streszczenie sesji z Gemini (`200720261841.md`), strategię z PDF-a (`FigureFame_czat_strategia_logo.pdf`) oraz nasze ustalenia.
> Cel: zakodować całość w jednym, spójnym podejściu, w ustalonej kolejności etapów.

---

## ⭐ ZASADA NACZELNA — FREE-FIRST

To projekt **hobbystyczny/rodzinny**. Nadrzędna reguła każdej decyzji technicznej: **korzystamy z narzędzi darmowych tak długo, jak się da.** Płatne wchodzą dopiero, gdy jest to nieuniknione i świadomie zaakceptowane (dziś jedyny znany koszt: domeny po zakupie, a wraz z nimi poczta — patrz sekcja 10).

Konkretne konsekwencje w całym planie:
- **AI:** wyłącznie darmowe tiery z fallbackiem (limity omijamy łańcuchem providerów, nie płatnym planem).
- **Obliczenia po stronie klienta:** obróbka obrazu (usuwanie tła, kompozycja świateł) w przeglądarce przez WASM/Canvas → **zero kosztów serwera**.
- **Storage oszczędny:** pliki robocze kasujemy po akceptacji; w chmurze zostaje tylko finalny webp/avif (dłużej mieścimy się w darmowym tierze Supabase).
- **Hosting:** Vercel + Supabase free tier tak długo, jak wystarcza.
- **Poczta (w przyszłości):** najpierw darmowe drogi (Cloudflare Email Routing + „send-as" w Gmailu, darmowe tiery transakcyjne) — patrz sekcja 10.

Każdy nowy pomysł oceniamy pytaniem: „czy da się to zrobić za darmo?" — i dopiero gdy nie, rozważamy koszt.

---

## 0. Kontekst i stan obecny

**Czym jest FigureFame:** baza danych i agregator informacji o japońskich figurkach kolekcjonerskich. Wyróżniki (wg PDF): AI Collector Dossier, Price Watch, Bootleg Risk Score, shorty społecznościowe, alerty aukcyjne. Projekt niskobudżetowy, traktowany jako prezent/projekt rodzinny → priorytet: **tanio i niezawodnie**.

**Stack:**
- Frontend: React + Vite (SPA), `react-router-dom`, `lucide-react`.
- Backend: Supabase (Postgres `figures`/`profiles`, Auth OAuth Discord, Storage `figure-images`).
- API serwerowe: `api/fetch-figure.js` (kaskada MFC → GoodSmile → Gemini + konwersja WebP), `api/process-image.js` (konwersja + upload). Lokalnie podpięte przez middleware w `vite.config.js`; produkcyjnie na Vercelu.

**Przepływ dziś:** user dodaje figurkę (`AddFigure.jsx`, status `PENDING`) → admin weryfikuje/uzupełnia (`AdminDashboard.jsx`, przycisk „Szukaj Danych" → `fetch-figure`) → zatwierdza (`APPROVED`) → figurka trafia do gabloty (`Showcase.jsx`) i ma dossier (`Dossier.jsx`).

**Znane problemy do naprawy w ramach planu:**
1. Model `gemini-3.5-flash` (`api/fetch-figure.js:161,176`) prawdopodobnie nie istnieje → AI cicho pada. Legacy SDK `@google/generative-ai`.
2. Brak realnego groundingu (AI „ma szukać w Google", ale nie może) → halucynacje cen i URL-i zdjęć.
3. `/admin` bez strażnika trasy (`App.jsx:23`) — ochrona wyłącznie przez RLS (do zweryfikowania).
4. `process-image.js` używa klucza **anon** do uploadu → potencjalnie każdy może wrzucać pliki.
5. Ścieżka do zdjęcia liczona **3 różnymi metodami** (`Showcase.jsx:171` → `/images/`, `Dossier.jsx:48` → `/images/official/`, `AdminDashboard.jsx:483` → `images.myfigurecollection.net/...`).
6. `AuctionDeals.jsx` i `OfficialShops.jsx` to atrapy (dane z `Math.random()`).
7. `releaseDate` zbierane w formularzu, ale nie zapisywane (`AddFigure.jsx:31-43`).

---

## 1. Decyzje architektoniczne (przyjęte domyślne)

| Obszar | Decyzja | Alternatywa |
|--------|---------|-------------|
| Multi-AI | **4 providery z fallbackiem**: Groq → Gemini → Cerebras → OpenRouter | Min. 2 (Groq+Gemini) / Max. 20+ z env |
| Warstwa AI | Jedna abstrakcja OpenAI-compatible (`api/lib/aiClient.js`) | 20 osobnych SDK (odrzucone) |
| Obróbka zdjęć | **Światła CSS/Canvas + usuwanie tła WASM** (darmowe) | +AI relight/upscale (płatne, later) |
| Ceny | Kolejka/cron + tabela `price_snapshots`, start od **eBay Browse API** | Scraping 50 stron on-request (odrzucone) |
| Bezpieczeństwo | RLS jako fundament + strażnik trasy + service_role tylko serwer | — |
| Koszty | **Free-first** (patrz zasada naczelna) — darmowe tak długo, jak się da | Płatne tylko gdy nieuniknione |

---

## 2. Zmiany w modelu danych (Supabase)

### 2.1. Tabela `figures` — nowe kolumny
```sql
alter table figures add column if not exists release_date text;            -- pkt 7 fix
alter table figures add column if not exists image_source_type text;       -- 'producent' | 'zdjecie_produktu_oryginalnego' | 'pobrane_z_sieci'
alter table figures add column if not exists image_rights_ack boolean default false;
alter table figures add column if not exists source_url text;              -- skąd zdjęcie
alter table figures add column if not exists bootleg_risk jsonb;           -- { score, level, reasons[] }
alter table figures add column if not exists rarity_score int;
alter table figures add column if not exists last_price_check timestamptz;
-- pola pod przyszłe social/wideo (Faza wideo z PDF):
alter table figures add column if not exists video_status text;            -- queued|rendering|ready|published|failed
alter table figures add column if not exists video_url text;
alter table figures add column if not exists youtube_video_id text;
alter table figures add column if not exists tiktok_post_id text;
alter table figures add column if not exists instagram_reel_id text;
alter table figures add column if not exists pinterest_pin_id text;
alter table figures add column if not exists affiliate_links_json jsonb;
```

### 2.2. Nowa tabela `price_snapshots`
```sql
create table if not exists price_snapshots (
  id bigint generated always as identity primary key,
  figure_id bigint references figures(id) on delete cascade,
  platform text not null,          -- 'eBay', 'AmiAmi', ...
  title text,
  condition text,
  price_value numeric,
  currency text default 'JPY',
  seller text,
  url text,                        -- link (afiliacyjny) do oferty
  is_official boolean default false,
  fetched_at timestamptz default now()
);
create index if not exists idx_price_snapshots_figure on price_snapshots(figure_id);
```

---

## 3. ETAP 1 — Bezpieczeństwo + Multi-AI

### 3.1. Bezpieczeństwo (pkt 3)

**A. RLS na Supabase** (SQL do wykonania w panelu Supabase):
```sql
-- figures
alter table figures enable row level security;

create policy "public reads approved"
  on figures for select using (status = 'APPROVED');

create policy "auth insert as pending"
  on figures for insert to authenticated
  with check (status = 'PENDING' and submitted_by = auth.uid());

create policy "admin full update"
  on figures for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

create policy "admin delete"
  on figures for delete to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- profiles: nikt nie ustawia sobie is_admin
alter table profiles enable row level security;
create policy "read own/all profiles" on profiles for select using (true);
create policy "update own non-admin fields" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));
```
> Uwaga: admin musi też móc czytać `PENDING`/`ARCHIVED`. Dodać policy SELECT dla adminów obejmującą wszystkie statusy.

**B. Storage `figure-images`** — polityka uploadu tylko dla zalogowanych/admina; `process-image.js` przełączyć na **service_role key** (serwer) zamiast anon.

**C. Strażnik trasy** — nowy komponent `src/components/ProtectedRoute.jsx`:
```jsx
// używa useAuth(): jeśli !user → redirect '/', jeśli requireAdmin && !isAdmin → redirect '/'
```
Owinąć `/admin` (i `/add` dla zalogowanych) w `App.jsx`.

**D. Higiena:** service_role key wyłącznie w env Vercel (nigdy w kliencie), walidacja MIME + limit rozmiaru w `process-image.js`.

**Pliki:** nowy `ProtectedRoute.jsx`; edycja `App.jsx`, `process-image.js`; SQL w Supabase.

### 3.2. Multi-AI (pkt 1)

**Nowy plik `api/lib/aiClient.js`** — warstwa abstrakcji OpenAI-compatible z łańcuchem fallbacków:
```
PROVIDERS = [
  { name:'groq',       baseURL:'https://api.groq.com/openai/v1',    model:'llama-3.1-8b-instant', key: GROQ_API_KEY },
  { name:'gemini',     ...,  model:'gemini-2.5-flash', grounding:true, key: GEMINI_API_KEY },
  { name:'cerebras',   baseURL:'https://api.cerebras.ai/v1',        model:'llama-3.3-70b',        key: CEREBRAS_API_KEY },
  { name:'openrouter', baseURL:'https://openrouter.ai/api/v1',      model:'openrouter/free',      key: OPENROUTER_API_KEY },
]

async function callAI(prompt, { json=true } = {}) {
  for (const p of enabledProviders) {
    try { return await callProvider(p, prompt) }
    catch (e) { if (isRateLimitOrUnavailable(e)) continue; else log(e) }
  }
  throw new Error('Wszystkie providery AI zawiodły')
}
```
- Klient: użyć `openai` SDK (jeden pakiet obsłuży wszystkie kompatybilne baseURL) + osobno gałąź Gemini z groundingiem (`tools:[{googleSearch:{}}]`) przez `@google/genai`.
- Parsowanie JSON i czyszczenie markdown przenieść z `fetch-figure.js` do helpera.
- Konfiguracja: dowolny provider włączasz obecnością jego klucza w env.

**Refactor `api/fetch-figure.js`:** zamiast bezpośredniego Gemini → `callAI()`. Kaskada MFC → GoodSmile → AI pozostaje; AI jako **ostateczność**, wyniki AI oznaczane jako niezweryfikowane.

**Modele „małe/szybkie" (analog Haiku) do wyboru:** Gemini 2.5 Flash-Lite, Llama 3.1 8B (Groq/Cerebras), Mistral Small 3, Gemma 3, Phi-4-mini, Qwen3-8B. Pula awaryjna (opcjonalnie w env): Mistral, Cloudflare Workers AI, GitHub Models, NVIDIA NIM, SambaNova, Cohere, Together, Scaleway, HuggingFace — łącznie 20+ modeli za jednym interfejsem.

**Env (Vercel):** `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` (+ ewentualne z puli).

---

## 4. ETAP 2 — Workflow zdjęcia: wiele kandydatów → jedno finalne (pkt 4)

**Cel:** w gablocie ląduje **dokładnie JEDNO** dopieszczone zdjęcie ze światłami — ale to jest **wynik**, nie ograniczenie procesu. Do momentu akceptacji admina figurka ma **folder roboczy** z wieloma grafikami-kandydatami, z których admin składa jeden finalny obraz. Po akceptacji: kompresja i sprzątanie.

### 4.1. Ważne doprecyzowanie: upload ≠ rezygnacja ze szukania
Ręczny upload to **jedno z wielu** źródeł grafiki, nie jedyne. Równolegle **nadal szukamy zdjęć automatycznie** (jak dziś w `fetch-figure.js`): scraping MFC / GoodSmile + AI. Wszystkie znalezione i wgrane grafiki trafiają do wspólnego **folderu roboczego** figurki jako kandydaci do wyboru.

### 4.2. Folder roboczy (Supabase Storage)
- Ścieżka robocza: `figure-images/_work/{figureId}/...` — tu lądują **wszyscy kandydaci** (upload użytkownika, zdjęcia ze scrapingu, warianty AI, półprodukty obróbki).
- Ścieżka finalna: `figure-images/{slug}_{timestamp}.webp` (+ `.avif`) — **tylko jeden** finalny plik.
- Dzięki temu Storage pozostaje szczupły → dłużej mieścimy się w darmowym tierze (zasada free-first).

### 4.3. Widget uploadu (`src/components/ImageUploader.jsx`) — w panelu admina (+ opcjonalnie w `AddFigure`)
- `<input type="file">` → plik(i) do **folderu roboczego** (jeszcze bez kompresji finalnej).
- **Wymagane** oznaczenie praw (radio), zapis do bazy:
  - `image_source_type`: `producent` / `zdjecie_produktu_oryginalnego` / `pobrane_z_sieci`
  - `image_rights_ack = true`, `source_url`
  - Bez zaznaczenia → przycisk „Dodaj do Gabloty" zablokowany (zabezpieczenie prawne z PDF).

### 4.4. Obróbka i kompozycja (przyjęte darmowe metody)
Admin wybiera/łączy kandydatów i składa **jeden** finalny kadr:
1. **Usuwanie tła** — `@imgly/background-removal` (WASM, w przeglądarce, **darmowe**) → figurka „wychodzi" z tła.
2. **Światła / kompozycja** — Canvas + rozbudowa istniejącego `generateGlowColor` + `.ambient-light` (glow, cień, winieta) → efekt gabloty wtopiony w obraz.
3. *(Opcja later, płatna)* **AI relight/upscale** — Replicate/Cloudflare AI dla efektu premium; włączane świadomie, poza free-first.

### 4.5. Podgląd „Live" w gablocie
Rozbudowa istniejącego podglądu (`AdminDashboard.jsx:475-497`) tak, by pokazywał **finalny, złożony** obraz w prawdziwej karcie gabloty ze światłami. Admin akceptuje dopiero, gdy widok mu się podoba.

### 4.6. Akceptacja = kompresja + sprzątanie (kluczowy krok)
Po kliknięciu „Dodaj do Gabloty":
1. Finalny obraz → kompresja do **WebP** (+ `AVIF`) przez `sharp` (endpoint `process-image.js`).
2. Zapis finalnego pliku w ścieżce kanonicznej + URL do `figures.official_image_url`.
3. **Usunięcie CAŁEGO folderu roboczego** `_work/{figureId}/` (wszyscy kandydaci i półprodukty) → w chmurze zostaje **tylko** finalny webp/avif.
4. `status = 'APPROVED'` → figurka znika z koszyka admina, pojawia się w gablocie z kompletem danych.

### 4.7. Ujednolicenie ścieżki do zdjęcia
Jeden helper `src/lib/getImageUrl.js` używany przez `Showcase`, `Dossier`, `AdminDashboard` — usuwa dzisiejszy problem 3 różnych metod liczenia ścieżki.

### 4.8. Przepływ (całość)
```
PENDING (koszyk admina)
   → folder roboczy: upload(y) + auto-scraping + warianty AI  (wielu kandydatów)
   → admin: usuwa tło, składa 1 finalny kadr ze światłami
   → podgląd Live w karcie gabloty
   → akceptacja wizualna → "Dodaj do Gabloty"
        → kompresja webp/avif
        → skasowanie całego folderu roboczego (zostaje 1 plik)
        → status APPROVED
   → figurka w gablocie z kompletem danych
```

**Pliki:** nowy `ImageUploader.jsx`, `src/lib/getImageUrl.js`; edycja `AdminDashboard.jsx`, `Showcase.jsx`, `Dossier.jsx`, `process-image.js` (dodać: obsługa folderu roboczego, kasowanie po akceptacji, AVIF obok WebP).

---

## 5. ETAP 3 — Realne ceny i oferty (pkt 2)

**Zasada „drabiny źródeł" (od najpewniejszego):**
```
1. Oficjalne API  → eBay Browse API (DARMOWE + afiliacja EPN), potem AmiAmi/HobbySearch
2. Scraping paru kluczowych stron (MFC, Mandarake, Suruga-ya) — strukturalnie
3. AI (grounding) → tylko gdy 1 i 2 zawiodą, oznaczone jako niezweryfikowane
```

**Architektura (Faza 5 z PDF):**
- Nowy endpoint `api/refresh-prices.js` — dla danej figurki pobiera oferty z eBay Browse API i zapisuje do `price_snapshots`, aktualizuje `figures.last_price_check`.
- **Cron** (Vercel Cron / n8n na VPS): raz na dobę odświeża APPROVED figurki. Frontend czyta z bazy → zero czekania.
- `AuctionDeals.jsx` / `OfficialShops.jsx`: podmiana atrap na realne dane z `price_snapshots` (UI wizualnie zostaje).

**Start realistyczny:** **jedno** źródło (eBay) najpierw → od razu afiliacja. Reszta platform „coming soon", dokładane pojedynczo.

⚠️ Prawnie: preferować oficjalne API/feedy afiliacyjne nad scrapingiem (ryzyko blokad/roszczeń z PDF).

**Pliki:** nowy `api/refresh-prices.js`, konfiguracja crona; edycja `AuctionDeals.jsx`, `OfficialShops.jsx`.

**Powiązane (Bootleg Risk Score, pkt z PDF):** start rule-based (sprzedawca AliExpress + cena <30% średniej + brak pudełka = 🔴), AI dokłada tylko wyjaśnienie; zapis do `figures.bootleg_risk`.

---

## 6. ETAP 4 — Generator Shortów (pkt 5, przyszłościowy)

Automatyczne 20-sekundowe filmiki (YouTube Shorts / TikTok / Reels) jako lejek → karta figurki → link afiliacyjny.

**Zasada z PDF:** NIE zaczynać od HeyGen/GPU/AI-video (drogie, halucynuje tył figurki). Start od **szablonu składanego automatem** z danych, które już mamy: zdjęcie WebP + nazwa + cena + strategia + światła gabloty.

**Architektura:**
- Szablon renderowany przez **Remotion** (MP4 z komponentu React) lub **FFmpeg** — zdjęcie + animowane napisy + logo FF + muzyka.
- Kolejka: przycisk „Generuj short" w adminie → webhook do VPS/KVM → worker render → zapis MP4 → aktualizacja `video_status`/`video_url`.
- Status w bazie: `queued | rendering | ready | published | failed`.

**Pliki:** nowy worker (VPS), endpoint webhook, przycisk w `AdminDashboard.jsx`. Realizacja po Etapach 1-3.

---

## 7. Kolejność realizacji (build order)

| Etap | Zakres | Pliki kluczowe |
|------|--------|----------------|
| **1** | RLS + strażnik `/admin` + multi-AI (`aiClient.js`) + fix modelu/groundingu | `ProtectedRoute.jsx`, `App.jsx`, `api/lib/aiClient.js`, `api/fetch-figure.js`, `process-image.js`, SQL |
| **2** | Upload 1 zdjęcia + prawa + obróbka (światła+usuwanie tła) + podgląd + ujednolicenie ścieżki | `ImageUploader.jsx`, `src/lib/getImageUrl.js`, `AdminDashboard.jsx`, `Showcase.jsx`, `Dossier.jsx` |
| **3** | Realne ceny: eBay API + `price_snapshots` + cron + Bootleg Risk | `api/refresh-prices.js`, `AuctionDeals.jsx`, `OfficialShops.jsx`, SQL |
| **4** | Generator shortów (Remotion/FFmpeg + kolejka VPS) | worker VPS, webhook, `AdminDashboard.jsx` |
| **5-pipe** | Pipeline publikacji: render poza Vercelem (GitHub Actions) → moderacja → Drive (sekcja 12) | GitHub Actions workflow, `api/enqueue-short.js`, panel moderacji, Drive API |

Migracje bazy (sekcja 2) + RLS (sekcja 3.1) wykonać jako pierwsze — reszta na nich bazuje.

---

## 8. Lista ryzyk i zabezpieczeń (z PDF, aktualizowana)

| Ryzyko | Skutek | Zabezpieczenie w planie |
|--------|--------|-------------------------|
| Cudze zdjęcia bez licencji | Roszczenia, blokady | `image_source_type` + `image_rights_ack` + `source_url`; checkbox wymagany (Etap 2) |
| Bootlegi / błędna identyfikacja | Utrata zaufania | Bootleg Risk Score rule-based + wyjaśnienie AI (Etap 3) |
| Masowy AI-content | Słabe SEO, brak monetyzacji | Realna wartość na karcie; AI jako ostateczność, oznaczane |
| Zbyt agresywna afiliacja | Spam, blokady | 1 karta FF w filmie; jasne oznaczenie afiliacji (Etap 4) |
| Halucynacje AI | Błędne dane/URL | Grounding + kaskada źródeł (AI ostatnia) + oznaczanie niezweryfikowanych |
| Otwarty panel admina | Nieautoryzowane zmiany | RLS + strażnik trasy + service_role serwer-side (Etap 1) |
| Limity darmowych AI | Padające zapytania | Łańcuch fallbacków 4+ providerów (Etap 1) |
| Koszty AI-video | Nieprzewidziane kredyty | Start FFmpeg/Remotion, ciężkie AI tylko dla hero (Etap 4) |

---

## 9. Podsumowanie zmiennych środowiskowych (docelowo)

```
# AI
GROQ_API_KEY=
GEMINI_API_KEY=            (istnieje jako VITE_GEMINI_API_KEY / _2 — ujednolicić)
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  (serwer-side; upload + operacje admina)
# Ceny
EBAY_APP_ID / EBAY_OAUTH_TOKEN=
EBAY_AFFILIATE_ID=
# Opcjonalne
PROXY_URL=                  (scraping za Cloudflare)
# Poczta (dopiero po zakupie domeny — sekcja 10)
SMTP_HOST / SMTP_USER / SMTP_PASS=   (np. darmowy tier Resend/Brevo)
```

---

## 10. Domeny i poczta (przyszłość — dopiero po zakupie domeny)

To **jedyny świadomie zaakceptowany obszar płatny** (reszta = free-first). Aktywujemy go dopiero, gdy kupisz `figurefame.com`. Do tego czasu projekt działa na `figure-fame.vercel.app`.

**Domeny (wg PDF):** główna `figurefame.com`; defensywnie `.pl` i `.eu`; `.studio` jako submarka; `.ai` jeśli budżet pozwala. Rejestracja Cloudflare (.com/.studio/.ai) + Aftermarket.pl (.pl/.eu).

**Poczta — potrzeba:** 2-3 adresy z domeny (np. `contact@`, `hello@`, `noreply@figurefame.com`), część z większym limitem. Rozdzielamy dwa różne problemy:

1. **Skrzynki / odbieranie maili (inbound):**
   - ⚠️ **Supabase NIE hostuje skrzynek pocztowych** — potrafi tylko *wysyłać* maile transakcyjne przez skonfigurowany SMTP. Samych adresów `@figurefame.com` w Supabase nie założysz.
   - ✅ **Najtańsza droga (praktycznie darmowa):** **Cloudflare Email Routing** — darmowe przekierowanie `contact@figurefame.com` → Twój Gmail, a wysyłka „send-as" z tego adresu przez darmowy Gmail. Obsłuży 2-3 aliasy bez kosztu.
   - Alternatywa płatna (gdyby trzeba pełnych skrzynek): Zoho Mail (darmowy tier dla 1 domeny, limity), Google Workspace / Migadu (płatne).

2. **Maile transakcyjne i mailing (outbound — alerty aukcyjne, powiadomienia, auth):**
   - Darmowe tiery: **Resend** (~3 000 maili/mies. free), **Brevo** (~300/dzień free), Mailjet.
   - **Supabase Auth** można wpiąć na własny SMTP (np. Resend) → maile logowania/potwierdzeń wychodzą z `@figurefame.com`.
   - To zasila przyszłe funkcje z PDF (Faza 6): mailing, alert aukcji, alert ceny.

**Wniosek free-first:** nawet po zakupie domeny pocztę da się utrzymać **za darmo lub prawie za darmo** (Cloudflare Email Routing + Gmail send-as + darmowy tier Resend). Płatny plan pocztowy dopiero, gdy limity darmowe przestaną wystarczać.

---

## 11. Kolejność realizacji — TO JEST PLAN

Potwierdzenie ustalonej kolejności etapów (ta tabela = zatwierdzony harmonogram):

| Etap | Co | Dlaczego w tej kolejności |
|------|-----|---------------------------|
| **0** | Migracje bazy (sekcja 2) + RLS (sekcja 3.1) | Fundament, reszta na nim bazuje |
| **1** | Pkt 3 (RLS + strażnik `/admin`) + Pkt 1 (multi-AI) | Bezpieczeństwo i naprawa cicho psującego się AI = fundament |
| **2** | Pkt 4 (folder roboczy → 1 zdjęcie + prawa + obróbka + podgląd + sprzątanie) | Twój główny workflow admina, duża wartość UX |
| **3** | Pkt 2 (realne ceny — start od eBay API + cron) | Pierwsza prawdziwa monetyzacja |
| **4** | Pkt 5 (generator shortów) | Nadbudowa na gotowym fundamencie |
| **5** | *(warunkowe)* Domeny + poczta (sekcja 10) | Dopiero po zakupie domeny; jedyny obszar płatny |

---

---

## 12. ETAP 5 — Pipeline publikacji shortów (Drive + moderacja wideo)

> Dodane 21.07.2026. Cel: po dodaniu figurki do gabloty wyprodukować short, przepuścić przez **obowiązkową akceptację admina**, a zaakceptowane MP4 kolejkować na **Google Drive** jako „do publikacji" (na przyszłe kanały YT/TikTok/social). Wszystko **free-first**.

### 12.1. Zasada naczelna tego etapu: render POZA Vercelem
Render ffmpeg (~65 s, ~490 klatek sharp) **przekracza limity Vercel-hobby** (czas funkcji 10–60 s, RAM 1 GB, rozmiar paczki ~250 MB z binarką ffmpeg+sharp). Dlatego:
- **Vercel = mózg/trigger**, nie renderownia. Może short *zlecić* i *wrzucić gotowy plik na Drive* (szybki call do API) — ale **nie renderuje**.
- **Renderownia = GitHub Actions** (patrz 12.3). Alternatywy: Oracle Cloud Free Tier (#3), VPS (#4 awaryjnie), laptop lokalny (ręcznie kilkadziesiąt do kolejki).

### 12.2. Storage na Drive — pojemność
Short 20 s 1080×1920 h264 ≈ **5–15 MB** (pesymistycznie 20 MB). **5 TB ≈ 250 000 shortów** (przy 10 MB → pół miliona). Nawet wersje 4K (~40–60 MB) = dziesiątki tysięcy. **Miejsce nie jest ograniczeniem — wąskim gardłem jest czas renderu, nie dysk.**

### 12.3. Renderownia: GitHub Actions (wybrana, free-first)
- **Repo publiczne → Actions bez limitu minut** (standardowe runnery za darmo dla repo publicznych). Najczystsza droga.
- Repo prywatne: **2000 min/mies.** darmowe. Render + narzut joba ~2–3 min/figurkę → **~800 figurek/mies.** (1 job = 1 figurka) lub **~1600/mies.** przy batchu 10/job (amortyzacja `npm ci`).
- ⚠️ **NIE** zakładać wielu kont dla obejścia limitów — łamie regulamin GitHuba. Repo publiczne = ten sam efekt legalnie i bez zarządzania tokenami.
- Runner ma ffmpeg wbudowany, do 6 h/job, dużo RAM. Trigger: `repository_dispatch`/`workflow_dispatch` z Vercela (webhook z panelu).

**Ranking środowisk renderu:**
| # | Środowisko | Zaleta | Haczyk |
|---|---|---|---|
| 1 | **GitHub Actions** | Zero-maintenance, „samo działa", natywny trigger; publiczne repo = bez limitu | Limit minut na repo prywatnym; tryb wsadowy |
| 2 | **Oracle Cloud Free Tier** (A1 ARM, 4 rdz./24 GB) | Zawsze włączony, bez limitu minut, mocny | Loteria dostępności A1; Ty adminujesz serwer; ryzyko blokady konta; karta przy rejestracji |
| 3 | **VPS** | Pełna kontrola, real-time | **Płatny** — tylko awaryjnie, gdy skala urośnie |
| 4 | **Laptop lokalny** | Już działa, zero kosztów | Ręcznie, słaby sprzęt — do produkcji kilkudziesięciu sztuk do kolejki |

### 12.4. Przepływ pipeline
```
Figurka APPROVED w Gablocie
   → Vercel zleca render (repository_dispatch → GitHub Actions)
   → Actions: renderShort → MP4 (video_status: rendering → ready) + video_url
   → PANEL ADMINA: podgląd wideo (odtwarzacz z video_url)  ← BRAMA: akceptacja konieczna
   → "Zatwierdź do publikacji"  (video_status: approved_for_publish)
   → (opcjonalny resize) push MP4 do folderu-kolejki na Google Drive
   → publikacja na YT/TikTok/IG/FB (na start ręcznie/pół-auto z Drive)
```

### 12.5. Moderacja wideo (panel)
- Nowy stan `video_status`: dołożyć `approved_for_publish` (obok queued/rendering/ready/published/failed).
- W `AdminDashboard.jsx`: odtwarzacz `<video>` z `video_url` + przyciski „Zatwierdź do publikacji" / „Odrzuć / renderuj ponownie".
- Każda figurka = osobny short (już tak działa renderer v2).

### 12.6. Resize / „4K" — uczciwie
- Nasz short to natywnie 1080×1920 — **standard i rekomendacja Shorts/TikTok/Reels**. 4K (2160×3840) **nie jest potrzebne**.
- **Upscale 1080→4K nie dodaje detali** (sztuczne, cięższe pliki). Jeśli chcemy ostrzej — **renderować natywnie w wyższej rozdzielczości** (parametr W/H w rendererze), nie skalować po fakcie.

### 12.7. Wrzucanie na Google Drive (DECYZJE 21.07.2026)
- **Rola Supabase Storage = bufor podręczny, max ~10 MP4** (podgląd do moderacji). Rola Google Drive = **stała kolejka publikacji**. Po akceptacji plik przenosimy na Drive i **kasujemy z Supabase** → free tier 1 GB nie rośnie.
- **Auth: OAuth na WŁASNE konto Artura** (pliki liczą się do jego 5 TB) — NIE konto serwisowe (tamto ma osobny ~15 GB). Zakres **`drive.file`** (apka widzi tylko własne pliki; brak wrażliwego scope = brak weryfikacji Google i brak wygasania refresh tokenu co 7 dni).
- **Setup po stronie Artura (jednorazowo, darmowo):** projekt Google Cloud → włącz Drive API → OAuth consent (External, self jako test user) → OAuth client „Desktop app" → Client ID/Secret → refresh_token (skrypt `scripts/gdrive-auth.mjs`). Do `.env.local`: `GOOGLE_DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN`. Folder „FigureFame Shorts" tworzy sam worker.
- **Przepływ publikacji:** `approved_for_publish` → worker pobiera MP4 z Supabase → upload na Drive (5 TB) → **kasuje z Supabase Storage** → `video_status='published'` + `drive_url`/`drive_file_id`.
- **Cap:** nie renderować nowych shortów, gdy w Supabase Storage jest już ~10 (bufor pełny).
- **Kolejność:** worker publikacji budujemy DOPIERO po skonfigurowaniu OAuth przez Artura (decyzja: „po mojej konfiguracji Drive") — wtedy kod + test end-to-end na żywym Drive. Wymaga migracji: kolumny `drive_file_id`, `drive_url`.
- Folder „do publikacji" na Drive = poczekalnia, z której później publikujesz na social.

### 12.8. Auto-publikacja na social (późniejszy klocek)
Wymaga zatwierdzonych aplikacji deweloperskich + OAuth per platforma:
- **YouTube Data API** — auto-upload Shorts (najłatwiejsze).
- **TikTok Content Posting API** — wymaga zgody na aplikację.
- **Instagram/Facebook (Meta Graph API)** — Reels przez API biznesowe.
- ⚠️ **Uwaga o muzyce:** wypalanie ścieżki w MP4 grozi roszczeniami Content ID i bywa przeciwskuteczne — platformy premiują **natywne, trendujące audio dodane w apce przy publikacji**. Realny start: audio dokładane ręcznie przy publikacji; ewentualny wypalony podkład tylko z legalnych źródeł royalty-free (YT Audio Library, Pixabay, Uppbeat, Incompetech CC-BY). Pod te figurki pasuje **lo-fi / synthwave / city-pop**, nie jazz/rock/country.
- Realistycznie: **start = kolejka na Drive + publikacja ręczna/pół-auto**, automatyzacja per platforma po zdobyciu kanałów i zgód.

### 12.9. Kolejność wewnątrz Etapu 5
1. Moderacja wideo w panelu (odtwarzacz + `approved_for_publish`) — najmniejszy klocek, od razu użyteczny.
2. Render poza Vercelem: workflow GitHub Actions + trigger z Vercela (`api/enqueue-short.js` → `repository_dispatch`).
3. Push zaakceptowanych MP4 na Google Drive (kolejka).
4. (Później) auto-publikacja per platforma.

**Pliki (do zrobienia w przyszłości):** workflow `.github/workflows/render-short.yml`, `api/enqueue-short.js` (trigger), rozbudowa `AdminDashboard.jsx` (moderacja), integracja Drive API, parametr rozdzielczości w `worker/renderShort.mjs`.

> Uwaga nazewnicza: „Etap 5 — Domeny i poczta" (sekcja 10) jest **warunkowy i równoległy** (odpala się dopiero po zakupie domeny). Ten Etap 5 (pipeline publikacji) to realny **następny krok deweloperski po Etapie 4**.

---

*Koniec planu. Realizacja: Etap 0 → 1 → 2 → 3 → 4 → 5 (pipeline publikacji); Etap „domeny+poczta" warunkowo po zakupie domeny. Wszystko zgodnie z zasadą naczelną FREE-FIRST.*
