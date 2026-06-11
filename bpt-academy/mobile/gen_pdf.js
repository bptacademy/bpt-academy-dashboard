const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Load the HTML
  const htmlPath = 'file:///Users/iamfabiandavid/.openclaw/workspace/volpair-financial-projections.html';
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Set dark background so no white border
  await page.evaluate(() => {
    document.documentElement.style.background = '#0D1B2A';
    document.body.style.background = '#0D1B2A';
  });

  await page.pdf({
    path: '/Users/iamfabiandavid/.openclaw/workspace/volpair-financial-projections.pdf',
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="
        width: 100%;
        background: #0A1628;
        border-top: 1px solid rgba(0,212,200,0.25);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        font-size: 10px;
        color: #7A96B2;
        font-family: -apple-system, sans-serif;
        height: 36px;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
      ">
        <span style="color:#00D4C8;font-weight:800;font-size:13px;letter-spacing:-0.5px;">volpair</span>
        <span>Financial Projections &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; 2026</span>
        <span>volpair.app</span>
      </div>`,
  });

  await browser.close();
  console.log('PDF generated successfully');
})();
