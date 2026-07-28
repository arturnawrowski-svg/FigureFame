# FigureFame — stan projektu (29.07.2026)

Pigułka dla nowego okna czatu. Szczegóły: [TODO.md](TODO.md),
[DOKUMENTACJA.md](DOKUMENTACJA.md), [plan_claude_210720026.md](plan_claude_210720026.md).

> **Zasada naczelna: FREE-FIRST.** Darmowe narzędzia tak długo, jak się da.
> Świadome wyjątki: domena (Cloudflare) i poczta Zoho Mail Lite (~13,50 €/rok).

---

## 0. Baza jest ZAMKNIĘTA (28.07.2026 wieczorem)

Do wczoraj **klucz publiczny otwierał wszystko**: poczekalnia moderacji, archiwum
i profile użytkowników były jawne, a zmiana i kasowanie figurek — dozwolone.
Ktokolwiek mógł skasować całą Gablotę.

> **Zasłona na hasło tego NIE zakrywała.** Stoi przed stroną na Vercelu, a baza
> odpowiada pod własnym adresem `*.supabase.co` — z pominięciem zasłony.

Naprawione migracją [migracje-rls-zamkniecie-bazy.sql](migracje-rls-zamkniecie-bazy.sql).
Stan potwierdzony testami kluczem publicznym, bez logowania:

```
Gablota (ma działać)        5 figurek     OK
oczekujące / archiwalne     0 wierszy     zamknięte
profile / cache / kolejka   0 wierszy     zamknięte
ZMIANA prawdziwej figurki   0 wierszy     zablokowana
USUNIĘCIE prawdziwej        0 wierszy     zablokowane
DODANIE do Gabloty          401           zablokowane
```

**Lekcja, która kosztowała jedno podejście:** reguły RLS działają na zasadzie
„wystarczy, że JEDNA pozwala". Dopisanie ostrzejszych reguł obok starych,
przepuszczających, **niczego nie zamyka**. Migracja kasuje więc najpierw
wszystkie reguły na tabeli i buduje komplet od zera.

**Drugą lekcją jest sposób testowania:** `PATCH`/`DELETE` na nieistniejącym
identyfikatorze zwraca 200/204 **niezależnie od reguł** — bo „zmieniono zero
wierszy" to sukces. Prawdziwy test idzie na istniejący wiersz z nagłówkiem
`Prefer: return=representation` i liczy zwrócone wiersze.

---

## 0a. Usuwanie konta — jest (29.07.2026)

Ostatni warunek prawny premiery. **Profil → „Usunięcie konta"**: trzeba przepisać
`USUWAM KONTO`, dopiero wtedy odblokowuje się przycisk.

Kasuje [api/delete-account.js](api/delete-account.js), bo tylko klucz `service_role`
umie usunąć konto — a ten nigdy nie może trafić do przeglądarki. Przeglądarka
wysyła wyłącznie swój token sesji; **tożsamość serwer bierze z tokenu, nigdy
z treści żądania** — inaczej dałoby się skasować cudze konto, podając jego numer.

**Figurki zostają i przechodzą na konto moderatora** — od tej pory to on widnieje
jako zgłaszający. Dane figurki to fakty o produkcie, nie dane osobowe; kasowanie
ich razem z kontem wycięłoby dziury w Gablocie i skasowało pracę moderatora.
RODO wymaga usunięcia powiązania z osobą — i to robimy. Przejmuje **najstarszy
moderator** (konto założyciela, nie przypadkowy admin dodany później); puste pole
zostaje wyłącznie awaryjnie, gdyby moderatora w bazie nie było. Użytkownik czyta
o tym w oknie potwierdzenia, zanim kliknie.

**Konto moderatora jest zablokowane przed skasowaniem** (403). Bez tego da się
zostać bez żadnego admina i stracić panel na własnej stronie.

Sprawdzone od początku do końca na jednorazowych kontach w żywej bazie:

```
bez tokenu                 401
złe potwierdzenie          400
podrobiony token           401
GET zamiast POST           405
konto moderatora           403
właściwe usunięcie         200   { przepisaneFigurki: 1, przejetePrzezModeratora: true }
konto w Auth po usunięciu  404   (nie ma)
profil                     pusto (kaskada zadziałała)
figurka                    została, submitted_by = konto „FigureFame.com admin"
```

