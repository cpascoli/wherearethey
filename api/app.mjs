// The accounts API (docs/accounts.md, section 7): plain functions, a Request in and a Response out, so the same code
// runs in the Netlify Function, on the dev server and in the tests.
//   createApp({ db, mail, env }) → handle(request, { ip, waitUntil })
// env: { origin, secret, limitKey, webhookSecret, topics: { pursue: '<resend topic id>' }, secure }
import { createHmac, timingSafeEqual } from 'node:crypto';
import { query } from './db.mjs';
import { makeAuth, CODE_MINUTES } from './auth.mjs';
import { makeLimits, ALL_CODES } from './limits.mjs';

export const TOPICS = ['pursue'];
export const PLACEMENTS = ['pursue', 'file', 'latest', 'home', 'account'];
// The wording a person agreed to, by version: the text itself is the sign-up block's and /account's, in git under
// this name. Add a version when the promise or the small print changes; never edit one.
export const WORDINGS = ['2026-12-a'];

const json = (status, body, headers) => new Response(body === undefined ? null : JSON.stringify(body), {
  status, headers: { ...(body !== undefined && { 'content-type': 'application/json' }), 'cache-control': 'no-store', ...headers },
});
const fail = (status, error) => json(status, { error });
const cleanEmail = v => (typeof v === 'string' && v.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>".]+$/.test(v.trim()) ? v.trim().toLowerCase() : null);
export const mask = email => email.replace(/^(.)[^@]*/, '$1…');

export function createApp({ db, mail, env, now = Date.now }) {
  const q = query(db);
  const limits = makeLimits({ db, key: env.limitKey, now });
  const auth = makeAuth({
    db, secret: env.secret, origin: env.origin, secure: env.secure !== false,
    sendCode: ({ email, code, type }) => mail.sendCode({
      email, code, minutes: CODE_MINUTES, type: type === 'email-verification' ? 'delete' : 'sign-in',
      idempotencyKey: createHmac('sha256', env.limitKey).update(`code:${email}:${code}`).digest('base64url'),
    }),
  });

  // ── helpers ──
  async function body(request, max = 4096) {
    const text = await request.text();
    if (text.length > max) return null;
    try { const v = JSON.parse(text || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
  }
  // the session of this request: { user, cookies } (cookies: a refreshed cookie to pass on), or null
  async function session(request) {
    const cookie = request.headers.get('cookie');
    if (!cookie) return null;
    const r = await auth.api.getSession({ headers: new Headers({ cookie }), returnHeaders: true }).catch(() => null);
    return r?.response?.user ? { user: r.response.user, token: r.response.session.token, cookies: r.headers?.getSetCookie?.() || [] } : null;
  }
  const withCookies = (res, cookies) => { for (const c of cookies || []) res.headers.append('set-cookie', c); return res; };
  async function state(user) {
    const subs = await q`select topic from subscription where user_id = ${user.id} and status = 'on'`;
    const [mc] = await q`select suppressed_at from mail_contact where user_id = ${user.id}`;
    return { signedIn: true, maskedEmail: mask(user.email), topics: Object.fromEntries(TOPICS.map(t => [t, subs.some(s => s.topic === t)])), suppressed: !!mc?.suppressed_at };
  }
  // tell Resend what the database says for this member; a failure leaves synced_at empty for the daily retry
  async function sync(user) {
    const subs = await q`select topic, status from subscription where user_id = ${user.id}`;
    if (!subs.length) return;
    await q`insert into mail_contact (user_id) values (${user.id}) on conflict (user_id) do update set synced_at = null`;
    try {
      const [mc] = await q`select resend_contact_id from mail_contact where user_id = ${user.id}`;
      const id = await mail.syncContact({ email: user.email, contactId: mc.resend_contact_id, on: Object.fromEntries(subs.map(s => [s.topic, s.status === 'on'])) });
      await q`update mail_contact set resend_contact_id = ${id}, synced_at = ${new Date(now())} where user_id = ${user.id}`;
    } catch { /* retried by api/purge.mjs */ }
  }
  // record a member's choice: the subscription, and the consent event that proves it
  async function choose(userId, topic, on, { by = 'member', placement, wording }) {
    await db.transaction().execute(async tx => {
      const t = query(tx);
      await t`insert into subscription (user_id, topic, status, changed_at, changed_by) values (${userId}, ${topic}, ${on ? 'on' : 'off'}, ${new Date(now())}, ${by})
        on conflict (user_id, topic) do update set status = excluded.status, changed_at = excluded.changed_at, changed_by = excluded.changed_by`;
      await t`insert into consent_event (user_id, topic, granted, wording_version, placement, at) values (${userId}, ${topic}, ${on}, ${wording}, ${placement}, ${new Date(now())})`;
    });
  }
  const suppressed = async userId => !!(await q`select 1 from mail_contact where user_id = ${userId} and suppressed_at is not null`).length;
  // a code to `email`: the limits, then the sending, which runs after the response so that a new and a known
  // address answer alike and as fast
  async function sendCode(email, ip, type, ctx) {
    const okAddr = await limits.allow('codeAddress', email), okIp = await limits.allow('codeIp', ip);
    if (!okAddr || !okIp) return fail(429, 'too-many');
    const all = await limits.count('codeAll', '*', 86400);
    if (all > ALL_CODES.stop) return fail(503, 'busy');
    const work = (async () => {
      if (all === ALL_CODES.warn) await mail.notifyOwner('Where Are They: 60 codes sent today', `Sign-in stops at ${ALL_CODES.stop} codes a day on Resend's free plan.`).catch(() => {});
      await auth.api.sendVerificationOTP({ body: { email, type } }).catch(() => {});
    })();
    if (ctx.waitUntil) ctx.waitUntil(work); else await work;
    return json(202, { sent: true });
  }

  // ── routes ──
  const routes = {
    'POST /api/code': async (request, ctx) => {
      const b = await body(request), email = cleanEmail(b?.email);
      if (!email) return fail(400, 'email');
      return sendCode(email, ctx.ip, 'sign-in', ctx);
    },

    'POST /api/session': async (request, ctx) => {
      const b = await body(request), email = cleanEmail(b?.email), code = typeof b?.code === 'string' ? b.code.replace(/\s+/g, '') : '';
      if (!email || !/^\d{8}$/.test(code)) return fail(400, 'invalid');
      const subscribe = b.subscribe === true;
      if (subscribe && (!PLACEMENTS.includes(b.placement) || !WORDINGS.includes(b.wording))) return fail(400, 'consent');
      if (!await limits.allow('verifyIp', ctx.ip)) return fail(429, 'too-many');
      const r = await auth.api.signInEmailOTP({ body: { email, otp: code }, asResponse: true }).catch(e => e);
      if (!(r instanceof Response) || !r.ok) {
        const c = r instanceof Response ? (await r.json().catch(() => ({}))).code : r?.body?.code;
        return fail(400, c === 'OTP_EXPIRED' ? 'expired' : c === 'TOO_MANY_ATTEMPTS' ? 'attempts' : 'invalid');
      }
      const { user } = await r.json();
      // only now, with the address proven, is anything recorded about alerts
      if (subscribe && !await suppressed(user.id)) { await choose(user.id, 'pursue', true, b); await sync(user); }
      return withCookies(json(200, await state(user)), r.headers.getSetCookie());
    },

    'GET /api/me': async request => {
      const s = await session(request);
      return s ? withCookies(json(200, await state(s.user)), s.cookies) : json(200, { signedIn: false });
    },

    'PUT /api/subscriptions/:topic': async (request, ctx, topic) => {
      const s = await session(request);
      if (!s) return fail(401, 'signed-out');
      const b = await body(request);
      if (!TOPICS.includes(topic) || typeof b?.on !== 'boolean' || !PLACEMENTS.includes(b.placement) || !WORDINGS.includes(b.wording)) return fail(400, 'consent');
      if (b.on && await suppressed(s.user.id)) return fail(409, 'suppressed');
      await choose(s.user.id, topic, b.on, b);
      await sync(s.user);
      return withCookies(json(200, await state(s.user)), s.cookies);
    },

    'DELETE /api/session': async request => {
      const s = await session(request);
      const b = await body(request);
      const out = await auth.api.signOut({ headers: new Headers({ cookie: request.headers.get('cookie') || '' }), asResponse: true }).catch(() => null);
      if (s && b?.everywhere === true) await q`delete from session where "userId" = ${s.user.id}`;
      return withCookies(json(204), out?.headers?.getSetCookie?.());
    },

    'POST /api/account/code': async (request, ctx) => {
      const s = await session(request);
      if (!s) return fail(401, 'signed-out');
      return sendCode(s.user.email, ctx.ip, 'email-verification', ctx);
    },

    'DELETE /api/account': async (request, ctx) => {
      const s = await session(request);
      if (!s) return fail(401, 'signed-out');
      const b = await body(request), code = typeof b?.code === 'string' ? b.code.replace(/\s+/g, '') : '';
      if (!/^\d{8}$/.test(code)) return fail(400, 'invalid');
      if (!await limits.allow('verifyIp', ctx.ip)) return fail(429, 'too-many');
      const r = await auth.api.verifyEmailOTP({ body: { email: s.user.email, otp: code }, asResponse: true }).catch(e => e);
      if (!(r instanceof Response) || !r.ok) {
        const c = r instanceof Response ? (await r.json().catch(() => ({}))).code : r?.body?.code;
        return fail(400, c === 'OTP_EXPIRED' ? 'expired' : c === 'TOO_MANY_ATTEMPTS' ? 'attempts' : 'invalid');
      }
      // the account and everything hanging from it go now; the copy at Resend is queued, tried, and retried daily
      const contact = await db.transaction().execute(async tx => {
        const t = query(tx);
        const [mc] = await t`select resend_contact_id from mail_contact where user_id = ${s.user.id}`;
        if (mc?.resend_contact_id) await t`insert into contact_deletion (resend_contact_id, requested_at) values (${mc.resend_contact_id}, ${new Date(now())}) on conflict do nothing`;
        await t`delete from verification where identifier like ${'%-otp-' + s.user.email}`;
        await t`delete from "user" where id = ${s.user.id}`;
        return mc?.resend_contact_id;
      });
      if (contact) await dropContact(contact);
      const out = await auth.api.signOut({ headers: new Headers({ cookie: request.headers.get('cookie') || '' }), asResponse: true }).catch(() => null);
      return withCookies(json(204), out?.headers?.getSetCookie?.());
    },

    'POST /api/hooks/resend': async request => {
      const raw = await request.text();
      if (raw.length > 65536) return fail(400, 'size');
      const id = request.headers.get('svix-id'), ts = request.headers.get('svix-timestamp'), sig = request.headers.get('svix-signature');
      if (!verifyWebhook(env.webhookSecret, id, ts, sig, raw, now())) return fail(400, 'signature');
      const fresh = await q`insert into webhook_event (id, received_at) values (${id}, ${new Date(now())}) on conflict do nothing returning id`;
      if (fresh.length) { let ev; try { ev = JSON.parse(raw); } catch { return fail(400, 'body'); } await applyEvent(ev); }
      return json(204);
    },
  };

  async function dropContact(id) {
    try { await mail.deleteContact(id); await q`delete from contact_deletion where resend_contact_id = ${id}`; } catch { /* retried by api/purge.mjs */ }
  }
  const userByEmail = async email => (await q`select id, email from "user" where email = ${String(email || '').trim().toLowerCase()}`)[0];
  async function suppress(email, reason) {
    const u = await userByEmail(email);
    if (!u) return;
    await q`insert into mail_contact (user_id, suppressed_at, suppressed_reason) values (${u.id}, ${new Date(now())}, ${reason})
      on conflict (user_id) do update set suppressed_at = coalesce(mail_contact.suppressed_at, excluded.suppressed_at), suppressed_reason = coalesce(mail_contact.suppressed_reason, excluded.suppressed_reason)`;
  }
  // What Resend tells us. It can switch an alert off or mark an address; it switches one on only when the member
  // did so on Resend's own preferences page.
  async function applyEvent(ev) {
    const d = ev?.data || {};
    const fromEmail = { by: 'email_link', placement: 'email', wording: 'resend-preferences' };
    if (ev.type === 'email.bounced') { if (d.bounce?.type === 'Permanent') await suppress(d.to?.[0], 'bounce'); }
    else if (ev.type === 'email.complained') await suppress(d.to?.[0], 'complaint');
    else if (ev.type === 'suppression.added') await suppress(d.email, ['bounce', 'complaint'].includes(d.origin) ? d.origin : 'manual');
    else if (ev.type === 'suppression.removed') { // the owner cleared it at Resend
      const u = await userByEmail(d.email);
      if (u) await q`update mail_contact set suppressed_at = null, suppressed_reason = null where user_id = ${u.id}`;
    } else if (ev.type === 'contact.updated') {
      const u = d.unsubscribed === true && await userByEmail(d.email);
      if (u) for (const s of await q`select topic from subscription where user_id = ${u.id} and status = 'on'`) await choose(u.id, s.topic, false, fromEmail);
    } else if (ev.type === 'contact.topics.updated') {
      const u = await userByEmail(d.email);
      if (u) for (const t of d.topics || []) {
        const topic = TOPICS.find(k => env.topics?.[k] && env.topics[k] === t.id), on = t.subscription === 'opt_in';
        if (!topic || !['opt_in', 'opt_out'].includes(t.subscription)) continue;
        const [cur] = await q`select status from subscription where user_id = ${u.id} and topic = ${topic}`;
        if ((cur?.status === 'on') !== on) await choose(u.id, topic, on, fromEmail);
      }
    } else if (ev.type === 'contact.deleted') {
      if (d.id) { await q`delete from contact_deletion where resend_contact_id = ${d.id}`; await q`update mail_contact set resend_contact_id = null, synced_at = null where resend_contact_id = ${d.id}`; }
    }
  }

  async function handle(request, ctx = {}) {
    const url = new URL(request.url);
    let key = `${request.method} ${url.pathname.replace(/\/$/, '')}`, arg;
    const m = key.match(/^PUT \/api\/subscriptions\/([a-z]+)$/);
    if (m) { key = 'PUT /api/subscriptions/:topic'; arg = m[1]; }
    const route = routes[key];
    if (!route) return fail(404, 'not-found');
    // every write but the signed webhook must come from our own pages
    if (request.method !== 'GET' && key !== 'POST /api/hooks/resend' && request.headers.get('origin') !== env.origin) return fail(403, 'origin');
    try { return await route(request, { ip: ctx.ip || 'unknown', waitUntil: ctx.waitUntil }, arg); }
    catch { return fail(500, 'error'); } // never the error itself: it could carry an address
  }
  return { handle, auth, sync, dropContact, q };
}

// Resend signs webhooks as Svix does: HMAC-SHA256 of "id.timestamp.body" with the secret after "whsec_" (base64),
// sent as "v1,<base64>" (several, space-separated, while a secret is being rotated). Five minutes of tolerance.
export function verifyWebhook(secret, id, timestamp, signatures, raw, nowMs = Date.now()) {
  if (!secret || !id || !timestamp || !signatures || Math.abs(nowMs / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const want = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest();
  return signatures.split(' ').some(s => {
    const [v, sig] = s.split(',');
    const got = Buffer.from(sig || '', 'base64');
    return v === 'v1' && got.length === want.length && timingSafeEqual(got, want);
  });
}
export const signWebhook = (secret, id, timestamp, raw) => 'v1,' + createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
