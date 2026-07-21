// ============================================================================
// gdrive-auth — jednorazowe pobranie refresh tokenu Google Drive (Etap 5).
// Odpala zgodę OAuth w przeglądarce (loopback), wymienia kod na tokeny i ZAPISUJE
// GOOGLE_DRIVE_REFRESH_TOKEN do .env.local. Zakres: drive.file (tylko własne pliki).
//
// Wymaga w .env.local: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET.
// Uruchom: npm run gdrive-auth   (albo: node scripts/gdrive-auth.mjs)
// Zaloguj się na konto z 5 TB i kliknij „Zezwól". Reszta dzieje się sama.
// ============================================================================
import http from "node:http";
import { exec } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
dotenv.config({ path: envPath });

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Brak GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET w .env.local");
  process.exit(1);
}

function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function saveRefreshToken(token) {
  let env = await readFile(envPath, "utf8");
  if (/^#?\s*GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m.test(env)) {
    env = env.replace(/^#?\s*GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m, `GOOGLE_DRIVE_REFRESH_TOKEN=${token}`);
  } else {
    env += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${token}\n`;
  }
  await writeFile(envPath, env);
}

let redirectUri;
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/?")) { res.writeHead(204); res.end(); return; }
  const u = new URL(req.url, "http://127.0.0.1");
  const code = u.searchParams.get("code");
  const err = u.searchParams.get("error");
  if (err) { res.writeHead(400); res.end("Odmowa/blad: " + err); console.error("BŁĄD zgody:", err); server.close(); process.exit(1); }
  if (!code) { res.writeHead(400); res.end("Brak code"); return; }
  try {
    const body = new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri, grant_type: "authorization_code",
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    const data = await r.json();
    if (!data.refresh_token) throw new Error("Brak refresh_token w odpowiedzi: " + JSON.stringify(data));
    await saveRefreshToken(data.refresh_token);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>✅ Gotowe! Refresh token zapisany do .env.local.</h2><p>Możesz zamknąć tę kartę.</p>");
    console.log("✓ refresh_token zapisany do .env.local");
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  } catch (e) {
    res.writeHead(500); res.end("Błąd: " + e.message);
    console.error("BŁĄD:", e.message); server.close(); process.exit(1);
  }
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;
  redirectUri = `http://127.0.0.1:${port}`;
  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: CLIENT_ID, redirect_uri: redirectUri, response_type: "code",
    scope: SCOPE, access_type: "offline", prompt: "consent",
  });
  console.log("\n== Zgoda Google Drive ==");
  console.log("Otwieram przeglądarkę. Jeśli się nie otworzy, wklej ten link ręcznie:\n");
  console.log(authUrl + "\n");
  console.log("Zaloguj się na konto z 5 TB, kliknij „Zezwól”. Token zapisze się sam.");
  openBrowser(authUrl);
});
