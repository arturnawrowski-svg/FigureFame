# FigureFame — Roadmap & TODO

Stan na **29.07.2026**. Szczegóły architektury: [plan_claude_210720026.md](plan_claude_210720026.md),
opis aplikacji: [DOKUMENTACJA.md](DOKUMENTACJA.md), lista sklepów: [affiliation.md](affiliation.md).

> **Zasada naczelna: FREE-FIRST.** Darmowe narzędzia tak długo, jak się da.
> Jedyny akceptowany koszt na dziś: domena i poczta w przyszłości.

---

## ✅ Zrobione

### Silnik danych
- [x] Baza Supabase (figures, price_snapshots, lookup_cache, lookup_queue).
- [x] Kolejka moderacji: `PENDING` → `APPROVED` / `ARCHIVED`.
- [x] **Drabina źródeł** (`api/lib/figureSources.js`): encyklopedia + katalogi producentów,
      AI dopiero na końcu i wyłącznie na braki. Japońskie nazwy, ostrzeżenia o podróbkach.
- [x] **Pamięć podręczna wyszukiwań** — każdą figurkę pobieramy raz (9,96 s → 0,09 s).
- [x] **Lokalna przeglądarka** (Playwright): omija Cloudflare, ~1,2 s, bez limitów, za darmo.
- [x] **Łańcuch dostawców scrapingu** z fallbackiem (6 usług, każda z własnym darmowym limitem).
- [x] Worker kolejki wyszukiwań — klik na żywej stronie realizuje komputer admina.
- [x] Warstwa multi-AI: 9 modeli z fallbackiem + grounding (Tavily / Gemini).

### Interfejs
- [x] Widok „Dossier", tooltipy, lista ofert.
- [x] Panel moderatora: zakładki, Studio zdjęcia, podgląd karty na żywo.
- [x] **Pasek postępu** z realnymi etapami; publicznie ogólne nazwy źródeł, dokładne tylko dla admina.
- [x] **Tryb ⭐ TOP** — dokładniejsze szukanie na żądanie.
- [x] Wyszukiwarka publiczna wyłącznie po własnej bazie (także po nazwach japońskich).
- [x] Przełącznik języka PL/EN (szkielet i18n).

### Generator shortów
- [x] Render lokalny (sharp + ffmpeg), opcje: scenariusz, akcent, muzyka, rozdzielczość, język.
- [x] Kolejka renderu w bazie + moderacja wideo + publikacja na Google Drive.
- [x] `FigureFame-Studio.cmd` — jedno kliknięcie uruchamia oba workery.

### Infrastruktura
- [x] GitHub + automatyczne wdrożenia na Vercel.
- [x] RLS, strażnik `/admin`, klucze wyłącznie po stronie serwera.
- [x] **Usuwanie konta (RODO)** — profil → strefa nieodwracalna, potwierdzenie przez
      przepisanie hasła. Figurki zostają, znika powiązanie z osobą. Konto moderatora
      zablokowane przed skasowaniem. Sprawdzone na jednorazowym koncie w żywej bazie.
- [x] Migracje w repo (wcześniej reguła `*.sql` trzymała schemat poza kontrolą wersji).

---

## 🔜 Następne w kolejce

### 1. Ceny i afiliacja (największy zysk — monetyzacja)
- [ ] **Klucze eBay** (`EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`) — kod czeka gotowy.
- [ ] **Rakuten** (`RAKUTEN_APP_ID`) — jw.
- [ ] Rejestracja w programach partnerskich → identyfikatory do `.env`
      (warstwa `affiliateLinks.js` obsługuje 12 platform, m.in. Amazon; bez identyfikatora
      linki zostają nietknięte, więc nic nie łamiemy przed akceptacją).
- [ ] Nota o linkach partnerskich w regulaminie i przy ofertach (wymóg w UE).
- [ ] Odświeżanie cen wyzwalane z panelu; automat dopiero, gdy będzie sens.

### 2. Domena i tożsamość
- [ ] Zakup domeny + poczta (`admin@`), przepięcie Vercela.
- [ ] Konta partnerskie docelowo na adres z domeny — przy istniejących kontach
      **zmieniać e-mail, nie zakładać nowych** (inaczej przepada historia prowizji).

### 3. Treść i zasięg
- [ ] Pełne tłumaczenie strony (EN, potem CS/FR) — szkielet i18n gotowy.
- [ ] Lokalizacja shortów: CS/FR (dopisanie do słownika w `shortOptions.js`).
- [ ] Publikacja shortów na kanałach (wymaga zgód platform).

### 4. Zapas i odporność
- [ ] Klucze zapasowych scraperów (ScrapingBee, Scrapfly) — wklejenie i gotowe.
- [ ] „Live Check" ofert przed przekierowaniem (ochrona przed martwymi linkami).
- [ ] Podział `AdminDashboard.jsx` (1090 linii) — **dopiero przy kolejnej rozbudowie**,
      dziś rozbijanie działającego panelu to ryzyko bez zysku.

---

## ❄️ Odłożone świadomie

- **Cerebras** — usunięty, brak działającego darmowego modelu.
- **AmiAmi / HobbySearch przez pośrednika** — adaptery gotowe, ale darmowe plany nie mają
  japońskich adresów IP (`ROTATION_FAILED`). Włącznik: `FIGURE_SOURCES_JP=1`.
- **SerpApi** — zbędne, dubluje darmowe API eBay.
- **Płatny plan Vercel** — dopiero przy realnym ruchu.
- **Pozycje 18+ z affiliation.md** — poza zakresem; ewentualnie za bramką wieku.

---

## ⚠️ O czym pamiętać

1. **Dodawaj figurki lokalnie** (`npm run dev` → `localhost`) — wtedy dane pobiera
   Twoja przeglądarka: bez limitów i najszybciej. Żywa strona to tryb awaryjny
   (zlecenie trafia do kolejki, realizuje je FigureFame Studio w domu).
2. **Backup rób PO zmianach**, nie przed — archiwum ma odzwierciedlać stan końcowy.
   Stare archiwa trzymaj poza folderem projektu (inaczej puchną kolejne).
3. **Dane z katalogów są pewne, z AI — nie.** Panel pokazuje pochodzenie; przed
   dodaniem do Gabloty weryfikuj to, czego nie potwierdziło żadne źródło.
