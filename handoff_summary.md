# FigureFame — stan techniczny i pułapki

> **01.08.2026.** Ten plik jest instrukcją obsługi tego, co już stoi: gdzie co jest wpięte,
> którym poleceniem się to uruchamia i o co można się boleśnie potknąć.
>
> Czym jest projekt i jakich zasad nie łamiemy → [ZALOZENIA.md](ZALOZENIA.md)
> Co zrobione → [DONE.md](DONE.md) · Co do zrobienia → [TODO.md](TODO.md) · Co dalej → [FUTURE.md](FUTURE.md)

---

## 1. Wdrożenie

- **Push na `main` = automatyczne wdrożenie na produkcję.** Nie trzeba `vercel --prod`.
  Tylko `main` idzie na produkcję; inne gałęzie dostają adres podglądu.
- **Zmienne środowiskowe, DNS i ustawienia Supabase NIE jadą z pushem** — te trzeba zmieniać osobno.
- Projekt Supabase: **`sfxraogvhjhalzxuddgl`**. Projekt Vercel: `figure-fame`.
- **Panel Supabase i projekt to dwie różne rzeczy.** Utrata dostępu do konta nie zatrzymuje
  aplikacji; klucze z `.env.local` działają niezależnie.

## 2. Domena i poczta — działa w całości

**`figurefame.com`** (Cloudflare Registrar, wygasa 27.07.2027).

> ⚠️ **Serwerów nazw NIE przenosić na Vercel.** Strefa musi zostać w Cloudflare — tam stoją
> rekordy poczty. Domena jest podpięta do Vercela rekordem A (`76.76.21.21`).

| kanał | jak działa |
|---|---|
| `figurefame@figurefame.com` | skrzynka w **Zoho** (mail.zoho.eu), superadmin domeny |
| `admin@`, `contact@` | **aliasy** tej skrzynki, nie osobne konta |
| odbiór | Zoho **przekazuje** wszystko na `figurefame@gmail.com` |
| wysyłka | Gmail „Wyślij jako" przez `smtppro.zoho.eu:465` SSL, login = `figurefame@figurefame.com` (hasło aplikacji) |
| `noreply@mail.figurefame.com` | **Brevo**, wpięty w Supabase jako własny SMTP |

**Poddomena `mail.figurefame.com` jest oddelegowana do Brevo** (rekordy NS →
`ns1/ns2.sendinblue.com`). Cloudflare nie widzi, co jest w środku — Brevo sam utrzymuje tam
DKIM i SPF. Cofa się skasowaniem dwóch rekordów NS.

Rozdzielenie jest celowe: automaty (rejestracje, resety haseł) psują sobie reputację na
`mail.figurefame.com`, a korespondencja z ludźmi ma własną na `figurefame.com`.
**Zoho zabrania wysyłki masowej** — dlatego `noreply@` nigdy nie może być aliasem tamtej skrzynki.

DNS: MX Zoho, SPF `include:zohomail.eu`, DKIM `zmail._domainkey` (zweryfikowany),
DMARC `p=none` (tryb obserwacji, nic nie blokuje).

## 3. Zasłona — strona jest zamknięta

- [middleware.js](middleware.js): HTTP Basic Auth, login **`archi`**, hasło **`Klara2026`**
- Sterowana zmiennymi `SITE_GATE_USER` / `SITE_GATE_PASSWORD` w Vercelu.
  **Usunięcie ich = zdjęcie zasłony**, bez ruszania kodu.
- [public/robots.txt](public/robots.txt) blokuje wyszukiwarki i 24 roboty AI. Wersja docelowa
  czeka zakomentowana na końcu pliku pod nagłówkiem „DOCELOWO".
- `index.html` ma `<meta name="robots" content="noindex...">` do zdjęcia w dniu premiery.

