const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 300, height: 300 });
  await page.goto('file://' + path.resolve(__dirname, 'logo-check.html'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  // Sample some pixels from the BPT text area
  const pixels = await page.evaluate(() => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const img = document.getElementById('img');
    ctx.drawImage(img, 0, 0, 300, 300);
    const results = [];
    // Sample a grid of points
    for (let x = 20; x < 280; x += 20) {
      for (let y = 20; y < 280; y += 20) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[3] > 10 && !(d[0] < 40 && d[1] < 40 && d[2] < 40)) {
          results.push({ x, y, r: d[0], g: d[1], b: d[2], a: d[3] });
        }
      }
    }
    return results;
  });
  console.log(JSON.stringify(pixels, null, 2));
  await browser.close();
})();
