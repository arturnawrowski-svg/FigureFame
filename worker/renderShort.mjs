// ============================================================================
// renderShort v3 — wieloscenowy generator shortów z opcjami (Etap 4/5).
// Sceny: INTRO (logo+domena) → REVEAL (wjazd figurki) → DETAILS (float + cena +
// bootleg) → STORES (gdzie kupić: chipsy sklepów) → OUTRO (logo + domena + CTA).
//
// OPCJE (opts): preset (tempo scen + ruch), accent (kolory glow/gradientów),
// music (klucz ścieżki), cta (tekst outro), scale/width/height (rozdzielczość).
//
// Technika: resvg (w sharp) NIE osadza obrazów w SVG, więc figurkę składamy
// kompozycją sharp: [statyczne tło] + [warstwa SVG: glow/tekst/chipsy] + [figurka].
// Wyjście renderujemy natywnie w docelowej rozdzielczości (viewBox skaluje wektory,
// karta figurki składana w wyższej rozdz.) — to NIE upscale. FFmpeg zszywa klatki
// (+ opcjonalna muzyka). Free-first.
// ============================================================================
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { presetOf, accentColors, musicFileOf, videoStrings } from '../src/lib/shortOptions.js';

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

// PRZESTRZEŃ PROJEKTOWA (design space) — cała geometria/typografia liczona w 1080x1920.
// Wyjście przez `scale` (SVG ma viewBox 0 0 W H → resvg rasteryzuje wektory ostro w
// docelowej rozdzielczości; kartę figurki też składamy w wyższej rozdz.). To NIE upscale.
const W = 1080, H = 1920, FPS = 24;
const CARD_W = 760;

// h264/yuv420p wymaga parzystych wymiarów
const even = (n) => Math.round(n / 2) * 2;

// --- easing / matematyka ---
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// przedziałowa animacja: wartość 0→1 między start a start+dur
const seg = (t, start, dur, ease = easeOutCubic) => ease(clamp01((t - start) / dur));

const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(text, max, lines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
    if (out.length === lines - 1 && (cur + '…').length > max) break;
  }
  if (cur) out.push(cur);
  return out.slice(0, lines);
}

// Kolory poziomów ryzyka (etykiety pochodzą ze słownika językowego)
const RISK_COLOR = { low: '#2ecc71', medium: '#f5a623', high: '#ff4757' };
function riskLabel(S, level) {
  return level === 'low' ? S.riskLow : level === 'high' ? S.riskHigh : S.riskMedium;
}

const DEFAULT_STORES = ['AmiAmi', 'HobbyLink Japan', 'Solaris Japan', 'eBay', 'Rakuten', 'Mandarake'];

async function storeNames() {
  try {
    const mod = await import('../src/lib/affiliateStores.js');
    const names = mod.STORE_GROUPS.flatMap((g) => g.stores.map((s) => s.name)).filter((n) => n !== 'AliExpress');
    return names.slice(0, 6);
  } catch {
    return DEFAULT_STORES;
  }
}

