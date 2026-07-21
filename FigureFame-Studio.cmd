@echo off
chcp 65001 >nul
title FigureFame Studio - lokalny render shortow
cd /d "%~dp0"
echo.
echo   ============================================================
echo     FigureFame Studio
echo   ============================================================
echo.
echo   Ten program renderuje shorty z kolejki na TWOIM komputerze
echo   i publikuje zaakceptowane na Google Drive.
echo.
echo   * Zostaw to okno OTWARTE - dziala w tle.
echo   * Dodawaj/zatwierdzaj shorty w panelu admina na stronie.
echo   * Aby zakonczyc: zamknij to okno.
echo.
echo   ------------------------------------------------------------
echo.
call npm run worker:watch
echo.
echo   [!] Worker sie zatrzymal. Nacisnij dowolny klawisz, aby zamknac.
pause >nul
