# Baza afiliacyjna FigureFame — 100 pozycji + instrukcja

> Stan na **03.08.2026**. Wersja do druku: [affiliation.pdf](affiliation.pdf) — powstaje
> z tego pliku poleceniem `node scripts/md-pdf.mjs affiliation`.

---

## ⚠️ Najpierw to, bo bez tego reszta jest bezużyteczna

**Programy afiliacyjne odrzucą Cię dzisiaj.** Nie dlatego, że coś jest źle zrobione — po prostu
nie mają czego sprawdzić. Weryfikacja zawsze wygląda tak samo: człowiek albo robot otwiera
Twoją stronę i patrzy, czy istnieje, czy ma treść i czy nie jest farmą linków.

Dziś strona stoi za zasłoną (HTTP Basic Auth), więc **widzą okienko z hasłem, a nie serwis**.
Do tego ma 24 figurki. To zbyt mało, żeby ktokolwiek uznał ją za wartościową.

```
brak kluczy afiliacyjnych  ←  brak akceptacji  ←  zasłona  ←  czekanie na klucze
```

**Kolejność jest więc odwrotna niż intuicja podpowiada:**

1. **Premiera** — zdjęcie zasłony ([TODO.md](TODO.md), pkt 3)
2. **~50 figurek** w bazie — Twój własny próg „ofensywy"
3. **Dopiero wtedy** zgłoszenia do programów

Zgłoszenie wysłane za wcześnie to nie jest neutralne zdarzenie: **odrzucenie zostaje
w systemie**, a ponowna aplikacja bywa trudniejsza niż pierwsza. Nie pal amunicji.

---

## Co przygotować przed pierwszym zgłoszeniem

Formularze pytają wszędzie o to samo. Przygotuj raz, użyjesz sto razy.

| pole | co wpisać |
|---|---|
| Adres strony | `https://figurefame.com` |
| Opis serwisu (EN) | *Polish-language database of Japanese collectible figures: manufacturer data, market value, bootleg risk assessment and where to buy authentic items.* |
| Kategoria | Collectibles / Toys & Hobbies / Anime |
| Kraj i język | Polska, polski (część programów pyta o rynek docelowy) |
| Model ruchu | Content / SEO / Social — **nigdy** „coupon", „cashback" ani „PPC" |
| Miesięczny ruch | podaj **prawdziwe** liczby z Vercel Analytics; zawyżanie to najczęstszy powód blokady po fakcie |
| Polityka prywatności | `https://figurefame.com/prywatnosc` — sprawdzają, że istnieje pod stałym adresem |
| Informacja o afiliacji | `https://figurefame.com/regulamin` — punkt 6 |
| Kontakt | `figurefame@figurefame.com` |
| Dane rozliczeniowe | NIP / numer konta / PayPal — **do uzupełnienia po rejestracji działalności** |

> ✅ **Dwie rzeczy masz już zrobione, a wielu odrzucają właśnie za ich brak:**
> nota o linkach afiliacyjnych w regulaminie (pkt 6) oraz `rel="sponsored"` na linkach
> w [OfficialShops.jsx](src/components/OfficialShops.jsx). Nie ruszaj tego.

---

## Jak to zrobić — proces w siedmiu krokach

1. **Zacznij od SIECI, nie od sklepów.** Jedno zgłoszenie do Awin czy Impact odblokowuje
   dostęp do setek sklepów naraz. Sklep po sklepie to droga na miesiące.
2. **Zgłoś się do 3–4 sieci równolegle** (patrz tabela A). Każda ma inny zestaw sklepów,
   więc się uzupełniają, a nie dublują.
3. **Po akceptacji sieci szukaj w jej katalogu** konkretnych sklepów z listy niżej.
   W sieci to zwykle jedno kliknięcie „Join programme" i akceptacja w 1–3 dni.
4. **Osobno zgłoś sklepy z własnym programem** (oznaczone ✅) — tam rejestrujesz się wprost
   na ich stronie.
5. **Identyfikator wpisz do zmiennych środowiskowych w Vercelu**, nie do kodu.
   Nazwy zmiennych są już zdefiniowane w [server-lib/affiliateLinks.js](server-lib/affiliateLinks.js).
