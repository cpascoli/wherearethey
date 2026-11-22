// The sign-up block and /account in a real browser, against the accounts API on Postgres in memory with a stand-in
// for Resend (docs/accounts.md, sections 4 and 15). Run after a build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, phone, skip, wait, accounts, origin } from './helpers.mjs';

const FILE = '/incident/uss-nimitz-tic-tac-encounter-2004';
const text = (p, sel) => p.$eval(sel, el => el.textContent.replace(/\s+/g, ' ').trim());
const until = (p, fn, ...args) => p.waitForFunction(fn, { timeout: 15000 }, ...args);
const code = async email => { const { mail } = await accounts(); for (let i = 0; i < 50 && !mail.last(email); i++) await wait(100); return mail.last(email); };
// a page of the standalone kind (no app to wait for)
async function plain(p, url) { await p.goto(origin() + url, { waitUntil: 'networkidle2' }); return p; }

test('the block at the foot of a file: email, code after a reload, done; no history entry, no page scroll sideways', { skip }, async () => {
  const p = await phone(FILE), email = 'reader@example.com';
  await p.waitForSelector('#panel .su[data-su="file"] input[type=email]');
  const before = await p.evaluate(() => ({ n: history.length, url: location.href }));
  assert.match(await text(p, '#panel .su'), /Get the next PURSUE release by email.*Usually within a day.*Creates your free account \(16\+\)/);
  assert.equal(await p.$eval('#panel .su input', el => parseFloat(getComputedStyle(el).fontSize) >= 16), true, 'no zoom on iOS');
  await p.$eval('#panel .su input', el => el.scrollIntoView({ block: 'center' }));
  await p.type('#panel .su input', 'not-an-address');
  await p.$eval('#panel .su form', f => f.requestSubmit());
  assert.match(await text(p, '#panel .su .su-err'), /doesn't look like an email/);
  await p.$eval('#panel .su input', el => { el.value = ''; });
  await p.type('#panel .su input', email);
  await p.$eval('#panel .su form', f => f.requestSubmit());
  await p.waitForSelector('#panel .su input[name=code]');
  assert.match(await text(p, '#panel .su h4'), /Enter the 8-digit code sent to r…@example\.com/);
  assert.equal(await p.$eval('#panel .su input[name=code]', el => `${el.inputMode} ${el.autocomplete}`), 'numeric one-time-code');
  assert.equal(await p.$eval('#panel .su [data-su-again]', b => b.disabled), true, 'a minute before another code');
  // the reader leaves for the mail app and the page reloads: the code step is still there
  await p.reload({ waitUntil: 'networkidle2' });
  await p.waitForSelector('#panel .su input[name=code]');
  const c = await code(email);
  assert.match(c, /^\d{8}$/);
  await p.type('#panel .su input[name=code]', '0000 0000' === `${c.slice(0, 4)} ${c.slice(4)}` ? '1111 1111' : '0000 0000');
  await p.$eval('#panel .su form', f => f.requestSubmit());
  await until(p, () => /isn't right/.test(document.querySelector('#panel .su .su-err')?.textContent || ''));
  await p.type('#panel .su input[name=code]', `${c.slice(0, 4)} ${c.slice(4)}`);
  await p.$eval('#panel .su form', f => f.requestSubmit());
  await until(p, () => /You'll hear from us when Release \d+ is out/.test(document.querySelector('#panel .su')?.textContent || ''));
  const after = await p.evaluate(() => ({ n: history.length, url: location.href, wide: document.documentElement.scrollWidth > innerWidth + 1, member: localStorage.getItem('wat:member'), cookie: document.cookie }));
  assert.deepEqual([after.n, after.url, after.wide], [before.n, before.url, false]);
  assert.equal(after.member, 'true');
  assert.doesNotMatch(after.cookie, /session/, 'the session cookie is not readable by the page');
  const { q } = (await accounts()).app;
  assert.deepEqual(await q`select placement, granted from consent_event`, [{ placement: 'file', granted: true }]);
  // another page, later: the same browser is recognised and sees one quiet line, no form
  const p2 = await p.browser().newPage(); await p2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p2.goto(origin() + '/program/pursue', { waitUntil: 'networkidle2' });
  await until(p2, () => /You get an email when a PURSUE release is out/.test(document.querySelector('.su[data-su="pursue"]')?.textContent || ''));
  assert.equal(await p2.$('.su form'), null);
  await p2.close(); await p.close();
});

test('the block is on the home page and Latest too, and is never the first thing on the screen', { skip }, async () => {
  for (const [url, sel] of [['/', '.su[data-su="home"]'], ['/latest', '.su[data-su="latest"]']]) {
    const p = await open(url);
    await p.waitForSelector(sel);
    assert.ok(await p.$eval(sel, el => el.getBoundingClientRect().top + scrollY > innerHeight * 0.6), `${url}: below the first screen`);
    await p.close();
  }
});

test('/account under its own policy: sign in without an alert, switch it on and off, sign out, delete', { skip }, async () => {
  const p = await open('/'), email = 'member@example.com', blocked = [], asked = [];
  p.on('console', m => { if (/Content Security Policy|Refused to/.test(m.text())) blocked.push(m.text()); });
  // a browser that has never signed in (the tests share one)
  await (await p.createCDPSession()).send('Network.clearBrowserCookies');
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await (await accounts()).app.q`delete from limit_counter`;
  p.on('request', r => { if (!r.url().startsWith(origin()) && !r.url().startsWith('data:')) asked.push(r.url()); });
  await plain(p, '/account');
  await p.waitForSelector('#ac input[type=email]');
  assert.match(await text(p, '#ac-title'), /Sign in or create an account/);
  assert.equal(await p.$eval('#ac input[name=alert]', el => el.checked), false, 'no alert unless asked for');
  await p.type('#ac input[type=email]', email);
  await p.$eval('#ac form', f => f.requestSubmit());
  await p.waitForSelector('#ac input[name=code]');
  await p.type('#ac input[name=code]', await code(email));
  await p.$eval('#ac form', f => f.requestSubmit());
  await p.waitForSelector('#ac .ac-switch');
  assert.match(await text(p, '#ac'), /Signed in as m…@example\.com/);
  assert.equal(await p.$eval('#ac .ac-switch', b => b.getAttribute('aria-checked')), 'false');
  const { app, mail } = await accounts(), q = app.q;
  assert.equal((await q`select 1 from subscription where user_id = (select id from "user" where email = ${email})`).length, 0);
  await p.click('#ac .ac-switch');
  await until(p, () => document.querySelector('#ac .ac-switch')?.getAttribute('aria-checked') === 'true');
  assert.deepEqual((await q`select placement, granted from consent_event where user_id = (select id from "user" where email = ${email})`), [{ placement: 'account', granted: true }]);
  await p.click('#ac .ac-switch');
  await until(p, () => document.querySelector('#ac .ac-switch')?.getAttribute('aria-checked') === 'false');
  // a reload keeps the session; signing out ends it
  await plain(p, '/account');
  await p.waitForSelector('#ac .ac-switch');
  await p.evaluate(() => [...document.querySelectorAll('#ac button')].find(b => b.textContent === 'Sign out').click());
  await p.waitForSelector('#ac input[type=email]');
  assert.equal(await p.evaluate(() => fetch('/api/me').then(r => r.json()).then(j => j.signedIn)), false);
  // sign in again and delete: a fresh code, what goes and what stays, then nothing is left
  await (await accounts()).app.q`delete from limit_counter`; // a minute has not passed in this test
  await p.type('#ac input[type=email]', email);
  await p.$eval('#ac form', f => f.requestSubmit());
  await p.waitForSelector('#ac input[name=code]');
  const before = mail.codes.length;
  await p.type('#ac input[name=code]', await code(email));
  await p.$eval('#ac form', f => f.requestSubmit());
  await p.waitForSelector('#ac .ac-switch');
  await q`delete from limit_counter`;
  await p.evaluate(() => [...document.querySelectorAll('#ac button')].find(b => /^Delete account/.test(b.textContent)).click());
  await p.waitForSelector('#ac .ac-warn input[name=code]');
  assert.match(await text(p, '#ac .ac-warn'), /deletes, now and for good.*What remains: copies in our backups.*30 days/);
  for (let i = 0; i < 50 && mail.codes.length === before; i++) await wait(100);
  assert.equal(mail.codes.at(-1).type, 'delete');
  await p.type('#ac .ac-warn input[name=code]', mail.codes.at(-1).code);
  await p.$eval('#ac .ac-warn form', f => f.requestSubmit());
  await until(p, () => /Your account is deleted/.test(document.querySelector('#ac')?.textContent || ''));
  assert.equal((await q`select 1 from "user" where email = ${email}`).length, 0);
  assert.equal(await p.evaluate(() => localStorage.getItem('wat:member')), 'false');
  assert.deepEqual(blocked, [], 'nothing on the page was refused by its policy');
  assert.deepEqual(asked, [], 'the page asked nothing of any other site');
  await p.close();
});
