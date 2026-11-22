// How the API is served: by the Netlify Function (netlify/functions/api.mjs) and, for development and the UI tests,
// by a plain Node server (api/dev.mjs: scripts/dev.mjs, tests/helpers.mjs).
import { createApp } from './app.mjs';

const off = () => new Response(JSON.stringify({ error: 'not-found' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// The API exists on the production deploy only, and only while ACCOUNTS_ENABLED is "true": previews and branch deploys
// have no database and no keys, and answer 404 (docs/accounts.md, T11).
export const live = (context, env) => context?.deploy?.context === 'production' && env.ACCOUNTS_ENABLED === 'true';

export async function production(env) {
  const [{ pgDb }, { resendMail }] = await Promise.all([import('./db.mjs'), import('./mail.mjs')]);
  for (const k of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'LIMIT_HMAC_KEY', 'RESEND_SEND_KEY', 'RESEND_CONTACTS_KEY', 'RESEND_WEBHOOK_SECRET', 'RESEND_TOPIC_PURSUE', 'RESEND_SEGMENT'])
    if (!env[k]) throw new Error(`missing ${k}`); // the name only, never a value
  const db = await pgDb(env.DATABASE_URL), topics = { pursue: env.RESEND_TOPIC_PURSUE };
  const mail = resendMail({ sendKey: env.RESEND_SEND_KEY, contactsKey: env.RESEND_CONTACTS_KEY, topics, segment: env.RESEND_SEGMENT });
  const app = createApp({ db, mail, env: { origin: 'https://wherearethey.info', secret: env.BETTER_AUTH_SECRET, limitKey: env.LIMIT_HMAC_KEY, webhookSecret: env.RESEND_WEBHOOK_SECRET, topics } });
  return { app, db, mail };
}

// (request, context) → Response, for a Netlify Function. `build` makes the app on first use.
export function netlifyHandler({ env = process.env, build = () => production(env) } = {}) {
  let made;
  return async (request, context) => {
    if (!live(context, env)) return off();
    try {
      const { app } = await (made ||= build());
      return await app.handle(request, { ip: context.ip, waitUntil: context.waitUntil ? p => context.waitUntil(p) : undefined });
    } catch (e) {
      made = null;
      console.error('accounts: could not start', String(e?.message || '').startsWith('missing ') ? e.message : '');
      return new Response(JSON.stringify({ error: 'error' }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
  };
}

// A Node http listener for /api/*: `await api(req, res)`. The IP is the socket's, never a header.
export function nodeListener(app, origin) {
  return async (req, res) => {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 70000) { res.writeHead(413); return res.end(); } chunks.push(c); }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const r = await app.handle(new Request(origin + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), { ip: req.socket.remoteAddress || 'local' });
    res.statusCode = r.status;
    for (const [k, v] of r.headers) if (k !== 'set-cookie') res.setHeader(k, v);
    const cookies = r.headers.getSetCookie(); if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await r.arrayBuffer()));
  };
}
