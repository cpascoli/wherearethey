// The owner's admin page in a real browser, phone-sized, under its own Content-Security-Policy (docs/accounts.md,
// section 18): nothing for anyone else; the figures; a digest composed from Latest, saved, previewed, scheduled with
// an emailed code, and taken back. Run after a build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, skip, wait, accounts, origin } from './helpers.mjs';
import { DEV_ADMIN } from '../api/dev.mjs';

const until = (p, fn, ...args) => p.waitForFunction(fn, { timeout: 15000 }, ...args);
const says = (p, re) => until(p, s => new RegExp(s).test(document.querySelector('#ow')?.textContent || ''), re.source);
const click = (p, label) => p.evaluate(l => [...document.querySelectorAll('#ow button')].find(b => b.textContent.trim() === l).click(), label);
const call = (p, method, path, body) => p.evaluate(async (m, u, b) => { const r = await fetch(u, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }); return r.status; }, method, path, body);
async function signIn(p, email) {
  const { mail, app } = await accounts();
  await app.q`delete from limit_counter`; // the tests ask for codes faster than a person may
  await call(p, 'POST', '/api/code', { email });
  for (let i = 0; i < 50 && !mail.last(email); i++) await wait(100);
  assert.equal(await call(p, 'POST', '/api/session', { email, code: mail.last(email) }), 200);
}

