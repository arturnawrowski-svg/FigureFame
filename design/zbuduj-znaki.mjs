// ============================================================================
// Wycinanie znaków FigureFame z arkusza koncepcyjnego.
// ----------------------------------------------------------------------------
// Uruchomienie:  node design/zbuduj-znaki.mjs
//
// Źródłem jest JEDEN plik — design/logo_FigureFame.png (arkusz „CONCEPT 2B").
// Wszystko w public/ powstaje z niego automatycznie, więc po podmianie arkusza
// wystarczy odpalić skrypt ponownie zamiast dłubać w każdej ikonie osobno.
//
// Dlaczego to nie jest zwykłe „wytnij i zapisz":
// arkusz jest płaskim obrazkiem z wtopionym tłem, a w nagłówku i na ikonach
// tło musi być przezroczyste. Każdy wariant wymaga innej metody, bo ma inne tło
// (krem kontra czerń) — stąd dwie funkcje niżej.
// ============================================================================

import sharp from "sharp";
import { statSync } from "node:fs";

const ARKUSZ = "design/logo_FigureFame.png";
const TLO_APLIKACJI = { r: 14, g: 15, b: 19, alpha: 1 }; // = background_color w manifeście

// Współrzędne wyznaczone pomiarowo na arkuszu 1448×1086 (nie na oko):
// bryłę gabloty znajduje się po ciemnym cokole, kafelki ikon po ciemnych pasach.
const KADRY = {
  gablotaJasna: { left: 241, top: 93, width: 227, height: 307 },
  gablotaCiemna: { left: 238, top: 438, width: 235, height: 320 },
  emblemat: { left: 800, top: 811, width: 122, height: 126 },
  nazwa: { left: 630, top: 505, width: 680, height: 90 },
  podtytul: { left: 630, top: 610, width: 560, height: 40 },
};

// Wygaszenie przezroczystości przy krawędziach kadru.
// Bez tego poświata ucięta granicą kadru rysuje widoczny prostokąt wokół znaku
// — szew widać dopiero na tle innym niż to z arkusza, np. w og-image.
function wygaszenieBrzegu(x, y, W, H, margines) {
  const d = Math.min(x, y, W - 1 - x, H - 1 - y);
  if (d >= margines) return 1;
  const t = d / margines;
  return t * t * (3 - 2 * t);
}

