import * as cheerio from 'cheerio';
fetch('https://www.goodsmile.info/en/product/11106/')
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    console.log('Images:', $('.itemImg img').length);
    console.log('Image SRC:', $('.itemImg img').attr('src'));
    console.log('Itemprop Image:', $('img[itemprop="image"]').attr('src'));
    console.log('Class itemPhotos:', $('.itemPhotos img').attr('src'));
  });
