// The accounts API (docs/accounts.md, section 15), on Postgres in memory (PGlite) with a stand-in for Resend.
// No browser and no built site needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, signWebhook, WORDINGS } from '../api/app.mjs';
import { devDb } from '../api/db-dev.mjs';
import { fakeMail } from '../api/mail.mjs';
import { purge } from '../api/purge.mjs';

const ORIGIN = 'https://wherearethey.info';
const SECRET = 'whsec_' + Buffer.from('a-webhook-secret-for-tests').toString('base64');
const W = WORDINGS[0];

// a fresh database, mail and clock per test; `client()` is one browser (it keeps its cookie)
async function setup() {
  const db = await devDb(), mail = fakeMail(), clock = { t: Date.parse('2026-12-01T10:00:00Z') };
  const app = createApp({ db, mail, now: () => clock.t, env: { origin: ORIGIN, secret: 's'.repeat(48), limitKey: 'k'.repeat(32), webhookSecret: SECRET, topics: { pursue: 'topic_pursue' } } });
  const q = app.q;
  function client(ip = '198.51.100.1') {
    let cookie = '';
    const c = async (method, path, body, { origin = ORIGIN, headers = {} } = {}) => {
      const res = await app.handle(new Request(ORIGIN + path, {
        method, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
        headers: { ...(origin && { origin }), ...(cookie && { cookie }), ...headers },
      }), { ip });
      for (const sc of res.headers.getSetCookie()) { c.setCookies.push(sc); const [kv] = sc.split(';'); cookie = /Max-Age=0/i.test(sc) ? '' : kv; }
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
    };
    c.setCookies = [];
    c.signIn = async (email, extra = {}) => { await c('POST', '/api/code', { email }); return c('POST', '/api/session', { email, code: mail.last(email), ...extra }); };
    return c;
  }
  const hook = (type, data, id = 'msg_' + Math.random().toString(36).slice(2), ts = Math.floor(clock.t / 1000)) => {
    const raw = JSON.stringify({ type, created_at: new Date(clock.t).toISOString(), data });
    return app.handle(new Request(ORIGIN + '/api/hooks/resend', { method: 'POST', body: raw, headers: { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': signWebhook(SECRET, id, ts, raw) } }), {});
  };
  return { db, mail, clock, app, q, client, hook };
}
const sub = { subscribe: true, placement: 'pursue', wording: W };

test('a new and a known address get the same answer', async () => {
  const { client, q, clock } = await setup();
  await client().signIn('known@example.com');
  clock.t += 61000;
  const a = await client('198.51.100.2')('POST', '/api/code', { email: 'known@example.com' });
  const b = await client('198.51.100.3')('POST', '/api/code', { email: 'new@example.com' });
  assert.equal(a.status, 202);
  assert.deepEqual([a.status, a.body, [...a.headers]], [b.status, b.body, [...b.headers]]);
  assert.equal((await q`select 1 from "user"`).length, 1, 'asking for a code creates no account');
});

test('nothing is recorded before the code is verified, and signing in subscribes to nothing', async () => {
  const { client, mail, q } = await setup();
  const c = client();
  await c('POST', '/api/code', { email: 'a@example.com' });
  assert.equal((await q`select 1 from "user"`).length + (await q`select 1 from consent_event`).length + mail.contacts.size, 0);
  const r = await c('POST', '/api/session', { email: 'a@example.com', code: mail.last('a@example.com') });
  assert.deepEqual(r.body, { signedIn: true, maskedEmail: 'a…@example.com', topics: { pursue: false }, suppressed: false });
  assert.equal((await q`select 1 from subscription`).length + (await q`select 1 from consent_event`).length + mail.contacts.size, 0);
  const [u] = await q`select name, image, "emailVerified" from "user"`;
  assert.deepEqual(u, { name: '', image: null, emailVerified: true });
});

test('signing up from the block records the consent and mirrors the contact', async () => {
  const { client, mail, q } = await setup();
  const r = await client().signIn('a@example.com', sub);
  assert.equal(r.body.topics.pursue, true);
  assert.deepEqual((await q`select topic, granted, wording_version, placement from consent_event`), [{ topic: 'pursue', granted: true, wording_version: W, placement: 'pursue' }]);
  assert.deepEqual([...mail.contacts.values()], [{ email: 'a@example.com', on: { pursue: true } }]);
  assert.ok((await q`select synced_at from mail_contact`)[0].synced_at);
});

test('an unknown placement or wording is refused, and no code is spent on it', async () => {
  const { client, mail } = await setup();
  const c = client();
  await c('POST', '/api/code', { email: 'a@example.com' });
  const code = mail.last('a@example.com');
  assert.equal((await c('POST', '/api/session', { email: 'a@example.com', code, subscribe: true, placement: 'incident/roswell', wording: W })).status, 400);
  assert.equal((await c('POST', '/api/session', { email: 'a@example.com', code, subscribe: true, placement: 'file', wording: 'made-up' })).status, 400);
  assert.equal((await c('POST', '/api/session', { email: 'a@example.com', code, ...sub })).status, 200);
});

test('wrong, replaced, expired and fourth-try codes fail', async () => {
  const { client, mail, clock, q } = await setup();
  const c = client(), email = 'a@example.com';
  await c('POST', '/api/code', { email });
  const first = mail.last(email), wrong = first === '00000000' ? '11111111' : '00000000';
  assert.deepEqual((await c('POST', '/api/session', { email, code: wrong })).body, { error: 'invalid' });
  clock.t += 61000; await c('POST', '/api/code', { email }); // a new code replaces the last
  assert.equal((await c('POST', '/api/session', { email, code: first })).status, 400, 'the replaced code');
  for (let i = 0; i < 3; i++) await c('POST', '/api/session', { email, code: wrong });
  assert.equal((await c('POST', '/api/session', { email, code: mail.last(email) })).status, 400, 'the right code after too many tries');
  clock.t += 61000; await c('POST', '/api/code', { email });
  await q`update verification set "expiresAt" = now() - interval '1 second'`; // Better Auth reads the real clock
  assert.deepEqual((await c('POST', '/api/session', { email, code: mail.last(email) })).body, { error: 'expired' });
  assert.equal((await q`select 1 from "user"`).length, 0);
});

test('every limit answers 429, and all codes stop before the daily allowance', async () => {
  const { client, mail, clock } = await setup();
  const code = (c, email) => c('POST', '/api/code', { email }).then(r => r.status);
  // one address: 1 a minute, 5 an hour
  let c = client('203.0.113.1');
  assert.deepEqual([await code(c, 'a@example.com'), await code(c, 'a@example.com')], [202, 429]);
  for (let i = 0; i < 3; i++) { clock.t += 61000; assert.equal(await code(client('203.0.113.' + (10 + i)), 'a@example.com'), 202); }
  clock.t += 61000; assert.equal(await code(client('203.0.113.20'), 'a@example.com'), 429, 'the sixth asked for in an hour (a refused one counts)');
  // one IP: 10 an hour
  c = client('203.0.113.50');
  for (let i = 0; i < 10; i++) assert.equal(await code(c, `p${i}@example.com`), 202);
  assert.equal(await code(c, 'p10@example.com'), 429);
  // verifications from one IP: 30 an hour
  c = client('203.0.113.60');
  for (let i = 0; i < 30; i++) assert.equal((await c('POST', '/api/session', { email: 'v@example.com', code: '12345678' })).status, 400);
  assert.equal((await c('POST', '/api/session', { email: 'v@example.com', code: '12345678' })).status, 429);
  // all codes: the owner hears at 60, sign-in stops after 95
  let n = mail.codes.length, last;
  for (let i = 0; n < 95; i++, n++) last = await code(client('192.0.2.' + (i % 250) + ''), `g${i}@example.org`);
  assert.equal(last, 202);
  assert.equal(mail.owner.length, 1);
  assert.equal(await code(client('192.0.2.251'), 'over@example.org'), 503);
  assert.equal(mail.codes.length, 95);
});

test('a write from another origin, or none, is refused', async () => {
  const { client } = await setup();
  const c = client();
  await c.signIn('a@example.com');
  const writes = [['POST', '/api/code', { email: 'a@example.com' }], ['POST', '/api/session', { email: 'a@example.com', code: '12345678' }],
    ['PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W }], ['DELETE', '/api/session', {}],
    ['POST', '/api/account/code', {}], ['DELETE', '/api/account', { code: '12345678' }]];
  for (const [m, p, b] of writes) for (const origin of ['https://evil.example', 'https://www.wherearethey.info', 'http://wherearethey.info', null])
    assert.equal((await c(m, p, b, { origin })).status, 403, `${m} ${p} from ${origin}`);
  assert.equal((await c('GET', '/api/me', undefined, { origin: null })).body.signedIn, true, 'the session survived');
  assert.equal((await c('GET', '/api/nothing')).status, 404);
});

test('the cookie is HttpOnly, Secure, SameSite=Lax, on /api only, with no Domain; the session row has no device', async () => {
  const { client, q } = await setup();
  const c = client();
  await c('POST', '/api/code', { email: 'a@example.com' }, { headers: { 'user-agent': 'Mozilla/5.0 Test', 'x-forwarded-for': '203.0.113.9' } });
  await c.signIn('a@example.com');
  const set = c.setCookies.filter(s => /session_token=/.test(s));
  assert.equal(set.length, 1);
  const [name, ...attrs] = set[0].split('; ');
  assert.match(name, /^__Secure-better-auth\.session_token=/);
  assert.deepEqual(attrs.sort(), ['HttpOnly', 'Max-Age=7776000', 'Path=/api', 'SameSite=Lax', 'Secure']);
  assert.deepEqual(await q`select "ipAddress", "userAgent" from session`, [{ ipAddress: null, userAgent: null }]);
  await assert.rejects(q`update session set "ipAddress" = '203.0.113.9'`, 'the table itself refuses a device');
});

test('me, sign out, sign out everywhere', async () => {
  const { client, clock } = await setup();
  const a = client(), b = client('198.51.100.9');
  assert.deepEqual((await a('GET', '/api/me')).body, { signedIn: false });
  await a.signIn('a@example.com'); clock.t += 61000; await b.signIn('a@example.com'); clock.t += 61000;
  assert.equal((await a('DELETE', '/api/session', {})).status, 204);
  assert.equal((await a('GET', '/api/me')).body.signedIn, false);
  assert.equal((await b('GET', '/api/me')).body.signedIn, true, 'the other browser stays signed in');
  await a.signIn('a@example.com');
  await a('DELETE', '/api/session', { everywhere: true });
  assert.equal((await b('GET', '/api/me')).body.signedIn, false);
});

test('the switch on /account, and what Resend reports back', async () => {
  const { client, mail, q, hook, app, clock } = await setup();
  const c = client();
  assert.equal((await c('PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W })).status, 401);
  await c.signIn('a@example.com'); clock.t += 61000;
  assert.equal((await c('PUT', '/api/subscriptions/digest', { on: true, placement: 'account', wording: W })).status, 400);
  assert.equal((await c('PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W })).body.topics.pursue, true);
  // unsubscribed from the email: off, and it stays off through a sign-in and a sync
  assert.equal((await hook('contact.topics.updated', { email: 'a@example.com', topics: [{ id: 'topic_pursue', subscription: 'opt_out' }] })).status, 204);
  assert.deepEqual(await q`select status, changed_by from subscription`, [{ status: 'off', changed_by: 'email_link' }]);
  assert.equal((await client('198.51.100.7').signIn('a@example.com')).body.topics.pursue, false);
  await app.sync((await q`select id, email from "user"`)[0]);
  assert.deepEqual([...mail.contacts.values()][0].on, { pursue: false });
  assert.deepEqual((await q`select granted, placement from consent_event order by id`), [{ granted: true, placement: 'account' }, { granted: false, placement: 'email' }]);
  // "unsubscribe from everything" at Resend
  await c('PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W });
  await hook('contact.updated', { email: 'a@example.com', unsubscribed: true });
  assert.equal((await c('GET', '/api/me')).body.topics.pursue, false);
});

test('a webhook is applied once, and only with a good, recent signature', async () => {
  const { client, q, hook, app, clock } = await setup();
  const c = client();
  await c.signIn('a@example.com', sub);
  const off = { email: 'a@example.com', topics: [{ id: 'topic_pursue', subscription: 'opt_out' }] };
  await hook('contact.topics.updated', off, 'msg_1');
  await c('PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W });
  await hook('contact.topics.updated', off, 'msg_1'); // delivered again
  assert.equal((await c('GET', '/api/me')).body.topics.pursue, true);
  const raw = JSON.stringify({ type: 'contact.topics.updated', data: off }), ts = String(Math.floor(clock.t / 1000));
  const send = h => app.handle(new Request(ORIGIN + '/api/hooks/resend', { method: 'POST', body: raw, headers: h }), {}).then(r => r.status);
  assert.equal(await send({ 'svix-id': 'msg_2', 'svix-timestamp': ts, 'svix-signature': 'v1,' + Buffer.from('nope').toString('base64') }), 400);
  assert.equal(await send({ 'svix-id': 'msg_2', 'svix-timestamp': ts, 'svix-signature': signWebhook(SECRET, 'msg_3', ts, raw) }), 400, 'signed for another id');
  assert.equal(await send({}), 400);
  assert.equal((await hook('contact.topics.updated', off, 'msg_4', Math.floor(clock.t / 1000) - 3600)).status, 400, 'an old timestamp');
  assert.equal((await c('GET', '/api/me')).body.topics.pursue, true);
  assert.equal((await q`select 1 from webhook_event`).length, 1);
});

test('a bounce or complaint marks the address, leaves the choice, and blocks switching on', async () => {
  const { client, q, hook, clock } = await setup();
  const c = client(), d = client('198.51.100.8');
  await c.signIn('a@example.com', sub);
  await hook('email.bounced', { to: ['a@example.com'], bounce: { type: 'Transient' } });
  assert.equal((await c('GET', '/api/me')).body.suppressed, false, 'a soft bounce is not a suppression');
  await hook('email.bounced', { to: ['a@example.com'], bounce: { type: 'Permanent', subType: 'General' } });
  assert.deepEqual((await c('GET', '/api/me')).body, { signedIn: true, maskedEmail: 'a…@example.com', topics: { pursue: true }, suppressed: true });
  assert.equal((await q`select suppressed_reason from mail_contact`)[0].suppressed_reason, 'bounce');
  await c('PUT', '/api/subscriptions/pursue', { on: false, placement: 'account', wording: W });
  assert.equal((await c('PUT', '/api/subscriptions/pursue', { on: true, placement: 'account', wording: W })).status, 409);
  // a member who never subscribed, then reports a code email as spam: signing up again doesn't subscribe
  await d.signIn('b@example.com');
  await hook('email.complained', { to: ['b@example.com'] });
  clock.t += 61000;
  const r = await client('198.51.100.10').signIn('b@example.com', sub);
  assert.deepEqual([r.status, r.body.topics.pursue, r.body.suppressed], [200, false, true]);
  await hook('email.complained', { to: ['nobody@example.com'] }); // not a member: nothing to do
  await hook('suppression.removed', { email: 'a@example.com' });
  assert.equal((await c('GET', '/api/me')).body.suppressed, false);
});

test('deleting an account needs a fresh code, removes every row, and retries the contact', async () => {
  const { client, mail, q, db, app, clock } = await setup();
  const c = client(), other = client('198.51.100.11');
  await c.signIn('a@example.com', sub); await other.signIn('keep@example.com', sub);
  const signInCode = mail.last('a@example.com');
  assert.equal((await c('DELETE', '/api/account', { code: signInCode })).status, 400, 'a used sign-in code');
  clock.t += 61000;
  assert.equal((await c('POST', '/api/account/code', {})).status, 202);
  assert.equal(mail.codes.at(-1).type, 'delete');
  mail.fail.delete = true;
  assert.equal((await c('DELETE', '/api/account', { code: mail.last('a@example.com') })).status, 204);
  assert.equal((await c('GET', '/api/me')).body.signedIn, false);
  const left = {};
  for (const t of ['user', 'session', 'account', 'subscription', 'consent_event', 'mail_contact']) left[t] = (await q`select * from ${(await import('kysely')).sql.table(t)}`).length;
  assert.deepEqual(left, { user: 1, session: 1, account: 0, subscription: 1, consent_event: 1, mail_contact: 1 }, 'only the other member is left');
  assert.equal((await q`select 1 from verification where identifier like '%a@example.com'`).length, 0);
  assert.equal(mail.contacts.size, 2, 'Resend was down: the contact is still there');
  assert.equal((await q`select 1 from contact_deletion`).length, 1, '…and queued');
  mail.fail.delete = false;
  assert.equal((await purge({ db, app, now: () => clock.t })).deleted, 1);
  assert.deepEqual([mail.contacts.size, (await q`select 1 from contact_deletion`).length], [1, 0]);
});

test('a failed sync is retried, and the daily purge removes what has expired and nothing else', async () => {
  const { client, mail, q, db, app, clock } = await setup();
  mail.fail.sync = true;
  const c = client();
  assert.equal((await c.signIn('a@example.com', sub)).body.topics.pursue, true, 'the choice is kept though Resend was down');
  assert.equal(mail.contacts.size, 0);
  await c('POST', '/api/code', { email: 'typed-never-confirmed@example.com' });
  await q`insert into webhook_event (id, received_at) values ('old', ${new Date(clock.t - 31 * 86400000)}), ('new', ${new Date(clock.t)})`;
  await q`update verification set "expiresAt" = ${new Date(clock.t - 1000)}`;
  mail.fail.sync = false;
  const later = clock.t + 3 * 86400000;
  const out = await purge({ db, app, now: () => later });
  assert.deepEqual(out, { codes: 1, sessions: 0, limits: out.limits, webhooks: 1, synced: 1, deleted: 0 });
  assert.ok(out.limits > 0);
  assert.equal((await q`select 1 from limit_counter`).length, 0);
  assert.equal(mail.contacts.size, 1);
  assert.equal((await c('GET', '/api/me')).body.signedIn, true);
});

test('outside production, or switched off, every route answers 404 and nothing is built', async () => {
  const { netlifyHandler } = await import('../api/serve.mjs');
  let built = 0;
  const h = env => netlifyHandler({ env, build: async () => { built++; return setup(); } });
  const ask = (handler, context) => handler(new Request(ORIGIN + '/api/me'), { ip: '198.51.100.1', ...context }).then(r => r.status);
  for (const context of ['deploy-preview', 'branch-deploy', 'dev', undefined]) assert.equal(await ask(h({ ACCOUNTS_ENABLED: 'true' }), { deploy: { context } }), 404, String(context));
  assert.equal(await ask(h({}), { deploy: { context: 'production' } }), 404);
  assert.equal(built, 0);
  assert.equal(await ask(h({ ACCOUNTS_ENABLED: 'true' }), { deploy: { context: 'production' } }), 200);
  assert.equal(await ask(netlifyHandler({ env: { ACCOUNTS_ENABLED: 'true' } }), { deploy: { context: 'production' } }), 500, 'no secrets: an error, not a crash');
});

test('the runtime role can add and read consent events, not change them, and cannot touch the schema', async () => {
  const { db, q, client } = await setup();
  const { grantRuntime } = await import('../api/db.mjs');
  await client().signIn('a@example.com', sub);
  await q`create role runtime`;
  await grantRuntime(db, 'runtime');
  // one connection in PGlite, so the role holds for what follows
  await q`set role runtime`;
  try {
    assert.equal((await q`select 1 from consent_event`).length, 1);
    await assert.rejects(q`update consent_event set granted = false`);
    await assert.rejects(q`delete from consent_event`);
    await assert.rejects(q`create table x (a int)`);
    await assert.rejects(q`alter table subscription drop constraint subscription_topic_check`);
    await assert.rejects(q`select 1 from schema_migration`);
    await q`delete from "user"`; // the account goes, and its consent events with it
    assert.equal((await q`select 1 from consent_event`).length, 0);
  } finally { await q`reset role`; }
});

test('switching an alert on again also clears the "unsubscribed" mark Resend sets on the contact; switching off does not touch it', async () => {
  const { resendMail } = await import('../api/mail.mjs');
  const calls = [];
  const fetch = async (url, init) => { calls.push(`${init.method} ${new URL(url).pathname} ${init.body || ''}`); return new Response(JSON.stringify({ id: 'c1' }), { status: 200 }); };
  const mail = resendMail({ sendKey: 's', contactsKey: 'c', topics: { pursue: 't1' }, segment: 'seg', fetch });
  assert.equal(await mail.syncContact({ email: 'a@example.com', contactId: 'c1', on: { pursue: true } }), 'c1');
  assert.deepEqual(calls, ['PATCH /contacts/c1/topics [{"id":"t1","subscription":"opt_in"}]', 'PATCH /contacts/c1 {"unsubscribed":false}']);
  calls.length = 0;
  await mail.syncContact({ email: 'a@example.com', contactId: 'c1', on: { pursue: false } });
  assert.deepEqual(calls, ['PATCH /contacts/c1/topics [{"id":"t1","subscription":"opt_out"}]']);
  calls.length = 0;
  await mail.syncContact({ email: 'a@example.com', on: { pursue: true } });
  assert.deepEqual(calls, ['POST /contacts {"email":"a@example.com","unsubscribed":false,"segments":[{"id":"seg"}],"topics":[{"id":"t1","subscription":"opt_in"}]}']);
});
