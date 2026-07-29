# FigureFame — co już zrobione

> Stan na **29.07.2026**. Zasady projektu → [ZALOZENIA.md](ZALOZENIA.md).
> Co jeszcze przed nami → [TODO.md](TODO.md) i [FUTURE.md](FUTURE.md).
>
> Przy każdej pozycji jest **dlaczego tak, a nie inaczej** — bo za pół roku samo „zrobione"
> nikomu nic nie powie, a decyzje zwykle miały powód.

---

## 1. Silnik danych

- **Baza Supabase** — `figures`, `profiles`, `price_snapshots`, `lookup_cache`, `lookup_queue`,
  `studio_status`. Migracje leżą w repo (wcześniej reguła `*.sql` w `.gitignore` trzymała
  schemat **poza** kontrolą wersji — to był błąd, bo schemat bazy jest częścią kodu).
- **Kolejka moderacji** `PENDING → APPROVED → ARCHIVED`.
- **Drabina źródeł** ([server-lib/figureSources.js](server-lib/figureSources.js)) — katalogi
  figurek i strony producentów, AI dopiero na końcu i wyłącznie na braki.
  *Dlaczego:* pierwotna kaskada **nie działała** — scraper MyFigureCollection używał selektorów,
  których w serwisie od dawna nie ma, więc zawsze zwracał zero trafień i wszystko spadało na AI.
  A ta zmyślała: japońskie nazwy będące bełkotem, nieistniejące adresy zdjęć.
- **Lokalna przeglądarka (Playwright)** — omija Cloudflare, ~1,2 s, bez limitów, za darmo.
  *Dlaczego:* Cloudflare rozpoznaje odcisk TLS i odrzuca serwery, a przepuszcza przeglądarki.
  Płatni pośrednicy zeszli do roli awaryjnej (łańcuch 6 dostawców z fallbackiem).
- **Pamięć podręczna wyszukiwań** (30 dni) — każdą figurkę pobieramy raz: 9,96 s → 0,09 s.
  *Dlaczego:* bez niej darmowe limity pośredników znikały po ~25 figurkach. Trzymamy w niej
  dane, które się nie zmieniają (producent, skala, nazwa japońska) — ceny idą osobną drogą.
- **Kolejka wyszukiwań** — klik na żywej stronie zostawia zlecenie, realizuje je komputer w domu.
- **Warstwa multi-AI** ([server-lib/aiClient.js](server-lib/aiClient.js)) — 9 modeli z fallbackiem
  + grounding (Gemini natywnie, reszta przez Tavily).

## 2. Interfejs

- **Gablota** z efektem półki kolekcjonerskiej, tryb jasny i ciemny.
- **Dossier** figurki: dane, oferty, ciekawostki, gdzie szukać, strategia zakupu.
- **Bootleg Radar** i **Ask AI** — dwa wyróżniki wobec MFC, oba działają.
- **Panel moderatora**: zakładki, Studio zdjęcia, podgląd karty na żywo, pasek postępu
  z prawdziwymi etapami (publicznie ogólne nazwy źródeł, dokładne tylko dla admina —
  dobór źródeł to nasza przewaga).
- **Znaczniki pochodzenia danych** przy każdym polu: ✅ katalog / ⚠️ AI.
  *Dlaczego:* pole wypełnione przez AI wyglądało identycznie jak zweryfikowane — a właśnie
  takie potrafi zawierać nieprawdę.
- **Rozbieżności zgłoszenie ↔ katalog** pokazywane obok siebie, bez automatycznej podmiany.
  *Dlaczego:* katalog bywa trafiony w INNĄ wersję tej samej postaci. Decyduje człowiek.
- **Wyszukiwarka publiczna** wyłącznie po własnej bazie, także po nazwach japońskich.
- **Przełącznik języka PL/EN** (szkielet i18n).
- **Flagi rysowane w kodzie** ([Flaga.jsx](src/components/Flaga.jsx)) — Windows nie ma glifów
  flag, emoji `🇵🇱` renderowało się jako „PL PL".

## 3. Zdjęcia

- **Workflow „wielu kandydatów → jedno finalne"**: folder roboczy w Storage, upload z dysku,
  Studio zdjęcia (usuwanie tła WASM + światła gabloty na Canvas), po akceptacji kompresja
  do WebP i skasowanie folderu roboczego.
- **Reguła bezwzględna:** do formularza trafia gotowe zdjęcie z naszego magazynu albo nic.
- **Oświadczenie o prawach** wymagane przed wejściem do Gabloty.
- **Podpis praw pod każdym zdjęciem** (28.07) — puste pole nie zostawia zdjęcia anonimowo,
  podpisujemy producentem. Na karcie napis leży **na zdjęciu** (jedzie z nim na zrzucie ekranu),
  w dossier **pod nim**.
