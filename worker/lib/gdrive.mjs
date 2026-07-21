// ============================================================================
// gdrive — minimalny klient Google Drive API dla workera publikacji (Etap 5).
// OAuth (refresh token) → access token → folder „FigureFame Shorts" → upload MP4.
// Zakres drive.file: apka widzi/zarządza TYLKO plikami, które sama utworzyła.
// Bez zewnętrznych zależności (fetch + Buffer). Free-first.
// ============================================================================

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_NAME = "FigureFame Shorts";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function driveConfigured() {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}

export async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json();
  if (!j.access_token) throw new Error("Drive: nie uzyskano access_token: " + JSON.stringify(j));
  return j.access_token;
}

// Znajdź folder utworzony przez apkę albo utwórz nowy; zwróć jego id.
export async function ensureFolder(token) {
  const q = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const s = await fetch(`${FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
    headers: { Authorization: "Bearer " + token },
  });
  const sj = await s.json();
  if (sj.files && sj.files.length) return sj.files[0].id;

  const c = await fetch(FILES_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  const cj = await c.json();
  if (!cj.id) throw new Error("Drive: nie utworzono folderu: " + JSON.stringify(cj));
  return cj.id;
}

// Upload MP4 (multipart: metadane + dane) do folderu. Zwraca { id, link }.
export async function uploadMp4(token, folderId, name, buffer) {
  const meta = { name, parents: [folderId] };
  const boundary = "ff_" + Date.now();
  const pre = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`;
  const post = `\r\n--${boundary}--`;
  const payload = Buffer.concat([Buffer.from(pre, "utf8"), buffer, Buffer.from(post, "utf8")]);

  const r = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: payload,
  });
  const j = await r.json();
  if (!j.id) throw new Error("Drive: upload nieudany: " + JSON.stringify(j));
  return { id: j.id, link: j.webViewLink };
}

// Usuń plik z Drive (np. rollback). Best-effort.
export async function deleteFile(token, fileId) {
  await fetch(`${FILES_URL}/${fileId}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
}