// Tło kremowe (wersja jasna): odejmujemy je i prostujemy kolor na półprzezroczystych
// brzegach — inaczej wokół znaku zostaje jasna obwódka. Szkło robi się przy okazji
// faktycznie przezroczyste, bo w arkuszu prześwituje przez nie to samo tło.
async function zdejmijKrem(kadr, { bg = [247, 245, 242], lo = 8, hi = 46, margines = 10 } = {}) {
  const { data, info } = await sharp(ARKUSZ).extract(kadr).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const o = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const s = p * C;
      const d4 = p * 4;
      const [r, g, b] = [data[s], data[s + 1], data[s + 2]];
      const odleglosc = Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));

      let a = Math.min(1, Math.max(0, (odleglosc - lo) / (hi - lo)));
      a = a * a * (3 - 2 * a);
      a *= wygaszenieBrzegu(x, y, W, H, margines);
      if (a < 0.004) continue;

      for (let c = 0; c < 3; c++) {
        const v = ([r, g, b][c] - bg[c] * (1 - a)) / a;
        o[d4 + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
      }
      o[d4 + 3] = Math.round(a * 255);
    }
  }
  return sharp(o, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

// Tło czarne (wersja ciemna, emblemat, napisy): obraz jest już „wymnożony przez
// czerń", więc przezroczystość bierzemy wprost z jasności piksela.
// Próg MUSI być powyżej jasności tła — zmierzona na obwodzie kadru wynosi ~26,
// przy niższym progu tło zostaje półprzezroczyste i rysuje prostokątny szew.
async function zdejmijCzern(kadr, { prog = 30, zakres = 50, margines = 14, kolo = false } = {}) {
  const { data, info } = await sharp(ARKUSZ).extract(kadr).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const o = Buffer.alloc(W * H * 4);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const promien = Math.min(W, H) / 2 - 4; // z zapasem do środka, żeby nie złapać tła zza koła

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (kolo && Math.hypot(x - cx, y - cy) > promien) continue;
      const p = y * W + x;
      const s = p * C;
      const d4 = p * 4;
      const [r, g, b] = [data[s], data[s + 1], data[s + 2]];
      const jasnosc = 0.299 * r + 0.587 * g + 0.114 * b;

      let a = Math.min(1, Math.max(0, (jasnosc - prog) / zakres));
      if (!kolo) a *= wygaszenieBrzegu(x, y, W, H, margines);
      if (a < 0.004) continue;

      o[d4] = r;
      o[d4 + 1] = g;
      o[d4 + 2] = b;
      o[d4 + 3] = Math.round(a * 255);
    }
  }
  return sharp(o, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

function waga(plik) {
  return Math.round(statSync(plik).size / 1024) + " kB";
}

async function main() {
  // --- Znak w nagłówku: dwie wersje, wspólne płótno ------------------------
  // Wspólne płótno jest po to, żeby przełączenie motywu nie przesuwało napisu
  // stojącego obok znaku.
  const PLOTNO = { width: 238, height: 320 };
  const przezroczyste = { r: 0, g: 0, b: 0, alpha: 0 };

  for (const [zrodlo, plik] of [
    [await zdejmijCzern(KADRY.gablotaCiemna), "public/logo-ff-dark.webp"],
    [await zdejmijKrem(KADRY.gablotaJasna), "public/logo-ff-light.webp"],
  ]) {
    await sharp(zrodlo)
      .trim({ threshold: 1 })
      .resize({ ...PLOTNO, fit: "contain", position: "centre", background: przezroczyste })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(plik);
    console.log(plik, PLOTNO.width + "×" + PLOTNO.height, waga(plik));
  }

  // --- Ikony -----------------------------------------------------------------
  // Emblemat, nie gablota: arkusz sam wskazuje go do małych rozmiarów, a płaska
  // geometria znosi pomniejszenie do 16 px, czego szklana bryła nie robi.
  const emblemat = await zdejmijCzern(KADRY.emblemat, { prog: 20, zakres: 45, kolo: true });

  const ikona = async (rozmiar, udzial, plik) => {
    const znak = await sharp(emblemat).resize({ width: Math.round(rozmiar * udzial), kernel: "lanczos3" }).toBuffer();
    await sharp({ create: { ...{ width: rozmiar, height: rozmiar }, channels: 4, background: TLO_APLIKACJI } })
      .composite([{ input: znak, gravity: "centre" }])
      .png()
      .toFile(plik);
    console.log(plik, rozmiar + "×" + rozmiar, waga(plik));
  };

  await ikona(64, 0.88, "public/favicon.png");        // zakładka jest malutka — znak musi wypełnić pole
  await ikona(180, 0.74, "public/apple-touch-icon.png");
  await ikona(192, 0.74, "public/icon-192.png");
  await ikona(512, 0.74, "public/icon-512.png");
  await ikona(512, 0.56, "public/icon-maskable-512.png"); // Android przycina do koła — znak musi zmieścić się w środku

  // --- Wizytówka linku (og-image) -------------------------------------------
  // Składana z części, a nie wycinana z arkusza w całości: ciemne pasmo arkusza
  // ma literówkę w akapicie („rynkowyclb"), a proporcje 4:1 nie pasują do 1,91:1
  // wymaganego przez podglądy linków.
  const S = 1200;
  const V = 630;
  const tlo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${V}">` +
      `<defs><radialGradient id="g" cx="0.2" cy="0.5" r="0.55">` +
      `<stop offset="0" stop-color="#F97316" stop-opacity="0.28"/>` +
      `<stop offset="1" stop-color="#F97316" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="100%" height="100%" fill="#0e0f13"/><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  );

  await sharp(tlo)
    .composite([
      { input: await sharp("public/logo-ff-dark.webp").resize({ height: 400, kernel: "lanczos3" }).toBuffer(), left: 95, top: 115 },
      { input: await sharp(await zdejmijCzern(KADRY.nazwa)).resize({ width: 600, kernel: "lanczos3" }).toBuffer(), left: 460, top: 225 },
      { input: await sharp(await zdejmijCzern(KADRY.podtytul)).resize({ width: 430, kernel: "lanczos3" }).toBuffer(), left: 463, top: 345 },
    ])
    .png({ compressionLevel: 9 })
    .toFile("public/og-image.png");
  console.log("public/og-image.png", S + "×" + V, waga("public/og-image.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
