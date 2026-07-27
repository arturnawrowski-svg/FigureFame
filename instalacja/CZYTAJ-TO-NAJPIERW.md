# FigureFame Studio — instalacja pomocnika

**Po co to jest?** Część pracy FigureFame musi wykonać zwykły komputer, bo
w internecie się jej nie da: pobieranie danych z katalogów figurek (blokują
serwery, przepuszczają przeglądarki) oraz renderowanie filmów.

Ten „pomocnik" nazywa się **FigureFame Studio**. Po instalacji **włącza się sam**
i pracuje w tle — nie trzeba już klikać w żadne pliki.

---

## Windows

1. Wejdź do folderu `instalacja`
2. Kliknij dwukrotnie **`Zainstaluj-Studio-WINDOWS.cmd`**
3. Naciśnij dowolny klawisz, gdy poprosi
4. Gotowe — zrestartuj komputer albo uruchom raz `FigureFame-Studio.cmd`

## Mac

1. Wejdź do folderu `instalacja`
2. Kliknij **prawym przyciskiem** na `Zainstaluj-Studio-MAC.command` → **Otwórz**
   → jeszcze raz **Otwórz**
   *(macOS pyta tak przy plikach spoza App Store — to normalne)*
3. Gotowe — Studio wystartuje samo przy następnym zalogowaniu

> Mac wymaga zainstalowanego **Node.js** — jeśli go nie ma, instalator o tym
> powie i wskaże stronę do pobrania.

---

## Skąd wiem, że działa?

Zaloguj się w panelu moderatora. Na górze zobaczysz:

- 🟢 **FigureFame Studio aktywne** — wszystko gra, dane pobiera Twój komputer
- 🔴 **FigureFame Studio wyłączone** — zlecenia czekają w kolejce

Przy czerwonym stanie jest przycisk **„▶ Uruchom Studio"** — działa, jeśli
wcześniej przeszedł ten instalator.

---

## iPhone, iPad, telefon z Androidem

**Na telefonie i tablecie Studio nie może działać** — to systemy, które nie
uruchamiają takich programów w tle. Nie jest to nasze ograniczenie, tylko zasada
tych urządzeń.

Ale strona działa na nich normalnie i można **zlecać** zadania:

1. Klikasz „Szukaj Danych" na telefonie → zlecenie ląduje w kolejce
2. Dowolny komputer w rodzinie z włączonym Studiem je wykonuje
3. Wracasz na telefon, klikasz ponownie → dane są

Czyli wystarczy, żeby **jeden** komputer w domu miał Studio włączone.

---

## Jak to wyłączyć?

**Windows:** usuń skrót `FigureFame Studio` z folderu Autostart
(`Win+R` → wpisz `shell:startup` → Enter)

**Mac:** w Terminalu:
```
launchctl unload ~/Library/LaunchAgents/com.figurefame.studio.plist
```

---

## Czy to bezpieczne?

- Instaluje się **tylko na Twoim koncie użytkownika** — bez hasła administratora
  i bez zmian w systemie
- Nie otwiera żadnych portów ani dostępu z zewnątrz
- Łączy się wyłącznie z Twoją bazą FigureFame i z katalogami figurek
- Cały kod jest w tym repozytorium i możesz go przejrzeć

Strona **nie potrafi** sama uruchomić programu na komputerze — dlatego potrzebny
jest ten jednorazowy instalator. Tak samo działają linki Zooma czy Spotify.
