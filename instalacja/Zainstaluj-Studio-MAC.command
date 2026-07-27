#!/bin/bash
# ============================================================================
# FigureFame Studio — instalacja (macOS)
#
# Uruchom JEDEN RAZ: kliknij dwukrotnie ten plik w Finderze.
# Gdy macOS powie, że plik pochodzi od niezidentyfikowanego dewelopera:
#   kliknij prawym → Otwórz → Otwórz.
#
# Co robi:
#   1) Studio włącza się samo po zalogowaniu (usługa launchd użytkownika)
#   2) Przycisk „Uruchom Studio" na stronie zaczyna działać (figurefame://)
#
# Wszystko instaluje się TYLKO na koncie bieżącego użytkownika —
# bez hasła administratora, bez zmian w systemie.
# ============================================================================
set -e
cd "$(dirname "$0")/.."
PROJEKT="$(pwd)"

echo
echo "  ============================================================"
echo "    FigureFame Studio — instalacja (macOS)"
echo "  ============================================================"
echo
echo "  Folder projektu: $PROJEKT"
echo

# --- Sprawdzenie Node.js -----------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "  [!] Nie znaleziono Node.js."
  echo "      Zainstaluj go ze strony https://nodejs.org (wersja LTS),"
  echo "      potem uruchom ten instalator ponownie."
  echo
  read -n 1 -s -r -p "  Naciśnij dowolny klawisz, aby zamknąć..."
  exit 1
fi

# --- 1. Skrypt startowy ------------------------------------------------------
echo "  [1/3] Przygotowuję skrypt uruchamiający..."
cat > "$PROJEKT/FigureFame-Studio.command" <<EOF
#!/bin/bash
# Uruchamia oba pomocniki FigureFame (dane figurek + renderowanie filmów).
cd "$PROJEKT"
npm run lookup-worker:watch &
npm run worker:watch
EOF
chmod +x "$PROJEKT/FigureFame-Studio.command"
echo "        OK"

# --- 2. Automatyczne uruchamianie (launchd) ----------------------------------
echo "  [2/3] Ustawiam automatyczne uruchamianie po zalogowaniu..."
mkdir -p "$HOME/Library/LaunchAgents"
PLIST="$HOME/Library/LaunchAgents/com.figurefame.studio.plist"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.figurefame.studio</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$PROJEKT/FigureFame-Studio.command</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>WorkingDirectory</key><string>$PROJEKT</string>
  <key>StandardOutPath</key><string>$PROJEKT/studio.log</string>
  <key>StandardErrorPath</key><string>$PROJEKT/studio.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST" 2>/dev/null || true
echo "        OK — Studio wystartuje po każdym zalogowaniu"

# --- 3. Protokół figurefame:// ----------------------------------------------
echo "  [3/3] Rejestruję przycisk „Uruchom Studio\" ze strony..."
APP="$HOME/Applications/FigureFame Studio.app"
mkdir -p "$APP/Contents/MacOS"

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>FigureFame Studio</string>
  <key>CFBundleIdentifier</key><string>com.figurefame.studio</string>
  <key>CFBundleExecutable</key><string>start</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key><string>FigureFame</string>
      <key>CFBundleURLSchemes</key><array><string>figurefame</string></array>
    </dict>
  </array>
</dict>
</plist>
EOF

cat > "$APP/Contents/MacOS/start" <<EOF
#!/bin/bash
open -a Terminal "$PROJEKT/FigureFame-Studio.command"
EOF
chmod +x "$APP/Contents/MacOS/start"

# Odświeżenie rejestru usług, żeby system zauważył nowy protokół.
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP" 2>/dev/null || true
echo "        OK"

echo
echo "  ------------------------------------------------------------"
echo "  GOTOWE."
echo
echo "  Od teraz:"
echo "    • Studio włącza się samo po zalogowaniu"
echo "    • w panelu na stronie zobaczysz zielone „Studio aktywne\""
echo
echo "  Aby wyłączyć automatyczny start:"
echo "    launchctl unload ~/Library/LaunchAgents/com.figurefame.studio.plist"
echo
read -n 1 -s -r -p "  Naciśnij dowolny klawisz, aby zamknąć..."
echo