> Zasłona **nie jest** już jedyną ochroną endpointów serwerowych — od 29.07 mają własną bramę
> ([server-lib/wymagajModeratora.js](server-lib/wymagajModeratora.js)). Wcześniej była, i to
> był poważny problem: patrz [DONE.md](DONE.md), sekcja 6.

### ⚠️ Zasłona zajmuje nagłówek `Authorization`

To nie jest ciekawostka, tylko rzecz, o którą projekt już się raz wywrócił (30.07).

Zasłona to **HTTP Basic Auth**, a ten mieszka w nagłówku `Authorization`. Gdy panel wkładał
tam swój token sesji, zasłona widziała „to nie jest Basic", odsyłała 401 z `WWW-Authenticate`
— a przeglądarka na taką odpowiedź **kasuje zapamiętane hasło do strony** i pyta o nie od nowa.
Objaw: cokolwiek klikniesz w panelu, wracasz do okienka z hasłem.

Dlatego **nasz token jedzie własnym nagłówkiem `x-ff-token`**
([src/lib/authFetch.js](src/lib/authFetch.js)), a serwer czyta oba —
własny pierwszy, `Authorization` jako droga zapasowa dla `curl`a i testów
(`tokenZzadania` w [wymagajModeratora.js](server-lib/wymagajModeratora.js)).

**Wniosek na przyszłość:** dopóki stoi zasłona, `Authorization` jest zajęty. Każdy nowy
endpoint wymagający tożsamości ma używać `x-ff-token`.

## 4. Logowanie

```
DZIAŁA:            google, discord, x, facebook
MOŻNA WŁĄCZYĆ:     apple, twitch, github, linkedin_oidc, spotify
NIE MA W SUPABASE: instagram, tiktok, reddit, pinterest, kick
```

- Przyciski w [Login.jsx](src/components/Login.jsx): Google, Discord, X. **Facebook działa,
  ale nie ma przycisku** — do decyzji.
- **Apple wymaga 99 USD/rok** (Apple Developer Program). Obowiązkowe dopiero przy aplikacji na iOS.
- Potwierdzenie adresu mailem jest **wymagane** (`mailer_autoconfirm = false`). Dotyczy tylko
  rejestracji hasłem — logowanie przez dostawcę potwierdza adres samo.

## 5. Adresy figurek — nieodwracalne

Każda figurka ma `slug`, `short_code` i `identity_key` ([figureIdentity.js](src/lib/figureIdentity.js)).
Adres: `figurefame.com/f/<slug>`.

> **Adres raz nadany jest nietykalny.** Kod figurki jest wypalany w obrazie shorta
> ([renderShort.mjs](worker/renderShort.mjs)) — opublikowanego filmu nie da się poprawić.

`external_ids` (np. numer MFC) to **odsyłacz do sprawdzenia, nie tożsamość figurki** —
MFC jest jedną z baz, nie wyrocznią.

## 6. Zdjęcia — reguła bezwzględna

**Do formularza trafia albo gotowe zdjęcie w naszym magazynie, albo pusto.** Nigdy surowy
adres z cudzego serwera. Egzekwowane w [fetch-figure.js](api/fetch-figure.js) — także na
ścieżce odczytu z pamięci podręcznej (`oczyscZdjecie`).

Powód nie jest teoretyczny: Kotobukiya skasowało zdjęcie Leviego, zanim je ściągnęliśmy.
Adres zwraca 301 na stronę główną.

Wszystkie 24 figurki trzymają dziś zdjęcia u nas, w webp, 0,4 MB łącznie (limit darmowego
Supabase: 1 GB ≈ 68 000 figurek). Wąskim gardłem będzie **transfer 5 GB/mies.**, nie miejsce —
wtedy Cloudflare przed Supabase, nie GDrive.

**Podpis praw:** [prawaDoZdjecia.js](src/lib/prawaDoZdjecia.js) — to, co wpisał moderator →
producent figurki. Puste pole NIE zostawia zdjęcia bez podpisu. Piszemy **„Fot.", nie „©"** —
przypisujemy autorstwo zdjęcia, a nie rozstrzygamy o prawach do postaci.

