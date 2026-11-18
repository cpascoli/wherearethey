// The PURSUE explainer (/program/pursue): its figures are counted from the record files at build time (pursueStats in
// build.mjs), so a new release updates the page. The early page and the app draw the same table, and the early page
// carries the FAQ as FAQPage structured data. Run after a build: `npm run build && npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { skip, open } from './helpers.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
// what the record files say: releases and records
function fromRecords() {
  const rel = new Map();
  for (const f of fs.readdirSync(path.join(ROOT, 'content/record'))) {
    const n = fs.readFileSync(path.join(ROOT, 'content/record', f), 'utf8').match(/^  release: (\d+)/m)?.[1];
    if (n) rel.set(+n, (rel.get(+n) || 0) + 1);
  }
  return rel;
}
const table = p => p.evaluate(() => ({
  rows: [...document.querySelectorAll('#sec-pursue .pu-table tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.trim())),
  tiles: [...document.querySelectorAll('#sec-pursue .pu-stats b')].map(b => b.textContent.trim()),
  faq: document.querySelectorAll('#sec-faq dt').length,
  wide: [...document.querySelectorAll('#sec-pursue .pu-wide')].some(el => el.getClientRects().length),
}));

test('the PURSUE explainer counts every release and record on file', { skip }, async () => {
  const rel = fromRecords(), total = [...rel.values()].reduce((a, b) => a + b, 0), last = Math.max(...rel.keys());
  const p = await open('/program/pursue');
  const t = await table(p);
  assert.equal(t.rows.length, rel.size, 'a row per release');
  for (const r of t.rows) assert.equal(+r[2], rel.get(+r[0].replace(/\D/g, '')), `${r[0]}: records`);
  assert.deepEqual(t.tiles.slice(0, 3), [String(rel.size), String(total), `Release ${last}`]);
  assert.equal(t.tiles[3], `Release ${last + 1}`, 'the next release');
  assert.ok(t.faq >= 5, 'the questions are listed');
  assert.ok(t.wide, 'desktop shows the gap and agency columns');
  await p.close();
  const m = await open('/program/pursue', { phone: true });
  const tm = await table(m);
  assert.equal(tm.rows.length, rel.size);
  assert.equal(tm.wide, false, 'phones leave out the gap and agency columns');
  await m.close();
});

test('the PURSUE page carries its FAQ as structured data, with the figures filled in', { skip }, () => {
  const html = fs.readFileSync(path.join(ROOT, 'site/program/pursue.html'), 'utf8');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const faq = ld['@graph'].find(x => x['@type'] === 'FAQPage');
  assert.ok(faq?.mainEntity.length >= 5, 'FAQPage with its questions');
  for (const q of faq.mainEntity) assert.doesNotMatch(q.acceptedAnswer.text, /\{\w+\}/, `a placeholder left in "${q.name}"`);
  assert.match(html, /class="pu-table"/, 'the early page has the release table');
});

test('the release highlights: top picks first, a release row shows that release\'s picks', { skip }, async () => {
  for (const phone of [false, true]) {
    const p = await open('/program/pursue', { phone });
    const picks = () => p.evaluate(() => ({
      on: document.querySelector('#sec-pu-hl .pu-filter .chip.on')?.dataset.puRel,
      slides: [...document.querySelectorAll('#sec-pu-hl .pu-slide')].map(s => ({ kicker: s.dataset.kicker, file: s.querySelector('h3 a')?.dataset.goto, text: s.querySelector('p')?.textContent.trim() })),
      dots: document.querySelectorAll('#sec-pu-hl .dv-dot').length,
    }));
    let s = await picks();
    assert.equal(s.on, '0', 'Top picks is the first view');
    assert.ok(s.slides.length >= 5, 'several top picks');
    assert.equal(s.dots, s.slides.length, 'a dot per pick');
    for (const x of s.slides) { assert.ok(x.file, 'each pick links to its file'); assert.match(x.text, /^[“"‘(A-Z0-9]/, `${x.file}: the line starts a sentence`); }
    const row = await p.evaluate(() => document.querySelector('#sec-pursue tr[data-pu-row]')?.dataset.puRow);
    await p.evaluate(r => document.querySelector(`#sec-pursue tr[data-pu-row="${r}"] td:nth-child(2)`).click(), row);
    await new Promise(r => setTimeout(r, 600));
    s = await picks();
    assert.equal(s.on, row, 'the row picks its release');
    assert.ok(s.slides.length > 0 && s.slides.every(x => x.kicker.startsWith(`Release ${row} `)), 'only that release\'s picks');
    await p.close();
  }
});
