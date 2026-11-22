// The daily housekeeping (docs/accounts.md, sections 5 and 9): delete what has expired, and try again what Resend
// didn't take the first time. Returns counts only.
import { query } from './db.mjs';

export async function purge({ db, app, now = Date.now }) {
  const q = query(db), t = ms => new Date(now() - ms), DAY = 86400000;
  const n = async rows => (await rows).length;
  const out = {
    codes: await n(q`delete from verification where "expiresAt" < ${t(0)} returning id`),
    sessions: await n(q`delete from session where "expiresAt" < ${t(0)} returning id`),
    limits: await n(q`delete from limit_counter where window_start < ${t(2 * DAY)} returning key`),
    webhooks: await n(q`delete from webhook_event where received_at < ${t(30 * DAY)} returning id`),
    synced: 0, deleted: 0,
  };
  for (const u of await q`select u.id, u.email from mail_contact m join "user" u on u.id = m.user_id where m.synced_at is null`) { await app.sync(u); out.synced++; }
  for (const d of await q`select resend_contact_id from contact_deletion`) { await app.dropContact(d.resend_contact_id); out.deleted++; }
  return out;
}
