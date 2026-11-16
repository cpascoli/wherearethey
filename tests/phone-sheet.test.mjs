// Phones: a file (or a connection) opens as a sheet over the page whose tab is lit.
//   "Done" (top right) closes it and shows that page: the graph for Explore and for a direct link,
//   Latest for a file opened from Latest, and so on, rewinding the history rather than adding an entry.
//   "‹ Back" (top left) shows only when there is an earlier file in the sheet, or the visitor came from the home
//   page, and steps back one entry.
// The rules live in app.js (#panel-done, sheetFields). Run after a build: `npm run build && npm test`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '../site');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = '/person/david-fravor';
const skip = !fs.existsSync(path.join(ROOT, 'index.html')) ? 'site/ is not built (npm run build)' : !fs.existsSync(CHROME) ? 'Chrome not found (set CHROME)' : false;

let server, browser, base;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
before(async () => {
  if (skip) return;
  server = http.createServer((req, res) => {
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

const wait = ms => new Promise(r => setTimeout(r, ms));
async function phone(url) {
  const p = await browser.newPage();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(base + url, { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => window.BUILD && document.querySelector('#views'), { timeout: 20000 });
  await wait(1200);
  return p;
}
// what the visitor sees: the address, whether a sheet is open, its buttons, the lit tab, how deep into the visit
const look = p => p.evaluate(() => {
  const shown = el => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const panel = document.querySelector('#panel');
  return {
    path: decodeURI(location.pathname),
    sheet: shown(panel),
    back: shown(panel) && shown(document.querySelector('#panel-back')),
    done: shown(panel) && shown(document.querySelector('#panel-done')),
    tab: [...document.querySelectorAll('#views .active')].find(shown)?.dataset.view || null, // the lit tab (Latest sits under More)
    n: history.state?.n ?? 0,
  };
});
const tap = async (p, sel) => { await p.evaluate(s => document.querySelector(s).click(), sel); await wait(1200); };
// open the first file linked from the open sheet (another file, not the one open)
const openLinked = async p => {
  await p.evaluate(() => [...document.querySelectorAll('#panel-body a[data-goto]')].find(a => a.dataset.goto && a.dataset.goto !== history.state?.sel && !a.closest('.p-crumbs')).click());
  await wait(1200);
};
const goBack = async p => { await p.evaluate(() => history.back()); await wait(1200); };

test('direct link: no Back, Done shows the graph without adding a history entry', { skip }, async () => {
  const p = await phone(FILE);
  let s = await look(p);
  assert.equal(s.path, FILE); assert.ok(s.sheet); assert.equal(s.back, false); assert.ok(s.done); assert.equal(s.tab, 'graph');
  const len = await p.evaluate(() => history.length);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.tab, 'graph');
  assert.equal(await p.evaluate(() => history.length), len, 'Done replaces the entry, it does not push one');
  await p.close();
});

test('direct link, then a second file: Back returns to the first, Done closes both onto the graph', { skip }, async () => {
  const p = await phone(FILE);
  await openLinked(p);
  let s = await look(p);
  assert.notEqual(s.path, FILE); assert.ok(s.back, 'Back shows for the second file'); assert.ok(s.done);
  await tap(p, '#panel-back');
  s = await look(p);
  assert.equal(s.path, FILE); assert.equal(s.back, false);
  await openLinked(p);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.n, 0, 'Done rewound to the first entry of the visit');
  await p.close();
});

test('from the home page: Back returns home, Done stays on Explore', { skip }, async () => {
  const p = await phone('/');
  await tap(p, '[data-home-file]');
  let s = await look(p);
  assert.ok(s.sheet); assert.ok(s.back, 'Back shows: the visitor came from the home page'); assert.ok(s.done); assert.equal(s.tab, 'graph');
  await tap(p, '#panel-back');
  s = await look(p);
  assert.equal(s.path, '/'); assert.equal(s.sheet, false);
  await tap(p, '[data-home-file]');
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.tab, 'graph');
  await goBack(p);
  assert.equal((await look(p)).path, '/', 'the back gesture after Done goes home, it does not reopen the file');
  await p.close();
});

test('from Latest: no Back on the first file, Back on the next, Done returns to Latest', { skip }, async () => {
  const p = await phone('/latest');
  await tap(p, '#view-latest [data-goto]');
  let s = await look(p);
  assert.ok(s.sheet); assert.equal(s.back, false, 'Back would do the same as Done'); assert.ok(s.done);
  await openLinked(p);
  s = await look(p);
  assert.ok(s.back);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/latest'); assert.equal(s.sheet, false); assert.equal(s.n, 0);
  await p.close();
});

test('from the graph: a tapped file has no Back, Done returns to the graph', { skip }, async () => {
  const p = await phone('/explore');
  await p.waitForFunction(() => window.__cy?.nodes(':visible').length, { timeout: 20000 });
  await p.evaluate(() => window.__cy.nodes(':visible')[0].emit('tap'));
  await wait(1500); // phones wait 400 ms for a second tap
  let s = await look(p);
  assert.ok(s.sheet); assert.equal(s.back, false); assert.ok(s.done);
  await openLinked(p);
  assert.ok((await look(p)).back);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.n, 0);
  await p.close();
});

test('a connection opened from the graph: no Back, Done closes it', { skip }, async () => {
  const p = await phone('/explore');
  await p.waitForFunction(() => window.__cy?.edges(':visible').length && document.querySelector('.edge-tip'), { timeout: 20000 });
  await p.evaluate(() => {
    const e = window.__cy.edges(':visible')[0], tip = document.querySelector('.edge-tip');
    tip.innerHTML = `<button data-pair="${e.data('source')}|${e.data('target')}">open</button>`; // as the link's tooltip button does
    tip.querySelector('button').click();
  });
  await wait(1200);
  let s = await look(p);
  assert.ok(s.sheet); assert.equal(s.back, false); assert.ok(s.done);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false);
  await p.close();
});
