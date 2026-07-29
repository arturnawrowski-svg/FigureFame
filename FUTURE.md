# FigureFame — co dalej

> Stan na **29.07.2026**. Zasady → [ZALOZENIA.md](ZALOZENIA.md) ·
> Zrobione → [DONE.md](DONE.md) · Najbliższe zadania → [TODO.md](TODO.md)
>
> **Bez dat-obietnic.** Każdy klocek ma zamiast tego **warunek wejścia** — kiedy ma sens go
> zaczynać. Plan roczny z datami przy projekcie robionym po godzinach zamienia się w listę
> wyrzutów sumienia; warunki wejścia mówią to samo, tylko uczciwie.

---

## Kolejność zależności

```
   PREMIERA
      │
      ├──► GŁĘBIA BAZY ──────────────┐
      │    (bez treści reszta         │
      │     nie ma czego promować)    │
      │                               ▼
      ├──► SHORTY I SOCIAL ──────► RUCH ──────► MONETYZACJA
      │    (lejek do kart)                      (afiliacja)
      │                                              │
      └──► JĘZYKI ◄─────────────────────────────────┘
           (dopiero gdy polska baza
            ma czym się bronić)
```

Zasada porządkująca: **najpierw treść, potem zasięg, na końcu pieniądze.**
Odwrotna kolejność to promowanie pustej strony.

---

## 1. Głębia bazy — najważniejsze ze wszystkiego

**Warunek wejścia:** premiera za nami.

Dziś: **24 figurki**. To za mało, żeby ktokolwiek został na stronie.

- Cel bliski: **100 figurek**, tempo ~10 tygodniowo (proces jest gotowy, to kwestia wieczorów)
- Cel dalszy: **300–500**, wtedy baza zaczyna bronić się w wyszukiwarce
- Priorytet doboru:
  1. **Najpopularniejsze postacie** (Miku, Rem, Asuka, Zero Two, Marin Kitagawa) — ruch z Google
  2. **Kompletne serie** (cały rząd Lucky Star, wszystkie wersje Sonico) — powód, żeby zostać
  3. **Nisze i wysokie ryzyko podróbki** — tam nasza wartość merytoryczna jest największa

**Najpierw po polsku.** Konkurencja z MFC po angielsku jest najostrzejsza, a po polsku
praktycznie nie istnieje. Głębia w jednym języku bije płyciznę w czterech.

## 2. Shorty i lejek social

**Warunek wejścia:** ~30 figurek ze zdjęciami, czyli jest z czego robić filmy przez miesiąc.

Pipeline renderu i publikacji na Dysk **już działa** — brakuje kont i regularności.

| Krok | Uwagi |
|---|---|
| Konta pod marką FigureFame | YouTube (kanał markowy, nie prywatne konto Google), TikTok Business, Instagram Business, Pinterest Business |
| Pierwsze 5 shortów ręcznie | Sprawdzian pipeline'u na żywym organizmie, zanim cokolwiek automatyzujemy |
| Rytm | 3 shorty tygodniowo. Nie więcej — regularność bije zryw |
| Discord | Logowanie już działa; serwer to naturalne miejsce dla społeczności kolekcjonerskiej |
| Pinterest | Wyszukiwarka wizualna: pin ze zdjęciem figurki pracuje miesiącami. Pole `pinterest_pin_id` czeka w bazie |

**Największym ryzykiem projektu nie jest kod, tylko konsekwencja w publikowaniu.**
Pipeline zbudowany w tydzień może stać bezużyteczny rok.

## 3. Monetyzacja — afiliacja

**Warunek wejścia:** klucze eBay/Rakuten wpięte (patrz [TODO.md](TODO.md) pkt 5) i jakikolwiek
ruch, który da się przekierować.

- Realne oferty na kartach zamiast dzisiejszych atrap
- Automatyczne odświeżanie cen (`refresh-prices` istnieje; brakuje wyzwalacza cyklicznego)
- Historia cen na karcie (prosty wykres w CSS, bez bibliotek)
- Linki afiliacyjne przez gotową warstwę 12 platform
- Celuj w sklepy kolekcjonerskie (5–12%), nie w Amazon (1–3%)

## 4. Alerty cenowe — nasz wyróżnik

**Warunek wejścia:** ceny odświeżają się automatycznie, jest komu wysyłać maile.

„Figurka z Twojej listy potaniała o 30%" — **MFC czegoś takiego nie ma.** To jest różnica
między katalogiem a narzędziem kolekcjonera, a przy okazji naturalne miejsce na link
afiliacyjny: użytkownik dostaje realną korzyść, my prowizję.

Potrzebne: lista obserwowanych figurek przy koncie + porównanie migawek cen + wysyłka
(Brevo już stoi).

## 5. Języki

**Warunek wejścia:** ~300 figurek po polsku.

Kolejność: **niemiecki** (duża społeczność kolekcjonerska, słabo obsłużona) → **francuski**
→ **angielski na końcu**, bo tam konkurencja z MFC jest najostrzejsza.

Szkielet i18n istnieje ([src/lib/i18n.js](src/lib/i18n.js)). Adresy figurek są neutralne
językowo, więc `/de/f/slug` doklei się bez psucia istniejących linków — i to jest powód,
dla którego zostały tak zaprojektowane.

## 6. Automatyzacja publikacji

**Warunek wejścia:** ręczne publikowanie zaczyna zjadać wieczory.

YouTube Data API jest darmowe i proste. TikTok i Instagram wymagają zatwierdzenia aplikacji
deweloperskiej (proces kilkutygodniowy, ale bezpłatny). Nie ma sensu zaczynać, dopóki nie ma
stałego strumienia filmów.

## 7. Dojrzałość techniczna

**Warunek wejścia:** projekt przestaje być jednoosobowy albo baza przekracza ~500 figurek.

- **Podział `AdminDashboard.jsx`** — przy najbliższej dużej zmianie w panelu
- **Testy `figureSources.js` i `aiClient.js`** — to rdzeń, który psuje się po cichu wraz
  ze zmianami w cudzych serwisach
- **CI (GitHub Actions)** — `npm test` na każdym push, darmowe
- **PWA** — manifest jest, brakuje service workera
- **TypeScript** — tylko jeśli utrzymanie zacznie boleć; zacząć od `server-lib/`

## 8. Rzeczy odłożone z premedytacją

| Pomysł | Kiedy wróci |
|---|---|
| **Reklamy** | Dopiero gdy będzie realny ruch, a afiliacja nie pokryje kosztów. Reklamy na stronie z 24 figurkami to psucie wrażenia za grosze |
| **Ranking użytkowników** | Gdy będzie więcej niż kilku zgłaszających |
| **Kolekcje użytkowników** (tabela `user_collections` już istnieje) | Naturalne przedłużenie alertów cenowych |
| **Aplikacja mobilna** | PWA załatwia 90% potrzeby za 0 zł; natywna oznacza 99 USD/rok za samo wejście |
| **Własne zdjęcia figurek** | Gdy będzie fizyczna kolekcja do sfotografowania — wtedy znika cały problem praw do cudzych zdjęć |
