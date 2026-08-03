# FigureFame — konta w mediach społecznościowych

> Instrukcja zakładania. Stan na **03.08.2026**.
> Wersja do druku: [media.pdf](media.pdf) — powstaje z tego pliku poleceniem
> `node scripts/md-pdf.mjs media`.
> Po założeniu konta wklej jego adres do [src/lib/social.js](src/lib/social.js) — ikona w stopce
> zapali się sama i stanie się klikalna.

---

## 1. Którym mailem zakładać

Masz trzy adresy, ale **to jedna skrzynka**: `admin@` i `contact@` są tylko aliasami
`figurefame@figurefame.com`. Wszystko ląduje w tym samym miejscu i przechodzi dalej na
`figurefame@gmail.com`.

| adres | do czego | dlaczego tak |
|---|---|---|
| **`figurefame@figurefame.com`** | **zakładanie wszystkich kont i publikowanie w opisach** | to prawdziwa skrzynka i superadmin domeny — tu przychodzi odzyskiwanie hasła. Ten sam adres stoi już w polityce prywatności i regulaminie, więc świat widzi jeden adres, nie trzy |
| `admin@figurefame.com` | **tylko konto administratora w aplikacji** | jest podpięty pod uprawnienia w bazie ([migracje.sql](migracje.sql)) — nie mieszaj go z mediami |
| `contact@figurefame.com` | rezerwa | zostaw wolny na wypadek, gdyby kiedyś trzeba było oddzielić korespondencję handlową |

> ⚠️ **Nie zakładaj kont na alias.** Odzyskiwanie hasła i weryfikacja właściciela idą na adres
> podany przy rejestracji. Prawdziwa skrzynka jest pewniejsza od aliasu, który da się skasować
> jednym kliknięciem w panelu Zoho.

> ⚠️ **Wyjątek: YouTube.** Potrzebuje konta Google, a Ty już takie masz —
> `figurefame@gmail.com`. Użyj go, ale przeczytaj punkt o koncie marki niżej.

---

## 2. Co założyć i w jakiej kolejności

Nazwa użytkownika wszędzie ta sama: **`figurefame`** (albo `@figurefame`).
Zajmij ją od razu na wszystkich platformach, nawet tych, których jeszcze nie uruchamiasz —
odzyskanie zajętej nazwy jest praktycznie niemożliwe.

| # | platforma | typ konta | mail | po co |
|---|---|---|---|---|
| 1 | **YouTube** | **konto marki** (Brand Account) | `figurefame@gmail.com` | główny dom shortów |
| 2 | **TikTok** | Business | `figurefame@figurefame.com` | największy zasięg organiczny |
| 3 | **Instagram** | Business | `figurefame@figurefame.com` | Reels + zdjęcia figurek |
| 4 | **Pinterest** | Business | `figurefame@figurefame.com` | wyszukiwarka wizualna, pin pracuje miesiącami |
| 5 | **Discord** | serwer | `figurefame@figurefame.com` | społeczność; logowanie Discordem już działa |
| 6 | X, Bluesky | zwykłe | `figurefame@figurefame.com` | na razie tylko rezerwacja nazwy |

> ⚠️ **YouTube: koniecznie „konto marki", nie zwykły kanał.** Kanał założony wprost na koncie
> Google jest przypisany do **osoby** — nie da się go przekazać ani dodać drugiego opiekuna.
> Konto marki można. Zmiana po fakcie bywa niemożliwa, więc to trzeba zrobić dobrze za pierwszym razem.
>
> Robi się to tak: YouTube → Ustawienia → *Dodaj lub zarządzaj kanałami* → **Utwórz nowy kanał**.

> ⚠️ **Business/Creator zamiast zwykłego konta** na TikToku, Instagramie i Pintereście.
> Bez tego nie ma statystyk ani klikalnych odnośników — czyli nie zobaczysz, czy shorty
> w ogóle kierują ruch.

---

## 3. Co wpisać w opisach

