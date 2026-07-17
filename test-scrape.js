import * as cheerio from "cheerio";

async function scrapeMFC(name) {
  try {
    const searchUrl = `https://myfigurecollection.net/browse.v4.php?keywords=${encodeURIComponent(name)}`;
    console.log('Fetching', searchUrl);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!res.ok) return { error: 'MFC search HTTP ' + res.status };
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.item-icon a').attr('href');
    if (!firstLink) return { error: 'No link found on MFC search' };

    const itemUrl = `https://myfigurecollection.net${firstLink}`;
    console.log('Fetching item', itemUrl);
    const itemRes = await fetch(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    if (!itemRes.ok) return { error: 'MFC item HTTP ' + itemRes.status };
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const data = {
      japanese_name: $item('.form-field:contains("Japanese") .value').text().trim() || "",
      manufacturer: $item('.form-field:contains("Manufacturer") .value').text().trim() || "",
      series: $item('.form-field:contains("Origin") .value').text().trim() || "",
      scale: $item('.form-field:contains("Scale") .value').text().trim() || "",
      original_price: $item('.form-field:contains("Price") .value').text().trim() || "",
      official_image_url: $item('.item-picture img').attr('src') || ""
    };
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

async function scrapeGoodSmile(name) {
  try {
    const searchUrl = `https://www.goodsmile.info/en/products/search?utf8=%E2%9C%93&search%5Bquery%5D=${encodeURIComponent(name)}`;
    console.log('Fetching', searchUrl);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return { error: 'GSC search HTTP ' + res.status };
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.hitItem a').attr('href');
    if (!firstLink) return { error: 'No link found on GSC' };

    const itemUrl = firstLink.startsWith('http') ? firstLink : `https://www.goodsmile.info${firstLink}`;
    console.log('Fetching item', itemUrl);
    const itemRes = await fetch(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!itemRes.ok) return { error: 'GSC item HTTP ' + itemRes.status };
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const priceMatch = $item('.detailBox dt:contains("Price")').next('dd').text().trim();
    const specMatch = $item('.detailBox dt:contains("Specifications")').next('dd').text();
    const scale = specMatch ? (specMatch.match(/(1\/\d+)/)?.[1] || "") : "";
    const imgUrl = $item('.itemImg img').attr('src');

    return {
      japanese_name: "", // Czasem brak na wersji EN
      manufacturer: "Good Smile Company",
      series: $item('.detailBox dt:contains("Series")').next('dd').text().trim() || "",
      scale: scale,
      original_price: priceMatch,
      official_image_url: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `https:${imgUrl}`) : ""
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function test() {
  const mfc = await scrapeMFC("Levi - Fortitude Ver.");
  console.log("MFC:", mfc);
  const gsc = await scrapeGoodSmile("Levi - Fortitude Ver.");
  console.log("GSC:", gsc);
}

test();
