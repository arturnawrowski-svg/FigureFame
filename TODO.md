# FigureFame — co do zrobienia

> **Aktualizacja: 04.08.2026.** Kolejność od najbardziej krytycznego w dół.
> Zasady → [ZALOZENIA.md](ZALOZENIA.md) · Zrobione → [DONE.md](DONE.md) · Dalej → [FUTURE.md](FUTURE.md)
>
> **Naprawa bazy zamknięta (szczeble A–F, 03–04.08).** Zero błędów w bazie, 14 z 17
> widocznych figurek kompletnych, komplet nazw japońskich. Szczegóły i pułapki:
> [handoff_summary.md](handoff_summary.md) sekcje 16–25.
>
> **Co z tego zostało dla człowieka, nie dla kodu:**
>
> - [ ] trzy zdjęcia do dograna ręcznie: **Kinomoto Sakura**, **Shikinami Asuka**,
>       **Super Sonico** (ta ostatnia pokazuje plik z zasiewu zamiast pliku z magazynu).
>       Katalog ich nie dał, bo trafiał w inne produkty tej samej postaci
> - [ ] **Asuka Jersey Ver.: Alter czy Good Smile?** — katalog oddał 惣流 (Asuka z serialu),
>       a nasza figurka to 式波 (z filmów „Rebuild"). Trafił w inną figurkę, więc nie
>       rozstrzygnął. Jedno sprawdzenie w MyFigureCollection
> - [ ] **„Usuń tło" w Studiu zdjęcia** nadal nie działa u Artura, przyczyna nieustalona.
>       Nie blokuje niczego innego — to obróbka zdjęcia, które już mamy
>
> Lista powstała z przeglądu **wszystkich** dokumentów projektu i trzech audytów z zewnątrz.
> Każda pozycja została sprawdzona w kodzie albo na żywej bazie — to, co się nie potwierdziło,
> jest na dole, w sekcji „Sprawdzone — NIE jest problemem", żeby nie wracało przy kolejnym audycie.

---

## 🔴 Blokuje premierę

### 1. Adres `figurefame.com` zamiast `figure-fame.vercel.app`

Skutek po premierze byłby taki: Google zaindeksuje `figure-fame.vercel.app` jako adres główny,
a link udostępniony na Discordzie zaprowadzi na Vercela zamiast na Twoją domenę.

- [x] cztery adresy w [index.html](index.html) — `canonical`, `og:url`, `og:image`, `twitter:image` (01.08)
- [x] **wartości domyślne** w [api/sitemap.js](api/sitemap.js), [api/figure-meta.js](api/figure-meta.js)
      i [worker/renderQueue.mjs](worker/renderQueue.mjs) przestawione na `figurefame.com` (01.08)
- [x] `HTTP-Referer` do OpenRoutera w [server-lib/aiClient.js](server-lib/aiClient.js) — piąte
      miejsce, którego ta lista wcześniej nie widziała (01.08)
- [ ] `SITE_URL=https://figurefame.com` w zmiennych Vercela — **już nie jest krytyczne**, bo
      wartości domyślne są poprawne. Warto ustawić dla jawności, ale zapomnienie nie psuje sitemapy

> **Dlaczego domyślne, a nie sama zmienna środowiskowa.** Pierwotny plan opierał wszystko na
> `SITE_URL` w Vercelu. Zmienne **nie jadą z pushem**, więc jedno zapomnienie = sitemap po cichu
> podaje zły adres, bez żadnego komunikatu. To dokładnie ta „cicha awaria", przed którą ostrzega
> [handoff_summary.md](handoff_summary.md) sekcja 9. Domyślna wartość jest teraz tą właściwą,
> a `SITE_URL` nadal ją nadpisuje — np. na adres podglądu.

### 2. Polityka prywatności i regulamin

Warunek legalnej premiery (RODO art. 13). **Strony powstały 01.08 — zostaje decyzja człowieka,
nie kod.**

- [x] strona `/prywatnosc` + `/regulamin` (statyczne komponenty, zero zależności)
- [x] **nota o linkach afiliacyjnych** — w regulaminie, pkt 6
- [x] odnośniki w stopce ([Footer.jsx](src/components/Footer.jsx))
- [ ] ⚠️ **przeczytać i zaakceptować treść** — to SZKIC; podpisujesz jako administrator danych
- [ ] ⚠️ **uzupełnić dane administratora** po rejestracji działalności (nazwa, adres, NIP) —
      miejsce oznaczone w [PolitykaPrywatnosci.jsx](src/components/PolitykaPrywatnosci.jsx)
- [ ] rzut oka prawnika przed zdjęciem zasłony, zwłaszcza na granicę wieku 16 lat
      i na punkt o odpowiedzialności

> **Uwaga, bo audyty z zewnątrz mówiły inaczej:** obowiązkiem jest *polityka prywatności*,
> a nie „cookie banner". Supabase trzyma sesję w `localStorage` **niezbędnie do działania
> logowania**, a na to zgoda nie jest wymagana. Banner stanie się potrzebny dopiero, jeśli
> kiedyś dołożymy śledzenie marketingowe.

### 3. Premiera — kolejność czynności

- [ ] **założyć konta w mediach i wpisać adresy** w [src/lib/social.js](src/lib/social.js).
      Od 01.08 ikony są widoczne jako **wyszarzony, nieklikalny podgląd** — nie prowadzą
      donikąd, więc nic nie psują, ale są przypomnieniem. Wpisanie `url` zamienia ikonę
      w prawdziwy odnośnik. Gdy konta będą komplet, `POKAZ_PODGLAD` przestaje mieć znaczenie;
      gdybyś ruszał premierę bez nich — ustaw je na `false`
- [ ] usunąć `SITE_GATE_USER` i `SITE_GATE_PASSWORD` z Vercela (zdjęcie zasłony)
- [ ] przywrócić `robots.txt` z sekcji „DOCELOWO" (czeka zakomentowany na końcu pliku)
- [ ] zdjąć `<meta name="robots" content="noindex...">` z `index.html`
- [ ] sprawdzić `site:figurefame.com` w Google po 48 h

⚠️ **Punkty 1 i 2 muszą być zrobione WCZEŚNIEJ.** Zdjęcie zasłony jest nieodwracalne
w tym sensie, że od tej chwili strona jest publiczna razem ze wszystkim, co na niej stoi.
Endpointy serwerowe są już zamknięte (29.07) — zasłona nie jest ich jedyną ochroną.

---

## 🟠 Ważne, ale nie blokuje

### 4. Statystyki

Ani jednego licznika. Po premierze nie będziesz wiedzieć, skąd przychodzą ludzie ani
czy shorty w ogóle kierują ruch.

- [x] **Vercel Analytics** — `<Analytics />` wpięty w [src/main.jsx](src/main.jsx), wewnątrz
      `BrowserRouter` (inaczej liczyłby tylko pierwsze wejście). Nie stawia ciasteczek,
      nie wymaga zgody (01.08)
- [ ] ⚠️ **włączyć Web Analytics w panelu Vercela** — bez tego komponent nic nie raportuje.
      Kod to połowa roboty, druga połowa jest w panelu
- [ ] Google Search Console (pozycje w wyszukiwarce) — dopiero po zdjęciu zasłony, wcześniej
      nie ma czego zweryfikować

> **Dlaczego to weszło przed premierą, choć jest w „nie blokuje".** Pierwsze dni po zdjęciu
> zasłony są najbardziej pouczające — wtedy widać, czy shorty w ogóle kierują ruch — i **nie
> da się ich odzyskać wstecz**. Licznik dołożony tydzień po premierze nie pokaże premiery.

### 5. Klucze do ofert i afiliacji

Kod czeka gotowy — to najkrótsza droga do pierwszego przychodu.

- [ ] `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`
- [ ] `RAKUTEN_APP_ID`
- [ ] rejestracja w programach partnerskich → identyfikatory do `.env`
      (warstwa [affiliateLinks.js](server-lib/affiliateLinks.js) obsługuje 12 platform;
      bez identyfikatora linki zostają nietknięte, więc nic się nie psuje przed akceptacją)
- [ ] ⚠️ zasłona blokuje też roboty programów afiliacyjnych — przy zgłoszeniach potrzebny wyjątek

> **To jest zakleszczenie — i jest przyjęte świadomie.**
>
> ```
> brak kluczy afiliacyjnych ← brak akceptacji ← zasłona ← czekanie na klucze
> ```
>
> Programy partnerskie (eBay Partner Network, Rakuten) weryfikują **żywą, publiczną**
> witrynę z widoczną polityką prywatności. Zza Basic Auth nie mają czego zatwierdzić.
> Więc premiera jest **warunkiem** afiliacji, nie odwrotnie — a ceny i agregatory stoją
> za tym samym progiem, bo są pochodną kluczy.
>
> **Decyzja: nie ma afiliacji, nie ma SEO ani GEO, dopóki strona nie jest dopieszczona.**
> Zasłona zostaje z premedytacją. Pusto tu nie dlatego, że o czymś zapomniano —
> ta kolejność jest wybrana. Wnioskiem z zakleszczenia **nie jest** „zdejmij zasłonę
> szybciej", tylko: „to, co blokuje premierę, blokuje też pierwszy przychód",
> więc pkt 1–3 z sekcji „🔴 Blokuje premierę" mają pierwszeństwo przed każdą rozbudową.
>
> Praktycznie: karty nie kłamią w międzyczasie — [AuctionDeals.jsx](src/components/AuctionDeals.jsx)
> daje uczciwy pusty stan zamiast atrap, a [OfficialShops.jsx](src/components/OfficialShops.jsx)
> to prawdziwe linki wyszukiwania, działające bez identyfikatorów.

### 6. Sprzątanie zależności

Sprawdzone: **żadna z tych trzech nie jest importowana w kodzie.**

- [ ] `npm remove framer-motion tailwind-merge clsx`

*Uwaga: to porządek w `package.json`, nie wydajność. Nieużywana zależność nie trafia do
paczki startowej — „5,5 MB w bundlu" z audytu jest nieprawdą.*

### 7. Drobne decyzje

- [ ] **Facebook** — logowanie działa, brak przycisku. Dodać czy wyłączyć?
- [x] **4 duplikaty figurek** w Archiwum — decyzja z 04.08: **zostają**. Indeks unikalności
      obejmuje tylko `APPROVED` i `PENDING`, więc archiwum ich nie przepuszcza dalej
- [ ] **Rozbieżność „Asuka Jersey Ver."** — patrz blok na górze tego pliku
- [x] **9 figurek w Archiwum bez zgłaszającego** — przypisane administratorowi (04.08)

---

## 🟡 Może poczekać

- [ ] **Ściśnięcie nagłówka, żeby Gablota weszła na pierwszy ekran** (pomysł z 31.07,
      świadomie odłożony). Dziś [AnimatedHero.jsx:194](src/components/AnimatedHero.jsx#L194)
      rezerwuje `minHeight: '60vh'`, a do tego wewnątrz panelu zostaje sporo pustego miejsca —
      razem spycha karty pod krawędź ekranu.
      - Cel mierzalny to **nie** „wszystko na jednej stronie" (zależy od monitora), tylko:
        nagłówek + wyszukiwarka + pełny pierwszy rząd kart + skrawek następnego. Ten skrawek
        jest ważniejszy od stopki — to on mówi „przewiń, jest tego więcej"
      - Największy zysk bez ruszania logotypu: ściągnąć puste miejsce wokół lockupu
        i zamienić sztywne `60vh` na zakres (dolna granica ~280 px, górna ~460 px)
      - ⚠️ `vh` na telefonie liczy się z paskiem przeglądarki i strona skacze przy przewijaniu —
        potrzebna jednostka odporna na chowanie paska
      - ⚠️ Gdyby nagłówek miał się zwężać przy przewijaniu: ruszać wyłącznie przekształceniem,
        nigdy rozmyciem (patrz [handoff_summary.md](handoff_summary.md), sekcja 9)

- [ ] **Awatar użytkownika** (webp) i język w profilu — kolumny już są
- [ ] **Podział `AdminDashboard.jsx`** (1267 linii) — dopiero przy kolejnej rozbudowie;
      dziś rozbijanie działającego panelu to ryzyko bez zysku
- [ ] **Testy dla `figureSources.js` i `aiClient.js`** — to rdzeń logiki, dziś bez pokrycia
- [ ] **Zapasowe klucze scraperów** (ScrapingBee, Scrapfly) — wklejenie i gotowe
- [ ] **„Live Check" ofert** przed przekierowaniem (ochrona przed martwymi linkami)
- [x] ~~**Kopia bazy z produkcji**~~ — **to twierdzenie było nieprawdziwe.** `npm run kopia`
      od początku kopiuje bazę (`figures`, `profiles`) i wszystkie zdjęcia z magazynu,
      nie tylko pliki projektu. 04.08 doszła tabela `characters` (bez niej kopia oddawałaby
      figurki bez nazw japońskich) oraz czytelna nazwa pliku
      `FigureFame_backup_ROK-MM-DD_GGMM.zip`. Kopia leci też na Dysk Google
- [ ] **Monitoring transferu Supabase** — 5 GB/mies. to prawdziwy sufit darmowego tieru

---

## ❄️ Odłożone świadomie

- **Cerebras** — usunięty, brak działającego darmowego modelu
- **DeepSeek** — na OpenRouterze nie ma darmowej wersji (sprawdzone 29.07: zero darmowych
  modeli DeepSeek), a wersja z GitHub Models to model rozumujący, który psuje odczyt JSON-a
  blokiem `<think>`. Bez wartości dodanej przy dziewięciu działających slotach
- **AmiAmi / HobbySearch przez pośrednika** — adaptery gotowe, ale darmowe plany nie mają
  japońskich adresów IP. Włącznik: `FIGURE_SOURCES_JP=1`
- **SerpApi** — zbędne, dubluje darmowe API eBay
- **Płatny plan Vercel** — dopiero przy realnym ruchu
- **Pozycje 18+** — poza zakresem

---

## ⚪ Sprawdzone — NIE jest problemem

Zebrane z trzech audytów z zewnątrz (`podsumowanie.md`, `ocenaHD.md`, `AUDYT-...md`).
Każde twierdzenie sprawdzone w kodzie albo wywołaniem, **nie na oko**.

| Twierdzenie | Jak jest naprawdę |
|---|---|
| „Brak error boundary" | Jest — [ErrorBoundary.jsx](src/components/ErrorBoundary.jsx) owija całą aplikację w `main.jsx` |
| „Tailwind CSS w stacku" | Nie ma Tailwinda. Jest `tailwind-merge` — inna biblioteka, w dodatku nieużywana |
| „Tylko jeden test" | Pięć plików, **49 testów**, wszystkie przechodzą |
| „RLS nie audytowane" | Zrobione i zweryfikowane 28.07 |
| „Usuwanie konta — brak" | Zrobione 29.07, przetestowane na jednorazowych kontach |
| „Brak Schema.org / rich snippets" | Jest — JSON-LD w [api/figure-meta.js](api/figure-meta.js), serwowane robotom przez przepisanie w `vercel.json` |
| „Brak Cache-Control na API" | Jest na `figure-meta` (`s-maxage=300`) i `sitemap` (`max-age=3600`); `fetch-figure` to strumień SSE, więc `no-cache` jest **poprawne** |
| „Każda karta figurki to funkcja serverless → limit 100k/mies." | Nie. Gablota czyta wprost z Supabase, Vercel serwuje pliki statyczne. Sufitem jest **transfer Supabase (5 GB)**, nie liczba wywołań funkcji |
| „WebP nie działa w Safari na iOS 14 → potrzebny JPEG" | Odwrotnie: Safari 14 (2020) **wprowadziło** obsługę WebP. Fallback byłby pracą bez odbiorcy |
| „Brak `favicon.ico` — Internet Explorer nie czyta PNG" | IE został wycofany w 2022 |
| „Basic Auth: sesja żyje wiecznie, dodać `Max-Age=3600`" | Basic Auth nie używa ciasteczka — nie ma czego ograniczać. Ten „fix" nie istnieje |
| „Brak rate limitingu na `delete-account`" | Wymaga ważnego tokenu **własnego** konta i przepisanego hasła. Cały atak to skasowanie sobie konta raz |
| „30-dniowa pamięć podręczna zestarzeje ceny" | W pamięci podręcznej leżą dane, które się nie zmieniają (producent, skala, nazwa japońska). Ceny mają własną drogę (`refresh-prices`) |
| „`supabaseClient.js` ma fallback na placeholder zamiast błędu" | Kosmetyka: bez zmiennych aplikacja i tak nie zadziała, a placeholder daje czytelniejszy komunikat w konsoli niż wyjątek przy starcie |
| „DeepSeek za darmo na OpenRouterze" | Zero darmowych modeli DeepSeek; oba podane identyfikatory nie istnieją |

**Wniosek na przyszłość:** audyt, który czyta kod, ale nie uruchamia ani jednego zapytania,
myli się mniej więcej w połowie przypadków — i to w obie strony. Nie zauważył za to rzeczy
najgroźniejszej: sześciu endpointów z kluczem `service_role` bez żadnej autoryzacji
(naprawione 29.07, patrz [DONE.md](DONE.md)).

---

## ⚠️ O czym pamiętać przy pracy

1. **Dodawaj figurki lokalnie** (`npm run dev`) — wtedy dane pobiera Twoja przeglądarka:
   bez limitów i najszybciej. Żywa strona to tryb awaryjny (zlecenie trafia do kolejki).
2. **Kopię zapasową rób PO zmianach**, nie przed — archiwum ma odzwierciedlać stan końcowy.
3. **Dane z katalogów są pewne, z AI — nie.** Panel pokazuje pochodzenie; przed dodaniem
   do Gabloty weryfikuj to, czego nie potwierdziło żadne źródło.
4. **Zielone światło Studia zapala wyłącznie tryb ciągły** — `npm run lookup-worker:watch`
   albo `FigureFame-Studio.cmd`.
