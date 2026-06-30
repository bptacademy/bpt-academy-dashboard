// Regenerate the OTC/Big Box pitch deck PDF from its HTML.
// Run from the workspace dir:  node build-otc-pdf.js
// Uses Chrome (via puppeteer's resolved binary) in --print-to-pdf mode,
// which honours the deck's @page { size:1280px 720px } slide dimensions.
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const DIR = __dirname;
const HTML = path.join(DIR, 'volpair-pitch-deck-otc-bigbox.html');
const PDF = path.join(DIR, 'volpair-pitch-deck-otc-bigbox.pdf');
const chrome = puppeteer.executablePath();
execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  '--virtual-time-budget=15000',
  '--print-to-pdf=' + PDF,
  'file://' + HTML,
], { stdio: 'inherit' });
console.log('PDF written:', PDF);