Limity znaków są prawdziwe i platformy tną w pół słowa. Teksty niżej mieszczą się z zapasem.

### Nazwa wyświetlana (wszędzie)

```
FigureFame
```

### TikTok — bio, limit 80 znaków

```
Japońskie figurki kolekcjonerskie: dane, ceny, ryzyko podróbek. figurefame.com
```

### Instagram — bio, limit 150 znaków

```
Japońskie figurki kolekcjonerskie
Dane producentów, wartość rynkowa
Ostrzegamy przed podróbkami
```

*(odnośnik wklej w osobne pole „Website", nie w bio)*

### X — bio, limit 160 znaków

```
Baza japońskich figurek kolekcjonerskich. Dane producentów, wartość rynkowa
i ryzyko podróbek. Po polsku.
```

### Bluesky — opis, limit 256 znaków

```
Baza japońskich figurek kolekcjonerskich: dane producentów, wartość rynkowa
i ocena ryzyka podróbek. Prowadzona po polsku.
figurefame.com
```

### Pinterest — „O Tobie", limit 500 znaków

```
FigureFame to polska baza japońskich figurek kolekcjonerskich. Zbieramy dane
producentów, skalę, rok wydania i wartość rynkową, a przy każdej figurce
oceniamy ryzyko trafienia na podróbkę. Podpowiadamy też, gdzie kupić
oryginał.

Cały katalog: figurefame.com
```

### Discord — opis serwera, limit 120 znaków

```
Polska społeczność kolekcjonerów japońskich figurek. Podróbki, ceny, nowości.
```

### YouTube — opis kanału, limit 1000 znaków

```
FigureFame to polska baza japońskich figurek kolekcjonerskich.

Przy każdej figurce zbieramy to, co naprawdę istotne przy zakupie: producenta,
skalę, rok wydania, cenę katalogową i dzisiejszą wartość rynkową. Osobno
oceniamy ryzyko trafienia na podróbkę — bo na rynku wtórnym to problem
kosztowniejszy niż sama pomyłka co do wersji.

Na kanale: krótkie prezentacje pojedynczych figurek, porównania wersji tej
samej postaci i ostrzeżenia o podróbkach, które najczęściej chodzą po
serwisach aukcyjnych.

Pełny katalog: figurefame.com
Kontakt: figurefame@figurefame.com
```

---

## 4. Rzeczy, które ugryzą, jeśli je pominiesz

- **Włącz dwuskładnikowe logowanie wszędzie i zapisz hasła w menedżerze.**
  Przejęte konto w mediach społecznościowych bywa nie do odzyskania — nie ma tam infolinii.
- **Nie publikuj odnośnika do konta, na którym nic nie ma.** To ta sama zasada, która rządzi
  ikonami w stopce: pusty kanał szkodzi bardziej niż jego brak. Wrzuć **3–5 materiałów**,
  dopiero potem wklejaj adres do `social.js`.
- **Nie wysyłaj masowej korespondencji przez Zoho** — regulamin tego zabrania i grozi utratą
  skrzynki. Do wysyłek automatycznych służy Brevo (`noreply@mail.figurefame.com`).
- **Nazwa użytkownika ma być identyczna wszędzie.** Ludzie zgadują adresy kont; jedna
  nazwa oznacza, że zawsze trafią.
- **Zdjęcie profilowe i baner** odtworzysz poleceniem `node design/zbuduj-znaki.mjs` —
  generuje komplet plików znaku z arkusza `design/logo_FigureFame.png`.

---

## 5. Gdy konto już stoi

Otwórz [src/lib/social.js](src/lib/social.js) i wpisz adres w pole `url` przy właściwej
platformie:

```js
{
  klucz: 'youtube',
  nazwa: 'YouTube',
  url: 'https://www.youtube.com/@figurefame',   // ← tutaj
  ...
}
```

Ikona w stopce przestanie być wyszarzoną atrapą, stanie się prawdziwym odnośnikiem
i zapali się kolorem marki po najechaniu. Nic więcej nie trzeba zmieniać.