Druga droga — skasowanie użytkownika **ręcznie w panelu Supabase**, z pominięciem
strony — też przechodzi (klucz obcy nie blokuje), ale tam figurka zostaje bez
właściciela: `submitted_by = null`. Jeśli zależy Ci na przejęciu, kasuj kontem
użytkownika przez stronę, nie ręcznie.

## 1. Stack i wdrożenie

- **Front**: React 19 + Vite 8, czysty CSS (zmienne, `body.light-mode` dla motywu jasnego)
- **Baza**: Supabase, projekt **`sfxraogvhjhalzxuddgl`**
- **Hosting**: Vercel, projekt `figure-fame`
- **Push na `main` = automatyczne wdrożenie na produkcję.** Nie trzeba `vercel --prod`.
  Tylko `main` idzie na produkcję; inne gałęzie dostają adres podglądu.
- Zmienne środowiskowe, DNS i ustawienia Supabase **nie** jadą z pushem — te trzeba zmieniać osobno.

## 2. Domena i poczta — działa w całości

**`figurefame.com`** (Cloudflare Registrar, wygasa 27.07.2027).

> ⚠️ **Serwerów nazw NIE przenosić na Vercel.** Strefa musi zostać w Cloudflare —
> tam stoją rekordy poczty. Domena jest podpięta do Vercela rekordem A (`76.76.21.21`).

| kanał | jak działa |
|---|---|
| `figurefame@figurefame.com` | skrzynka w **Zoho** (mail.zoho.eu), superadmin domeny |
| `admin@`, `contact@` | **aliasy** tej skrzynki, nie osobne konta |
| odbiór | Zoho **przekazuje** wszystko na `figurefame@gmail.com` |
| wysyłka | Gmail „Wyślij jako" przez `smtppro.zoho.eu:465` SSL, login = `figurefame@figurefame.com` (hasło aplikacji) |
| `noreply@mail.figurefame.com` | **Brevo**, wpięty w Supabase jako własny SMTP |

**Poddomena `mail.figurefame.com` jest oddelegowana do Brevo** (rekordy NS →
`ns1/ns2.sendinblue.com`). Cloudflare nie widzi, co jest w środku — Brevo sam
utrzymuje tam DKIM i SPF. Cofa się skasowaniem dwóch rekordów NS.

Rozdzielenie jest celowe: automaty (rejestracje, resety haseł) psują sobie
reputację na `mail.figurefame.com`, a korespondencja z ludźmi ma własną na
`figurefame.com`. **Zoho zabrania wysyłki masowej** — dlatego `noreply@` nigdy
nie może być aliasem tamtej skrzynki.

DNS: MX Zoho, SPF `include:zohomail.eu`, DKIM `zmail._domainkey` (zweryfikowany),
DMARC `p=none` (tryb obserwacji, nic nie blokuje).

## 3. Zasłona — strona jest zamknięta

- [middleware.js](middleware.js): HTTP Basic Auth, login **`archi`**, hasło **`Klara2026`**
- Sterowana zmiennymi `SITE_GATE_USER` / `SITE_GATE_PASSWORD` w Vercelu.
  **Usunięcie ich = zdjęcie zasłony**, bez ruszania kodu.
- [public/robots.txt](public/robots.txt) blokuje wyszukiwarki i 24 roboty AI.
  Wersja docelowa czeka zakomentowana na końcu pliku pod nagłówkiem „DOCELOWO".
- `index.html` ma `<meta name="robots" content="noindex...">` do zdjęcia w dniu premiery.

## 4. Logowanie

```
DZIAŁA:            google, discord, x, facebook
MOŻNA WŁĄCZYĆ:     apple, twitch, github, linkedin_oidc, spotify
NIE MA W SUPABASE: instagram, tiktok, reddit, pinterest, kick
```

- Przyciski w [Login.jsx](src/components/Login.jsx): Google, Discord, X. **Facebook działa,
  ale nie ma przycisku** — do decyzji.
- **Apple wymaga 99 USD/rok** (Apple Developer Program). Staje się obowiązkowe dopiero
  przy aplikacji na iOS.
