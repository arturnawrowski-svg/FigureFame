# Rozbudowany Plan Rozwojowy FigureFame.com

**Horyzont: 12 miesięcy (sierpień 2026 – lipiec 2027)**  
**Zespół: solo + narzędzia AI**  
**Budżet: free-first, płatne tylko tam gdzie konieczne (jak domena)**  
**Priorytety: wszystko — social, baza, monetyzacja, społeczność — równolegle tam gdzie się da**

---

## Spis treści

1. [Fazy rozwojowe w skrócie](#fazy-w-skrócie)
2. [Faza 0 — Porządki przed startem (sierpień 2026)](#faza-0)
3. [Faza 1 — Fundament i premiera (wrzesień 2026)](#faza-1)
4. [Faza 2 — Głębia bazy + social (październik–grudzień 2026)](#faza-2)
5. [Faza 3 — Monetyzacja + automatyzacja (styczeń–marzec 2027)](#faza-3)
6. [Faza 4 — Skalowanie (kwiecień–lipiec 2027)](#faza-4)
7. [Zadania ciągłe (przez cały rok)](#zadania-ciągłe)
8. [Mapa zależności](#mapa-zależności)
9. [Budżet](#budżet)
10. [Mierniki sukcesu](#mierniki-sukcesu)

---

<a name="fazy-w-skrócie"></a>
## Fazy rozwojowe w skrócie

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

---

<a name="faza-0"></a>
## Faza 0 — Porządki przed startem (sierpień 2026)

**Cel: Zabezpieczyć projekt przed premierą i zamknąć dziury.**

### 0.1 Audyt RLS (REGULAMINOWY — warunek premiery)

Stan z `handoff_summary.md`: *"Reguły dostępu do bazy (RLS) — nie audytowane. Do sprawdzenia przed premierą, bo klucz publiczny i tak jest w kodzie strony."*

Kroki:
- [ ] Przejrzeć każdą tabelę w Supabase Dashboard → Authentication → Policies
- [ ] Dla `figures`: upewnić się że PUBLIC może tylko SELECT gdzie `status = 'APPROVED'`
- [ ] Dla `profiles`: upewnić się że user widzi tylko swój profil (INSERT tylko siebie, UPDATE tylko siebie)
- [ ] Dla `short_queue` / `deals`: user tylko INSERT + SELECT własne
- [ ] Admin rights: sprawdzić czy `is_admin` w `profiles` nie może być ustawiony przez usera (trigger/before insert?)
- [ ] Napisać migrację SQL do pliku i wrzucić do repo (np. `migrations/rls-policies.sql`)

### 0.2 Usuwanie konta (RODO — warunek premiery)

Stan: brak. Bez tego nie można legalnie wystartować.

Kroki:
- [ ] API endpoint `api/delete-account.js`:
  - [ ] DELETE z `profiles`
  - [ ] DELETE z `auth.users` (Supabase Admin API)
  - [ ] Usunięcie zdjęć z bucketu `figure-images` (jeśli user dodawał)
  - [ ] Potwierdzenie mailem przed faktycznym usunięciem
- [ ] Przycisk "Usuń konto" w `ProfilePage.jsx` z potwierdzeniem (wpisz "USUŃ")
- [ ] Polityka prywatności (nowa strona `/privacy`)

### 0.3 Czyszczenie martwych zależności

Stan: `framer-motion` wisi w `package.json` (5,5 MB), choć kod w `index.css` komentuje: *"Wcześniej robiła to biblioteka animacji (framer-motion) — 5,5 MB zależności wciąganej do paczki startowej"*. `handoff_summary.md` mówi że framer-motion został usunięty, ale w `package.json` wciąż jest.

- [ ] `npm remove framer-motion` (bezpieczne — AnimatedHero używa własnego rAF, animacje CSS są czystym CSS)
- [ ] Sprawdzić czy `tailwind-merge`/`clsx` jest faktycznie używane: `grep -r "twMerge\|clsx" src/`
- [ ] Jeśli nie → `npm remove tailwind-merge clsx`
- [ ] Przetestować `npm run build` czy wszystko działa

### 0.4 Zakładanie kont social media

Wszystkie profile firmowe pod marką **FigureFame**, logo + link do figurefame.com:

| Platforma | Typ | Uwagi |
|---|---|---|
| **YouTube** | Brand Account (kanał firmowy) | Nie osobiste konto Google. Załóż jako FigureFame — Ty jako Artur możesz być menedżerem, ale kanał należy do marki. |
| **TikTok** | Business Account | TikTok Business → statystyki, bio link, reklamy. |
| **Instagram** | Business Account | Podpięty do FB Page. Daje statystyki, przycisk kontaktowy. |
| **Pinterest** | Business Account | Pinterest Business Hub. Wymagane do linków affiliate i analityki. |
| **Facebook** | Strona/Fanpage (Page) | Nie profil osobisty. Strona pod marką FigureFame. |
| **Bluesky** | Profil @figurefame.com (albo figurefame.bsky.social) | Rosnąca społeczność kolekcjonerska, otwarty protokół AT. |
| **Discord** | Serwer społeczności | 5 kanałów: #ogólne, #figurki, #znaleziska, #shorty, #feedback |

Tekst bio (wszędzie ten sam):
```
Japanese figure collector's database + AI-powered search.
毎日新しいフィギュア 🔍
↓ Full catalog
figurefame.com
```

---

<a name="faza-1"></a>
## Faza 1 — Fundament i premiera (wrzesień 2026)

**Cel: Wystartować publicznie, uruchomić pierwsze social media i Discord.**

### 1.1 Premiera publiczna (dzień 1 września)

Kroki:
- [ ] Usunąć `SITE_GATE_USER` i `SITE_GATE_PASSWORD` z Vercela (zdjęcie zasłony)
- [ ] Przywrócić `robots.txt` z sekcji "DOCELOWO" w `public/robots.txt`
- [ ] Zdjąć `<meta name="robots">` z `index.html`
- [ ] Sprawdzić czy Google/Bing indeksują: `site:figurefame.com` po 48h

### 1.2 Dodać brakujące przyciski logowania

Stan z handoff: Facebook działa, ale nie ma przycisku. W `Login.jsx` brakuje Facebook.

- [ ] Dodać przycisk Facebook w `Login.jsx`
- [ ] Rozważyć włączenie Apple (dopiero jeśli ktoś poprosi — 99 USD/rok)
- [ ] Opcjonalnie: LinkedIn OIDC (dostępne w Supabase, mały koszt, może przydać się B2B z producentami)

### 1.3 Pierwsze shorty — ręcznie

Stan: pipeline renderowania istnieje (`renderShort.mjs`), ale nie jest wdrożony do publikacji.

Zacznij od ręcznego tworzenia shortów (TY robisz + AI pomaga):
- [ ] Zrób 5 shortów dla figurek które już mają zdjęcia (Izumi Konata, Hatsune Miku, Levi, Super Sonico itp.)
- [ ] Opublikuj na wszystkich 3 platformach (YT Shorts, TikTok, IG Reels)
- [ ] W każdym short link w bio → `figurefame.com/f/<slug>`
- [ ] Harmonogram: 3 shorty/tydzień

### 1.4 Pinterest — evergreen traffic

- [ ] Załóż tablice tematyczne: "Anime Figures", "Nendoroid Collection", "Scale Figures", "Prize Figures"
- [ ] Pinuj zdjęcia figurek z linkiem do karty na FigureFame
- [ ] Automatyzacja przez IFTTT/Zapier później (Faza 3)

### 1.5 Discord — społeczność

- [ ] Ustaw serwer: kanały tekstowe + ogłoszenia z RSS/webhook z GitHub
- [ ] Link do Discorda w navbarze strony
- [ ] Automatyczna rola po zalogowaniu (Supabase Auth → Discord → webhook)

---

<a name="faza-2"></a>
## Faza 2 — Głębia bazy + social (październik–grudzień 2026)

**Cel: 200 figurek w bazie, stały ruch z social media, pierwsze affiliate kliknięcia.**

### 2.1 Głębia bazy danych — 10 figurek/tydzień

Stan: 24 figurki. Na 200 potrzeba ~4 miesięcy po 10/tydz.

Proces (oparty o istniejący lookup pipeline):
```
1. AI proponuje kandydatów (Gemini z groundingiem → popularne figurki z MFC)
2. lookupWorker (lokalny Playwright) zbiera dane ze źródeł
3. TY weryfikujesz w AdminDashboard
4. Zatwierdzenie = APPROVED → widoczne w Gablocie
5. AI generuje opis + strategię wyszukiwania
6. Short renderuje się do kolejki
```

Priorytetyzacja figurek:
1. **Najpopularniejsze** (Hatsune Miku, Rem, Ram, Asuna, Zero Two, Marin Kitagawa) — ruch z wyszukiwarki
2. **Series kompletne** (cały rząd Lucky Star, wszystkie wersje Sonico)
3. **Nisze** (rzadkie, drogie, albo z wysokim `bootleg_risk`) — wartość merytoryczna

### 2.2 Harmonogram social media (tydzień)

| Dzień | Platforma | Treść |
|---|---|---|
| Poniedziałek | TikTok | Short (nowa figurka + AI voice) |
| Wtorek | Instagram | Post ze zdjęciem + ciekawostka |
| Środa | YouTube Shorts | Short (ten sam co na TT) |
| Czwartek | Instagram | Reel (figurka + muzyka) |
| Piątek | TikTok | Short (porównanie: fake vs real) |
| Sobota | Pinterest | 5 pinów nowych figurek |
| Niedziela | — | Odpoczynek / Discord engagement |

### 2.3 Affiliate — pierwsze linki (ręcznie)

- [ ] Zarejestruj się w programach afiliacyjnych: Amazon Associates, Solaris Japan (jeśli mają), proxy shopów japońskich
- [ ] Dla każdej figurki w bazie: przypisz link afiliacyjny (ręcznie, później automatyzacja)
- [ ] W `auction-deals` i `official-shops` na karcie figurki: podmiana linków na afiliacyjne
- [ ] Rekomendacja: Amazon ma figurki, ale niski % (3-5%). Celuj w sklepy kolekcjonerskie.

### 2.4 i18n — przygotowanie tłumaczeń

Stan: szkielet istnieje (`i18n.js`, `t()`, `cycleLocale`).

- [ ] Zbierz wszystkie teksty z UI do plików językowych (JS objects lub JSON)
- [ ] PL — gotowe, używasz na co dzień
- [ ] Dodaj DE (niemiecki) — duża społeczność kolekcjonerska w Niemczech
- [ ] Dodaj EN (angielski) — dopiero jak baza > 500 figurek

Uwaga: adresy figurek (`/f/<slug>`) są neutralne językowo, więc `/de/f/slug` doklei się bez psucia linków.

---

<a name="faza-3"></a>
## Faza 3 — Monetyzacja + automatyzacja (styczeń–marzec 2027)

**Cel: Automatyczny lejek short → karta → affiliate, społeczność która sama produkuje treści.**

### 3.1 Auto-publikacja shortów

Stan: pipeline renderowania istnieje, ale publikacja jest ręczna.

- [ ] Zrób skrypt `worker/publishShort.mjs` który:
  - [ ] Bierze z kolejki zaakceptowane MP4
  - [ ] Wgrywa na YouTube (YouTube Data API v3) — darmowe, 10k requestów/dzień
  - [ ] Wgrywa na TikTok (TikTok Business API) — wymaga zatwierdzonej aplikacji developerskiej
  - [ ] Post na IG (Meta Graph API) — przez Facebook Creator Studio

Uwaga: YouTube API jest darmowe. TikTok i IG wymagają zatwierdzenia aplikacji (proces 2-4 tygodnie, darmowy).

### 3.2 Price tracker (Etap 3 z planu)

Stan: endpoint `api/refresh-prices.js` istnieje, ale nie jest wdrożony do regularnego odświeżania.

- [ ] Uruchom `refresh-prices` jako cron na Vercel (Vercel Cron Jobs — darmowe, 2 joby na hobby plan)
  - [ ] Codziennie: sprawdź aktualne ceny dla APPROVED figurek
  - [ ] Co tydzień: pełne odświeżenie ze źródeł (BuyFinder → market value)
- [ ] Wyświetlaj historię cen na karcie figurki (prosty sparkline CSS)

### 3.3 Automatyzacja afiliacji

- [ ] API endpoint `api/affiliate-links.js`:
  - [ ] Dla figurki → znajdź oferty w Amazon/Solaris/sklepach
  - [ ] Zapisz do `deals` z linkiem afiliacyjnym
  - [ ] Automatycznie podmieniaj linki w `auction-deals` na afiliacyjne
- [ ] Wykorzystaj istniejący `affiliateLinks.js` w `server-lib/` (jest, ale nie jest podpięty do UI)

### 3.4 Discord — automatyzacja

- [ ] Bot Discord (prosty, w Node.js na Vercel):
  - [ ] Codzienny post "Figurka dnia" (losowa APPROVED figurka)
  - [ ] Powiadomienia o nowych figurkach w bazie
  - [ ] Kanał `#znaleziska` z RSS sklepów japońskich
- [ ] Link do Discorda w navbarze (już jest login, dodaj przycisk "Dołącz do społeczności")

### 3.5 AdminDashboard — refaktoryzacja

Stan: 1266 linii w jednym pliku.

- [ ] Wydziel: `FigureTable.jsx`, `FigureForm.jsx`, `ShortPanel.jsx`, `ImagePanel.jsx`
- [ ] Testy dla AdminDashboard (przynajmniej czy renderuje zakładki)
- [ ] To nie jest krytyczne, ale ułatwi dalszy rozwój

---

<a name="faza-4"></a>
## Faza 4 — Skalowanie (kwiecień–lipiec 2027)

**Cel: 500+ figurek, ruch organiczny z wyszukiwarek, i18n, pierwszy przychód.**

### 4.1 i18n — wdrożenie niemieckiego i angielskiego

- [ ] DE: tłumaczenie UI, opisów figurek AI generowane po niemiecku
- [ ] EN: dopiero po 500 figurkach (konkurencja z MFC po angielsku jest najostrzejsza)
- [ ] Obsługa `/de/f/slug` i `/en/f/slug` w routerze (Vercel i18n lub React Router)
- [ ] `hreflang` tagi dla SEO

### 4.2 PWA (Progressive Web App)

Stan: `manifest.webmanifest` istnieje w `public/`.

- [ ] Service worker (offline + cache figurek)
- [ ] "Add to Home Screen" działa na iOS/Android
- [ ] Push notifications (o nowych figurkach, wyprzedaży)

### 4.3 TypeScript — stopniowa migracja

Stan: całość w JS. TypeScript pomoże przy 500+ figurkach i złożonej logice.

- [ ] Zacznij od `server-lib/` (aiClient, figureSources, figureImage) — to rdzeń logiki
- [ ] Potem API (`api/*.js`)
- [ ] Frontend na końcu (albo nigdy — React JSX w Vite działa dobrze)
- [ ] Włącz `strict: true` w tsconfig

### 4.4 Testy — pokrycie krytycznych ścieżek

Stan: tylko `lookupShared.test.js`.

- [ ] **Krytyczne:** `aiClient.js` — mock providerów, sprawdź fallback chain
- [ ] **Krytyczne:** `figureSources.js` — testuj `queryVariants`, `sameFigure`, `scoreCandidate`
- [ ] **Ważne:** `figureImage.js` — testuj `crossCheckImage`, `preferLargestMfc`
- [ ] **Ważne:** `figureIdentity.js` — testuj slug, short_code, identity_key
- [ ] CI: GitHub Actions (darmowe) → `npm test` na każdym push

### 4.5 Monitoring

- [ ] Vercel Analytics (darmowe) — ruch, błędy, wydajność
- [ ] Sentry (darmowy tier) — błędy JavaScript na produkcji
- [ ] Google Search Console — pozycje w wyszukiwarce
- [ ] Logi: Vercel logs + Supabase logs (oba darmowe)

### 4.6 Ewentualnie: reklamy

Dopiero jeśli:
- Ruch > 10k MAU (miesięcznych aktywnych użytkowników)
- I affiliate revenue nie pokrywa kosztów

Wtedy: Carbon Ads (reklamy programistyczne, dobrze płacą, nie przeszkadzają UX) albo bezpośrednie reklamy sklepów z figurkami.

---

<a name="zadania-ciągłe"></a>
## Zadania ciągłe (przez cały rok)

| Co | Jak często | Narzędzie |
|---|---|---|
| Nowe figurki | 10/tydzień | lookupWorker + AdminDashboard |
| Shorty | 3/tydzień | renderShort.mjs → ręczna publikacja → auto od Fazy 3 |
| Instagram/TikTok | codziennie | Ten sam content cross-postowany |
| Pinterest | 5 pinów/dzień | Ręcznie + później IFTTT |
| Discord engagement | codziennie | Bot od Fazy 3 |
| Kopia zapasowa | tygodniowo | `npm run kopia` (istnieje!) |
| npm audit | miesięcznie | `npm audit` + aktualizacja zależności |
| SEO check | miesięcznie | Google Search Console |
| Backup bazy | tygodniowo | Supabase → SQL dump |

---

<a name="mapa-zależności"></a>
## Mapa zależności — co od czego zależy

```
Faza 0 (sierpień)
│
├── RLS audyt ────────────── warunek premium ──┐
├── Usuwanie konta ───────── warunek RODO ─────┤
├── Martwe zależności ────── czystość ──────────┤
└── Konta social ───────────────────────────────┤
                                                │
Faza 1 (wrzesień) ← Premiery                    │
├── Premiera publiczna ─────────────────────────┘
├── Facebook przycisk ────── drobne
├── Pierwsze shorty ──────── początek lejka
├── Pinterest ────────────── evergreen traffic
└── Discord ──────────────── społeczność start
                                                │
Faza 2 (X–XII 2026)                             │
├── 200 figurek ──────────── głębia bazy
├── Social 7 dni/tydz ────── stały harmonogram
├── Affiliate ręczne ─────── pierwsze $$$ ────── warunek do Fazy 3
└── i18n PL→DE ───────────── przygotowanie
                                                │
Faza 3 (I–III 2027)                             │
├── Auto-publikacja shortów ─── warunek: API social
├── Price tracker cron ──────── warunek: refresh-prices działa
├── Automatyzacja afiliacji ─── warunek: affiliateLinks.js
├── Discord bot ─────────────── społeczność
└── Refaktoryzacja Admin ────── developer experience
                                                │
Faza 4 (IV–VII 2027)                            │
├── i18n DE/EN ────────────── warunek: 500 figurek
├── PWA ──────────────────── engagement mobilny
├── TypeScript ────────────── utrzymywalność
├── Testy + CI ───────────── jakość
├── Monitoring ────────────── zdrowie projektu
└── Reklamy ──────────────── warunek: 10k MAU
```

---

<a name="budżet"></a>
## Budżet — gdzie i kiedy wydać

| Pozycja | Koszt | Kiedy | Uzasadnienie |
|---|---|---|---|
| **Domena figurefame.com** | ~55 zł/rok ✅ (opłacone do 2027) | Już jest | — |
| **Zoho Mail Lite** | ~13,50 €/rok ✅ | Już jest | Poczta firmowa |
| **Vercel Hobby** | 0 zł ✅ | Zawsze | Darmowy hosting |
| **Supabase Free** | 0 zł ✅ | Do 500 MB bazy | 24 figurki = śladowe użycie |
| **Apple Developer Program** | 99 USD/rok ❌ | TYLKO jeśli ktoś poprosi o login przez Apple | Nie teraz |
| **Sentry (darmowy)** | 0 zł ✅ | Od Fazy 1 | Monitoring błędów |
| **Tavily API (darmowy)** | 0 zł ✅ | Jeśli masz klucz | Grounding AI |
| **Groq API (darmowy)** | 0 zł ✅ | Jeśli masz klucz | Główny provider AI |
| **Brevo SMTP** | 0 zł ✅ | Masz już | Noreply maile |
| **YouTube Data API** | 0 zł ✅ | Od Fazy 3 | 10k requestów/dzień free |
| **TikTok Business API** | 0 zł ✅ | Od Fazy 3 | Wymaga zatwierdzenia aplikacji, nie kasy |
| **Meta Graph API** | 0 zł ✅ | Od Fazy 3 | Darmowe |
| **Vercel Cron Jobs** | 0 zł ✅ | Od Fazy 3 | 2 joby na hobby plan |
| **GitHub Actions** | 0 zł ✅ | Od Fazy 4 | 2000 minut/miesiąc free |
| **Google Cloud (Gemini)** | 0 zł ✅ | Jeśli masz klucz | Darmowy tier Gemini |

**Razem wydatków obowiązkowych: 0 zł.** Dalej free-first.

---

<a name="mierniki-sukcesu"></a>
## Mierniki sukcesu — po czym poznać że działa

### Miesiąc 1 (wrzesień 2026)
- [ ] Strona publiczna, indeksowana w Google
- [ ] 40 figurek w bazie
- [ ] 3 shorty opublikowane na każdej platformie
- [ ] Discord: 10 członków (znajomi + Ty)
- [ ] Pinterest: 50 pinów

### Miesiąc 3 (listopad 2026)
- [ ] 100 figurek w bazie
- [ ] TikTok/IG: 100 followersów (organicznie)
- [ ] Discord: 50 członków
- [ ] Pierwsze kliknięcia w linki afiliacyjne
- [ ] Google: pierwsze wejścia z wyszukiwarki (pozycje 20-50 dla niszowych zapytań)

### Miesiąc 6 (luty 2027)
- [ ] 250 figurek w bazie
- [ ] Social media: łącznie 1000 followersów
- [ ] Shorty publikują się automatycznie
- [ ] Price tracker działa codziennie
- [ ] Ruch: 500 odwiedzających/miesiąc
- [ ] Pierwsza prowizja affiliate (nawet 5 zł — symboliczny start)

### Miesiąc 12 (sierpień 2027)
- [ ] 500+ figurek w bazie
- [ ] 3 języki (PL, DE, EN)
- [ ] 5000+ MAU
- [ ] Społeczność Discorda: 200+ członków
- [ ] Przychód z afiliacji: 100+ zł/miesiąc (pokrywa domenę na kolejny rok)
- [ ] PWA działa, service worker wdrożony
- [ ] Testy pokrywają kluczowe ścieżki
- [ ] RLS audytowane i potwierdzone

---

## Podsumowanie

Najważniejsze decyzje do podjęcia TERAZ (sierpień 2026):

1. **RLS + usuwanie konta** — zrób to przed premierą, bez tego nie startujesz legalnie
2. **Usuń framer-motion** — zbędne 5,5 MB, build będzie szybszy i mniejszy
3. **Załóż konta social** — YouTube (Brand Account!), TikTok Business, IG Business, Pinterest Business, Bluesky
4. **Ustal harmonogram treści** — 3 shorty/tydzień + codzienny engagement. Bez regularności social nie ruszy

Reszta może poczekać — pipeline shortów jest gotowy, lookup działa, AI fallbacki stoją. Największym ryzykiem nie jest kod, tylko **konsekwencja w publikowaniu treści** przez rok.