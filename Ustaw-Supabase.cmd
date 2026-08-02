@echo off
chcp 65001 >nul
title FigureFame - podlaczenie Supabase
cd /d "%~dp0"

rem ===========================================================================
rem  KLIKNIJ TEN PLIK DWA RAZY.
rem
rem  Wlasciwa robota siedzi w scripts\ustaw-supabase.ps1. Ten plik istnieje
rem  po to, zeby dalo sie ja uruchomic klikiem: Windows domyslnie blokuje
rem  skrypty PowerShella, a "-ExecutionPolicy Bypass" omija te blokade
rem  TYLKO dla tego jednego uruchomienia. Ustawien systemu nie rusza.
rem
rem  ⚠️ PAUSE NA KONCU JEST OBOWIAZKOWE I BEZWARUNKOWE.
rem  Pierwsza wersja pauzowala tylko tam, gdzie skrypt sam przewidzial blad.
rem  Gdy polecial blad NIEPRZEWIDZIANY, okno znikalo razem z komunikatem
rem  i nie bylo czego przeczytac ani przeslac dalej. Pauza stoi wiec tutaj,
rem  poza skryptem - zadna awaria w srodku jej nie ominie.
rem ===========================================================================

if not exist "scripts\ustaw-supabase.ps1" (
  echo.
  echo   [BLAD] Nie znalazlem pliku scripts\ustaw-supabase.ps1
  echo   Uruchom ten plik z katalogu projektu FigureFame.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ustaw-supabase.ps1"
set KOD=%ERRORLEVEL%

echo.
echo   ------------------------------------------------------------
if "%KOD%"=="0" (
  echo   Skrypt zakonczyl sie bez bledow.
) else (
  echo   Skrypt zakonczyl sie bledem ^(kod %KOD%^).
  echo.
  echo   Caly przebieg zapisal sie do pliku:
  echo      %~dp0ustaw-supabase-log.txt
  echo   Przeslij ten plik - jest w nim dokladny komunikat.
)
echo   ------------------------------------------------------------
echo.
pause
