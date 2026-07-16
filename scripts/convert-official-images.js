import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputFiles = process.argv.slice(2);

if (inputFiles.length === 0) {
  console.error('Proszę podać ścieżki do plików graficznych jako argumenty.');
  process.exit(1);
}

const outputDir = path.join(process.cwd(), 'public', 'images', 'official');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function convertImages() {
  for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
      console.warn(`Plik nie istnieje: ${file}`);
      continue;
    }

    const basename = path.basename(file, path.extname(file));
    const webpPath = path.join(outputDir, `${basename}.webp`);
    const avifPath = path.join(outputDir, `${basename}.avif`);
    const jpgPath = path.join(outputDir, `${basename}.jpg`);

    try {
      // Create WebP
      await sharp(file)
        .webp({ quality: 80 })
        .toFile(webpPath);
      console.log(`Zapisano: ${webpPath}`);

      // Create AVIF
      await sharp(file)
        .avif({ quality: 80 })
        .toFile(avifPath);
      console.log(`Zapisano: ${avifPath}`);

      // Copy original as jpg fallback if not already in official folder
      await sharp(file)
        .jpeg({ quality: 90 })
        .toFile(jpgPath);
      console.log(`Zapisano: ${jpgPath}`);

    } catch (err) {
      console.error(`Błąd podczas konwersji pliku ${file}:`, err);
    }
  }
}

convertImages();
