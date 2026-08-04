// Sonda interfejsu: strona postaci i zwinięte wyniki wyszukiwania.
// Uruchamiać Z KATALOGU PROJEKTU (inaczej nie widzi node_modules).
//   node scripts/sonda-postaci.mjs http://localhost:5199
import { chromium } from "playwright";

const ADRES = (process.argv[2] || "http://localhost:5199").replace(/\/+$/, "");
const przegladarka = await chromium.launch();
const strona = await przegladarka.newPage({ viewport: { width: 1280, height: 1000 } });

const bledyKonsoli = [];
strona.on("console", (m) => { if (m.type() === "error") bledyKonsoli.push(m.text()); });
strona.on("pageerror", (e) => bledyKonsoli.push(String(e)));

// --- 1. Strona postaci ---
await strona.goto(`${ADRES}/postac/hatsune-miku`, { waitUntil: "networkidle" });
const naglowek = await strona.locator("h1").first().textContent().catch(() => null);
const jp = await strona.locator(".postac-jp").first().textContent().catch(() => null);
const licznik = await strona.locator(".postac-licznik").first().textContent().catch(() => null);
const kart = await strona.locator(".figure-card").count();
const tytul = await strona.title();
console.log("STRONA POSTACI /postac/hatsune-miku");
console.log(`  nagłówek: ${naglowek}`);
console.log(`  japońska: ${jp}`);
console.log(`  licznik : ${licznik}`);
console.log(`  kart    : ${kart}`);
console.log(`  tytuł   : ${tytul}`);
await strona.screenshot({ path: "kopie/sonda-postac.png", fullPage: false });

// --- 2. Zwinięte wyniki wyszukiwania ---
await strona.goto(ADRES, { waitUntil: "networkidle" });
await strona.locator(".search-input").fill("miku");
await strona.waitForTimeout(400);
const grupy = await strona.locator(".grupa-postaci").count();
const tytulGrupy = await strona.locator(".grupa-tytul").first().innerText().catch(() => null);
const kartPrzed = await strona.locator(".figure-card").count();
await strona.locator(".grupa-tytul").first().click();
await strona.waitForTimeout(300);
const kartPo = await strona.locator(".figure-card").count();
console.log("\nWYSZUKIWANIE „miku\"");
console.log(`  grup            : ${grupy}`);
console.log(`  tytuł pierwszej : ${String(tytulGrupy).replace(/\s+/g, " ")}`);
console.log(`  kart przed / po : ${kartPrzed} / ${kartPo}`);
await strona.screenshot({ path: "kopie/sonda-szukanie.png", fullPage: false });

console.log(`\nbłędy w konsoli: ${bledyKonsoli.length}`);
for (const b of bledyKonsoli.slice(0, 5)) console.log(`  ! ${b}`);

await przegladarka.close();
