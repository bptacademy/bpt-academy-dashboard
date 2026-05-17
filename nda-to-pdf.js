const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const htmlPath = 'file://' + path.resolve('/Users/iamfabiandavid/.openclaw/workspace/volpair-nda.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: '/Users/iamfabiandavid/.openclaw/workspace/volpair-nda-aimee-lawson.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  });
  await browser.close();
  console.log('PDF created successfully.');
})();
