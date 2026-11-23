#!/usr/bin/env node
// The release alert (docs/accounts.md, section 8): makes a DRAFT broadcast at Resend. A person reads it, sends
// themself a test, and presses Send there; this script never sends.
//   npm run alert -- pursue 9 [--dry]      (--dry: reconcile nothing, create nothing, print the email)
// It 1. stops unless the release's page is live, 2. reconciles our database with Resend (unsubscribes first),
// 3. writes the email from the release's event and its highlights on the PURSUE file, in those files' own words,
// 4. creates the draft, prints how many people it would reach, and refuses a second draft for the same release.
// Needs in the Keychain "wherearethey-migrate" (database) and "wherearethey-resend" (the full-access key), and in
// the environment RESEND_TOPIC_PURSUE, RESEND_SEGMENT, and optionally ALERT_ADDRESS (a postal address for the footer; the owner has none, see docs/accounts.md, section 13).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readEntries } from './lib.mjs';

const SITE = 'https://wherearethey.info';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// a file's opening: whole sentences up to about `max` characters, and always the first one (never cut mid-sentence)
const firstSentences = (t, max = 260) => { const s = String(t || '').replace(/^\*Sources:.*$/gm, '').replace(/[*_`]|\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(?=\s|$)/g) || []; let out = ''; for (const x of s) { if (out && (out + x).length > max) break; out += x; } return out.trim(); };
const tagged = u => `${u}${u.includes('?') ? '&' : '?'}utm_source=alert&utm_medium=email`; // the same for every reader

// The email for PURSUE release n, from the files: { subject, text, html, picks }
export function draft(n, { entries = readEntries(), slugs = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/slugs.json'), 'utf8')), address } = {}) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const ev = byId.get(`ev-pursue-release-${String(n).padStart(2, '0')}`);
  if (!ev) throw new Error(`no event for release ${n} (content/event/ev-pursue-release-${String(n).padStart(2, '0')}.md): file the release first`);
  const url = id => `${SITE}/${slugs[id]}`;
  const lead = ev.data.facts?.[0]?.text;
  if (!lead) throw new Error("the release's event has no first statement to open the email with");
  const picks = (byId.get('pursue')?.data.highlights || []).filter(h => h.release === n && byId.has(h.file)).sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0)).slice(0, 5)
    .map(h => { const f = byId.get(h.file); return { name: f.data.name, url: tagged(url(h.file)), line: h.why || f.data.bio || firstSentences(f.body) }; }).filter(p => p.line);
  if (picks.length < 3) throw new Error(`release ${n} has ${picks.length} highlights with a line on the PURSUE file: it needs three to five`);
  const page = tagged(url(ev.id)), subject = `PURSUE Release ${n} is out: ${picks[0].name}`;
  const why = 'You get this because you asked for an email when a PURSUE release is out, at wherearethey.info.';
  const text = [lead, '', 'The files that matter:', '', ...picks.flatMap(p => [`${p.name}`, p.line, p.url, '']), `The whole release: ${page}`, '', '—', why,
    'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}', `Where Are They · Carlo Pascoli${address ? ` · ${address}` : ''}`].join('\n');
  const html = `<div style="font:16px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#142027;max-width:600px;margin:0 auto;padding:8px 4px">
<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b6a73;margin:0 0 6px">Where Are They · PURSUE Release ${n}</p>
<p>${esc(lead)}</p>
<p style="font-weight:600;margin:22px 0 6px">The files that matter</p>
${picks.map(p => `<p style="margin:0 0 14px"><a href="${esc(p.url)}" style="color:#0f766e;font-weight:600">${esc(p.name)}</a><br>${esc(p.line)}</p>`).join('\n')}
<p style="margin:22px 0"><a href="${esc(page)}" style="color:#0f766e">The whole release, record by record →</a></p>
<p style="font-size:13px;color:#5b6a73;border-top:1px solid #dfe4e2;padding-top:12px;margin-top:26px">${esc(why)} <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#5b6a73">Unsubscribe</a> in one click.<br>Where Are They · Carlo Pascoli${address ? ` · ${esc(address)}` : ''}</p>
</div>`;
  return { subject, text, html, picks, page: url(ev.id), name: `pursue-release-${String(n).padStart(2, '0')}` };
}

// Make Resend's contacts say what the database says, never the other way round except for "off": someone who
// unsubscribed there is switched off here first. Returns what it did; throws before doing anything that looks wrong.
export async function reconcile({ q, app, mail, topicId, dry = false, log = console.log }) {
  const { purge } = await import('../api/purge.mjs');
  const members = await q`select u.id, u.email, m.resend_contact_id, m.suppressed_at, coalesce(s.status, 'off') as status from "user" u
    left join mail_contact m on m.user_id = u.id left join subscription s on s.user_id = u.id and s.topic = 'pursue'`;
  const contacts = [];
  for (let after; ;) { const r = await mail.call('GET', `/contacts?limit=100${after ? `&after=${after}` : ''}`); contacts.push(...r.data); if (!r.has_more || !r.data.length) break; after = r.data.at(-1).id; }
  if (contacts.length && !members.length) throw new Error('Resend has contacts and the database has no members: wrong database? Nothing was changed.');
  const byEmail = new Map(members.map(m => [m.email, m]));
  const out = { off: 0, orphans: [], pushed: 0, recipients: 0 };
  // 1. unsubscribes at Resend win over an older "on" here
  for (const c of contacts) {
    const m = byEmail.get(String(c.email).toLowerCase());
    if (!m) { out.orphans.push(c.id); continue; }
    const topics = (await mail.call('GET', `/contacts/${c.id}/topics`)).data || [];
    c.optedIn = !c.unsubscribed && topics.some(t => t.id === topicId && t.subscription === 'opt_in');
    if (m.status === 'on' && !c.optedIn && m.resend_contact_id === c.id) {
      out.off++;
      if (!dry) { await q`update subscription set status = 'off', changed_at = now(), changed_by = 'email_link' where user_id = ${m.id} and topic = 'pursue'`;
        await q`insert into consent_event (user_id, topic, granted, wording_version, placement) values (${m.id}, 'pursue', false, 'resend-preferences', 'email')`; }
      m.status = 'off';
    }
  }
  // 2. contacts with no member (a deletion that never reached Resend): removed, unless that is suspiciously many
  if (out.orphans.length > Math.max(1, contacts.length * 0.05)) throw new Error(`${out.orphans.length} of ${contacts.length} contacts have no member here (more than 5%): stopped, nothing removed. Look before sending.`);
  if (!dry) { for (const id of out.orphans) await mail.deleteContact(id); await purge({ db: app.db_, app }); }
  // 3. members whose choice Resend doesn't have yet
  for (const m of members) {
    const c = contacts.find(x => x.id === m.resend_contact_id);
    if ((m.status === 'on') !== !!c?.optedIn && (m.status === 'on' || c)) { out.pushed++; if (!dry) await app.sync({ id: m.id, email: m.email }); }
    if (m.status === 'on' && !m.suppressed_at) out.recipients++;
  }
  log(`reconciled: ${out.off} unsubscribed at Resend, ${out.orphans.length} contacts without a member removed, ${out.pushed} synced`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [topic, num, ...flags] = process.argv.slice(2), dry = flags.includes('--dry'), n = Number(num);
  try {
    if (topic !== 'pursue' || !Number.isInteger(n)) throw new Error('usage: npm run alert -- pursue <release number> [--dry]');
    const address = process.env.ALERT_ADDRESS;
    const d = draft(n, { address });
    const live = await fetch(d.page, { redirect: 'manual' });
    if (live.status !== 200) throw new Error(`the release's page is not live (${live.status}): ${d.page}. Push the release first.`);
    console.log(`\nSubject: ${d.subject}\n\n${d.text}\n`);
    if (dry) { console.log('(--dry: nothing reconciled, nothing created)'); process.exit(0); }
    for (const k of ['RESEND_TOPIC_PURSUE', 'RESEND_SEGMENT']) if (!process.env[k]) throw new Error(`set ${k}`);
    const { keychain } = await import('./accounts-backup.mjs');
    const [{ pgDb, query }, { resendMail, FROM, REPLY_TO }, { createApp }] = await Promise.all([import('../api/db.mjs'), import('../api/mail.mjs'), import('../api/app.mjs')]);
    const db = await pgDb(keychain('wherearethey-migrate')), key = keychain('wherearethey-resend'), topics = { pursue: process.env.RESEND_TOPIC_PURSUE };
    const mail = resendMail({ sendKey: key, contactsKey: key, topics, segment: process.env.RESEND_SEGMENT });
    const app = createApp({ db, mail, env: { origin: SITE, secret: 'x'.repeat(40), limitKey: 'unused-by-this-script', topics } }); // no sign-in happens here
    app.db_ = db;
    const existing = (await mail.call('GET', '/broadcasts')).data?.find(b => b.name === d.name);
    if (existing) throw new Error(`a broadcast named ${d.name} exists already (${existing.status}): not making a second one`);
    const r = await reconcile({ q: query(db), app, mail, topicId: topics.pursue });
    const b = await mail.call('POST', '/broadcasts', { name: d.name, segment_id: process.env.RESEND_SEGMENT, topic_id: topics.pursue, from: FROM, reply_to: REPLY_TO, subject: d.subject, html: d.html, text: d.text, send: false });
    console.log(`\nDraft created at Resend: ${d.name} (${b.id}). It would reach ${r.recipients} ${r.recipients === 1 ? 'person' : 'people'}.\nNext: open it at resend.com, send yourself a test, read it, check the count there is ${r.recipients}, then Send.`);
    await db.destroy();
  } catch (e) { console.error('alert:', e.message); process.exit(1); }
}
