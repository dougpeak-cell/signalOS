// download-logos.js
// Usage: node download-logos.js

const fs = require("fs");
const path = require("path");
const https = require("https");

const tickers = ["aapl", "amzn", "amd", "meta", "msft", "nvda", "tsla"];

const logoDir = path.join(__dirname, "public", "logos");

const tickerToDomain = {
  aapl: "apple.com",
  amzn: "amazon.com",
  amd: "amd.com",
  meta: "facebook.com",
  msft: "microsoft.com",
  nvda: "nvidia.com",
  tsla: "tesla.com",
};

function downloadLogo(ticker, domain) {
  const url = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  const dest = path.join(logoDir, `${ticker}.png`);

  https.get(url, (res) => {
    // 🔥 HANDLE REDIRECT (301/302)
    if (res.statusCode === 301 || res.statusCode === 302) {
      return https.get(res.headers.location, (redirectRes) => {
        saveImage(redirectRes, ticker, dest);
      });
    }

    saveImage(res, ticker, dest);
  }).on("error", (err) => {
    console.error(`Error ${ticker}:`, err.message);
  });
}

function saveImage(res, ticker, dest) {
  if (res.statusCode !== 200) {
    console.log(`Failed ${ticker}: ${res.statusCode}`);
    res.resume();
    return;
  }

  const file = fs.createWriteStream(dest);
  res.pipe(file);

  file.on("finish", () => {
    file.close();
    console.log(`✓ ${ticker}`);
  });
}

if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

console.log("Downloading logos...");

tickers.forEach((ticker) => {
  const domain = tickerToDomain[ticker];
  if (domain) {
    downloadLogo(ticker, domain);
  } else {
    console.log(`No mapping for ${ticker}`);
  }
});
