# FigureFame — założenia projektu

> Stan na **29.07.2026**. To jest punkt wejścia: czym ten projekt jest, na czym stoi
> i jakich zasad nie wolno złamać. Co już zrobione → [DONE.md](DONE.md).
> Co do zrobienia → [TODO.md](TODO.md). Co dalej → [FUTURE.md](FUTURE.md).

---

## 1. Czym to jest

**FigureFame** to baza danych i agregator wiedzy o **japońskich figurkach kolekcjonerskich**.

Nie kolejny katalog, tylko **platforma decyzyjna kolekcjonera**: nie tylko pokazuje dane,
ale pomaga odpowiedzieć na cztery pytania, które kolekcjoner zadaje przed zakupem —
**czy to oryginał, ile to warto, gdzie kupić, czy czekać.**

**Dla kogo:** kolekcjonerzy figurek anime (od początkujących po zaawansowanych), kupujący
na rynku wtórnym, ludzie szukający rzetelnych danych i ostrzeżeń przed podróbkami.

**Czym się różnimy od MyFigureCollection** — największej istniejącej bazy:

| Wyróżnik | Na czym polega |
|---|---|
| **Bootleg Radar** | Ocena, jak często dany model bywa podrabiany, plus lista cech oryginału |
| **Ask AI** | Kontekstowy asystent przy każdej figurce — pyta się go o autentyczność, ceny, strategię |
| **AI Dossier** | Dane zbierane automatycznie z wielu katalogów i uzupełniane przez AI, z widocznym pochodzeniem każdego pola |
| **Shorty** | Krótkie filmy z figurkami prowadzące na kartę produktu — MFC nie robi treści |
| **Price Watch** | Realne oferty i ceny z rynku (w budowie) |

---

## 2. Zasada naczelna: FREE-FIRST

To projekt **hobbystyczny i rodzinny**. Nadrzędna reguła każdej decyzji technicznej:
**korzystamy z narzędzi darmowych tak długo, jak się da.**

Każdy nowy pomysł przechodzi przez pytanie: *„czy da się to zrobić za darmo?"* — i dopiero
gdy nie, rozważamy koszt.

Co z tego wynika w praktyce:

- **AI:** wyłącznie darmowe tiery, a limity omijamy **łańcuchem dziewięciu providerów**, nie płatnym planem
- **Obliczenia u klienta:** usuwanie tła i kompozycja świateł liczą się w przeglądarce (WASM/Canvas) — serwer nie płaci
- **Ciężka robota na komputerze domowym:** pobieranie danych zza Cloudflare i render filmów robi *FigureFame Studio* na komputerze admina, nie chmura
- **Oszczędny Storage:** pliki robocze kasujemy po akceptacji, w chmurze zostaje jeden finalny webp
- **Własne implementacje zamiast zależności** tam, gdzie to tanie i trwałe (np. zapis ZIP kopii zapasowej — ma działać także za rok, gdy nikt nie zaktualizuje bibliotek)

### Świadomie zaakceptowane koszty (jedyne)

| Pozycja | Koszt | Dlaczego mimo zasady |
|---|---|---|
| Domena `figurefame.com` (Cloudflare) | ~55 zł/rok | Bez własnej domeny nie ma marki ani wiarygodności przy programach afiliacyjnych |
| Zoho Mail Lite | ~13,50 €/rok | Poczta firmowa z domeny; darmowe drogi nie dawały wysyłki „send-as" bez psucia reputacji |

Wszystko inne — hosting, baza, AI, scraping, render, publikacja — **kosztuje 0 zł**.

---

## 3. Gdzie to stoi

| Warstwa | Usługa | Uwagi |
|---|---|---|
| Front | **Vercel**, projekt `figure-fame` | push na `main` = wdrożenie na produkcję |
| Baza, logowanie, pliki | **Supabase**, projekt `sfxraogvhjhalzxuddgl` | darmowy tier: 1 GB miejsca, **5 GB transferu/mies.** ← to jest prawdziwy sufit |
| Domena i DNS | **Cloudflare Registrar** | ⚠️ serwerów nazw **nie przenosić** na Vercel — w Cloudflare stoją rekordy poczty |
| Poczta ludzka | **Zoho** (`figurefame@figurefame.com` + aliasy) | przekazuje na Gmaila, wysyłka „send-as" |
| Poczta automatyczna | **Brevo** (`noreply@mail.figurefame.com`) | osobna poddomena — automaty nie psują reputacji korespondencji |
| Filmy | **Google Drive** | shorty lądują tam po zatwierdzeniu i zwalniają Supabase |
| Ciężka robota | **FigureFame Studio** — komputer domowy | Playwright (dane) + ffmpeg (render) |