- Potwierdzenie adresu mailem jest **wymagane** (`mailer_autoconfirm = false`).
  Dotyczy tylko rejestracji hasłem — logowanie przez dostawcę potwierdza adres samo.
- `/add` wymaga potwierdzonego adresu ([ProtectedRoute.jsx](src/components/ProtectedRoute.jsx),
  `wymagaPotwierdzenia`). W praktyce **nieosiągalne**: Supabase nie wydaje sesji przed
  potwierdzeniem, więc niepotwierdzony nigdy nie jest zalogowany. Zostawione jako
  zabezpieczenie na wypadek dostawcy oddającego adres niepotwierdzony.

## 5. Adresy figurek — nieodwracalne

Każda figurka ma `slug`, `short_code` i `identity_key`
([figureIdentity.js](src/lib/figureIdentity.js)). Adres: `figurefame.com/f/<slug>`.

> **Adres raz nadany jest nietykalny.** Kod figurki jest wypalany w obrazie shorta
> ([renderShort.mjs](worker/renderShort.mjs)) — opublikowanego filmu nie da się poprawić.

Adresy są neutralne językowo, więc `/de/f/slug` doklei się później bez psucia linków.

`external_ids` (np. numer MFC) to **odsyłacz do sprawdzenia, nie tożsamość figurki** —
MFC jest jedną z baz, nie wyrocznią.

## 6. Zdjęcia — reguła bezwzględna

**Do formularza trafia albo gotowe zdjęcie w naszym magazynie, albo pusto.**
Nigdy surowy adres z cudzego serwera. Egzekwowane w [fetch-figure.js](api/fetch-figure.js)
— także na ścieżce odczytu z pamięci podręcznej (`oczyscZdjecie`).

Powód nie jest teoretyczny: Kotobukiya skasowało zdjęcie Leviego, zanim je ściągnęliśmy.
Adres zwraca 301 na stronę główną.

Wszystkie 24 figurki trzymają dziś zdjęcia u nas, w webp, 0,4 MB łącznie
(limit darmowego Supabase: 1 GB ≈ 68 000 figurek). Wąskim gardłem będzie
**transfer 5 GB/mies.**, nie miejsce — wtedy Cloudflare przed Supabase, nie GDrive.

### Podpis praw pod każdym zdjęciem

[prawaDoZdjecia.js](src/lib/prawaDoZdjecia.js): to co wpisał moderator →
**producent figurki**. Puste pole NIE zostawia zdjęcia bez podpisu — dlatego
żadna figurka nie trafia do Gabloty anonimowo, nawet gdy nikt o tym polu nie
pomyślał. Na karcie napis leży **na zdjęciu** (jedzie z nim na zrzucie ekranu),
w dossier **pod nim**.

Piszemy **„Fot.", nie „©"** — przypisujemy autorstwo zdjęcia, a nie
rozstrzygamy o prawach do postaci. Te należą do wydawcy anime, czyli kogoś
innego niż producent figurki.

## 7. Narzędzia (npm run …)

| polecenie | co robi |
|---|---|
| `adresy` | nadaje slug / kod / identity_key; `-- --zapisz` wykonuje |
| `zdjecia` | ściąga do nas zdjęcia z cudzych serwerów; `-- --zapisz` wykonuje |
| `kopia` | ZIP do `kopie/` **oraz na Dysk Google**; `-- --bez-dysku` pomija Dysk |
| `lookup-worker` | worker wyszukiwań (omija Cloudflare lokalną przeglądarką) |
| `worker` | kolejka renderowania shortów |
| `gdrive-auth` | odnowienie dostępu do Dysku Google (otwiera przeglądarkę) |

### FigureFame Studio — co trzeba wiedzieć

