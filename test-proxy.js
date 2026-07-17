import * as cheerio from 'cheerio';

async function testProxy() {
  const targetUrl = 'https://myfigurecollection.net/browse.v4.php?keywords=Levi';
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(proxyUrl);
    const json = await res.json();
    console.log("AllOrigins Length:", json.contents.length);
    if(json.contents.includes('Cloudflare')) {
        console.log("AllOrigins blocked by Cloudflare!");
    } else {
        console.log("AllOrigins SUCCESS");
    }
  } catch (e) {
    console.error(e);
  }
}
testProxy();
