// Email: Resend over plain fetch (no SDK), and a stand-in with the same methods for the dev server and the tests.
// Two keys (docs/accounts.md, T13): `sendKey` can only send from our domain and is used for codes; `contactsKey` has
// full access and is used for contacts. Nothing here logs an address, a code or a provider's error body.
export const FROM = 'Where Are They <alerts@wherearethey.info>';
export const REPLY_TO = 'wherearetheyinfo@proton.me';

const codeText = (code, minutes, type) => [
  type === 'delete' ? `Your code to delete your Where Are They account: ${code}` : type === 'confirm' ? `Your code to confirm sending an email to members: ${code}` : `Your Where Are They code: ${code}`,
  '', `It expires in ${minutes} minutes. Enter it on the page where you asked for it.`,
  '', "If it wasn't you, ignore this email: nothing happens without the code.",
  '', 'Where Are They · wherearethey.info',
].join('\n');

export class MailError extends Error {
  constructor(status, name) { super(`mail ${status} ${name || ''}`.trim()); this.status = status; this.name_ = name; }
}

// topics: { pursue: '<resend topic id>' }; segment: the "Members" segment's id
export function resendMail({ sendKey, contactsKey, topics = {}, segment, fetch = globalThis.fetch }) {
  async function call(key, method, path, body, headers = {}) {
    const r = await fetch(`https://api.resend.com${path}`, {
      method, headers: { authorization: `Bearer ${key}`, ...(body !== undefined && { 'content-type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new MailError(r.status, data?.name);
    return data;
  }
  const topicList = on => Object.entries(topics).filter(([, id]) => id).map(([t, id]) => ({ id, subscription: on[t] ? 'opt_in' : 'opt_out' }));
  return {
    // idempotencyKey: the same code is never sent twice if the function is retried
    async sendCode({ email, code, minutes, type, idempotencyKey }) {
      await call(sendKey, 'POST', '/emails', {
        from: FROM, to: [email], reply_to: REPLY_TO,
        subject: type === 'delete' ? 'Your code to delete your account' : type === 'confirm' ? 'Your code to confirm sending' : 'Your Where Are They code',
        text: codeText(code, minutes, type),
      }, idempotencyKey ? { 'idempotency-key': idempotencyKey } : {});
    },
    async notifyOwner(subject, text) {
      await call(sendKey, 'POST', '/emails', { from: FROM, to: [REPLY_TO], subject, text });
    },
    // create or update the contact so that Resend's topics say what `on` ({ pursue: true }) says; returns its id
    async syncContact({ email, contactId, on }) {
      if (!contactId) {
        try {
          return (await call(contactsKey, 'POST', '/contacts', { email, unsubscribed: false, ...(segment && { segments: [{ id: segment }] }), topics: topicList(on) })).id;
        } catch (e) {
          if (e.status !== 409 && e.status !== 422) throw e; // it may exist already (an earlier deletion that failed)
          contactId = (await call(contactsKey, 'GET', `/contacts/${encodeURIComponent(email)}`)).id;
        }
      }
      await call(contactsKey, 'PATCH', `/contacts/${contactId}/topics`, topicList(on)); // the body is the bare list: Resend answers 422 to { topics: [...] } (tried on 22 November)
      // Resend's unsubscribe page also marks the whole contact "unsubscribed", which blocks every broadcast whatever
      // the topics say. A member who switches an alert on again, on our pages, has undone that.
      if (Object.values(on).some(Boolean)) await call(contactsKey, 'PATCH', `/contacts/${contactId}`, { unsubscribed: false });
      return contactId;
    },
    async deleteContact(contactId) {
      try { await call(contactsKey, 'DELETE', `/contacts/${contactId}`); } catch (e) { if (e.status !== 404) throw e; }
    },
    // ── for the owner's admin page (api/admin.mjs) ──
    async sendTest({ to, subject, html, text }) {
      await call(sendKey, 'POST', '/emails', { from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text });
    },
    // a broadcast to the members who chose `topic`, made as a draft; returns its id
    async createBroadcast({ name, topic, subject, html, text }) {
      if (!topics[topic] || !segment) throw new MailError(0, 'no-topic');
      return (await call(contactsKey, 'POST', '/broadcasts', { name, segment_id: segment, topic_id: topics[topic], from: FROM, reply_to: REPLY_TO, subject, html, text, send: false })).id;
    },
    // at: an ISO time to send it at; none = now
    async sendBroadcast(id, at) { await call(contactsKey, 'POST', `/broadcasts/${id}/send`, at ? { scheduled_at: at } : {}); },
    // a draft or a scheduled one (which cancels it); one already gone is fine
    async deleteBroadcast(id) { try { await call(contactsKey, 'DELETE', `/broadcasts/${id}`); } catch (e) { if (e.status !== 404) throw e; } },
    // { status, … } as Resend has it, or null when it has none by that id
    async getBroadcast(id) { try { return await call(contactsKey, 'GET', `/broadcasts/${id}`); } catch (e) { if (e.status === 404) return null; throw e; } },
    call: (method, path, body) => call(contactsKey, method, path, body), // for scripts/alert.mjs
  };
}

// The stand-in: remembers what it was asked to do. `print` shows codes in the terminal (the dev server).
export function fakeMail({ print = false, fail = {} } = {}) {
  const m = {
    codes: [], contacts: new Map(), deleted: [], owner: [], tests: [], broadcasts: new Map(), fail, n: 0,
    async sendCode({ email, code, type }) {
      if (m.fail.send) throw new MailError(500);
      m.codes.push({ email, code, type });
      if (print) console.log(`\n  ✉  code for ${email}${type === 'delete' ? ' (delete account)' : type === 'confirm' ? ' (confirm sending)' : ''}: ${code}\n`);
    },
    async notifyOwner(subject, text) { m.owner.push({ subject, text }); if (print) console.log(`  ✉  to the owner: ${subject}`); },
    async syncContact({ email, contactId, on }) {
      if (m.fail.sync) throw new MailError(500);
      const id = contactId || [...m.contacts].find(([, c]) => c.email === email)?.[0] || `contact_${++m.n}`;
      m.contacts.set(id, { email, on: { ...on } });
      return id;
    },
    async sendTest(e) { if (m.fail.send) throw new MailError(500); m.tests.push(e); if (print) console.log(`  ✉  test email to ${e.to}: ${e.subject}`); },
    async createBroadcast(b) { if (m.fail.broadcast) throw new MailError(500); const id = `broadcast_${++m.n}`; m.broadcasts.set(id, { ...b, status: 'draft' }); return id; },
    async sendBroadcast(id, at) { if (m.fail.sendBroadcast) throw new MailError(500); const b = m.broadcasts.get(id); b.status = at ? 'scheduled' : 'sent'; b.at = at; if (print) console.log(`  ✉  broadcast "${b.subject}" ${at ? `scheduled for ${at}` : 'sent'}`); },
    async deleteBroadcast(id) { m.broadcasts.delete(id); },
    async getBroadcast(id) { return m.broadcasts.get(id) || null; },
    async deleteContact(id) { if (m.fail.delete) throw new MailError(500); m.contacts.delete(id); m.deleted.push(id); },
    last: email => m.codes.findLast(c => c.email === email)?.code,
  };
  return m;
}