6. **Sprawdź, czy link naprawdę jest znakowany** — otwórz kartę figurki, kliknij ofertę
   i zobacz, czy w adresie pojawił się Twój identyfikator.
7. **Zapisz w kalendarzu datę pierwszej wypłaty.** Większość programów kasuje konto
   po 6–12 miesiącach bez ruchu, a razem z nim historię.

> ⚠️ **Nie znakuj linków przed akceptacją.** Kod jest już na to odporny: bez identyfikatora
> w zmiennych zwraca adres nietknięty ([affiliateLinks.js:118](server-lib/affiliateLinks.js#L118)).
> To najczęstszy powód natychmiastowej blokady — programy traktują to jak próbę oszustwa.

---

## Od czego zacząć — pierwsza piątka

Gdybyś miał zrobić tylko pięć zgłoszeń, te dają najwięcej przy Twoim profilu:

| kolejność | co | dlaczego akurat to |
|---|---|---|
| 1 | **eBay Partner Network** | kod już to obsługuje, a rynek wtórny to serce kolekcjonerstwa |
| 2 | **Awin** | największy zasięg w Europie, obsługuje ShareASale, wiele sklepów DE/UK |
| 3 | **Amazon Associates PL + JP** | konwersja poza konkurencją, choć stawki niskie |
| 4 | **Allegro** | jedyny program, gdzie Twój polski ruch jest naturalny |
| 5 | **Play-Asia lub Solaris Japan** | wysokie stawki i dokładnie Twój asortyment |

---

# LISTA 100 POZYCJI

**Legenda statusu:**
✅ otwarty program, rejestrujesz się sam ·
🔷 dostępny przez sieć afiliacyjną ·
✉️ brak otwartego programu, trzeba napisać ·
❌ programu nie ma

> ⚠️ **Stawki są orientacyjne i zmieniają się bez ostrzeżenia.** Traktuj je jako rząd
> wielkości przy ustalaniu kolejności zgłoszeń, nigdy jako podstawę wyliczeń. Jedynym
> źródłem prawdy jest regulamin programu w dniu rejestracji.

## A. Sieci afiliacyjne — **zacznij tutaj** (1–12)

| # | nazwa | status | uwagi |
|---|---|---|---|
| 1 | **Awin** | ✅ | Europa, mocne DE i UK. Wchłonęło ShareASale — jedno konto, dwa katalogi. Bywa opłata wstępna, zwracana po pierwszej wypłacie |
| 2 | **Impact** | ✅ | dużo marek rozrywkowych i subskrypcyjnych, nowoczesny panel |
| 3 | **CJ Affiliate** | ✅ | wielka sieć, popkultura i elektronika. Wymaga sensownego ruchu |
| 4 | **Rakuten Advertising** | ✅ | przez nią podłącza się część sklepów japońskich i amerykańskich |
| 5 | **ShareASale** | ✅ | katalog wewnątrz Awin; tu siedzi m.in. sklep Crunchyroll |
| 6 | **Partnerize** | ✉️ | sieć premium, zwykle za zaproszeniem |
| 7 | **Admitad** | ✅ | silna w Europie Środkowej, przyjazna mniejszym wydawcom |
| 8 | **TradeDoubler** | ✅ | Europa, w tym Polska |
| 9 | **FlexOffers** | ✅ | agreguje programy z innych sieci, niski próg wejścia |
| 10 | **Skimlinks** | ✅ | automatycznie zamienia zwykłe linki w partnerskie — dobre na start, niższe stawki |
| 11 | **Sovrn Commerce** | ✅ | jak wyżej, alternatywa dla Skimlinks |
| 12 | **Webepartners** | ✅ | polska sieć, dobra do sklepów krajowych |

## B. Marketplace i giganci (13–20)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 13 | **Amazon Associates PL** | ✅ | 1–3% | najbliżej Twojego ruchu; ciasteczko tylko 24 h |
| 14 | **Amazon Associates JP** | ✅ | 1–3% | osobna rejestracja, osobne konto — obsługiwane w kodzie |
| 15 | **Amazon Associates DE** | ✅ | 1–3% | dla ruchu niemieckiego (patrz plan językowy) |
| 16 | **eBay Partner Network** | ✅ | 1–4% | **obsługiwane w kodzie**, kluczowe dla rynku wtórnego |
| 17 | **AliExpress Portals** | ✅ | 3–9% | ⚠️ wysokie ryzyko podróbek — używać wyłącznie w sekcji ostrzegawczej |
| 18 | **Rakuten Ichiba (JP)** | ✅ | 1–5% | **obsługiwane w kodzie**, ogromny wybór japoński |
| 19 | **Yahoo! Shopping Japan** | 🔷 ValueCommerce | 1–3% | wymaga japońskiej sieci ValueCommerce |
| 20 | **Etsy** | 🔷 Awin | 4% | rękodzieło, gabloty, akcesoria ekspozycyjne |

## C. Sklepy japońskie i importowe (21–44)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 21 | **AmiAmi** | ❌ | — | największy sklep świata, ale **programu nie ma**. Linkujemy bez prowizji |
| 22 | **HobbyLink Japan** | ✉️ | stały % | kontakt z działem marketingu; miejsce na ID czeka w kodzie |
| 23 | **Solaris Japan** | ✅ | 4–8% | ciasteczko 30 dni, wypłata gotówką lub kredytem sklepowym z bonusem |
| 24 | **Play-Asia** | ✅ | 5–12% | najprzyjaźniejszy panel z całej listy, ogromny wybór figurek |
| 25 | **Tokyo Otaku Mode** | ✅ | od 5% | mocna baza w USA, wyższe ceny bazowe = wyższa prowizja kwotowa |
| 26 | **CDJapan** | ✅ | 3–7% | własny program, wysyłka wprost z Japonii |
| 27 | **Hobby Search (1999.co.jp)** | ✉️ | — | solidny, ale program tylko po kontakcie |
| 28 | **Nin-Nin Game** | ✅ | 3–5% | program bywa okresowo zawieszany; wypłata w punktach sklepowych |
| 29 | **Otaku Republic** | ✅ | 3–6% | dużo doujinshi i figurek niszowych |
| 30 | **HobbyGenki** | ✅ | ok. 5% | mniejszy sklep, przyzwoite stawki |
| 31 | **Plaza Japan** | ✉️ | — | szeroki katalog, kontakt bezpośredni |
| 32 | **Animate Online Shop** | ❌ | — | głównie rynek japoński, brak programu dla zagranicy |
| 33 | **Gamers (Japonia)** | ❌ | — | jak wyżej |
| 34 | **Toranoana** | ❌ | — | doujin i gadżety, brak programu |
| 35 | **Melonbooks** | ❌ | — | jw. |
| 36 | **Volks** | ✉️ | — | Dollfie i figurki premium |
| 37 | **Suruga-ya** | ❌ | — | rynek wtórny, ogromny wybór, brak programu |
| 38 | **Mandarake** | ✉️ | — | największy rynek wtórny; współprace tylko indywidualne |
| 39 | **Lashinbang** | ❌ | — | używane, brak programu |
| 40 | **Jungle (jungle-scs)** | ❌ | — | używane figurki premium |
| 41 | **BookOff Online** | ❌ | — | rynek wtórny |
| 42 | **Yahoo! Auctions Japan** | 🔷 przez pośrednika | — | monetyzujesz przez Buyee lub ZenMarket, nie wprost |
| 43 | **Mercari Japan** | 🔷 przez pośrednika | — | jw. |
| 44 | **Chara-ani** | ✉️ | — | oficjalny sklep z gadżetami anime |

## D. Sklepy zachodnie — USA i Kanada (45–62)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 45 | **Entertainment Earth** | ✅ | do 10% | ogromny dystrybutor, świetne stawki, towar niedostępny gdzie indziej |
| 46 | **Sideshow Collectibles** | ✅ | 5–10% | statuetki premium 300–2000 USD — **jedna konwersja robi miesiąc** |
| 47 | **Crunchyroll Store** | 🔷 ShareASale | 2–5% | dawniej Right Stuf, jeden z największych sklepów zachodnich |
| 48 | **BigBadToyStore** | ✉️ | — | program prywatny, kontakt B2B |
| 49 | **Mighty Jaxx** | ✅ | do 10% | figurki designerskie, mocna marka własna |
| 50 | **Pop Mart** | 🔷 CJ | 8–12% | blind boxy, bardzo wysoka powtarzalność zakupów |
| 51 | **Hot Topic** | 🔷 Impact/CJ | 5–8% | merch anime i popkultura |
| 52 | **BoxLunch** | 🔷 Impact | 5–8% | siostrzana marka Hot Topic |
| 53 | **GameStop** | 🔷 Impact | 1–5% | figurki i gadżety growe |
| 54 | **Barnes & Noble** | 🔷 CJ/Impact | 2–5% | manga i figurki |
| 55 | **Target** | 🔷 Impact | 1–8% | zależnie od kategorii |
| 56 | **Walmart** | 🔷 Impact | 1–4% | szeroki asortyment |
| 57 | **Kidrobot** | ✅ | 5–10% | winylowe figurki designerskie |
| 58 | **Funko** | 🔷 Impact | 5–10% | Pop! — najbardziej masowy segment |
| 59 | **Super7** | ✅ | 5–10% | figurki retro i kolekcjonerskie |
| 60 | **Bluefin Distribution** | ✉️ | — | oficjalny dystrybutor Bandai w USA |
| 61 | **Toynk** | 🔷 sieci | 5–8% | duży asortyment kolekcjonerski |
| 62 | **Dorkside Toys** | ✅ | ok. 5% | mniejszy sklep, przyzwoite warunki |

## E. Europa i Wielka Brytania (63–74)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 63 | **Zavvi** | 🔷 Awin | 3–8% | UK, częste promocje |
| 64 | **Forbidden Planet** | 🔷 Awin | 3–6% | UK, kultowy sklep komiksowy |
| 65 | **Dekai Anime** | 🔷 Awin | 4–8% | UK, wyspecjalizowany w anime |
| 66 | **Archonia** | 🔷 sieci | 4–7% | BE/NL/DE, duży wybór figurek |
| 67 | **Elbenwald** | 🔷 Awin | 5–10% | DE, merch fantasy i anime |
| 68 | **Close Up GmbH** | 🔷 Awin | 5–8% | DE, hurtownia merchu |
| 69 | **Figuya** | ✅ | 5–8% | DE, sklep dedykowany figurkom |
| 70 | **Manga Mafia** | ✅ | 5–8% | DE, manga i figurki |
| 71 | **NipponArt** | ✅ | ok. 5% | DE, import japoński |
| 72 | **Meccha Japan** | ✅ | 3–7% | FR, wysyłka z Japonii, obsługuje całą UE |
| 73 | **Crunchyroll EMEA** | 🔷 sieci | 2–5% | europejski oddział, osobny program |
| 74 | **EMP** | 🔷 Awin | 5–10% | DE/EU, duży sklep merchowy |

## F. Pośrednicy zakupowi — proxy (75–82)

*Model rozliczeń jest tu inny: zwykle stała kwota za nowego klienta albo procent od opłaty
za usługę, nie od ceny towaru.*

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 75 | **Buyee** | ✅ | ok. 5–10 USD/klient | **obsługiwane w kodzie**, największy pośrednik do aukcji JP |
| 76 | **ZenMarket** | ✅ | ok. 5 USD/klient | **obsługiwane w kodzie**, przejrzysty panel |
| 77 | **FromJapan** | ✅ | % od opłaty | dobra obsługa aukcji Yahoo |
| 78 | **Neokyo** | ✅ | % od opłaty | mniejszy, przyjazny europejskim klientom |
| 79 | **Jauce** | ✅ | stała kwota | wyspecjalizowany w Yahoo Auctions |
| 80 | **Superbuy** | ✅ | 3–6% | głównie Chiny, ale obsługuje też Japonię |
| 81 | **Remambo** | ✉️ | — | weteran wśród pośredników |
| 82 | **Tenso** | ✅ | stała kwota | przesyłki, nie zakupy — uzupełnia ofertę |

## G. Producenci i sklepy oficjalne (83–92)

*Rzadko mają programy afiliacyjne — sprzedają przez dystrybutorów. Wartość tej sekcji polega
na czym innym: to **źródła danych i zdjęć**, a przy okazji miejsca, gdzie warto zapytać
o współpracę, gdy baza urośnie.*

| # | nazwa | status | uwagi |
|---|---|---|---|
| 83 | **Good Smile Company** | ✉️ | największy producent; sklep globalny bez otwartego programu |
| 84 | **Kotobukiya** | ✉️ | sklep oficjalny, kontakt bezpośredni |
| 85 | **Bandai Premium (P-Bandai)** | ❌ | wyłącznie sprzedaż własna |
| 86 | **Square Enix Store** | 🔷 sieci | obsługiwany przez zagraniczne sieci |
| 87 | **Alter** | ❌ | sprzedaje wyłącznie przez dystrybutorów |
| 88 | **Max Factory** | ❌ | dystrybucja przez Good Smile |
| 89 | **Kaiyodo** | ❌ | jw., przez dystrybutorów |
| 90 | **MegaHouse** | ❌ | jw. |
| 91 | **FREEing / F:Nex** | ❌ | marki zależne od GSC |
| 92 | **Banpresto** | ❌ | nagrody z automatów, brak sprzedaży detalicznej |

## H. Polska i region (93–96)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 93 | **Allegro** | ✅ | 1–5% | **najważniejszy dla Twojego ruchu.** Polski kolekcjoner kupuje tu odruchowo |
| 94 | **Yatta.pl** | ✉️ | — | polski sklep z figurkami, warto pytać o współpracę |
| 95 | **Kolekcjoner.pl** | ✉️ | — | jw., współpraca prywatna |
| 96 | **Dystrykt Zero** | ✉️ | — | współprace influencerskie |

## I. Okołotematyczne — kolekcjoner i tak to kupuje (97–100)

| # | nazwa | status | stawka orient. | uwagi |
|---|---|---|---|---|
| 97 | **Displate** | ✅ | 10–20% | plakaty metalowe; wysokie stawki, częste kampanie |
| 98 | **Redbubble** | 🔷 Impact | 3–10% | merch drukowany na życzenie |
| 99 | **Crunchyroll (subskrypcja)** | 🔷 sieci | stała kwota | prowizja za nowego subskrybenta |
| 100 | **Akcesoria ekspozycyjne** | 🔷 Amazon/Allegro | 1–5% | gabloty, oświetlenie LED, pokrywy akrylowe — kupowane **razem** z figurką, więc konwertują lepiej, niż się wydaje |

---

## Gdzie wpisać identyfikator, gdy już go masz

Warstwa afiliacyjna jest gotowa i obsługuje **12 platform**
([server-lib/affiliateLinks.js](server-lib/affiliateLinks.js)). Identyfikatory idą
do **zmiennych środowiskowych w Vercelu**, nigdy do kodu:

```
EBAY_AFFILIATE_CAMPAIGN_ID     RAKUTEN_AFFILIATE_ID       AMAZON_ASSOCIATE_TAG
ALIEXPRESS_AFFILIATE_ID        SOLARIS_AFFILIATE_ID       PLAYASIA_AFFILIATE_ID
TOM_AFFILIATE_ID               CDJAPAN_AFFILIATE_ID       EE_AFFILIATE_ID
SIDESHOW_AFFILIATE_ID          BUYEE_AFFILIATE_ID         ZENMARKET_AFFILIATE_ID
```

Osobno działa lista „Gdzie kupić" na karcie figurki
([src/lib/affiliateStores.js](src/lib/affiliateStores.js)) — tam identyfikatory wpisuje się
w stałej `AFFILIATE_IDS` w kodzie, bo linki powstają w przeglądarce.

> Panel administratora pokazuje, które programy są już aktywne — funkcja
> `affiliateStatus()` sprawdza obecność każdej zmiennej.

---

## Zasady, których nie łamiemy

1. **Prowizja nie zmienia kolejności ofert.** To zobowiązanie z regulaminu (pkt 6), powiązane
   wprost z kodem. Sortujemy po cenie, nie po tym, ile zarobimy.
2. **Monetyzujemy konkretne oferty, nie linki do wyszukiwarek.** Link „zobacz wyniki dla Miku"
   jest bezwartościowy dla kolekcjonera i słabo konwertuje.
3. **Nie znakujemy linków przed akceptacją programu.**
4. **AliExpress tylko w sekcji ostrzegawczej.** Wyższa prowizja nie jest warta wysłania
   kolekcjonera po podróbkę — na tym stoi cała wiarygodność serwisu.
5. **Pozycje 18+ poza zakresem** — także te, które mają dobre programy afiliacyjne.
