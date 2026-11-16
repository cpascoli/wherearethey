// Phones: a file (or a connection) opens as a sheet over the page whose tab is lit.
//   "Done" (top right) closes it and shows that page: the graph for Explore and for a direct link,
//   Latest for a file opened from Latest, and so on, rewinding the history rather than adding an entry.
//   "‹ Back" (top left) shows only when there is an earlier file in the sheet, or the visitor came from the home
//   page, and steps back one entry.
// The rules live in app.js (#panel-done, sheetFields). Run after a build: `npm run build && npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skip, wait, phone } from './helpers.mjs';

const FILE = '/person/david-fravor';
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
const openId = p => p.evaluate(() => history.state?.sel);
// after Done on Explore: the file that was open is on the graph, near the middle of the screen
async function assertCentred(p, id) {
  await p.waitForFunction(i => { const n = window.__cy?.getElementById(i); return n?.length && !n.hasClass('hidden'); }, { timeout: 20000 }, id);
  await wait(1200); // the camera moves for 450 ms, a new trail lays out first
  const r = await p.evaluate(i => {
    const n = window.__cy.getElementById(i), c = window.__cy.container().getBoundingClientRect(), q = n.renderedPosition();
    return { x: q.x / c.width, y: q.y / c.height };
  }, id);
  assert.ok(r.x > 0.2 && r.x < 0.8 && r.y > 0.15 && r.y < 0.85, `${id} is near the middle of the graph (at ${r.x.toFixed(2)}, ${r.y.toFixed(2)})`);
}

test('direct link: no Back, Done shows the graph, centred on the file, without adding a history entry', { skip }, async () => {
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

test('direct link to a file that is not on the key-files map: Done shows it, with its connections', { skip }, async () => {
  const p = await phone('/person/kevin-knuth');
  await tap(p, '#panel-done');
  assert.equal((await look(p)).sheet, false);
  await assertCentred(p, 'kevin-knuth');
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
  const id = await openId(p);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.tab, 'graph');
  await assertCentred(p, id);
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
  const first = await openId(p);
  await tap(p, '#panel-done');
  assert.equal((await look(p)).sheet, false);
  await assertCentred(p, first);
  await p.evaluate(i => window.__cy.getElementById(i).emit('tap'), first);
  await wait(1500);
  await openLinked(p);
  assert.ok((await look(p)).back);
  const second = await openId(p);
  await tap(p, '#panel-done');
  s = await look(p);
  assert.equal(s.path, '/explore'); assert.equal(s.sheet, false); assert.equal(s.n, 0);
  if (await p.evaluate(i => !!window.__cy.getElementById(i).length, second)) await assertCentred(p, second); // (a record or news item lights its file instead)
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
