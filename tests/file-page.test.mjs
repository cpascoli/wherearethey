// A file's page: the order of its lists. Run after a build: `npm run build && npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skip, open } from './helpers.mjs';

// "All video moments" on a person's page: their own words before what others say of them (those carry the speaker's
// chip), and among their own the sworn testimony (a hearing's recording) before interviews; one video's moments stay
// together, in order of time.
test('a person\'s moments lead with their own sworn words', { skip }, async () => {
  const p = await open('/person/david-fravor');
  const ms = await p.evaluate(() => {
    const sec = [...document.querySelectorAll('.p-sec')].find(s => /video moments/i.test(s.querySelector('h4')?.textContent || ''));
    return [...sec.querySelectorAll('.moment')].map(m => { const [video, t] = m.querySelector('[data-play]').dataset.play.split('@'); return { video, t: +t, chips: m.querySelectorAll('.who .chip').length }; });
  });
  assert.ok(ms.length >= 8, 'the list is there');
  const own = ms.map(m => m.chips === 1), sworn = ms.map(m => /-hearing-/.test(m.video));
  assert.ok(own[0] && sworn[0], 'his own sworn testimony first');
  assert.ok(own.lastIndexOf(true) < own.indexOf(false), 'his own words before what others say of him');
  const mine = sworn.slice(0, own.indexOf(false));
  assert.ok(mine.includes(false) && mine.lastIndexOf(true) < mine.indexOf(false), 'sworn before interviews');
  const done = new Set();
  ms.forEach((m, i) => { const k = `${m.video}|${own[i]}`, prev = ms[i - 1]; if (prev && `${prev.video}|${own[i - 1]}` === k) assert.ok(m.t >= prev.t, 'in order of time'); else { assert.ok(!done.has(k), 'one video\'s moments together'); done.add(k); } });
  await p.close();
});