- Wszystkie 24 figurki trzymają zdjęcia u nas: webp, 0,4 MB łącznie.

## 4. Shorty i publikacja

- **Render lokalny** (sharp + ffmpeg): scenariusz, akcent, muzyka, rozdzielczość, język.
- **Kolejka renderu w bazie** + moderacja wideo w panelu + publikacja na Google Drive.
- **FigureFame Studio** — jedno kliknięcie uruchamia oba workery; instalator dla Windows i Maca
  (Autostart / LaunchAgent), liczy ścieżki względem siebie, więc działa z dowolnego katalogu.
- **Kopia zapasowa** na Dysk Google domyślnie, własny zapis ZIP bez bibliotek.
  *Dlaczego bez biblioteki:* ma działać także za rok, gdy nikt nie zaktualizuje zależności.

## 5. Infrastruktura i tożsamość

- **GitHub + automatyczne wdrożenia na Vercel** (push na `main` = produkcja).
- **Domena `figurefame.com`** w Cloudflare (do 27.07.2027), podpięta do Vercela rekordem A.
- **Poczta:** Zoho dla ludzi, Brevo dla automatów na osobnej poddomenie.
  *Dlaczego rozdzielone:* automaty (rejestracje, resety haseł) psują sobie reputację,
  a korespondencja z ludźmi ma mieć własną. Zoho zabrania wysyłki masowej.
- **Zasłona na hasło** przed premierą + `robots.txt` blokujący wyszukiwarki i 24 roboty AI.
- **Logowanie**: Google, Discord, X (Facebook działa, brak przycisku). Potwierdzenie adresu
  mailem wymagane przy rejestracji hasłem.
- **Adresy figurek**: `slug`, `short_code`, `identity_key`, adres `figurefame.com/f/<slug>`,
  neutralny językowo (`/de/f/slug` doklei się później bez psucia linków).

## 6. Bezpieczeństwo

### Zamknięcie bazy — reguły dostępu (RLS), 28.07.2026

Do 28.07 **klucz publiczny otwierał wszystko**: poczekalnia moderacji, archiwum i profile
były jawne, a zmiana i kasowanie figurek — dozwolone. Ktokolwiek mógł skasować całą Gablotę.
Zasłona na hasło tego **nie zakrywała**: stoi przed stroną na Vercelu, a baza odpowiada pod
własnym adresem, z pominięciem zasłony.

Naprawione migracją [migracje-rls-zamkniecie-bazy.sql](migracje-rls-zamkniecie-bazy.sql),
potwierdzone testami kluczem publicznym:

```
Gablota (ma działać)        5 figurek     OK
oczekujące / archiwalne     0 wierszy     zamknięte
profile / cache / kolejka   0 wierszy     zamknięte
ZMIANA prawdziwej figurki   0 wierszy     zablokowana
USUNIĘCIE prawdziwej        0 wierszy     zablokowane
DODANIE do Gabloty          401           zablokowane
```

### Usuwanie konta (RODO), 29.07.2026

Profil → strefa nieodwracalna, potwierdzenie przez przepisanie `USUWAM KONTO`.
Kasuje [api/delete-account.js](api/delete-account.js) — tożsamość bierze **z tokenu sesji**,
nigdy z treści żądania (inaczej dałoby się skasować cudze konto, podając jego numer).
Figurki zostają i **przechodzą na konto moderatora**; konto moderatora jest zablokowane
przed skasowaniem, żeby nie dało się zostać bez admina na własnej stronie.

### Zamknięcie endpointów serwerowych, 29.07.2026

Sześć endpointów pracowało kluczem `service_role` i **nie sprawdzało, kto puka**:
`upload-work-image`, `finalize-image`, `process-image`, `generate-short`, `refresh-prices`,
`fetch-figure`. Chroniła je wyłącznie zasłona na hasło — a pierwszym punktem listy „przed
premierą" jest właśnie *zdjęcie zasłony*. Premiera otworzyłaby je światu: wgrywanie plików
do naszego Storage, zmuszanie serwera do pobierania dowolnego adresu, palenie limitów AI
i kredytów scraperów.

Brama: [server-lib/wymagajModeratora.js](server-lib/wymagajModeratora.js) (token → `getUser`
→ `is_admin`), token dokłada [src/lib/authFetch.js](src/lib/authFetch.js).
`ask-figure` **zostaje publiczny** — to asystent dla odwiedzającego — ale dostał próg
10 zapytań na minutę z jednego adresu.

Sprawdzone na jednorazowych kontach w żywej bazie:

