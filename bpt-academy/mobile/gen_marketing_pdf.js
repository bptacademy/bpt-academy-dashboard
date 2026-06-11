const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file:///Users/iamfabiandavid/.openclaw/workspace/volpair-marketing-strategy.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    document.documentElement.style.background = '#0D1B2A';
    document.body.style.background = '#0D1B2A';
  });
  await page.pdf({
    path: '/Users/iamfabiandavid/.openclaw/workspace/volpair-marketing-strategy.pdf',
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', bottom: '48px', left: '0', right: '0' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="
        width:100%;
        background:#0A1628;
        border-top:1px solid rgba(0,212,200,0.25);
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:0 16px;
        font-size:8px;
        color:#7A96B2;
        font-family:-apple-system,sans-serif;
        height:48px;
        box-sizing:border-box;
        -webkit-print-color-adjust:exact;
      ">
        <span style="color:#00D4C8;font-weight:800;font-size:13px;letter-spacing:-0.5px;flex-shrink:0">volpair</span>
        <span style="display:flex;gap:10px;align-items:center;flex:1;justify-content:center;flex-wrap:wrap;">
          <span style="color:#5EEAD4;font-weight:600">1. Positioning</span>
          <span style="color:#4A6080">·</span>
          <span>2. Pre-Launch</span>
          <span style="color:#4A6080">·</span>
          <span>3. Launch</span>
          <span style="color:#4A6080">·</span>
          <span>4. Growth</span>
          <span style="color:#4A6080">·</span>
          <span>5. With OTC</span>
          <span style="color:#4A6080">·</span>
          <span>6. Without OTC</span>
          <span style="color:#4A6080">·</span>
          <span>7. Influencers</span>
          <span style="color:#4A6080">·</span>
          <span>8. Clubs</span>
          <span style="color:#4A6080">·</span>
          <span>9. Content</span>
          <span style="color:#4A6080">·</span>
          <span>10. Budget</span>
          <span style="color:#4A6080">·</span>
          <span>11. KPIs</span>
          <span style="color:#4A6080">·</span>
          <span>12. Roadmap</span>
        </span>
        <span style="flex-shrink:0;color:#4A6080">volpair.app · 2026</span>
      </div>`,
  });
  await browser.close();
  console.log('PDF generated successfully');
})();