test('the admin page: nothing for others; figures, compose, save, preview, schedule and take back for the owner', { skip }, async () => {
  const first = await open('/timeline'), p = await first.browser().newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const blocked = []; p.on('console', m => { if (/Content Security Policy/i.test(m.text())) blocked.push(m.text()); });
  const go = async () => { await p.goto(origin() + '/admin', { waitUntil: 'networkidle2' }); };
  await go();
  await says(p, /There is nothing here/);
  // a member, with the digest on: still nothing, and the routes are not there
  await signIn(p, 'member@example.com');
  assert.equal(await call(p, 'PUT', '/api/subscriptions/digest', { on: true, placement: 'account', wording: '2026-12-b' }), 200);
  assert.equal(await call(p, 'GET', '/api/admin/stats'), 404);
  await go();
  await says(p, /There is nothing here/);
  await call(p, 'DELETE', '/api/session', {});
  // the owner
  await signIn(p, DEV_ADMIN);
  await go();
  await says(p, /2\s*accounts/);
  await says(p, /1 person would get a digest sent now/);
  assert.doesNotMatch(await p.$eval('#ow', el => el.textContent), /example\.com|wherearethey\.test/, 'no address on the page');
  await click(p, "Compose this week's digest");
  await p.waitForSelector('#ow iframe.ow-frame');
  assert.match(await p.$eval('#ow input[type=text]', el => el.value), /\S/);
  assert.match(await p.$eval('#ow iframe.ow-frame', f => `${f.getAttribute('sandbox')}|${f.srcdoc}`), /^\|[^]*utm_source=digest[^]*RESEND_UNSUBSCRIBE_URL/);
  assert.ok(await p.$$eval('#ow .ow-item', xs => xs.length) > 0, 'the proposal has items from Latest');
  // edit and save
  await p.$eval('#ow input[type=text]', el => { el.value = 'The week in the record'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await says(p, /Unsaved changes/);
  await click(p, 'Save draft');
  await says(p, /Saved\./);
  assert.match(await p.$eval('#ow iframe.ow-frame', f => f.srcdoc), /The week in the record/);
  // a test to the owner alone
  await click(p, 'Send me a test');
  await says(p, /Test sent to your own address/);
  const { mail, app } = await accounts();
  assert.deepEqual([mail.tests.length, mail.tests[0].to, mail.broadcasts.size], [1, DEV_ADMIN, 0]);
  // schedule it two days ahead, confirmed with a code
  await app.q`delete from limit_counter`;
  await p.$eval('#ow-at', el => { const t = new Date(Date.now() + 2 * 864e5 - new Date().getTimezoneOffset() * 60000); el.value = t.toISOString().slice(0, 16); el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.ok(await p.$$eval('#ow .ow-bar button', bs => bs.some(b => b.textContent === 'Send or schedule…')), 'the bar at the bottom says where sending is');
  const n = mail.codes.length;
  await click(p, 'Schedule…');
  await p.waitForSelector('#ow input[name=code]');
  for (let i = 0; i < 50 && mail.codes.length === n; i++) await wait(100);
  assert.equal(mail.codes.at(-1).type, 'confirm');
  await p.type('#ow input[name=code]', mail.codes.at(-1).code);
  await p.$eval('#ow form', f => f.requestSubmit());
  await says(p, /Scheduled for .*to 1 person/);
  assert.deepEqual([...mail.broadcasts.values()].map(b => [b.status, b.topic, b.subject]), [['scheduled', 'digest', 'The week in the record']]);
  await click(p, 'Take it back (make it a draft again)');
  await says(p, /Taken back/);
  assert.equal(mail.broadcasts.size, 0);
  assert.deepEqual(await app.q`select status, resend_broadcast_id from broadcast_draft`, [{ status: 'draft', resend_broadcast_id: null }]);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no sideways scroll on a phone');
  assert.deepEqual(blocked, [], 'nothing on the page was refused by its policy');
});

// Ad blockers hide anything whose class or id looks like an advert's ("ad-main", "ad-row", id "ad"): with those names
// the owner saw the page flash and go blank. The page's own names start with "ow-".
test('the admin page uses no name an ad blocker hides', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), dir = path.resolve(import.meta.dirname, '../site');
  for (const f of ['admin.html', 'assets/admin.css', 'assets/admin.js']) assert.doesNotMatch(fs.readFileSync(path.join(dir, f), 'utf8'), /(?<![a-zA-Z])ads?[-_][a-z]|id="ads?"|#ads?\b/i, f);
});

// While the server answers, /account and /admin show the coming view as a placeholder (grey bars) of the same height,
// so nothing moves when the real one replaces it. The API's answers are held back to look at the placeholder.
async function placeholderThenView(p, url, root) {
  const held = [], hold = r => (/\/api\//.test(r.url()) ? held.push(r) : r.continue());
  await p.setRequestInterception(true); p.on('request', hold);
  await p.goto(origin() + url, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector(`${root} .ac-skel`);
  await wait(300); // fonts
  const size = () => p.$eval(root, el => ({ h: Math.round(el.getBoundingClientRect().height), reachable: el.querySelectorAll('.ac-skel:not([inert])').length, text: el.querySelector('.ac-sr')?.textContent }));
  const before = await size();
  p.off('request', hold); for (const r of held) r.continue(); await p.setRequestInterception(false);
  await p.waitForFunction(r => !document.querySelector(`${r} .ac-skel`) && document.querySelector(`${r} button`), { timeout: 15000 }, root);
  return { before, after: await size() };
}
test('the placeholders on /account and /admin have the height of the view that replaces them', { skip }, async () => {
  const first = await open('/timeline');
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const p = await first.browser().newPage();
    await p.setViewport({ width, height });
    await p.goto(origin() + '/account', { waitUntil: 'networkidle2' });
    await call(p, 'DELETE', '/api/session', {});
    await p.evaluate(() => localStorage.clear());
    // signed out, nothing remembered: the sign-in form is there at once, with no placeholder
    await p.goto(origin() + '/account', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#ac input[type=email]');
    await signIn(p, DEV_ADMIN);
    for (const [url, root] of [['/account', '#ac'], ['/admin', '#ow']]) {
      await p.goto(origin() + url, { waitUntil: 'networkidle2' }); // the first visit remembers the outline
      await p.waitForFunction(r => !document.querySelector(`${r} .ac-skel`) && document.querySelector(`${r} button`), {}, root);
      const { before, after } = await placeholderThenView(p, url, root);
      assert.equal(before.reachable, 0, 'nothing in the placeholder can be used');
      assert.equal(before.text, 'Loading…');
      assert.ok(Math.abs(before.h - after.h) <= 1, `${url} at ${width}: placeholder ${before.h}px, view ${after.h}px`);
      assert.ok(after.h > 150, 'the view is there');
    }
    await p.close();
  }
});