```
endpoint             bez tokenu   zwykły user   moderator
upload-work-image    401          403           przechodzi
finalize-image       401          403           przechodzi
process-image        401          403           przechodzi
generate-short       401          403           przechodzi
refresh-prices       401          403           przechodzi
fetch-figure         401          403           przechodzi
ask-figure (publiczny): 10× przepuszczone, 11. → 429
```

### Pozostałe

- Strażnik tras (`ProtectedRoute`): `/admin` tylko dla moderatora, `/add` i `/profile` dla zalogowanych.
- `/add` wymaga **potwierdzonego adresu** — zabezpieczenie na wypadek dostawcy oddającego
  adres niepotwierdzony.
- Uprawnienia admina nadaje wyłącznie baza; dawna auto-elewacja w kodzie została usunięta.

## 7. Wydajność

```
paczka startowa (gzip)    145 kB     (było 185 kB)
odpowiedź Gabloty         2 036 B    (było 8 286 B, -75%)
pierwszy bajt z Vercela   ~150 ms
```

- **`framer-motion` odstawiony** — 5,5 MB zależności robiło dwa wjazdy tekstu; dziś czysty CSS.
- **Gablota pobiera jawną listę kolumn**, nie `select('*')` — encyklopedia szła przez sieć
  prosto do kosza (karta jej nie rysuje, dossier dociąga swoje).
- **Panel moderatora, 29.07:** Vercel Toolbar mierzył INP **1254 ms** (próg „słabo": 500 ms),
  z czego 929 ms na rysowanie. Winowajcą nie były dane, tylko **rozmycia przerysowywane przy
  każdym naciśnięciu klawisza** — podgląd karty ma poświatę `blur(80px)` i dwa tła
  z `backdrop-filter`. Podgląd wydzielony i zasilany danymi opóźnionymi (`useDeferredValue`),
  `FieldMark` wyjęty poza komponent (w środku był **nowym typem przy każdym renderze**),
  szukanie opóźnione i zapamiętane, `memo` + `useCallback` na Wgrywarce i Studiu.
  *Nie zmierzone ponownie — INP pokazuje wyłącznie prawdziwa przeglądarka.*
- **Łańcuch AI, 29.07:** zmierzony na 5 figurkach × 9 slotów (ten sam prompt, ten sam kontekst
  z Tavily). `openrouter` miał **medianę 55 s i rekord 516 s** przy 60-sekundowym limicie funkcji
  na Vercelu — i nic go nie przerywało. Dodany twardy limit czasu (`AI_TIMEOUT_MS`, domyślnie 20 s)
  i nowa kolejność: `groq → sambanova → github2 → github → github4 → github3 → gemini → hf → openrouter`.

## 8. Migracje uruchomione w bazie

| plik | co wnosi |
|---|---|
| [migracje.sql](migracje.sql) i pochodne | schemat, kolumny pod zdjęcia, wideo, afiliację |
| [migracje-rls-zamkniecie-bazy.sql](migracje-rls-zamkniecie-bazy.sql) | reguły dostępu — 28.07 |
| [migracje-prawa-do-zdjec.sql](migracje-prawa-do-zdjec.sql) | kolumna `image_credit` — 29.07 |
| [migracje-usuwanie-konta.sql](migracje-usuwanie-konta.sql) | pola profilu + `ON DELETE SET NULL` — 29.07 |

---

## Pułapki, które kosztowały czas

Szczegóły techniczne i objawy → [handoff_summary.md](handoff_summary.md).
W skrócie, żeby nie wracały:

1. **Reguły RLS działają na zasadzie „wystarczy, że JEDNA pozwala".** Dopisanie ostrzejszej
   obok starej, przepuszczającej, niczego nie zamyka.
2. **`PATCH`/`DELETE` na nieistniejącym identyfikatorze zwraca 200/204 niezależnie od reguł** —
   „zmieniono zero wierszy" to sukces. Taki test niczego nie dowodzi.
3. **Scrapery gniją po cichu** razem ze zmianami w cudzych serwisach. Kaskada źródeł wymaga
   sygnału „to źródło przestało odpowiadać" — dziś dają go plakietki źródeł w panelu.
4. **Ciche awarie są najgorsze.** Przycisk „Uruchom Studio" nie działał, bo wpis w rejestrze
   wskazywał o katalog za nisko — kliknięcie nie dawało ŻADNEGO komunikatu.
5. **Zielone światło Studia zapala wyłącznie tryb ciągły** (`--watch`).
6. **Dostęp do Dysku Google wygasa co 7 dni**, gdy ekran zgody stoi w trybie *Testing*.
7. **Komponent zdefiniowany wewnątrz innego komponentu** jest przy każdym renderze nowym typem —
   React rozbiera go i buduje od zera.
8. **Audyt bez uruchomienia kodu myli się w połowie przypadków** — patrz sekcja „Sprawdzone,
   NIE jest problemem" w [TODO.md](TODO.md).
