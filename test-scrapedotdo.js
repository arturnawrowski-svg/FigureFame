const token = "b884544706ed4678bb45a71e322de1ca5d85daa98fb";
const targetUrl = "https://myfigurecollection.net/browse.v4.php?keywords=Levi";
const proxyUrl = `http://api.scrape.do/?token=${token}&url=${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl)
  .then(res => res.text())
  .then(html => {
    if (html.includes("Just a moment...") || html.includes("Cloudflare")) {
      console.log("Blocked by Cloudflare!");
    } else {
      console.log("Success! HTML length:", html.length);
    }
  })
  .catch(console.error);