**Zielone światło w panelu zapala WYŁĄCZNIE tryb ciągły.** `startHeartbeat` jest
tylko w gałęzi `--watch` ([lookupWorker.mjs](worker/lookupWorker.mjs#L136)), więc
`npm run lookup-worker` zrobi robotę, ale panel dalej pokaże „Studio wyłączone".
Właściwe polecenie to `npm run lookup-worker:watch`, a najwygodniej —
`FigureFame-Studio.cmd` w katalogu głównym (uruchamia oba workery naraz).

**Instalator liczy ścieżki względem siebie**, więc działa z dowolnego katalogu
i na Macu tak samo (`Zainstaluj-Studio-MAC.command` → LaunchAgent). Po
przeniesieniu projektu w inne miejsce trzeba go **uruchomić ponownie** — wpis
w rejestrze/LaunchAgencie jest bezwzględny i sam się nie zaktualizuje.

**Dostęp do Dysku Google wygasa.** Objaw: `invalid_grant: Token has been expired
or revoked` przy publikacji shortów. Doraźnie — `npm run gdrive-auth`. Jeśli
wraca co tydzień, przyczyną jest ekran zgody OAuth w trybie **Testing** (Google
kasuje wtedy tokeny po 7 dniach) — przełączyć na **In production** w Google
Cloud Console → APIs & Services → OAuth consent screen.

`node design/zbuduj-znaki.mjs` odtwarza **wszystkie osiem plików znaku** (logo, ikony,
og-image) z arkusza [design/logo_FigureFame.png](design/logo_FigureFame.png).

Kopia: własny zapis ZIP bez bibliotek ([worker/lib/zip.mjs](worker/lib/zip.mjs)) —
ma działać także za rok, gdy nikt nie zaktualizuje zależności. Sprawdzony:
Windows rozpakowuje, zdjęcia identyczne co do bajtu.

## 8. Wydajność — stan po pomiarach

```
paczka startowa (gzip)    145 kB     (było 185 kB)
odpowiedź Gabloty         2 036 B    (było 8 286 B, -75%)
pierwszy bajt z Vercela   ~150 ms
```

- `framer-motion` **usunięty** — 5,5 MB zależności robiło dwa wjazdy tekstu, teraz CSS.
- Gablota pobiera **jawną listę kolumn**, nie `select('*')`. Encyklopedia szła przez
  sieć prosto do kosza (karta jej nie rysuje, dossier dociąga swoje).
- Nierozstrzygnięte: logowanie przez dostawcę bywa wolne. Podejrzenie — **zasłona
  na hasło działa na każdym adresie**, w tym na ścieżce powrotu z logowania. Zniknie
  samo w dniu premiery.

### Panel moderatora — co spowalniało pisanie (29.07.2026)

Vercel Toolbar mierzył INP **1254 ms** (próg „słabo": 500 ms), z czego 929 ms
szło na rysowanie. Winowajcą nie były dane, tylko **rozmycia przerysowywane przy
każdym naciśnięciu klawisza**: podgląd karty ma poświatę `filter: blur(80px)` i dwa
tła z `backdrop-filter`, a jego treść i kolor poświaty zmieniały się z każdą literą
wpisywaną w pole „nazwa".

Zmiany w [AdminDashboard.jsx](src/components/AdminDashboard.jsx):

| co | dlaczego |
|---|---|
| podgląd karty wydzielony + `useDeferredValue` | rozmycie przerysowuje się, gdy przeglądarka ma wolne, a nie przy każdej literze |
| `FieldMark` wyjęty poza komponent | komponent zdefiniowany w środku innego jest **nowym typem przy każdym renderze** — React rozbierał i budował te znaczniki od zera |
| szukanie przez `useDeferredValue` + `useMemo` | lista przestała się przeliczać i przerysowywać przy każdym znaku w wyszukiwarce |
| `memo` na Wgrywarce i Studiu zdjęcia + `useCallback` na ich funkcjach | bez stałych funkcji `memo` niczego nie daje — komponent widzi „nowe propsy" i rysuje się mimo to |

**Nie zmierzone ponownie** — pomiar INP daje wyłącznie prawdziwa przeglądarka
z paskiem Vercela. Po wdrożeniu warto zerknąć jeszcze raz.

## 9. Pułapki, które kosztowały czas

- **Przy logowaniach ufaj `/auth/v1/authorize`, nie `/auth/v1/settings`.** Wykaz
  ustawień pokazuje `twitter: false`, choć działający dostawca nazywa się `x`.
  Rozróżnienie w komunikacie błędu: `is not enabled` = jest, wyłączone;
  `could not be found` = nie ma go w Supabase.
- **Windows nie ma glifów flag.** Emoji `🇵🇱` renderuje się jako para liter, więc
  przycisk pokazywał „PL PL". Flagi są rysowane w [Flaga.jsx](src/components/Flaga.jsx).
- **MFC trzyma cztery rozmiary zdjęcia** pod tą samą nazwą i domyślnie podsuwa
  miniaturę. `preferLargestMfc` podmienia katalog na `/items/2/`.
- **Zdjęcia produktów pobieraj wprost, nie przez pośrednika.** Cloudflare broni stron
  HTML, nie obrazków. Pośrednik kosztował i wywalał zapis błędem 401, gdy klucz wygasł.
- **`transform: scale()` nie zmniejsza miejsca w układzie strony** — tylko wygląd.
- **Panel Supabase i projekt to dwie różne rzeczy.** Utrata dostępu do konta nie
  zatrzymuje aplikacji; klucze z `.env.local` działają niezależnie.
- **Vercel wstrzykuje swój pasek narzędziowy SAM**, gdy oglądasz własne wdrożenie
  zalogowany na swoje konto. Brak `@vercel/toolbar` w `package.json` niczego nie
  dowodzi. To z niego pochodzi „Interaction Timing" z pomiarem INP.
- **Ciche awarie są najgorsze.** Przycisk „Uruchom Studio" nie działał, bo wpis
  w rejestrze wskazywał o katalog za nisko — kliknięcie nie dawało ŻADNEGO
  komunikatu, więc wyglądało to na zepsute Studio. Instalator sprawdza teraz
  istnienie pliku, zanim cokolwiek zarejestruje.

## 10. Czeka na decyzję

- **Facebook** — działa, brak przycisku. Dodać czy wyłączyć?
- **4 duplikaty figurek** w Archiwum.
- **Profil użytkownika** — kraj, bio, telefon i awatar mają już swoje kolumny
  (do 29.07 formularz pytał o pola, których w bazie nie było, i „Zapisz zmiany"
  kończyło się błędem `Could not find the 'avatar_url' column`). Zostaje do decyzji:
  wgrywanie awatara (webp) i język. Zmiana hasła tylko dla kont z rejestracji
  hasłem — kto wszedł Discordem, hasła nie ma.
- **Tłumaczenia** — szkielet i18n istnieje ([i18n.js](src/lib/i18n.js), `t()`, `cycleLocale`).
  Rekomendacja: **najpierw głębia po polsku** (300–500 figurek), potem niemiecki,
  francuski, angielski na końcu — tam konkurencja z MFC jest najostrzejsza.
- **Levi - Fortitude Ver.** ma już zdjęcie z MFC; reszta figurek czeka na uzupełnienie danych.

## 11. Przed premierą

1. Usunąć `SITE_GATE_*` z Vercela (zdjęcie zasłony)
2. Przywrócić `robots.txt` z sekcji „DOCELOWO" i zdjąć `<meta name="robots">` z `index.html`
3. Zasłona blokuje też roboty programów afiliacyjnych — przy zgłoszeniach potrzebny wyjątek
4. ~~Usuwanie konta (RODO)~~ — zrobione 29.07, patrz sekcja 0a
5. ~~Audyt RLS~~ — zrobiony 28.07, patrz sekcja 0

## 12. Migracje do uruchomienia w SQL Editor

**Nic nie czeka — wszystkie uruchomione.** Stan sprawdzony na żywej bazie 29.07.

| plik | stan |
|---|---|
| [migracje-rls-zamkniecie-bazy.sql](migracje-rls-zamkniecie-bazy.sql) | ✅ uruchomiona i zweryfikowana 28.07 |
| [migracje-prawa-do-zdjec.sql](migracje-prawa-do-zdjec.sql) | ✅ 29.07 — kolumna `image_credit` jest |
| [migracje-usuwanie-konta.sql](migracje-usuwanie-konta.sql) | ✅ 29.07 — pola profilu są, klucz obcy nie blokuje kasowania konta |

Kod schodzi na wersję bez kolumny `image_credit` (podpisuje producentem) —
zabezpieczenie zostaje, bo bez niego brakująca kolumna wywaliłaby cały odczyt
i Gablota byłaby pusta.

---
*Po przeczytaniu tego pliku masz komplet kontekstu do dalszej pracy z Arturem.*
