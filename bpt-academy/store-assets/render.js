const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  // Render at 2x for crisp quality
  await page.setViewport({ width: 2048, height: 1000, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, 'feature-graphic.html'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.resolve(__dirname, 'feature-graphic-2x.png'), fullPage: false });
  await browser.close();
  console.log('Done: feature-graphic-2x.png');
})();
