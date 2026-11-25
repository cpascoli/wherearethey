// The owner's admin page in a real browser, phone-sized, under its own Content-Security-Policy (docs/accounts.md,
// section 18): nothing for anyone else; the figures; a digest composed from Latest, saved, previewed, scheduled with
// an emailed code, and taken back. Run after a build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, skip, wait, accounts, origin } from './helpers.mjs';
import { DEV_ADMIN } from '../api/dev.mjs';

const until = (p, fn, ...args) => p.waitForFunction(fn, { timeout: 15000 }, ...args);
const says = (p, re) => until(p, s => new RegExp(s).test(document.querySelector('#ad')?.textContent || ''), re.source);
const click = (p, label) => p.evaluate(l => [...document.querySelectorAll('#ad button')].find(b => b.textContent.trim() === l).click(), label);
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
  assert.doesNotMatch(await p.$eval('#ad', el => el.textContent), /example\.com|wherearethey\.test/, 'no address on the page');
  await click(p, "Compose this week's digest");
  await p.waitForSelector('#ad iframe.ad-frame');
  console.log((await p.$eval('#ad', el => el.innerHTML)).slice(0, 1500));
  assert.match(await p.$eval('#ad input[type=text]', el => el.value), /\S/);
  assert.match(await p.$eval('#ad iframe.ad-frame', f => `${f.getAttribute('sandbox')}|${f.srcdoc}`), /^\|[^]*utm_source=digest[^]*RESEND_UNSUBSCRIBE_URL/);
  assert.ok(await p.$$eval('#ad .ad-item', xs => xs.length) > 0, 'the proposal has items from Latest');
  // edit and save
  await p.$eval('#ad input[type=text]', el => { el.value = 'The week in the record'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await says(p, /Unsaved changes/);
  await click(p, 'Save draft');
  await says(p, /Saved\./);
  assert.match(await p.$eval('#ad iframe.ad-frame', f => f.srcdoc), /The week in the record/);
  // a test to the owner alone
  await click(p, 'Send me a test');
  await says(p, /Test sent to your own address/);
  const { mail, app } = await accounts();
  assert.deepEqual([mail.tests.length, mail.tests[0].to, mail.broadcasts.size], [1, DEV_ADMIN, 0]);
  // schedule it two days ahead, confirmed with a code
  await app.q`delete from limit_counter`;
  await p.$eval('#ad-at', el => { const t = new Date(Date.now() + 2 * 864e5 - new Date().getTimezoneOffset() * 60000); el.value = t.toISOString().slice(0, 16); });
  const n = mail.codes.length;
  await click(p, 'Continue…');
  await p.waitForSelector('#ad input[name=code]');
  for (let i = 0; i < 50 && mail.codes.length === n; i++) await wait(100);
  assert.equal(mail.codes.at(-1).type, 'confirm');
  await p.type('#ad input[name=code]', mail.codes.at(-1).code);
  await p.$eval('#ad form', f => f.requestSubmit());
  await says(p, /Scheduled for .*to 1 person/);
  assert.deepEqual([...mail.broadcasts.values()].map(b => [b.status, b.topic, b.subject]), [['scheduled', 'digest', 'The week in the record']]);
  await click(p, 'Take it back (make it a draft again)');
  await says(p, /Taken back/);
  assert.equal(mail.broadcasts.size, 0);
  assert.deepEqual(await app.q`select status, resend_broadcast_id from broadcast_draft`, [{ status: 'draft', resend_broadcast_id: null }]);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no sideways scroll on a phone');
  assert.deepEqual(blocked, [], 'nothing on the page was refused by its policy');
});
