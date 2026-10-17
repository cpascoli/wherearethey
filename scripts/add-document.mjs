#!/usr/bin/env node
// Download a document into library/docs/<id>.<ext>, extract its text, and print a preview.
//
//   node scripts/add-document.mjs <url> <id>
//
// Tries a plain HTTP download first; if the site blocks it (403 / bot check / HTML instead of a file)
// it falls back to the locally installed Chrome, which streams the file to disk.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const [url, id] = process.argv.slice(2);
if (!url || !id) { console.log('usage: node scripts/add-document.mjs <url> <id>'); process.exit(1); }
const DIR = path.join(ROOT, 'library', 'docs');
fs.mkdirSync(DIR, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const MAGIC = { '%PDF': 'pdf', '\x89PNG': 'png', '\xff\xd8\xff': 'jpg', 'GIF8': 'gif' };
const kind = buf => Object.entries(MAGIC).find(([m]) => buf.subarray(0, m.length).toString('latin1') === m)?.[1];

let buf = null;
try {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const b = Buffer.from(await res.arrayBuffer());
  if (res.ok && kind(b)) buf = b;
} catch { /* fall through to Chrome */ }

if (!buf) {
  console.log('plain download blocked — using Chrome');
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  const tmp = path.join(DIR, '.incoming');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: tmp });
  await page.goto(new URL(url).origin, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.evaluate(u => { const a = document.createElement('a'); a.href = u; a.download = ''; document.body.append(a); a.click(); }, url).catch(() => {});
  const t0 = Date.now();
  while (Date.now() - t0 < 5 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 1000));
    const files = fs.readdirSync(tmp);
    if (files.length && !files.some(f => f.endsWith('.crdownload'))) { buf = fs.readFileSync(path.join(tmp, files[0])); break; }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
}
if (!buf || !kind(buf)) { console.error(`✗ could not download a document from ${url}`); process.exit(1); }

const ext = kind(buf);
const dest = path.join(DIR, `${id}.${ext}`);
fs.writeFileSync(dest, buf);
console.log(`✓ library/docs/${id}.${ext} (${Math.round(buf.length / 1024)} KB)`);
if (ext === 'pdf') {
  try {
    const pages = execFileSync('pdfinfo', [dest]).toString().match(/Pages:\s+(\d+)/)?.[1];
    execFileSync('pdftotext', ['-layout', dest, dest.replace(/\.pdf$/, '.txt')]);
    const txt = fs.readFileSync(dest.replace(/\.pdf$/, '.txt'), 'utf8').replace(/\s+/g, ' ').trim();
    let text = txt;
    if (txt.length < 200) { // scanned image: OCR it
      console.log(`  ${pages} pages, no text layer — running OCR…`);
      execFileSync('node', [path.join(ROOT, 'scripts', 'ocr.mjs'), dest], { stdio: 'inherit' });
      text = fs.readFileSync(dest.replace(/\.pdf$/, '.txt'), 'utf8').replace(/\s+/g, ' ').trim();
    }
    console.log(`  ${pages} pages · ${text.length.toLocaleString()} chars of text`);
    const txtPreview = text;
    console.log(`  preview: ${txtPreview.slice(0, 600)}`);
  } catch { console.log('  (text extraction unavailable)'); }
}