**Podział ról, który przewija się przez cały projekt: Vercel jest mózgiem, komputer domowy rękami.**
Wszystko, czego nie da się zrobić w chmurze za darmo albo w ogóle (Cloudflare przepuszcza
przeglądarki, nie serwery; render wideo kosztuje), trafia do kolejki w bazie, a komputer
w domu ją realizuje.

---

## 4. Stack

- **Front:** React 19 + Vite 8, **czysty CSS** (zmienne, `body.light-mode`) — bez Tailwinda, bez bibliotek animacji
- **Baza:** Supabase (Postgres + Auth + Storage), reguły dostępu **RLS**
- **Funkcje serwerowe:** Node na Vercelu (`api/*`), lokalnie te same pliki przez middleware Vite
- **Obrazy:** `sharp` na serwerze, Canvas/WASM w przeglądarce
- **Dane:** własna drabina źródeł (katalogi figurek) + warstwa multi-AI z fallbackiem
- **Testy:** Vitest — 49 testów na logice, która ma prawo się zepsuć po cichu

---

## 5. Reguły nienaruszalne

Te zasady kosztowały błędy, awarie albo pieniądze. Żadnej z nich nie łamiemy „na chwilę".

1. **Klucz `service_role` nigdy nie trafia do przeglądarki.** Omija wszystkie reguły dostępu
   do bazy. Endpoint, który go używa, musi sam sprawdzać, kto puka
   ([server-lib/wymagajModeratora.js](server-lib/wymagajModeratora.js)).
2. **Adres figurki raz nadany jest nietykalny.** Kod figurki wypalamy w obrazie shorta —
   opublikowanego filmu nie da się poprawić.
3. **Do formularza trafia albo gotowe zdjęcie w naszym magazynie, albo pusto.** Nigdy surowy
   adres z cudzego serwera. Powód nie jest teoretyczny: Kotobukiya skasowało zdjęcie Leviego,
   zanim je ściągnęliśmy.
4. **Żadne zdjęcie bez podpisu praw.** Puste pole nie zostawia zdjęcia anonimowo — podpisujemy
   producentem figurki. Piszemy „Fot.", nie „©" — przypisujemy autorstwo zdjęcia, a nie
   rozstrzygamy o prawach do postaci.
5. **Dane z katalogów mają pierwszeństwo przed AI.** AI wypełnia wyłącznie braki, a panel
   pokazuje pochodzenie każdego pola. To, czego nie potwierdził żaden katalog, wymaga
   sprawdzenia przed wejściem do Gabloty.
6. **Nic nie trafia do Gabloty bez moderacji.** Obieg `PENDING → APPROVED → ARCHIVED`,
   a reguły bazy pilnują, że zgłoszenie nie może wejść od razu jako zatwierdzone.
7. **Kopia zapasowa po zmianach, nie przed.** Archiwum ma odzwierciedlać stan końcowy.

---

## 6. Czego świadomie nie robimy

| Rzecz | Dlaczego nie |
|---|---|
| **Generator komiksów AI** (pierwotna koncepcja „FigureFrame") | Zmieniliśmy kierunek: baza i dane o figurkach zamiast zabawki generatywnej. Opis pierwotny → [archiwum/](archiwum/) |
| **Pozycje 18+** | Poza zakresem projektu; ewentualnie kiedyś za bramką wieku |
| **Płatne plany** (Vercel Pro, płatne AI, płatny scraping) | Dopóki darmowe tiery wystarczają — patrz FREE-FIRST |
| **TypeScript** | Projekt jest jednoosobowy i działa; migracja to koszt bez dzisiejszego zysku |
| **Apple jako logowanie** | 99 USD/rok. Staje się obowiązkowe dopiero przy aplikacji na iOS |
| **Reklamy** | Najwcześniej po realnym ruchu; afiliacja jest uczciwszym modelem dla tej treści |

---

## 7. Słownik — czym są nazwy własne

- **Gablota** — publiczna strona główna z zatwierdzonymi figurkami
- **Dossier** — pełna karta figurki (dane, oferty, Bootleg Radar, Ask AI)
- **Poczekalnia** — zgłoszenia o statusie `PENDING`, czekające na moderatora
- **FigureFame Studio** — program na komputerze domowym: pobiera dane i renderuje filmy
- **Drabina źródeł** — kolejność katalogów, z których zbieramy dane; AI jest ostatnia
- **Zasłona** — hasło na całą stronę przed premierą (`SITE_GATE_*` w Vercelu)
