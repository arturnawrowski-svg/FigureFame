# FigureFame — dokumentacja techniczno-funkcjonalna

> **Typ dokumentu:** dokumentacja techniczno-funkcjonalna (opis produktu, funkcji i architektury).
> **Status:** szkic roboczy · aktualizowany w trakcie rozwoju · 21.07.2026
> **Środowisko produkcyjne:** [figure-fame.vercel.app](https://figure-fame.vercel.app)

---

## 1. W skrócie (streszczenie)

**FigureFame** to baza danych i inteligentny agregator informacji o **japońskich figurkach kolekcjonerskich**. Łączy uporządkowany katalog z warstwą AI, oceną ryzyka podróbek oraz (docelowo) śledzeniem cen i lejkiem z krótkich filmów w social media.

**Jedno zdanie:** *Największy, wspomagany przez AI zbiór zaufanych danych, cen i historii japońskich figurek kolekcjonerskich — z ochroną przed podróbkami.*

**Dla kogo:** kolekcjonerzy figurek anime (początkujący i zaawansowani), osoby kupujące na rynku wtórnym, fani szukający rzetelnych danych i ostrzeżeń przed bootlegami.

---

## 2. Problem i wizja

Rynek figurek kolekcjonerskich jest rozproszony: dane są w wielu serwisach, ceny zmienne, a podróbki (bootlegi) coraz trudniejsze do odróżnienia. Istniejące katalogi (np. MyFigureCollection) są cenne, ale to głównie statyczne bazy.

**Wizja FigureFame:** nie kolejny katalog, lecz **platforma decyzyjna kolekcjonera** — która nie tylko pokazuje dane, ale **pomaga podjąć decyzję**: czy to oryginał, ile to warto, gdzie kupić, czy czekać.

---

## 3. Wyróżniki (na tle konkurencji)

| Wyróżnik | Opis | Status |
|----------|------|--------|
| **Ask AI about this figure** | Kontekstowy asystent kolekcjonera przy każdej figurce (autentyczność, ceny, strategia). | ✅ działa |
| **Bootleg Radar** | Ocena, jak często dany model bywa podrabiany + generowana lista cech oryginału. | ✅ działa |
| **AI Dossier** | Automatyczne wzbogacanie danych figurki z wielu źródeł + AI. | ✅ działa |
| **Price Watch** | Śledzenie realnych ofert i cen z aukcji/sklepów. | 🔜 w planie |
| **Shorty + lejek afiliacyjny** | Krótkie filmy z social media prowadzące do karty figurki. | 🔜 w planie |

---

## 4. Kluczowe funkcje

### 4.1. Gablota (strona główna)
Publiczna, animowana ekspozycja zatwierdzonych figurek z efektem „półki kolekcjonerskiej" (ambient light). Wyszukiwarka po nazwie i serii. Tryb jasny/ciemny.

### 4.2. Dossier figurki
Pełna karta: dane (producent, seria, skala, typ, cena pierwotna), wartość rynkowa, ciekawostki, gdzie szukać, strategia zakupu, oferty (docelowo realne), **Bootleg Radar** i **Ask AI**.

### 4.3. Panel Moderatora
Trzy statusy obiegu: **PENDING → APPROVED → ARCHIVED**. Moderator weryfikuje zgłoszenia, uzupełnia dane (ręcznie lub „Szukaj Danych" — scraping + AI), zarządza zdjęciem i zatwierdza do Gabloty.

### 4.4. Dodawanie figurek
Zalogowani użytkownicy zgłaszają figurki (status PENDING). Reszta danych i zdjęcia uzupełniane są półautomatycznie.

### 4.5. Workflow zdjęcia „jedno finalne"
Do figurki trafia **jedno** dopieszczone zdjęcie, ale proces dopuszcza **wielu kandydatów** w folderze roboczym (upload + scraping + AI). Po akceptacji: kompresja do WebP i skasowanie folderu roboczego. Upload wymaga **oświadczenia o prawach** do zdjęcia (zabezpieczenie prawne).

### 4.6. Konta i profile
Logowanie (OAuth Discord), profil użytkownika, rola administratora (moderatora).

---

## 5. Architektura techniczna

```
Przeglądarka (React SPA)
        │
        ├── Supabase  ── Auth (OAuth Discord)
        │               ── Postgres (figures, profiles, price_snapshots) + RLS
        │               ── Storage (figure-images: kandydaci _work/ + finalne WebP)
        │
        └── Funkcje serwerowe (/api/*, Vercel / dev: Vite middleware)
                 ├── fetch-figure     — kaskada danych: MFC → GoodSmile → AI
                 ├── process-image     — konwersja WebP + upload
                 ├── upload-work-image — kandydat do folderu roboczego
                 ├── finalize-image    — finalny WebP + sprzątanie folderu
                 ├── ask-figure        — asystent AI o figurce
                 └── sitemap           — dynamiczny sitemap.xml
                          │
                          └── Warstwa multi-AI (lib/aiClient.js)
                              Groq → OpenRouter → Cerebras → Gemini (fallback)
```

### 5.1. Stack
- **Frontend:** React 19 + Vite, React Router, lucide-react (ikony).
- **Backend/BaaS:** Supabase (Postgres + Auth + Storage).
- **Funkcje API:** Node (serverless na Vercel; lokalnie przez middleware Vite).
- **Przetwarzanie obrazów:** `sharp` (serwer) + Canvas/WebP (klient).
- **AI:** warstwa własna nad darmowymi modelami (OpenAI-compatible + Gemini REST).
- **Hosting:** Vercel.

### 5.2. Warstwa multi-AI
Jedna abstrakcja `callAI()` z łańcuchem fallbacków po **darmowych** providerach — gdy jeden osiągnie limit, próbowany jest kolejny. Kolejność konfigurowalna. Cel: niezawodność bez płatnego planu. Gemini docelowo zapewnia **grounding (Google Search)** — mniej halucynacji przy danych figurek.

---

## 6. Model danych (uproszczony)

- **`figures`** — rdzeń: `name`, `japanese_name`, `series`, `manufacturer`, `scale`, `type`, `original_price`, `market_value`, `additional_info`, `where_to_search`, `strategy`, `official_image_url`, prawa do zdjęcia (`image_source_type`, `image_rights_ack`, `source_url`), `bootleg_risk`, pola pod wideo/social, `status` (PENDING/APPROVED/ARCHIVED), `submitted_by`.
- **`profiles`** — dane użytkownika + `is_admin`.
- **`price_snapshots`** — oferty/ceny z rynku (pod Price Watch): `platform`, `price_value`, `condition`, `seller`, `url`, `fetched_at`.

---

## 7. Przepływy

**Użytkownik:** przegląda Gablotę → wchodzi w Dossier → pyta AI / sprawdza Bootleg Radar → (docelowo) klika ofertę afiliacyjną.

**Moderator:** zgłoszenie PENDING → „Szukaj Danych" (scraping + AI) → weryfikacja i zdjęcie → **Dodaj do Gabloty** (wymaga praw do zdjęcia) → APPROVED.

**Lejek docelowy (z wizji):** short w social media → karta figurki na FigureFame → link afiliacyjny → prowizja.

---

## 8. Bezpieczeństwo

- **RLS (Row Level Security)** w Postgres: publiczny odczyt tylko `APPROVED`; dodawanie tylko zalogowani (jako PENDING); edycja/usuwanie tylko admin.
- **Ochrona uprawnień:** trigger blokuje samodzielne nadanie sobie roli admina.
- **Strażnik tras** (`ProtectedRoute`): `/admin` tylko dla admina, `/add` i `/profile` dla zalogowanych.
- **Operacje serwerowe** kluczem `service_role` (po stronie serwera).

---

## 9. Stan realizacji

| Etap | Zakres | Status |
|------|--------|--------|
| 0 | Migracje bazy + RLS | ✅ (SQL przygotowany, uruchomiony) |
| 1 | Bezpieczeństwo + warstwa multi-AI | ✅ gotowe (Groq/OpenRouter zweryfikowane) |
| 2 | Workflow zdjęcia (upload/finalize/sprzątanie) | ✅ kod gotowy · ⏳ runtime czeka na konfigurację Storage |
| + | Ask AI, Bootleg Radar, strona „O aplikacji", SEO (meta/OG, robots, sitemap) | ✅ gotowe i przetestowane |
| 3 | Price Watch (realne ceny, start od eBay API) | 🔜 |
| 4 | Generator shortów (Remotion/FFmpeg) | 🔜 |
| 5 | Domeny + poczta | 🔜 (warunkowo, po zakupie domeny) |

---

## 10. Zasady projektu

- **FREE-FIRST:** projekt hobbystyczny/rodzinny — narzędzia darmowe tak długo, jak się da (darmowe AI z fallbackiem, obliczenia po stronie klienta, oszczędny Storage). Płatne tylko gdy nieuniknione (domeny, potem poczta — planowana prawie za darmo).
- **Rozwój etapowy:** najpierw fundament i bezpieczeństwo, potem wyróżniki, na końcu automatyzacja.

---

## 11. Ryzyka i zabezpieczenia

| Ryzyko | Zabezpieczenie |
|--------|----------------|
| Prawa do cudzych zdjęć | Oświadczenie o prawach + źródło przy uploadzie; priorytet zdjęć własnych/oficjalnych. |
| Błędna identyfikacja / bootlegi | Bootleg Radar z wyjaśnieniem; ręczna moderacja top figurek. |
| Halucynacje AI | Kaskada źródeł (AI ostatnia) + grounding; oznaczanie danych niezweryfikowanych. |
| Limity darmowych AI | Łańcuch fallbacków wielu providerów. |
| Masowy AI-content (SEO) | Realna wartość na karcie: ceny, ostrzeżenia, ciekawostki. |

---

## 12. Uruchomienie (dla dewelopera)

```bash
npm install
npm run dev      # środowisko developerskie (Vite + endpointy /api/*)
npm run build    # build produkcyjny
```

**Zmienne środowiskowe (`.env.local`):** klucze Supabase (URL, anon, service_role), klucze AI (Groq / OpenRouter / Cerebras / Gemini), opcjonalnie proxy do scrapingu. Na produkcji te same zmienne w konfiguracji Vercela.

---

*Dokument roboczy — do dalszego rozwoju. Odzwierciedla stan aplikacji na dzień 21.07.2026.*
