// ============================================================================
// gen-music — generuje bezpieczne (wolne od praw) podkłady muzyczne do shortów.
// Tworzone syntezą ffmpeg = 0% ryzyka Content ID na YT/TikTok/FB/IG.
//
// v2: zamiast jednego długiego akordu — PROGRESJA akordów (zmiana co ~5s), co daje
// ruch i mniej monotonii. Każdy akord = kilka sinusów (amix) z fade in/out, sklejone
// filtrem concat, na końcu filtr charakteru (tremolo/lowpass/apulsator) + limiter.
//
// To NIE zastępuje dobrej muzyki — to działające, legalne defaulty. Lepsze utwory
// wrzuć jako mp3 do worker/assets/music/ i dopisz w src/lib/shortOptions.js.
//
// Uruchom: node scripts/gen-music.mjs   (albo: npm run gen-music)
// ============================================================================
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'worker', 'assets', 'music');
const CHORD_SEC = 5.5; // 4 akordy × 5.5s ≈ 22s (pokrywa 20.6s shorta)

// Zbuduj argumenty ffmpeg: progresja akordów (concat) + filtr charakteru.
function progressionArgs(chords, tail, outFile) {
  const inputs = [];
  const parts = [];
  let idx = 0;
  chords.forEach((notes, ci) => {
    const ins = [];
    notes.forEach((f) => {
      inputs.push('-f', 'lavfi', '-i', `sine=frequency=${f}:duration=${CHORD_SEC}`);
      ins.push(`[${idx}]`);
      idx++;
    });
    // akord: zmiksuj nuty, fade in/out do ciszy na brzegach (gładkie sklejenie)
    parts.push(`${ins.join('')}amix=inputs=${notes.length},afade=t=in:st=0:d=0.35,afade=t=out:st=${(CHORD_SEC - 0.7).toFixed(2)}:d=0.7[c${ci}]`);
  });
  const concatIns = chords.map((_, ci) => `[c${ci}]`).join('');
  parts.push(`${concatIns}concat=n=${chords.length}:v=0:a=1[seq]`);
  parts.push(`[seq]${tail},alimiter=limit=0.92,aformat=sample_fmts=fltp:channel_layouts=stereo[a]`);
  return ['-y', ...inputs, '-filter_complex', parts.join(';'), '-map', '[a]', '-c:a', 'libmp3lame', '-q:a', '5', outFile];
}

// Częstotliwości nut (Hz)
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25,
  A2: 110.0, B2: 123.47, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0,
};

const TRACKS = [
  {
    // spokojny — progresja Am–F–C–G (vi–IV–I–V), miękkie tremolo
    file: 'spokojny.mp3',
    chords: [
      [N.A3, N.C4, N.E4, N.A4],
      [N.F3, N.A3, N.C4, N.F4],
      [N.C4, N.E4, N.G4, N.C5],
      [N.G3, N.B3, N.D4, N.G4],
    ],
    tail: 'tremolo=f=0.12:d=0.3,lowpass=f=2000,volume=2.3',
  },
  {
    // ciepły ambient — niska progresja C–Am–F–G, mocny lowpass = lo-fi ciepło
    file: 'cieplo.mp3',
    chords: [
      [N.C3, N.E3, N.G3, N.C4],
      [N.A2, N.C3, N.E3, N.A3],
      [N.F2, N.A2, N.C3, N.F3],
      [N.G2, N.B2, N.D3, N.G3],
    ],
    tail: 'lowpass=f=1200,volume=2.5',
  },
  {
    // puls — jasna progresja Em–C–G–D + apulsator (rytmiczne pompowanie pod TikTok)
    file: 'puls.mp3',
    chords: [
      [N.E4, N.G4, N.B4, N.E5],
      [N.C4, N.E4, N.G4, N.C5],
      [N.G3, N.B3, N.D4, N.G4],
      [N.D4, N.Fs4, N.A4, N.D5],
    ],
    tail: 'apulsator=hz=1.7,lowpass=f=2600,volume=2.3',
  },
];

const run = async () => {
  await mkdir(outDir, { recursive: true });
  for (const t of TRACKS) {
    const out = join(outDir, t.file);
    await execFileP(ffmpegInstaller.path, progressionArgs(t.chords, t.tail, out));
    console.log('OK:', t.file);
  }
  console.log('Gotowe →', outDir);
};

run().catch((e) => { console.error('BŁĄD:', e.message); process.exit(1); });
