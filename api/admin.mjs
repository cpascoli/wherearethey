// The owner's routes (docs/accounts.md, section 18): figures about the accounts and the weekly digest's drafts.
// They exist only for the one address in env.admin, signed in like any member; for anyone else, signed in or not,
// every one of them answers 404. Rules that hold here:
//   - nothing returned names a member: the figures are counts, never an address or an id;
//   - a draft is structured text (api/digest.mjs), and the email is written on the server from it;
//   - sending or scheduling needs a fresh emailed code, and the version of the draft the owner was looking at, so a
//     stolen session or a script on the page can neither send nor swap the text under a send;
//   - before anything is sent, every member's latest choice must have reached Resend.
import { query } from './db.mjs';
import { clean, render, SITE } from './digest.mjs';

const DAY = 86400000;
const MAX_DRAFTS = 30, MAX_AHEAD = 30 * DAY, MIN_AHEAD = 2 * 60000;

export function adminRoutes({ db, mail, env, auth, limits, session, body, json, fail, withCookies, sendCode, sync, now }) {
  const q = query(db);
  const num = async rows => Number((await rows)[0]?.n || 0);
  // only the owner gets past this; everyone else is told there is nothing here
  const owner = work => async (request, ctx, arg) => {
    const s = await session(request);
    if (!s || !env.admin || s.user.email !== env.admin) return fail(404, 'not-found');
    return withCookies(await work(request, ctx, arg, s), s.cookies);
  };
  const recipients = topic => num(q`select count(*)::int as n from subscription s left join mail_contact m on m.user_id = s.user_id
    where s.topic = ${topic} and s.status = 'on' and m.suppressed_at is null`);
  const unsynced = () => num(q`select count(*)::int as n from mail_contact m where m.synced_at is null and exists (select 1 from subscription s where s.user_id = m.user_id)`);
  const iso = d => (d ? new Date(d).toISOString() : null);
  const row = r => ({ id: Number(r.id), subject: r.subject, status: r.status, version: r.version, updatedAt: iso(r.updated_at), scheduledAt: iso(r.scheduled_at), sentAt: iso(r.sent_at) });
  const one = async id => (await q`select * from broadcast_draft where id = ${id} and topic = 'digest'`)[0];
  const full = async r => { const d = { subject: r.subject, content: JSON.parse(r.content) }; return { ...row(r), content: d.content, ...render(d), recipients: await recipients('digest') }; };
  // a scheduled digest whose time has come: ask Resend what became of it (it may have been cancelled there)
  async function settle() {
    for (const r of await q`select id, resend_broadcast_id, scheduled_at from broadcast_draft where status = 'scheduled' and scheduled_at <= ${new Date(now())}`) {
      const b = await mail.getBroadcast(r.resend_broadcast_id).catch(() => undefined);
      if (b === null) await q`update broadcast_draft set status = 'draft', scheduled_at = null, resend_broadcast_id = null where id = ${r.id}`;
      else if (b?.status === 'sent') await q`update broadcast_draft set status = 'sent', sent_at = ${r.scheduled_at} where id = ${r.id}`;
    }
  }

  return {
    'GET /api/admin/stats': owner(async () => {
      const t = ms => new Date(now() - ms);
      const on = await q`select s.topic, count(*)::int as n, count(*) filter (where m.suppressed_at is null)::int as reach from subscription s
        left join mail_contact m on m.user_id = s.user_id where s.status = 'on' group by s.topic`;
      return json(200, {
        members: await num(q`select count(*)::int as n from "user"`),
        new7: await num(q`select count(*)::int as n from "user" where "createdAt" > ${t(7 * DAY)}`),
        new30: await num(q`select count(*)::int as n from "user" where "createdAt" > ${t(30 * DAY)}`),
        topics: Object.fromEntries(Object.keys(env.topics || {}).filter(k => env.topics[k]).map(k => { const r = on.find(x => x.topic === k); return [k, { on: r?.n || 0, reach: r?.reach || 0 }]; })),
        noAlert: await num(q`select count(*)::int as n from "user" u where not exists (select 1 from subscription s where s.user_id = u.id and s.status = 'on')`),
        suppressed: await num(q`select count(*)::int as n from mail_contact where suppressed_at is not null`),
        unsynced: await unsynced(),
        deletions: await num(q`select count(*)::int as n from contact_deletion`),
        sessions: await num(q`select count(*)::int as n from session where "expiresAt" > ${t(0)}`),
        off30: await num(q`select count(*)::int as n from consent_event where not granted and at > ${t(30 * DAY)}`),
        codesToday: await limits.peek('codeAll', '*', 86400),
        // where the alerts were switched on, by kind of place (never the file), and the sign-ups of each day
        placements: Object.fromEntries((await q`select placement, count(*)::int as n from consent_event where granted and at > ${t(30 * DAY)} group by placement`).map(r => [r.placement, r.n])),
        days: (await q`select to_char("createdAt" at time zone 'UTC', 'YYYY-MM-DD') as d, count(*)::int as n from "user" where "createdAt" > ${t(30 * DAY)} group by 1 order by 1`).map(r => [r.d, r.n]),
        at: iso(now()),
      });
    }),

    'GET /api/admin/digests': owner(async () => {
      await settle();
      return json(200, { digests: (await q`select * from broadcast_draft where topic = 'digest' order by id desc limit 60`).map(row), recipients: await recipients('digest'), topic: !!env.topics?.digest });
    }),

    'POST /api/admin/digests': owner(async request => {
      const d = clean(await body(request, 60000));
      if (d.error) return fail(400, d.error);
      if (await num(q`select count(*)::int as n from broadcast_draft where status = 'draft'`) >= MAX_DRAFTS) return fail(409, 'too-many-drafts');
      const [r] = await q`insert into broadcast_draft (topic, subject, content, status, created_at, updated_at) values ('digest', ${d.subject}, ${JSON.stringify(d.content)}, 'draft', ${new Date(now())}, ${new Date(now())}) returning *`;
      return json(201, await full(r));
    }),

    'GET /api/admin/digests/:id': owner(async (request, ctx, id) => {
      await settle();
      const r = await one(id);
      return r ? json(200, await full(r)) : fail(404, 'not-found');
    }),

    'PUT /api/admin/digests/:id': owner(async (request, ctx, id) => {
      const b = await body(request, 60000), d = clean(b);
      if (d.error) return fail(400, d.error);
      const [r] = await q`update broadcast_draft set subject = ${d.subject}, content = ${JSON.stringify(d.content)}, version = version + 1, updated_at = ${new Date(now())}
        where id = ${id} and topic = 'digest' and status = 'draft' and version = ${Number(b.version) || 0} returning *`;
      if (r) return json(200, await full(r));
      const cur = await one(id);
      return !cur ? fail(404, 'not-found') : fail(409, cur.status === 'draft' ? 'stale' : 'not-a-draft');
    }),

    'DELETE /api/admin/digests/:id': owner(async (request, ctx, id) => {
      const gone = await q`delete from broadcast_draft where id = ${id} and topic = 'digest' and status = 'draft' returning id`;
      if (gone.length) return json(204);
      return (await one(id)) ? fail(409, 'not-a-draft') : fail(404, 'not-found');
    }),

    // the email as written, to the owner's own address and nobody else
    'POST /api/admin/digests/:id/test': owner(async (request, ctx, id, s) => {
      const r = await one(id);
      if (!r) return fail(404, 'not-found');
      if (!await limits.allow('adminTest', 'owner')) return fail(429, 'too-many');
      const e = render({ subject: r.subject, content: JSON.parse(r.content) }), fill = t => t.replaceAll('{{{RESEND_UNSUBSCRIBE_URL}}}', `${SITE}/account`);
      try { await mail.sendTest({ to: s.user.email, subject: `[Test] ${r.subject}`, html: fill(e.html), text: fill(e.text) }); } catch { return fail(502, 'mail'); }
      return json(202, { sent: true });
    }),

    'POST /api/admin/code': owner(async (request, ctx, arg, s) => sendCode(s.user.email, ctx.ip, 'forget-password', ctx)),

    // Send now, or at `at`. Needs the code just emailed, and the version the owner reviewed.
    'POST /api/admin/digests/:id/send': owner(async (request, ctx, id, s) => {
      const b = await body(request), code = typeof b?.code === 'string' ? b.code.replace(/\s+/g, '') : '';
      if (!b || !/^\d{8}$/.test(code)) return fail(400, 'invalid');
      let at = null;
      if (b.at != null) { at = new Date(b.at); const ahead = at.getTime() - now(); if (typeof b.at !== 'string' || !(ahead >= MIN_AHEAD && ahead <= MAX_AHEAD)) return fail(400, 'when'); }
      if (!env.topics?.digest) return fail(409, 'no-topic');
      const r = await one(id);
      if (!r) return fail(404, 'not-found');
      if (r.status !== 'draft') return fail(409, 'not-a-draft');
      if (r.version !== Number(b.version)) return fail(409, 'stale');
      if (!await limits.allow('verifyIp', ctx.ip)) return fail(429, 'too-many');
      const v = await auth.api.checkVerificationOTP({ body: { email: s.user.email, type: 'forget-password', otp: code }, asResponse: true }).catch(e => e);
      if (!(v instanceof Response) || !v.ok) {
        const c = v instanceof Response ? (await v.json().catch(() => ({}))).code : v?.body?.code;
        return fail(400, c === 'OTP_EXPIRED' ? 'expired' : c === 'TOO_MANY_ATTEMPTS' ? 'attempts' : 'invalid');
      }
      // a code confirms one send: whoever deletes it goes on
      if (!(await q`delete from verification where identifier = ${'forget-password-otp-' + s.user.email} returning id`).length) return fail(400, 'invalid');
      // every choice made here must be at Resend before it decides who gets this
      for (const u of await q`select u.id, u.email from mail_contact m join "user" u on u.id = m.user_id where m.synced_at is null limit 50`) await sync(u);
      if (await unsynced()) return fail(409, 'unsynced');
      const reach = await recipients('digest');
      if (!reach) return fail(409, 'nobody');
      if (!await limits.allow('adminSend', 'owner')) return fail(429, 'too-many');
      const e = render({ subject: r.subject, content: JSON.parse(r.content) });
      let bid;
      try {
        bid = await mail.createBroadcast({ name: `digest-${r.id}-v${r.version}`, topic: 'digest', subject: r.subject, html: e.html, text: e.text });
        await q`update broadcast_draft set resend_broadcast_id = ${bid} where id = ${r.id}`;
        await mail.sendBroadcast(bid, at ? at.toISOString() : null);
      } catch {
        if (bid) { await mail.deleteBroadcast(bid).catch(() => {}); await q`update broadcast_draft set resend_broadcast_id = null where id = ${r.id}`; }
        return fail(502, 'mail');
      }
      const [done] = at
        ? await q`update broadcast_draft set status = 'scheduled', scheduled_at = ${at}, updated_at = ${new Date(now())} where id = ${r.id} returning *`
        : await q`update broadcast_draft set status = 'sent', sent_at = ${new Date(now())}, updated_at = ${new Date(now())} where id = ${r.id} returning *`;
      return json(200, { ...row(done), recipients: reach });
    }),

    // take a scheduled digest back: it becomes a draft again
    'POST /api/admin/digests/:id/cancel': owner(async (request, ctx, id) => {
      const r = await one(id);
      if (!r) return fail(404, 'not-found');
      if (r.status !== 'scheduled') return fail(409, 'not-scheduled');
      if (new Date(r.scheduled_at).getTime() <= now()) return fail(409, 'too-late');
      try { await mail.deleteBroadcast(r.resend_broadcast_id); } catch { return fail(502, 'mail'); }
      const [back] = await q`update broadcast_draft set status = 'draft', scheduled_at = null, resend_broadcast_id = null, updated_at = ${new Date(now())} where id = ${r.id} returning *`;
      return json(200, await full(back));
    }),
  };
}
