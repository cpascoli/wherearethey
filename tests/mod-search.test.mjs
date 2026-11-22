// The MoD UFO files search reads its index from another origin (the R2 bucket), never through ours
// (docs/accounts.md, T8). Here the index in site/pagefind-mod is served from a second port with a CORS header,
// as the bucket does, and every request for /pagefind-mod/ on the site's own origin is refused.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { open, skip as noSite, wait } from './helpers.mjs';

const INDEX = path.resolve(import.meta.dirname, '../site/pagefind-mod');
const skip = noSite || (!fs.existsSync(path.join(INDEX, 'pagefind-entry.json')) && 'no local MoD index (npm run index:mod)');

let bucket, base;
before(async () => {
  if (skip) return;
  bucket = http.createServer((req, res) => {
    const f = path.join(INDEX, decodeURIComponent(req.url.split('?')[0]).replace(/^\/pagefind-mod\//, ''));
    if (!f.startsWith(INDEX) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => bucket.listen(0, 'localhost', r));
  base = `http://localhost:${bucket.address().port}/pagefind-mod/`;
});
after(() => bucket?.close());

// a page whose own origin has no /pagefind-mod/, with the index at `base`
async function page(url) {
  const p = await open('/');
  const own = new URL(p.url()).origin;
  await p.setRequestInterception(true);
  const sameOrigin = [];
  p.on('request', r => {
    if (r.url().startsWith(own + '/pagefind-mod/')) { sameOrigin.push(r.url()); return r.abort(); }
    r.continue();
  });
  await p.evaluateOnNewDocument(b => { globalThis.MOD_INDEX = b; }, base);
  await p.goto(own + url, { waitUntil: 'networkidle2' });
  return { p, sameOrigin };
}

test('the MoD search page finds pages with its index on another origin', { skip }, async () => {
  const { p, sameOrigin } = await page('/mod-files?q=radar');
  await p.waitForSelector('#mf-res li', { timeout: 20000 });
  const first = await p.$eval('#mf-res li', li => ({ href: li.querySelector('a').getAttribute('href'), marks: li.querySelectorAll('.x mark').length, other: li.querySelectorAll('.x :not(mark)').length }));
  assert.match(first.href, /^(https:\/\/|\/)/, 'the result links to a PDF');
  assert.ok(first.marks > 0, 'the excerpt marks the match');
  assert.equal(first.other, 0, 'an excerpt holds text and marks only');
  assert.deepEqual(sameOrigin, [], 'nothing was asked of /pagefind-mod/ on our origin');
  await p.close();
});

test('what the index says is shown as text', { skip }, async () => {
  const { p } = await page('/mod-files');
  await wait(500);
  const out = await p.evaluate(async () => {
    // the page's own renderer, fed a result as a tampered index would give it
    const src = [...document.scripts].find(s => s.type === 'module').textContent;
    const pick = name => src.match(new RegExp(`const ${name} = [^\\n]+(?:\\n\\s+\\.[^\\n]+)*`))[0];
    const { excerpt, link } = new Function(`const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); ${pick('excerpt')}; ${pick('link')}; return { excerpt, link };`)();
    return { x: excerpt('a <mark>b</mark> <img src=x onerror=alert(1)> <script>alert(1)<\/script> &amp; c'), js: link('javascript:alert(1)'), other: link('//evil.example/x'), ok: link('https://example.org/a.pdf#page=2'), own: link('/document/x') };
  });
  assert.ok(!/<(?!\/?mark>)/.test(out.x), `only <mark> survives: ${out.x}`);
  assert.match(out.x, /<mark>b<\/mark>/);
  assert.equal(out.js, '#');
  assert.equal(out.other, '#');
  assert.equal(out.ok, 'https://example.org/a.pdf#page=2');
  assert.equal(out.own, '/document/x');
  await p.close();
});
