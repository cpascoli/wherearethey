// Shared setup for the UI tests: serves the built site/ on a free port and drives a headless Chrome.
// Run after a build: `npm run build && npm test`.
import { before, after } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '../site');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const skip = !fs.existsSync(path.join(ROOT, 'index.html')) ? 'site/ is not built (npm run build)' : !fs.existsSync(CHROME) ? 'Chrome not found (set CHROME)' : false;
export const wait = ms => new Promise(r => setTimeout(r, ms));

let server, browser, base;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };
// /account's own policy, as in netlify.toml (keep the two the same)
export const ACCOUNT_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
// The accounts API, as on the dev server: Postgres in memory and a stand-in for Resend, started on the first /api
// request. `accounts()` gives the tests its mail (the codes "sent") and its database.
let api;
export const accounts = () => (api ||= import('../api/dev.mjs').then(async m => { const a = await m.development({ origin: base, print: false }); return { ...a, listen: m.nodeListener(a.app, base) }; }));
export const origin = () => base;
before(async () => {
  if (skip) return;
  server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) return void accounts().then(a => a.listen(req, res)).catch(() => { res.writeHead(500); res.end(); });
    if (req.url.split('?')[0] === '/account') res.setHeader('content-security-policy', ACCOUNT_CSP);
    const p = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, '/'));
    const f = [p, p + '.html', path.join(p, 'index.html')].map(c => path.join(ROOT, c)).find(c => c.startsWith(ROOT) && fs.existsSync(c) && fs.statSync(c).isFile());
    if (!f) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, 'localhost', r));
  base = `http://localhost:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
});
after(async () => { await browser?.close(); server?.close(); });

// open a page once the app has booted. phone: an iPhone-sized screen; timezone/now: the visitor's clock
export async function open(url, { phone = false, timezone, now, width = 1440, height = 900 } = {}) {
  const p = await browser.newPage();
  if (phone) {
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  } else await p.setViewport({ width, height });
  if (timezone) await p.emulateTimezone(timezone);
  if (now) await p.evaluateOnNewDocument(t => { // a fixed clock (Date only; timers keep running)
    const Real = Date, off = t - Real.now();
    globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + off])); } static now() { return Real.now() + off; } };
  }, now);
  await p.goto(base + url, { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => window.BUILD && document.querySelector('#views'), { timeout: 20000 });
  await wait(1200);
  return p;
}
export const phone = url => open(url, { phone: true });
