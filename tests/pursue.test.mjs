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
    // the dots belong to the carousel: beside its label on desktop, under the slides on phones (not over the sheet's bar)
    const at = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), n = r('#sec-pu-hl .hc-nav'), t = r('#sec-pu-hl .hc-track'), c = r('#sec-pu-hl .pu-car'); return { inside: n.top >= c.top && n.bottom <= c.bottom + 1, below: n.top >= t.bottom }; });
    assert.ok(at.inside, 'the dots sit inside the carousel');
    if (phone) assert.ok(at.below, 'phones: the dots under the slides');
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

test('PURSUE is in the bar after Latest on desktop and first under More on phones; it opens the explainer; Back returns', { skip }, async () => {
  for (const phone of [false, true]) {
    const p = await open('/timeline', { phone });
    const shown = sel => p.evaluate(s => [...document.querySelectorAll(s)].filter(a => a.getClientRects().length).map(a => a.dataset.goto || a.dataset.view || a.getAttribute('href')), sel);
    await p.evaluate(() => document.getElementById('btn-more').click());
    await new Promise(r => setTimeout(r, 300));
    if (phone) {
      assert.equal((await shown('#more-menu a'))[0], 'pursue', 'the first item under More');
      await p.evaluate(() => document.querySelector('#more-menu a[data-goto="pursue"]').click());
    } else {
      assert.deepEqual((await shown('#views a')).slice(0, 3), ['latest', 'pursue', 'graph'], 'in the bar, between Latest and Explore');
      assert.ok(!(await shown('#more-menu a')).includes('pursue') && (await shown('#more-menu a')).at(-1) === '/about', 'not under More, where About is');
      assert.equal(await p.$('.top-about'), null, 'About is no longer in the bar');
      await p.evaluate(() => document.getElementById('btn-more').click());
      await p.evaluate(() => document.querySelector('#views a[data-goto="pursue"]').click());
    }
    await new Promise(r => setTimeout(r, 1500));
    assert.equal(await p.evaluate(() => location.pathname), '/program/pursue');
    assert.ok(await p.evaluate(() => document.getElementById('more-menu').hidden && !!document.querySelector('#sec-pu-hl')), 'the menu closes, the explainer shows');
    if (!phone) assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('#views a.active, #views button.active')].map(a => a.dataset.goto || a.dataset.view)), ['pursue'], 'PURSUE is the lit item, not Explore');
    if (!phone) { // Explore, clicked over the explainer, shows the graph with the key files, not the explainer still
      await p.evaluate(() => document.querySelector('#views a[data-view="graph"]').click());
      await new Promise(r => setTimeout(r, 1500));
      assert.deepEqual(await p.evaluate(() => [location.pathname, document.getElementById('panel').hidden, document.getElementById('app').classList.contains('reading'), !!document.querySelector('[data-core], [data-trail-exit]')]), ['/explore', true, false, false], 'Explore alone, on the key files');
      assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('#views a.active, #views button.active')].map(a => a.dataset.goto || a.dataset.view)), ['graph'], 'Explore is lit');
      await p.evaluate(() => history.back());
      await new Promise(r => setTimeout(r, 1500));
      assert.equal(await p.evaluate(() => location.pathname), '/program/pursue', 'Back returns to the explainer');
    }
    await p.evaluate(() => history.back());
    await new Promise(r => setTimeout(r, 1500));
    assert.equal(await p.evaluate(() => location.pathname), '/timeline');
    await p.close();
  }
});