## 7. Stopka, dokumenty prawne i okna (01.08)

Stopka nie jest już dwoma `div`-ami w `App.jsx` — to [Footer.jsx](src/components/Footer.jsx).
Niesie odnośniki do polityki prywatności, regulaminu i „O aplikacji", czyli rzeczy **wymagane
przed zdjęciem zasłony**.

### Okno nad stroną — wzorzec, którego nie wolno zamienić na `window.open`

Dokumenty otwierają się jako okno nakładane na Gablotę, ale **mają prawdziwy adres**
(`/prywatnosc`, `/regulamin`, `/o-aplikacji`, `/faq`). Odnośnik niesie w `state` pole `tlo`
(stronę, która ma zostać pod spodem); `App.jsx` renderuje wtedy trasy tła dla `tlo`,
a dokument w oknie. Wejście wprost albo odświeżenie → zwykła pełna strona.

> ⚠️ **`window.open` jest tu zły i nie jest to kwestia gustu.** Blokują go wtyczki, na telefonie
> okien nie ma, a polityka prywatności **musi** mieć stały, linkowalny adres — sprawdzają go
> programy afiliacyjne przy weryfikacji i wyszukiwarki.

**Dodanie nowego dokumentu to jeden wiersz** w tablicy `OKNA` w [App.jsx](src/App.jsx).
Warunek: komponent treści przyjmuje `wOknie` i w tym trybie nie rysuje własnego tytułu ani
przycisku powrotu (niesie je belka okna i „Zamknij").

**⚠️ FAQ jest osiągalne WYŁĄCZNIE z „O aplikacji"** — w nagłówku nie ma do niego odnośnika.
Kto będzie sprzątał `About.jsx`, ten łatwo odetnie całą stronę FAQ.

### Kolor marki

Tożsamością jest **pomarańcz z logotypu**, nie cyan. `--color-miku-cyan` i `--color-sonico-pink`
są nazwane od postaci — to akcenty przy figurkach, nie kolor interfejsu.

| token | ciemny | jasny | po co |
|---|---|---|---|
| `--color-accent` | `#f97316` | `#c2410c` | tekst i drobne elementy |
| `--color-accent-fill` | `#f97316` | `#f97316` | wypełnienia przycisków |

**Dlaczego jasny motyw ma inny odcień:** `#f97316` na bieli to 2,7:1 — poniżej progu WCAG AA
dla tekstu. Na wypełnieniu przycisku to nie problem, bo liczy się napis NA nim
(`#181818` na `#f97316` = 6,3:1), dlatego „Zamknij" jest tym samym żywym pomarańczem w obu motywach.

### Teksty prawne to SZKIC

[PolitykaPrywatnosci.jsx](src/components/PolitykaPrywatnosci.jsx) i
[Regulamin.jsx](src/components/Regulamin.jsx) opisują to, co serwis **naprawdę** robi, ale
**podpisuje je administrator danych, nie autor kodu**. W polityce jest miejsce oznaczone
do uzupełnienia po rejestracji działalności (nazwa, adres, NIP).

Trzy punkty regulaminu są **zobowiązaniem powiązanym z kodem** — jeśli kod się zmieni, tekst
przestaje być prawdziwy: wpis zostaje po usunięciu konta (`api/delete-account.js`), podpis
„Fot." zamiast „©" ([prawaDoZdjecia.js](src/lib/prawaDoZdjecia.js)), prowizja nie zmienia
kolejności ofert (`server-lib/affiliateLinks.js`).

### Ikony mediów społecznościowych

[src/lib/social.js](src/lib/social.js) to jedyne źródło adresów marki. **Pusty adres = brak
ikony**, świadomie: odnośnik do konta, na którym nic nie ma, szkodzi bardziej niż jego brak.
Dziś wszystkie są puste, więc żadna ikona się nie rysuje. Znaki to oficjalne ścieżki
z `simple-icons` — **nie wolno ich odrysowywać z pamięci**.

## 8. Narzędzia (npm run …)

| polecenie | co robi |
|---|---|
| `adresy` | nadaje slug / kod / identity_key; `-- --zapisz` wykonuje |
| `zdjecia` | ściąga do nas zdjęcia z cudzych serwerów; `-- --zapisz` wykonuje |
| `kopia` | ZIP do `kopie/` **oraz** na Dysk Google; `-- --bez-dysku` pomija Dysk |
| `lookup-worker` | worker wyszukiwań (omija Cloudflare lokalną przeglądarką) |
| `worker` | kolejka renderowania shortów |
| `gdrive-auth` | odnowienie dostępu do Dysku Google (otwiera przeglądarkę) |

### FigureFame Studio — co trzeba wiedzieć

**Zielone światło w panelu zapala WYŁĄCZNIE tryb ciągły.** `startHeartbeat` jest tylko
w gałęzi `--watch` ([lookupWorker.mjs](worker/lookupWorker.mjs#L136)), więc `npm run lookup-worker`
zrobi robotę, ale panel dalej pokaże „Studio wyłączone". Właściwe polecenie to
`npm run lookup-worker:watch`, a najwygodniej — `FigureFame-Studio.cmd` (uruchamia oba workery).

**Instalator liczy ścieżki względem siebie**, więc działa z dowolnego katalogu i na Macu tak
samo (`Zainstaluj-Studio-MAC.command` → LaunchAgent). Po przeniesieniu projektu trzeba go
**uruchomić ponownie** — wpis w rejestrze/LaunchAgencie jest bezwzględny.

**Dostęp do Dysku Google wygasa.** Objaw: `invalid_grant: Token has been expired or revoked`
przy publikacji shortów. Doraźnie — `npm run gdrive-auth`. Jeśli wraca co tydzień, przyczyną
jest ekran zgody OAuth w trybie **Testing** (Google kasuje wtedy tokeny po 7 dniach) —
przełączyć na **In production** w Google Cloud Console.

`node design/zbuduj-znaki.mjs` odtwarza **wszystkie osiem plików znaku** (logo, ikony, og-image)
z arkusza [design/logo_FigureFame.png](design/logo_FigureFame.png).

## 9. Pułapki, które kosztowały czas

- **Reguły RLS działają na zasadzie „wystarczy, że JEDNA pozwala".** Dopisanie ostrzejszych
  obok starych, przepuszczających, **niczego nie zamyka**. Migracja kasuje więc najpierw
  wszystkie reguły na tabeli i buduje komplet od zera.
- **`PATCH`/`DELETE` na nieistniejącym identyfikatorze zwraca 200/204 niezależnie od reguł** —
  bo „zmieniono zero wierszy" to sukces. Prawdziwy test idzie na istniejący wiersz z nagłówkiem
  `Prefer: return=representation` i liczy zwrócone wiersze.
- **Klucz `service_role` omija RLS** — endpoint, który go używa, musi sam sprawdzać, kto puka.
  Reguły bazy go nie obronią.
- **Przy logowaniach ufaj `/auth/v1/authorize`, nie `/auth/v1/settings`.** Wykaz ustawień
  pokazuje `twitter: false`, choć działający dostawca nazywa się `x`. Rozróżnienie w błędzie:
  `is not enabled` = jest, wyłączone; `could not be found` = nie ma go w Supabase.
- **Windows nie ma glifów flag.** Emoji `🇵🇱` renderuje się jako para liter, więc przycisk
  pokazywał „PL PL". Flagi są rysowane w [Flaga.jsx](src/components/Flaga.jsx).
- **MFC trzyma cztery rozmiary zdjęcia** pod tą samą nazwą i domyślnie podsuwa miniaturę.
  `preferLargestMfc` podmienia katalog na `/items/2/`.
- **Zdjęcia produktów pobieraj wprost, nie przez pośrednika.** Cloudflare broni stron HTML,
  nie obrazków. Pośrednik kosztował i wywalał zapis błędem 401, gdy klucz wygasł.
- **Scrapery gniją po cichu** razem ze zmianami w cudzych serwisach — selektory MFC przestały
  istnieć i kaskada zwracała zero trafień, a wszystko spadało na AI. Sygnał „to źródło
  przestało odpowiadać" dają dziś plakietki źródeł w panelu.
- **`transform: scale()` nie zmniejsza miejsca w układzie strony** — tylko wygląd.
- **Komponent zdefiniowany wewnątrz innego komponentu** jest przy każdym renderze **nowym
  typem** — React rozbiera go i buduje od zera. Kosztowało to opóźnienie reakcji panelu.
- **Rozmycia (`blur`, `backdrop-filter`) przerysowywane przy każdej literze** to najdroższa
  rzecz w interfejsie. Podgląd karty w panelu dostaje dane opóźnione (`useDeferredValue`).
- **Vercel wstrzykuje swój pasek narzędziowy SAM**, gdy oglądasz własne wdrożenie zalogowany
  na swoje konto. Brak `@vercel/toolbar` w `package.json` niczego nie dowodzi. To z niego
  pochodzi „Interaction Timing" z pomiarem INP.
- **Providerzy AI nie mają obowiązku odpowiedzieć.** Zmierzony rekord: 516 s przy limicie
  funkcji 60 s. Każde wywołanie ma dziś twardy limit czasu (`AI_TIMEOUT_MS`).
- **Ciche awarie są najgorsze.** Przycisk „Uruchom Studio" nie działał, bo wpis w rejestrze
  wskazywał o katalog za nisko — kliknięcie nie dawało ŻADNEGO komunikatu, więc wyglądało to
  na zepsute Studio. Instalator sprawdza teraz istnienie pliku, zanim cokolwiek zarejestruje.
- **Middleware Vite to nie Vercel.** Endpoint `process-image` miał w dev własną obsługę bez
  skrótów `res.status()/.json()`. Póki zwracał samą treść, nikt tego nie zauważył — ale gdy
  doszła brama moderatora, w dev **każde** wywołanie kończyło się błędem 500.
- **`localhost` nie ma zasłony, więc nie sprawdzi wszystkiego.** Brama moderatora przeszła
  lokalnie komplet testów (401/403/200) i **położyła produkcję**, bo tam przed aplikacją stoi
  jeszcze Basic Auth — patrz sekcja 3. Zmiany dotykające nagłówków, uwierzytelniania albo
  przekierowań trzeba sprawdzić przez `https://figurefame.com`, nie tylko przez `npm run dev`.
  Wystarczy `curl -u archi:HASŁO -i https://figurefame.com/api/...` i spojrzenie, czy
  w odpowiedzi nie ma `WWW-Authenticate`.
- **Nieużywana zależność nie leży w paczce startowej.** `framer-motion` wisi w `package.json`,
  ale nie jest importowany — więc „5,5 MB w bundlu" to nieprawda. Warto go usunąć dla porządku,
  nie dla wydajności.
- **Pułapka fokusa w modalu ma trzeci przypadek, o którym wszyscy zapominają.** Sprawdzanie
  „czy fokus jest na pierwszym / ostatnim polu" nie wystarcza, bo **zaraz po otwarciu fokus
  siedzi na SAMYM kontenerze okna** (`tabIndex={-1}`) i nie jest ani pierwszym, ani ostatnim.
  Wtedy Shift+Tab przesuwa go **wstecz, na stronę pod nakładką** — jedno naciśnięcie i
  użytkownik klawiatury klika w stopkę, której nie widzi. Trzeba jawnie obsłużyć „fokus jest
  na kontenerze albo poza oknem". Zmierzone: 21 wyjść na 25 naciśnięć, po poprawce 0 na 40.
- **Tab do przodu może działać, gdy Shift+Tab nie działa** — i to maskuje powyższy błąd.
  Kontener poprzedza swoje dzieci w drzewie, więc Tab wchodzi do środka „sam z siebie".
  **Każdą pułapkę fokusa sprawdzaj w OBIE strony.**
- **Globalne reguły na selektorach elementów gryzą się z komponentami.** `header { margin-bottom:
  4rem }` z góry `index.css` trafiło w `<header>` belki okna i zrobiło 51 px dziury pod tytułem.
  Testy DOM tego nie widzą — złapał to dopiero zrzut ekranu.
- **`opacity` na kontenerze niszczy zmierzony kontrast.** Stopka miała `opacity: .6` i tekst
  `#a0aab2`, który w treści strony daje 7,5:1, schodził do **3,5:1 — poniżej progu WCAG AA**.
  Stonowanie robimy jawnym kolorem, który da się zmierzyć, nigdy przezroczystością na całości.
- **Playwright jest w `devDependencies` i warto go używać do sprawdzania interfejsu.** Wszystkie
  trzy powyższe znalezione sondami na uruchomionej aplikacji, nie czytaniem kodu. Skrypt sondy
  odpalaj **z katalogu projektu** (inaczej nie widzi `node_modules`) i nie nazywaj stałej `URL`,
  bo przesłoni globalny konstruktor.
- **Stan „w toku" wygląda identycznie jak awaria — i to najgroźniejszy rodzaj cichej usterki.**
  `working` w `lookup_queue` pełni rolę blokady, a worker bierze wyłącznie `pending`. Gdy Studio
  padło **dwie sekundy po podjęciu** zlecenia (02.08), wiersz został zablokowany na zawsze:
  panel nie miał czego pokazać, Studio świeciło na zielono, a figurka była martwa. Prawdę
  pokazało dopiero **zestawienie dwóch rzeczy naraz** — `lookup_queue.updated_at` i
  `studio_status.last_seen` zatrzymały się w tej samej sekundzie. Worker zwalnia dziś porzucone
  zlecenia po 10 minutach ([lookupWorker.mjs](worker/lookupWorker.mjs)), ale **wniosek jest
  ogólniejszy: każdy stan pośredni potrzebuje limitu czasu**, inaczej awaria procesu zamienia
  się w trwałą blokadę danych.
- **Kolejki nie mają atomowego pobierania zlecenia.** Oba workery robią `SELECT` wierszy
  o danym statusie, a potem `UPDATE` na „zajęte". Przy **jednym** komputerze to bez znaczenia —
  pętla jest sekwencyjna. Przy **dwóch** to wyścig: obie stacje mogą wziąć to samo zlecenie.
  To jedyna rzecz do naprawienia przed rozdzieleniem Studia na kilka maszyn (patrz sekcja 11).

## 10. Gdzie jest sufit darmowych planów (ustalone 30.07)

Ani GitHub, ani Vercel. **Supabase — ale nie baza, tylko transfer.**

| Zasób | Limit | Zużycie dziś |
|---|---|---|
| Baza (wiersze tekstu) | setki MB | ułamek promila — 24 wiersze to nic |
| Magazyn plików | 1 GB | 0,4 MB (24 zdjęcia) ≈ 0,04% |
| **Transfer miesięczny** | **5 GB** | zależy od ruchu ← **tu jest sufit** |

Zdjęcie waży ~17 kB, więc 5 GB to jakieś **250–300 tys. wyświetleń zdjęć miesięcznie**.
Przy dzisiejszym ruchu nieosiągalne; przy jednym shorcie, który zaskoczy — do zjedzenia
w weekend.

**Dzielenie bazy na dwa darmowe konta odpada** i nie jest to kwestia regulaminu:

1. Nie rozwiązuje problemu — sufitem jest transfer zdjęć, nie miejsce.
2. Baza jest relacyjna (`figures` ↔ `price_snapshots` ↔ `profiles`); podział wywala klucze
   obce, złączenia i reguły RLS, czyli wszystko, co zamknęliśmy 28.07.
3. Konta użytkowników żyją w **jednym** projekcie — człowiek zalogowany w projekcie A nie
   istnieje dla projektu B.
4. Dwa klucze, dwa klienty, dwie kopie zapasowe przy projekcie jednoosobowym.
5. Supabase usypia nieaktywne darmowe projekty.

**Właściwa droga, gdy transfer zacznie boleć:** Cloudflare przed zdjęciami (domena już tam
stoi, więc to konfiguracja, nie przeprowadzka). Cloudflare pobiera plik z Supabase **raz**
i serwuje go dalej ze swojej pamięci. Koszt 0 zł. Gdyby i to nie starczyło — Cloudflare R2:
10 GB miejsca i **zero opłat za transfer wychodzący**, a baza zostaje jedna.

> Uczciwie: dziś wąskim gardłem nie jest żadna z tych usług, tylko **24 figurki**.
> Do limitów trzeba najpierw dorosnąć, a droga do nich prowadzi przez treść —
> dlatego w [FUTURE.md](FUTURE.md) głębia bazy stoi przed wszystkim innym.

## 11. Studio na wielu komputerach — architektura już na to pozwala

**Nie trzeba nic przebudowywać.** Układ jest kolejkowy od początku: Vercel to mózg,
komputer to ręce, a **spotykają się wyłącznie przez tabelę w Supabase**. Żadna maszyna
nie musi widzieć drugiej ani mieć publicznego adresu.

```
        Vercel  ──zapis zlecenia──►  Supabase  ◄──odpyta co 20-30 s──  komputer A
        (mózg)                       (kolejka)                          komputer B
                                                                        komputer C
```

Baza jest na to przygotowana wprost: **`studio_status` ma `station` jako klucz główny**
(czyli osobny wiersz na maszynę, nie jeden na wszystkie) oraz **`can_browse` i `can_render`** —
każda stacja ogłasza, co potrafi.

**Rozdzielenie ról jest darmowe i nie wymaga kodu**, bo to dwa osobne procesy:

| polecenie | co robi | czego potrzebuje |
|---|---|---|
| `npm run lookup-worker:watch` | pobiera dane z katalogów | Chromium (Playwright) |
| `npm run worker:watch` | renderuje i publikuje shorty | ffmpeg, CPU, dostęp do Dysku |

Słaby laptop może więc pobierać dane, a mocny pecet renderować filmy. Wystarczy na drugiej
maszynie repozytorium, `.env.local` z kluczem `service_role` i uruchomienie **tylko jednego**
z tych poleceń.

> ⚠️ **Zanim uruchomisz DRUGĄ stację, napraw pobieranie zleceń.** Oba workery robią
> `SELECT` wierszy o danym statusie, a dopiero potem `UPDATE` na „zajęte". Między tymi
> dwoma zapytaniami jest szpara: dwie maszyny mogą wziąć **to samo zlecenie** i zrobić
> tę samą robotę dwa razy — a przy renderze to dwa filmy dla jednej figurki.
> Przy jednym komputerze problem nie istnieje, bo pętla jest sekwencyjna.
>
> Naprawa jest krótka: pobranie musi być **jednym** zapytaniem, które od razu oznacza
> wiersz jako zajęty i zwraca to, co faktycznie zajęło —
> `update … set status='working' where id in (select … where status='pending'
> for update skip locked) returning *`. `SKIP LOCKED` sprawia, że druga stacja pomija
> zajęte wiersze zamiast na nie czekać.
