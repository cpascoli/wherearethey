// The home page's day file and the stories opened from a file.
//   - The day's file follows the visitor's own date, not UTC (index.html's inline script and the app alike).
//   - The day's file is not listed again under "Latest on the record".
//   - A story opened from a file's "Keep reading" gets its own history entry: Back returns to the file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skip, open, wait } from './helpers.mjs';

const DAY = 864e5;
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const dayBlock = p => p.evaluate(() => {
  const d = document.querySelector('#view-home .home-day');
  return d && { kicker: d.querySelector('.home-kicker')?.textContent.trim(), id: d.querySelector('[data-home-file]')?.dataset.homeFile };
});

test('the day\'s file follows the visitor\'s local date', { skip }, async () => {
  // 19:30 UTC is already tomorrow in Bangkok (UTC+7): the visitor there sees what a UTC visitor sees tomorrow
  const today = Date.parse(utcDay(Date.now()));
  const bangkok = await open('/', { timezone: 'Asia/Bangkok', now: today + 19.5 * 3600e3 });
  const tomorrowUtc = await open('/', { timezone: 'UTC', now: today + DAY + 12 * 3600e3 });
  const a = await dayBlock(bangkok), b = await dayBlock(tomorrowUtc);
  assert.ok(a && b, 'both show a day file');
  assert.deepEqual(a, b);
  await bangkok.close(); await tomorrowUtc.close();
});

test('the day\'s file is not repeated in Latest, also when it is the pinned entry', { skip }, async () => {
  // the dates index.html has blocks for; one whose block is the featured entry (no anniversary that day) is the case
  // where the duplicate used to show
  const probe = await open('/');
  const days = await probe.evaluate(() => { const d = JSON.parse(document.getElementById('home-days')?.textContent || '{"dates":{},"html":[]}'); return Object.entries(d.dates).map(([k, i]) => [k, /Featured ·/.test(d.html[i])]); });
  await probe.close();
  const pick = days.find(([, f]) => f) || days[0];
  assert.ok(pick, 'index.html carries the day blocks');
  const p = await open('/', { timezone: 'UTC', now: Date.parse(pick[0]) + 12 * 3600e3 });
  const day = await dayBlock(p);
  const latest = await p.evaluate(() => [...document.querySelectorAll('#view-home [data-home-latest]')].map(a => a.dataset.homeLatest));
  assert.ok(day?.id, 'a day file is shown');
  assert.ok(latest.length > 0, 'Latest lists entries');
  assert.ok(!latest.includes(day.id), `${day.id} is the day's file and also in Latest (${pick[0]}${pick[1] ? ', featured' : ''})`);
  await p.close();
});

for (const phone of [false, true]) {
  test(`${phone ? 'phone' : 'desktop'}: a story opened from a file's "Keep reading" goes Back to the file`, { skip }, async () => {
    const p = await open('/timeline', { phone });
    await p.evaluate(() => document.querySelector('.tl-item[data-goto="inc-nimitz-2004"]').click());
    await wait(1200);
    const file = await p.evaluate(() => location.pathname);
    assert.match(file, /^\/incident\//);
    await p.evaluate(() => document.querySelector('#panel [data-story-start]').click());
    await wait(1500);
    assert.match(await p.evaluate(() => location.pathname + location.search), /^\/explore\?story=/);
    await p.evaluate(() => history.back());
    await wait(1500);
    assert.equal(await p.evaluate(() => location.pathname), file);
    await p.evaluate(() => history.back());
    await wait(1500);
    assert.equal(await p.evaluate(() => location.pathname), '/timeline');
    await p.close();
  });
}