// seed 0..1 z tekstu — subtelna wariacja między figurkami (żeby shorty nie były identyczne)
function seed01(str) {
  let h = 0;
  for (let i = 0; i < String(str || '').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return (Math.abs(h) % 1000) / 1000;
}

// --- stan animacji dla czasu t (T = znaczniki scen, motion = intensywność, phase = faza bujania) ---
function computeState(t, aspect, T, motion, cta, phase = 0) {
  const figH0 = CARD_W / aspect;

  // domyślnie figurka niewidoczna (intro/po outro)
  const fig = { show: false, w: CARD_W, h: figH0, left: 0, top: 0, cy: H * 0.42 };

  const targetTop = 320;
  if (t >= T.introEnd && t < T.storesEnd + 0.8) {
    let scale = 1, top = targetTop;

    // REVEAL: wjazd z dołu + skala
    const pIn = seg(t, T.introEnd, 1.7);
    // STORES: zmniejszenie + w górę
    const pStore = t >= T.detailsEnd ? seg(t, T.detailsEnd, 1.0, easeInOut) : 0;
    // OUTRO: zjazd w dół
    const pOut = t >= T.storesEnd ? seg(t, T.storesEnd, 0.7, easeInCubic) : 0;

    const bob = t >= T.revealEnd && t < T.detailsEnd ? Math.sin((t - T.revealEnd) * 1.15 + phase) * 14 * motion : 0;
    const breathe = 1 + (t >= T.revealEnd && t < T.detailsEnd ? Math.sin((t - T.revealEnd) * 0.9 + phase) * 0.012 * motion : 0);

    scale = lerp(0.82, 1.0, pIn) * breathe;
    scale = lerp(scale, 0.66, pStore);
    top = lerp(1980, targetTop, pIn) + bob;
    top = lerp(top, 210, pStore);
    top = lerp(top, 2100, pOut);

    const w = CARD_W * scale;
    const h = w / aspect;
    fig.show = true;
    fig.w = Math.round(w);
    fig.h = Math.round(h);
    fig.left = Math.round((W - w) / 2);
    fig.top = Math.round(top);
    fig.cy = fig.top + fig.h / 2;
  }

  // BRAND — duże, wyśrodkowane (intro + outro)
  const brandBig = { show: false, opacity: 0, scale: 1, cy: H * 0.42, showDomain: true, cta: null };
  if (t < T.introEnd) {
    const a = seg(t, 0.15, 0.7);
    const s = lerp(0.86, 1, seg(t, 0, 1.1));
    const outFade = 1 - seg(t, T.introEnd - 0.6, 0.6, easeInCubic);
    brandBig.show = true; brandBig.opacity = a * outFade; brandBig.scale = s; brandBig.cy = H * 0.44;
  } else if (t >= T.storesEnd + 0.35) {
    const a = seg(t, T.storesEnd + 0.35, 0.7);
    const s = lerp(0.9, 1, seg(t, T.storesEnd + 0.35, 0.9));
    brandBig.show = true; brandBig.opacity = a; brandBig.scale = s; brandBig.cy = H * 0.42;
    brandBig.cta = cta;
  }

  // BRAND — małe, lewy górny róg (sceny główne)
  const brandSmall = { opacity: 0 };
  if (t >= T.introEnd && t < T.storesEnd + 0.2) {
    brandSmall.opacity = seg(t, T.introEnd + 0.1, 0.5) * (1 - seg(t, T.storesEnd - 0.3, 0.5, easeInCubic));
  }

  // NAZWA + SERIA (reveal → details), znika w stores
  const info = { opacity: 0, dx: 0 };
  if (t >= T.introEnd + 0.5 && t < T.detailsEnd + 0.4) {
    const a = seg(t, T.introEnd + 0.5, 0.7);
    const fade = 1 - seg(t, T.detailsEnd - 0.2, 0.5, easeInCubic);
    info.opacity = a * fade;
    info.dx = lerp(-55, 0, a);
  }

  // CENA + BOOTLEG (details), znika w stores
  const price = { opacity: 0, dy: 0 };
  if (t >= T.revealEnd + 0.4 && t < T.detailsEnd + 0.4) {
    const a = seg(t, T.revealEnd + 0.4, 0.7);
    const fade = 1 - seg(t, T.detailsEnd - 0.2, 0.5, easeInCubic);
    price.opacity = a * fade;
    price.dy = lerp(40, 0, a);
  }

  // STORES: nagłówek + chipsy (stagger) + podpis
  const stores = { headingOpacity: 0, sub: 0, chips: [] };
  if (t >= T.detailsEnd + 0.2 && t < T.storesEnd + 0.3) {
    const fadeOut = 1 - seg(t, T.storesEnd - 0.2, 0.5, easeInCubic);
    stores.headingOpacity = seg(t, T.detailsEnd + 0.2, 0.5) * fadeOut;
    stores.sub = seg(t, T.detailsEnd + 0.9, 0.6) * fadeOut;
    for (let i = 0; i < 6; i++) {
      const a = seg(t, T.detailsEnd + 0.5 + i * 0.18, 0.45);
      stores.chips.push({ opacity: a * fadeOut, dy: lerp(26, 0, a) });
    }
  }

  return { fig, brandBig, brandSmall, info, price, stores };
}

// --- warstwa SVG (przezroczysta): glow + tekst + chipsy + brand ---
// OW/OH = wyjściowe piksele; viewBox trzyma współrzędne w przestrzeni projektowej W x H.
// A = [color0, color1] akcentu.
function overlaySvg(st, data, OW, OH, A) {
  const [A0, A1] = A;
  const P = [];
  P.push(`<svg width="${OW}" height="${OH}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
 <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${A0}"/><stop offset="1" stop-color="${A1}"/></linearGradient>
 <radialGradient id="spot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${A0}" stop-opacity="0.42"/><stop offset="0.55" stop-color="${A0}" stop-opacity="0.10"/><stop offset="1" stop-color="${A0}" stop-opacity="0"/></radialGradient>
 <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0c10" stop-opacity="0"/><stop offset="1" stop-color="#0b0c10" stop-opacity="0.92"/></linearGradient>
</defs>`);

  // spotlight za figurką
  if (st.fig.show) {
    const r = Math.max(st.fig.w, 520) * 0.9;
    P.push(`<circle cx="${W / 2}" cy="${Math.round(st.fig.cy)}" r="${Math.round(r)}" fill="url(#spot)"/>`);
  }

  // dolny fade pod tekst
  P.push(`<rect x="0" y="1180" width="${W}" height="740" fill="url(#fade)"/>`);

  // małe logo (góra)
  if (st.brandSmall.opacity > 0.01) {
    P.push(`<g opacity="${st.brandSmall.opacity.toFixed(3)}">
      <text x="56" y="118" font-family="Arial, sans-serif" font-size="40" font-weight="bold" letter-spacing="-1"><tspan fill="#ece8e0">FIGURE</tspan><tspan fill="url(#acc)">FAME</tspan></text>
      <text x="58" y="158" font-family="Arial, sans-serif" font-size="22" fill="#8f897c" letter-spacing="2">figurefame.com</text>
    </g>`);
  }

  // NAZWA + SERIA
  if (st.info.opacity > 0.01) {
    const lines = data.nameLines.map((ln, i) => `<tspan x="0" dy="${i === 0 ? 0 : 78}">${xml(ln)}</tspan>`).join('');
    P.push(`<g opacity="${st.info.opacity.toFixed(3)}" transform="translate(${(56 + st.info.dx).toFixed(1)},1420)">
      <text x="0" y="0" font-family="Arial, sans-serif" font-size="70" font-weight="bold" fill="#ffffff" letter-spacing="-1">${lines}</text>
      <text x="2" y="${60 + (data.nameLines.length - 1) * 78}" font-family="Arial, sans-serif" font-size="32" fill="#b9b3a8">${xml(data.series)}</text>
    </g>`);
  }

  // CENA + BOOTLEG
  if (st.price.opacity > 0.01) {
    const [rc, rl] = data.risk;
    const y = 1620 + st.price.dy;
    P.push(`<g opacity="${st.price.opacity.toFixed(3)}">
      <rect x="56" y="${y - 40}" width="${64 + rl.length * 15}" height="50" rx="25" fill="${rc}" fill-opacity="0.16" stroke="${rc}" stroke-opacity="0.5"/>
      <circle cx="86" cy="${y - 15}" r="7" fill="${rc}"/>
      <text x="106" y="${y - 6}" font-family="Arial, sans-serif" font-size="26" fill="${rc}">${xml(rl)}</text>
      <text x="58" y="${y + 66}" font-family="Arial, sans-serif" font-size="28" fill="#8f897c">${xml(data.priceLabel)}</text>
      <text x="56" y="${y + 116}" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="url(#acc)">${xml(data.price)}</text>
    </g>`);
  }

  // STORES: nagłówek + chipsy
  if (st.stores.headingOpacity > 0.01) {
    P.push(`<g opacity="${st.stores.headingOpacity.toFixed(3)}"><text x="${W / 2}" y="1130" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="url(#acc)" letter-spacing="1">${xml(data.where)}</text></g>`);
  }
  const chipW = 470, chipH = 84, gapX = 40, gapY = 24;
  const cols = 2, startX = (W - (cols * chipW + gapX)) / 2, startY = 1220;
  st.stores.chips.forEach((c, i) => {
    if (c.opacity <= 0.01) return;
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (chipW + gapX);
    const yy = startY + row * (chipH + gapY) + c.dy;
    P.push(`<g opacity="${c.opacity.toFixed(3)}">
      <rect x="${x.toFixed(0)}" y="${yy.toFixed(0)}" width="${chipW}" height="${chipH}" rx="18" fill="#16181f" stroke="#3a3f4d"/>
      <circle cx="${x + 42}" cy="${yy + chipH / 2}" r="9" fill="url(#acc)"/>
      <text x="${x + 74}" y="${yy + chipH / 2 + 12}" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ece8e0">${xml(data.stores[i] || '')}</text>
    </g>`);
  });
  if (st.stores.sub > 0.01) {
    P.push(`<g opacity="${st.stores.sub.toFixed(3)}"><text x="${W / 2}" y="1640" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#b9b3a8">${xml(data.affiliate)}</text></g>`);
  }

  // BRAND duże (intro/outro)
  if (st.brandBig.show && st.brandBig.opacity > 0.01) {
    const cy = st.brandBig.cy;
    P.push(`<g opacity="${st.brandBig.opacity.toFixed(3)}" transform="translate(${W / 2},${cy}) scale(${st.brandBig.scale.toFixed(3)})">
      <text x="0" y="0" text-anchor="middle" font-family="Arial, sans-serif" font-size="104" font-weight="bold" letter-spacing="-2"><tspan fill="#ece8e0">FIGURE</tspan><tspan fill="url(#acc)">FAME</tspan></text>
      <text x="0" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#b9b3a8" letter-spacing="4">figurefame.com</text>
      ${st.brandBig.cta ? `<rect x="-260" y="120" width="520" height="76" rx="18" fill="url(#acc)"/><text x="0" y="171" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#0b0c10">${xml(st.brandBig.cta)}</text>` : ''}
    </g>`);
  }

  P.push('</svg>');
  return P.join('\n');
}

function baseBgSvg(OW, OH, A0) {
  return `<svg width="${OW}" height="${OH}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1e25"/><stop offset="1" stop-color="#0a0b0e"/></linearGradient>
 <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="${A0}" fill-opacity="0.08"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/></svg>`;
}

async function makeCard(figBuffer, scale) {
  // Kartę składamy w rozdzielczości docelowej (CARD_W * scale), żeby po zmniejszaniu
  // klatka-po-klatce figurka pozostała ostra przy wyższych rozdzielczościach wyjściowych.
  const resized = await sharp(figBuffer).resize({ width: even(CARD_W * scale) }).toBuffer();
  const meta = await sharp(resized).metadata();
  const rx = Math.round(26 * scale);
  const mask = Buffer.from(`<svg width="${meta.width}" height="${meta.height}"><rect width="${meta.width}" height="${meta.height}" rx="${rx}" ry="${rx}" fill="#fff"/></svg>`);
  const rounded = await sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return { buffer: rounded, aspect: meta.width / meta.height };
}

async function loadImageBuffer(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Nie pobrano zdjęcia (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return await readFile(src);
}

async function hasFile(p) { try { await access(p); return true; } catch { return false; } }

// Rozwiązanie ścieżki muzyki: musicPath > klucz music > (legacy) assets/music.mp3 > cisza
function resolveMusicPath(music, musicPath) {
  if (musicPath) return musicPath;
  if (music === 'none') return null;
  const file = music ? musicFileOf(music) : null;
  if (file) return join(__dirname, 'assets', 'music', file);
  return join(__dirname, 'assets', 'music.mp3'); // legacy fallback (jeśli istnieje)
}

export async function renderShort(figure, opts = {}) {
  const { imageSrc, out, musicPath, scale, width, height, preset, accent, music, cta, lang } = opts;
  const stamp = Date.now();
  const framesDir = join(tmpdir(), `ff_frames_${stamp}`);
  await mkdir(framesDir, { recursive: true });

  // OPCJE → parametry renderu
  const pr = presetOf(preset);
  const sd = seed01(figure.name);                 // wariacja per figurka
  const T = pr.T;
  const motion = pr.motion * (0.9 + sd * 0.3);     // ±ruch zależny od figurki
  const phase = sd * Math.PI * 2;                  // przesunięcie fazy bujania
  const A = accentColors(accent || 'auto', figure.name);
  const S = videoStrings(lang); // napisy w wybranym języku
  const ctaText = (cta && cta.trim()) ? cta.trim() : S.ctaDefault;

  // Rozdzielczość wyjściowa: `scale` wprost, albo z `width`/`height` (bierzemy większy współczynnik).
  let sc = scale || 1;
  if (width) sc = Math.max(sc, width / W);
  if (height) sc = Math.max(sc, height / H);
  sc = Math.max(1, Math.min(sc, 2)); // klamra: 1080p..2160p (4K); wyżej nie ma sensu z tego źródła
  const OW = even(W * sc), OH = even(H * sc);

  try {
    const staticBase = await sharp(Buffer.from(baseBgSvg(OW, OH, A[0]))).png().toBuffer();
    const { buffer: cardBuf, aspect } = await makeCard(await loadImageBuffer(imageSrc), sc);

    const data = {
      nameLines: wrap(figure.name, 18, 2),
      series: [figure.series, figure.manufacturer].filter(Boolean).join(' · '),
      price: figure.price || S.priceFallback,
      risk: [RISK_COLOR[figure.riskLevel] || RISK_COLOR.medium, riskLabel(S, figure.riskLevel)],
      stores: await storeNames(),
      where: S.where,
      priceLabel: S.priceLabel,
      affiliate: S.affiliate,
    };

    const total = Math.round(T.end * FPS);
    for (let i = 0; i < total; i++) {
      const t = i / FPS;
      const st = computeState(t, aspect, T, motion, ctaText, phase);

      const layers = [{ input: Buffer.from(overlaySvg(st, data, OW, OH, A)), top: 0, left: 0 }];
      // Kolejność: base → overlay(glow+tekst) → figura. Nachodzeniu zapobiega layout
      // (figura w centrum, tekst dół/góra). Współrzędne z computeState są w przestrzeni
      // projektowej (W x H) — mnożymy przez `sc` do pikseli wyjściowych.
      const composite = [];
      const figLayer = st.fig.show
        ? [{
            input: await sharp(cardBuf).resize({ width: even(st.fig.w * sc) }).toBuffer(),
            top: Math.round(st.fig.top * sc),
            left: Math.round(st.fig.left * sc),
          }]
        : [];
      composite.push(...layers, ...figLayer);

      const frame = await sharp(staticBase).composite(composite).png().toBuffer();
      await writeFile(join(framesDir, `f_${String(i + 1).padStart(5, '0')}.png`), frame);
    }

    // FFmpeg: klatki (+ muzyka jeśli jest) → MP4
    const musicFile = resolveMusicPath(music, musicPath);
    const withMusic = musicFile && (await hasFile(musicFile));
    const args = ['-y', '-framerate', String(FPS), '-i', join(framesDir, 'f_%05d.png')];
    if (withMusic) args.push('-i', musicFile);
    args.push(
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast',
      '-movflags', '+faststart', '-r', String(FPS), '-t', String(T.end)
    );
    if (withMusic) {
      args.push('-filter_complex', `[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=${(T.end - 1.2).toFixed(1)}:d=1.2,volume=0.8[a]`,
        '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-shortest');
    }
    args.push(out);
    await execFileP(ffmpegInstaller.path, args);

    return out;
  } finally {
    await rm(framesDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Uruchomienie bezpośrednie = demo (do testu).
// Użycie: node renderShort.mjs [out.mp4] [obraz] [scale] [preset] [accent] [music] [lang]
if (process.argv[1]?.endsWith('renderShort.mjs')) {
  const out = process.argv[2] || './short-demo.mp4';
  const img = process.argv[3] || './public/images/miku_figure.png';
  const scale = process.argv[4] ? Number(process.argv[4]) : 1;
  const preset = process.argv[5] || 'klasyczny';
  const accent = process.argv[6] || 'bursztyn';
  const music = process.argv[7] || 'none';
  const lang = process.argv[8] || 'pl';
  renderShort(
    { name: 'Hatsune Miku', series: 'Vocaloid', manufacturer: 'Good Smile Company', price: '~ 15 000 JPY', riskLevel: 'high' },
    { imageSrc: img, out, scale, preset, accent, music, lang }
  ).then((p) => console.log('OK short:', p)).catch((e) => { console.error('BŁĄD:', e.message); process.exit(1); });
}
