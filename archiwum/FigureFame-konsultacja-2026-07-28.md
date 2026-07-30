# Konsultacja FigureFame.com — 28.07.2026

Kompletna rozmowa: pytania Artura + odpowiedzi i analizy asystenta.

---

## Spis treści

1. [Pytanie 1 — Jakie social media prowadzić?](#p1)
2. [Pytanie 2 — Profil firmowy vs osobisty? Bluesky?](#p2)
3. [Pytanie 3 — Weryfikacja pliku podsumowanie.md (audyt kodu)](#p3)
4. [Pytanie 4 — Plan rozwojowy 12 miesięcy](#p4)
5. [Pytanie 5 — Research źródeł wiedzy o figurkach](#p5)

---

<a name="p1"></a>
## 1. Jakie social media powinno jeszcze prowadzić figurefame.com?

**Pytanie Artura:** *jakie media społecznościowe powinno jeszcze prowadzić figurefame.com?*

### Odpowiedź:

### Musisz mieć (core — zgodne ze strategią shortów)

| Platforma | Uzasadnienie |
|---|---|
| **YouTube** (kanał + Shorts) | Już masz pole `youtube_video_id` w bazie. Shorts na YouTube to drugi co do wielkości rynek shortów. Dodatkowo: długie formaty (unboxing, recenzje) działają latami i są indeksowane w wyszukiwarce. |
| **TikTok** | To jest TWÓJ kanał #1 dla shortów. Algorytm TikTok wciąż najlepiej wynajduje nowe treści. Masz już pipeline renderowania shortów (`renderShort.mjs`). Postawienie krótkich filmów z figurkami to naturalne dopasowanie. |
| **Instagram** (Reels + posty) | Figurki to content **idealny wizualnie** — społeczność kolekcjonerska na Instagramie jest ogromna (#animefigures, #figurecollection). Reels są priorytetem algorytmu IG. Dodatkowo: Instagram Shop w przyszłości. |

### Masz już, warto utrzymać

| Platforma | Status |
|---|---|
| **X / Twitter** | Działa jako login. Prowadź konto do announcementów, zasięgi słabe, ale obecność potrzebna. |
| **Discord** | Działa jako login. **Serwer Discord to must-have** dla społeczności kolekcjonerów — ludzie chcą rozmawiać o figurkach, pytać o porady, zgłaszać propozycje. |
| **Facebook** | Login działa ale nie ma przycisku. Strona/FB Page: niskie zasięgi organiczne, ale **grupy kolekcjonerskie na FB są aktywne**. Możesz cross-postować shorty. Niski priorytet. |

### Warto rozważyć

| Platforma | Uzasadnienie |
|---|---|
| **Pinterest** | Już masz pole `pinterest_pin_id` w bazie. Pinterest to wyszukiwarka wizualna — pin ze zdjęciem figurki może przynosić ruch przez miesiące/lata. Dobry do evergreen contentu. Koszt: niski (postowanie zdjęć z linkiem). |
| **Reddit** | r/AnimeFigures (1,3M członków), r/AnimeCollectors — ogromny ruch z wyszukiwarek. Ale: Reddit nie lubi czystej autopromocji. Wartością jest autentyczne uczestnictwo w społeczności. Nie „prowadź konto", ale **bądź obecny**. |

### Nie rób (zmarnowane zasoby)

| Platforma | Dlaczego nie |
|---|---|
| **LinkedIn** | Zupełnie nie trafia do grupy docelowej kolekcjonerów figurek. |
| **Snapchat** | Zanikający zasięg, nie do tego modelu biznesowego. |
| **Threads** | Mało aktywna społeczność kolekcjonerska, w Polsce nikły zasięg. |
| **Twitch** | Streamowanie przeglądania katalogu figurek ma ograniczony sens. |

### Kolejność wdrożenia (priorytety)

```
1. YouTube (Shorty)        — już masz pipeline, brakuje tylko konta i publikacji
2. TikTok                  — główny kanał shortowy, zasięg + wiral
3. Instagram               — baza kolekcjonerów, treści wizualne
4. Discord                 — serwer społeczności (masz już login!)
5. Pinterest               — evergreen traffic (masz już pole w bazie)
6. Facebook                — grupy, niski priorytet
7. X/Twitter               — announcementy (już działa)
8. Reddit                  — organiczna obecność, nie reklama
```

---

<a name="p2"></a>
## 2. Typy profili i Bluesky

**Pytanie Artura:** *Zrób mi proszę podsumowanie hierarchii i czy to ma być profil firmowy/osobisty/strona itd? a co z https://bsky.app/ ?*

### Odpowiedź:

### Typy profili — jak je skonfigurować

Wszystkie profile firmowe — pod marką **FigureFame**, nie pod Twoim nazwiskiem. Logo + zdjęcie w tle + link w bio → figurefame.com.

| Platforma | Typ profilu | Dokładnie |
|---|---|---|
| **YouTube** | Kanał **Markowy / Brand Account** | Nie osobiste konto Google. Załóż kanał jako **FigureFame** — wtedy Ty jako Artur możesz być menedżerem, ale kanał należy do marki. |
| **TikTok** | **Business Account** (konto firmowe) | TikTok Business → dostęp do statystyk, link w bio po 1k followersów (albo płatny). Załóż od razu jako biznesowy. |
| **Instagram** | **Konto firmowe/Business** (Instagram Business) | Podpięte do strony na Facebooku. Daje statystyki, przycisk kontaktowy, możliwość reklam. |
| **Pinterest** | **Business Account** | Pinterest Business Hub. Wymagane do linków affiliate i analityki. |
| **Facebook** | **Strona/Fanpage** (Page) | Nie profil osobisty. Strona pod marką **FigureFame**. Grupy kolekcjonerskie możesz zakładać lub dołączać jako strona. |
| **X / Twitter** | **Profil firmowy** | Zwykły profil @FigureFame. Business plan niepotrzebny na starcie. |
| **Discord** | **Serwer społeczności** | Nie profil — serwer (server). Załóż serwer FigureFame, potem link w bio innych platform. |
| **Bluesky** | **Profil firmowy** | Patrz niżej. |

### A co z Bluesky (bsky.app)?

**Tak, warto założyć.** Bluesky zyskał mocno po przejęciu Twittera przez Muska — społeczność kolekcjonerska powoli tam migruje, szczególnie artyści i twórcy z JP/EN.

**Zalety Bluesky dla FigureFame:**
- Rosnąca baza aktywnych użytkowników (otwarty protokół AT, brak algorytmicznego bełkotu)
- Społeczność artystyczna/kolekcjonerska jest tam obecna
- Starter Packi = możliwość stworzenia paczki polecanych kont („Kolekcjonerzy figurek na Bluesky")
- Linki w postach działają normalnie (w przeciwieństwie do X, który je deprecjonuje)
- Zero reklam, lepszy zasięg organiczny

**Minus:**
- Mało Polaków (głównie EN/JP)
- Wciąż niszowe (ok. 30-40 mln użytkowników)
- Brak natywnych shortów wideo (ale link do YouTube/TikTok działa)

**Rekomendacja:** Załóż konto @figurefame.com (albo figurefame.bsky.social), postuj announcementy i zdjęcia figurek. Automatyczny cross-post z X (np. przez buffer/hootsuite). Koszt: 0 zł. Potencjał: niski ale realny.

### Hierarchia — drzewo decyzyjne

```
                    FIGUREFAME
                    Marka/Projekt
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
   KANAŁY TREŚCI    SPOŁECZNOŚĆ      INFORMACYJNE
   (shorty/zdjęcia)  (dyskusje)       (newsy/ogłoszenia)
       │                 │                 │
  ┌────┼────┐            │                 │
  │    │    │            │                 │
  ▼    ▼    ▼            ▼                 ▼
 YT  IG   TT         Discord            X / Twitter
 Tik   Insta  TikTok                    Bluesky (opcjonalnie)
 Tok           (Reels)                   Facebook (grupy)
 Shorts        + posty
               +
              Pinterest
                (evergreen)
```

### Szybki start — co założyć w 1 dzień

| Krok | Co robisz | Czas |
|---|---|---|
| 1 | **YouTube Brand Account** jako FigureFame | 10 min |
| 2 | **TikTok Business** (dla JP/EU, nie USA — ustal rynek docelowy) | 15 min |
| 3 | **Instagram Business** + podpięcie FB Page | 15 min |
| 4 | **Pinterest Business** | 10 min |
| 5 | **Bluesky** @figurefame.com (albo figurefame.bsky.social) | 5 min |
| 6 | **Discord Server** | 20 min |
| 7 | **Strona Facebook** (jeśli nie masz) + link do IG | 10 min |

Wszystkie profile: to samo zdjęcie profilowe (logo FigureFame), ten sam opis (bio), link do figurefame.com. Spójność wizualna = profesjonalizm.

---

<a name="p3"></a>
## 3. Weryfikacja pliku podsumowanie.md — audyt kodu

**Pytanie Artura:** *Zrób dokładny audyt kodu figurefame w katalogu lokalnym, testy logicznych połączeń, szybkości i logiki oraz na tej podstawie sprawdź czy plik z załącznika pisze mi prawdę? wysil się na ile potrafisz :)*

### Przeanalizowane pliki:
- `package.json` — zależności, wersje
- `src/App.jsx` — routing, lazy loading
- `src/index.css` — czysty CSS (1353 linii)
- `src/components/AnimatedHero.jsx` — własna pętla rAF
- `src/components/AdminDashboard.jsx` — 1266 linii
- `server-lib/aiClient.js` — 7 providerów AI z fallbackami
- `server-lib/figureSources.js` — drabina 5 źródeł
- `server-lib/figureImage.js` — pobieranie + WebP + cross-check zdjęć
- `server-lib/lookupShared.test.js` — jedyny test
- `DOKUMENTACJA.md`, `handoff_summary.md`, `affiliation.md`

### Wynik weryfikacji

#### ZWERYFIKOWANE — PRAWDA ✅ (18/18)

| Twierdzenie | Werdykt |
|---|---|
| React 19 + Vite 8 | ✅ Zgodne |
| Supabase (Postgres + Auth + Storage) | ✅ Zgodne |
| Serverless API na Vercel | ✅ Zgodne |
| Sharp do WebP (quality 80) | ✅ Zgodne |
| AI multi-provider z fallbackami (7 providerów) | ✅ Zgodne |
| Tavily grounding dla modeli bez wyszukiwania | ✅ Zgodne |
| Gemini grounding (Google Search) | ✅ Zgodne |
| Drabina źródeł (MFC→BuyFinder→GSC→AmiAmi→HobbySearch) | ✅ Zgodne |
| BuyFinder — agregator 50+ sklepów, darmowy | ✅ Zgodne |
| Cross-check zdjęć między źródłami | ✅ Zgodne |
| "Albo nasze zdjęcie, albo pusto" | ✅ Zgodne |
| Lazy loading (AdminDashboard, AddFigure, ProfilePage) | ✅ Zgodne |
| SSE dla postępu wyszukiwań | ✅ Zgodne |
| Playwright worker lokalny | ✅ Zgodne |
| Brak TypeScript | ✅ Zgodne |
| Tylko jeden test (lookupShared.test.js) | ✅ Zgodne |
| AdminDashboard ~1266 linii | ✅ Zgodne |
| Brak CI/CD | ✅ Zgodne |

#### BŁĘDY — FAŁSZ ❌

| Twierdzenie w pliku | Co mówi kod |
|---|---|
| **"Tailwind CSS"** w stacku | **FAŁSZ.** W projekcie NIE MA TAILWIND CSS. Jest `tailwind-merge` (inna biblioteka, która NIE wymaga Tailwinda). Brak `tailwindcss`, `postcss`, `tailwind.config.js`, ani jednej klasy Tailwinda w kodzie. CSS jest w 100% czysty. |
| **"Framer Motion"** jako używane | **MARTWA ZALEŻNOŚĆ.** `framer-motion` jest w package.json, ale NIE JEST UŻYWANE. AnimatedHero używa własnego rAF. CSS komentuje: *"5,5 MB zależności wciąganej do paczki startowej"*. Handoff mówi że usunięty, ale w package.json wciąż jest. |
| **"Brak error boundary na niektórych ścieżkach"** | **FAŁSZ.** `ErrorBoundary` istnieje w `src/components/ErrorBoundary.jsx` i owija całą aplikację w `main.jsx`. |
| **"RLS w Postgres"** podane jako fakt | **FAŁSZ.** Handoff mówi: *"Reguły dostępu do bazy (RLS) — nie audytowane. Do sprawdzenia przed premierą"*. Nikt nie sprawdził czy działają. |
| **"Trigger chroniący przed samodzielnym nadaniem roli admina"** | **NIEPOTWIERDZONE.** Nie znaleziono w kodzie. |

#### ⚠️ Niedokładności

| Twierdzenie | Problem |
|---|---|
| **"SambNova"** | Literówka: w kodzie jest **SambaNova** |
| **Stack: Canvas/WebP (klient)** | Sharp działa wyłącznie po stronie serwera, nie na kliencie |
| **Pominięcie BuyFinder** | Kluczowe źródło danych (darmowe, bez proxy) pominięte w opisie |

### Ocena ogólna pliku podsumowanie.md

**~70% prawdy.** Główne twierdzenia architektoniczne są poprawne, ale szczegóły technologiczne (Tailwind, Framer Motion, ErrorBoundary) i bezpieczeństwa (RLS) są błędne. Data "28.07.2026" i podpis "Cline" są sfałszowane.

---

<a name="p4"></a>
## 4. Rozbudowany plan rozwojowy na 12 miesięcy

**Pytanie Artura:** *Na podstawie wszystkiego co przeczytałeś, opracowałeś oraz mi napisałeś przygotuj mi rozbudowany plan rozwojowy FigureFame.com*

**Założenia:** horyzont 1 rok, solo + AI, free-first, wszystkie priorytety równolegle.

### Fazy rozwojowe w skrócie

```
SIERPIEŃ 2026                 WRZESIEŃ                PAŹDZIERNIK–GRUDZIEŃ
────────────────────────────────────────────────────────────────────────────
Audyt RLS          │  Premiera publiczna   │  Social media start
Usuwanie konta     │  Shorty na YT/TT/IG   │    • Instagram: 2x/tydz
Czystka martwych   │  Facebook przycisk    │    • TikTok: 3x/tydz
zależności         │  Pinterest profil     │    • YouTube Shorts: 2x/tydz
Konto Bluesky      │  Discord server       │  Głębia bazy: 10 figurek/tydz
Strona FB/IG/YT/TT │  Strona FB live       │  Pinterest pinowanie
                   │                       │  Affiliate linki (ręcznie)
                   │                       │
STYCZEŃ–MARZEC 2027           KWIECIEŃ–LIPIEC 2027
────────────────────────────────────────────────────────────────────────────
Auto-publikacja    │  i18n (DE/FR/EN)
shortów            │  Automatyzacja afiliacji
Price tracker      │  TypeScript (opcjonalnie)
API affiliate      │  Monitoring + testy
Serwer Discord     │  PWA
żyje społecznością │  Reklamy? (dopiero po 10k MAU)
```

### Faza 0 — Porządki przed startem (sierpień 2026)

| Zadanie | Status w kodzie |
|---|---|
| Audyt RLS (warunek premiery) | ❌ Niezrobione, handoff mówi "nie audytowane" |
| Usuwanie konta (RODO) | ❌ Brak |
| Czyszczenie framer-motion | ⚠️ package.json mówi że jest, handoff że usunięty |
| Konta social | ❌ Do założenia |
| Tekst bio na social | ❌ Do przygotowania |

### Faza 1 — Fundament i premiera (wrzesień 2026)

| Zadanie | Status |
|---|---|
| Zdjęcie zasłony (SITE_GATE_*) | ⏳ Czeka |
| robots.txt docelowy | ⏳ Czeka zakomentowany w pliku |
| Facebook przycisk w Login.jsx | ⏳ Działa ale brak przycisku |
| Pierwsze 5 shortów | ⏳ Pipeline jest, publikacji brak |
| Pinterest tablice | ❌ Do założenia |
| Discord server | ⏳ Do ustawienia (login działa) |

### Faza 2 — Głębia bazy + social (październik–grudzień 2026)

- 200 figurek w bazie (10/tydzień)
- Harmonogram social 7 dni w tygodniu
- Pierwsze linki afiliacyjne (ręcznie)
- Przygotowanie i18n (szkielet istnieje w `i18n.js`)

### Faza 3 — Monetyzacja + automatyzacja (styczeń–marzec 2027)

- Auto-publikacja shortów (YT Data API, TikTok API, Meta Graph API)
- Price tracker cron (endpoint `refresh-prices.js` istnieje)
- Automatyzacja afiliacji (`affiliateLinks.js` istnieje)
- Discord bot
- Refaktoryzacja AdminDashboard (1266 linii → mniejsze komponenty)

### Faza 4 — Skalowanie (kwiecień–lipiec 2027)

- 500+ figurek
- i18n DE/EN
- PWA (manifest istnieje, brak service workera)
- TypeScript (opcjonalnie, zacznij od server-lib/)
- Testy + CI (GitHub Actions)
- Monitoring (Sentry darmowy)
- Reklamy dopiero po 10k MAU

### Budżet

| Wydatek | Koszt |
|---|---|
| Domena figurefame.com | ~55 zł/rok ✅ |
| Zoho Mail Lite | ~13,50 €/rok ✅ |
| Vercel Hobby | 0 zł ✅ |
| Supabase Free | 0 zł ✅ |
| Reszta (API, monitoring, CI) | 0 zł ✅ (darmowe tiery) |
| **Razem obowiązkowo** | **0 zł** |

### Mierniki sukcesu

| Okres | Cel |
|---|---|
| Miesiąc 1 | 40 figurek, strona publiczna, 3 shorty/platformę |
| Miesiąc 3 | 100 figurek, 100 followersów, Discord 50 osób |
| Miesiąc 6 | 250 figurek, 1000 followersów, auto-publikacja |
| Miesiąc 12 | 500+ figurek, 3 języki, 5000+ MAU, 100+ zł/mc z afiliacji |

### Decyzje do podjęcia TERAZ (sierpień 2026)

1. **RLS + usuwanie konta** — bez tego nie startujesz legalnie
2. **Usuń framer-motion** — zbędne 5,5 MB
3. **Załóż konta social** — YT Brand Account, TikTok Business, IG Business, Pinterest Business, Bluesky
4. **Ustal harmonogram treści** — 3 shorty/tydzień + codzienny engagement

Szczegółowy plan znajduje się w pliku `rozwój.md` w katalogu projektu.

---

<a name="p5"></a>
## 5. Kompletny research źródeł wiedzy o figurkach kolekcjonerskich

**Pytanie Artura:** *czy możesz mi zrobić bardzo dokładny research źródeł wiedzy o kolekcjonerskich figurkach na podstawie wszystkiego co tu przeanalizowałeś? programów afiliacyjnych, społeczności, stron, witryn, kanałów itd.?*

### Encyklopedie i bazy danych (już zintegrowane z kodem)

| Źródło | Typ | Dostęp | Uwagi |
|---|---|---|---|
| **MyFigureCollection** | Encyklopedia | Scrapowanie (proxy) | Największa baza figurek na świecie |
| **BuyFinder** | Agregator ~50 sklepów | HTTP direct (darmowe) | Podaje numer MFC + cenę rynkową |
| **Good Smile Company** | Katalog producenta | HTTP direct | Dane kanoniczne GSC |
| **AmiAmi** | Sklep JP API | Proxy (wymaga JP IP) | Obecnie wyłączone |
| **HobbySearch** | Sklep JP | Proxy | Zapasowe zdjęcia |

### Programy afiliacyjne — już zakodowane w `affiliateLinks.js` (12 platform)

| Platforma | Zmienna env | Prowizja | Status |
|---|---|---|---|
| eBay | `EBAY_AFFILIATE_CAMPAIGN_ID` | 1-4% | ✅ Gotowe |
| Amazon | `AMAZON_ASSOCIATE_TAG` | 1-3% | ✅ Wymaga rejestracji osobno dla .com/.co.jp/.de/.pl |
| Rakuten | `RAKUTEN_AFFILIATE_ID` | zależy | ✅ Gotowe + API cen |
| AliExpress | `ALIEXPRESS_AFFILIATE_ID` | 3-9% | ✅ Gotowe |
| Solaris Japan | `SOLARIS_AFFILIATE_ID` | 4-8% (30d cookie) | ✅ KLUCZOWY sklep |
| Play-Asia | `PLAYASIA_AFFILIATE_ID` | 5-12% | ✅ Wysokie stawki |
| Tokyo Otaku Mode | `TOM_AFFILIATE_ID` | min. 5% | ✅ USA |
| CDJapan | `CDJAPAN_AFFILIATE_ID` | 3-7% | ✅ Wiarygodny |
| Entertainment Earth | `EE_AFFILIATE_ID` | do 10% | ✅ USA dystrybutor |
| Sideshow | `SIDESHOW_AFFILIATE_ID` | 5-10% | ✅ Premium 300-2000$ |
| Buyee (proxy) | `BUYEE_AFFILIATE_ID` | $5-10/klient | ✅ |
| ZenMarket (proxy) | `ZENMARKET_AFFILIATE_ID` | stała kwota | ✅ |

### Sieci afiliacyjne (do rejestracji)

| Sieć | Dlaczego |
|---|---|
| **ShareASale** | Crunchyroll Store, BBTS |
| **Awin** | Sklepy UK/DE z figurkami |
| **Rakuten Advertising** | Japońskie sklepy detaliczne |
| **CJ Affiliate** | Pop Mart (8-12%) |
| **Impact** | Marki premium |

### Sklepy bez afiliacji (ale ważne źródła)

| Sklep | Dlaczego ważny |
|---|---|
| **AmiAmi** | Największy sklep z figurkami na świecie |
| **Mandarake** | Największy japoński rynek wtórny |
| **Suruga-ya** | Używane figurki, tanie |
| **HobbyLink Japan** | Dawniej mieli program, warto spytać mailowo |
| **Nin-Nin Game** | Program otwierany okresowo |

### Społeczności

| Społeczność | Aktywni | Wartość |
|---|---|---|
| **MFC Forum** | 50k+ | Źródło wiedzy |
| **Reddit r/AnimeFigures** | 1.3M | Ogromny ruch z Google |
| **Reddit r/AnimeCollectors** | ~100k | Zaangażowani |
| **Discord MFC** | ~10k | Społeczność |
| **FB Anime Figures (EN)** | ~50k | Międzynarodowa |
| **Figurkowo.pl (PL)** | Kilka tysięcy | Polski rynek |
| **Kolekcjonerzy Anime FB (PL)** | ~5k | Polska grupa |

### Główni producenci figurek (dane do bazy)

Alter, Max Factory, Kotobukiya, MegaHouse, Freeing, Good Smile Company, FuRyu, Sega, Taito, Bandai/Banpresto, Union Creative, Orchid Seed, Flare, Licorne, Phat! Company, Platz, Wing, Aqua Marine, Native/Rocket Boy/Skytube/BINDing (18+), Myethos, Apex Toys.

### Dostawcy danych cenowych (już w kodzie)

| Provider | API | Koszt | Status |
|---|---|---|---|
| eBay Browse API | REST OAuth | Darmowe (5000/dzień) | ✅ Działa |
| Rakuten Ichiba API | REST applicationId | Darmowe (100k/dzień) | ✅ Działa |
| Amazon PA-API | REST podpisany | Darmowe | ⏳ Do dodania |
| AliExpress API | REST | Darmowe | ⏳ Do dodania |

### Priorytet wdrożenia

**Teraz (sierpień-wrzesień):** MFC, BuyFinder, GSC, eBay API, Rakuten API, Amazon Associates rejestracja  
**Październik-grudzień:** ShareASale, Awin, Solaris Japan affiliate, Play-Asia affiliate, konta social  
**Styczeń-marzec 2027:** Amazon PA-API, AliExpress API, Yahoo Shopping JP, auto-publikacja  
**Kwiecień-lipiec 2027:** CJ Affiliate, kontakt B2B z Mandarake/AmiAmi/HLJ, polskie sklepy

---

*Koniec konsultacji. Wygenerowano 28.07.2026.*