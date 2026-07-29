# FigureFame — stan techniczny i pułapki

> **29.07.2026.** Ten plik jest instrukcją obsługi tego, co już stoi: gdzie co jest wpięte,
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

## 7. Narzędzia (npm run …)

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

## 8. Pułapki, które kosztowały czas

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
- **Nieużywana zależność nie leży w paczce startowej.** `framer-motion` wisi w `package.json`,
  ale nie jest importowany — więc „5,5 MB w bundlu" to nieprawda. Warto go usunąć dla porządku,
  nie dla wydajności.
