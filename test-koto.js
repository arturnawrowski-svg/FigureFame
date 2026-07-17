import * as cheerio from 'cheerio';

async function scrapeKotobukiya(name) {
  try {
    const searchUrl = `https://www.kotobukiya.co.jp/en/product/?fw=${encodeURIComponent(name)}`;
    console.log('Fetching', searchUrl);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return { error: 'Kotobukiya search HTTP ' + res.status };
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Find the first product link
    const firstLink = $('.product-list__item a').attr('href') || $('.p-product-list__item a').attr('href');
    if (!firstLink) {
        console.log("HTML:", html.substring(0, 500));
        return { error: 'No link found on Kotobukiya' };
    }

    const itemUrl = firstLink.startsWith('http') ? firstLink : `https://www.kotobukiya.co.jp${firstLink}`;
    console.log('Fetching item', itemUrl);
    const itemRes = await fetch(itemUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const itemHtml = await itemRes.text();
    const $item = cheerio.load(itemHtml);

    const imgUrl = $item('.product-detail__image img').attr('src') || $item('.p-product-detail__image img').attr('src');
    
    return {
      manufacturer: "Kotobukiya",
      official_image_url: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `https://www.kotobukiya.co.jp${imgUrl}`) : ""
    };
  } catch (e) {
    return { error: e.message };
  }
}

scrapeKotobukiya("Levi Fortitude").then(console.log);
