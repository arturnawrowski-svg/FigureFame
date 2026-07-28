// ============================================================================
// zip — minimalny zapis archiwum ZIP, bez zewnętrznych bibliotek.
//
// Po co własny, skoro są gotowe: kopia zapasowa ma działać ZAWSZE, także za
// rok, gdy nikt nie zaktualizuje zależności. Format ZIP nie zmienił się od
// dziesięcioleci, a tu potrzebujemy jego wąskiego wycinka — plików bez
// katalogów, bez szyfrowania, bez archiwów dzielonych. To kilkadziesiąt linii
// zamiast kolejnej biblioteki do pilnowania.
//
// Zapisujemy pojedyncze archiwum w pamięci, więc nadaje się do kopii rzędu
// dziesiątek megabajtów — nie do dowolnie dużych.
// ============================================================================
import { deflateRawSync } from "node:zlib";

// CRC-32 (ten sam wielomian co w gzip). Tablicę liczymy raz przy starcie.
const TABLICA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLICA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// ZIP przechowuje czas w formacie MS-DOS — dwa 16-bitowe pola, sekundy co dwie.
function czasDos(data) {
  const czas = (data.getHours() << 11) | (data.getMinutes() << 5) | (data.getSeconds() >> 1);
  const dzien = ((data.getFullYear() - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate();
  return { czas, dzien };
}

/**
 * Składa archiwum ZIP.
 * @param {{nazwa: string, dane: Buffer}[]} pliki
 * @returns {Buffer}
 */
export function zbudujZip(pliki, teraz = new Date()) {
  const { czas, dzien } = czasDos(teraz);
  const czesci = [];
  const katalog = [];
  let pozycja = 0;

  for (const plik of pliki) {
    const nazwa = Buffer.from(plik.nazwa, "utf8");
    const surowe = plik.dane;
    const suma = crc32(surowe);

    // Zdjęcia są już skompresowane (webp) — ponowne pakowanie nic nie da, a
    // kosztuje czas. Pakujemy tylko wtedy, gdy faktycznie coś to daje.
    const spakowane = deflateRawSync(surowe, { level: 6 });
    const uzyjDeflate = spakowane.length < surowe.length;
    const tresc = uzyjDeflate ? spakowane : surowe;
    const metoda = uzyjDeflate ? 8 : 0;

    const naglowek = Buffer.alloc(30);
    naglowek.writeUInt32LE(0x04034b50, 0); // podpis nagłówka lokalnego
    naglowek.writeUInt16LE(20, 4); // wymagana wersja
    naglowek.writeUInt16LE(0x0800, 6); // nazwy plików w UTF-8
    naglowek.writeUInt16LE(metoda, 8);
    naglowek.writeUInt16LE(czas, 10);
    naglowek.writeUInt16LE(dzien, 12);
    naglowek.writeUInt32LE(suma, 14);
    naglowek.writeUInt32LE(tresc.length, 18);
    naglowek.writeUInt32LE(surowe.length, 22);
    naglowek.writeUInt16LE(nazwa.length, 26);
    naglowek.writeUInt16LE(0, 28);

    czesci.push(naglowek, nazwa, tresc);

    const wpis = Buffer.alloc(46);
    wpis.writeUInt32LE(0x02014b50, 0); // podpis wpisu w katalogu centralnym
    wpis.writeUInt16LE(20, 4);
    wpis.writeUInt16LE(20, 6);
    wpis.writeUInt16LE(0x0800, 8);
    wpis.writeUInt16LE(metoda, 10);
    wpis.writeUInt16LE(czas, 12);
    wpis.writeUInt16LE(dzien, 14);
    wpis.writeUInt32LE(suma, 16);
    wpis.writeUInt32LE(tresc.length, 20);
    wpis.writeUInt32LE(surowe.length, 24);
    wpis.writeUInt16LE(nazwa.length, 28);
    wpis.writeUInt32LE(0, 38); // atrybuty zewnętrzne
    wpis.writeUInt32LE(pozycja, 42); // gdzie leży nagłówek lokalny
    katalog.push(wpis, nazwa);

    pozycja += naglowek.length + nazwa.length + tresc.length;
  }

  const katalogBuf = Buffer.concat(katalog);
  const stopka = Buffer.alloc(22);
  stopka.writeUInt32LE(0x06054b50, 0); // podpis końca katalogu centralnego
  stopka.writeUInt16LE(pliki.length, 8);
  stopka.writeUInt16LE(pliki.length, 10);
  stopka.writeUInt32LE(katalogBuf.length, 12);
  stopka.writeUInt32LE(pozycja, 16);

  return Buffer.concat([...czesci, katalogBuf, stopka]);
}
