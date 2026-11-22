// Email: Resend over plain fetch (no SDK), and a stand-in with the same methods for the dev server and the tests.
// Two keys (docs/accounts.md, T13): `sendKey` can only send from our domain and is used for codes; `contactsKey` has
// full access and is used for contacts. Nothing here logs an address, a code or a provider's error body.
export const FROM = 'Where Are They <alerts@wherearethey.info>';
export const REPLY_TO = 'wherearetheyinfo@proton.me';

const codeText = (code, minutes, type) => [
  type === 'delete' ? `Your code to delete your Where Are They account: ${code}` : `Your Where Are They code: ${code}`,
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
        subject: type === 'delete' ? 'Your code to delete your account' : 'Your Where Are They code',
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
      await call(contactsKey, 'PATCH', `/contacts/${contactId}/topics`, { topics: topicList(on) });
      // Resend's unsubscribe page also marks the whole contact "unsubscribed", which blocks every broadcast whatever
      // the topics say. A member who switches an alert on again, on our pages, has undone that.
      if (Object.values(on).some(Boolean)) await call(contactsKey, 'PATCH', `/contacts/${contactId}`, { unsubscribed: false });
      return contactId;
    },
    async deleteContact(contactId) {
      try { await call(contactsKey, 'DELETE', `/contacts/${contactId}`); } catch (e) { if (e.status !== 404) throw e; }
    },
    call: (method, path, body) => call(contactsKey, method, path, body), // for scripts/alert.mjs
  };
}

// The stand-in: remembers what it was asked to do. `print` shows codes in the terminal (the dev server).
export function fakeMail({ print = false, fail = {} } = {}) {
  const m = {
    codes: [], contacts: new Map(), deleted: [], owner: [], fail, n: 0,
    async sendCode({ email, code, type }) {
      if (m.fail.send) throw new MailError(500);
      m.codes.push({ email, code, type });
      if (print) console.log(`\n  ✉  code for ${email}${type === 'delete' ? ' (delete account)' : ''}: ${code}\n`);
    },
    async notifyOwner(subject, text) { m.owner.push({ subject, text }); if (print) console.log(`  ✉  to the owner: ${subject}`); },
    async syncContact({ email, contactId, on }) {
      if (m.fail.sync) throw new MailError(500);
      const id = contactId || [...m.contacts].find(([, c]) => c.email === email)?.[0] || `contact_${++m.n}`;
      m.contacts.set(id, { email, on: { ...on } });
      return id;
    },
    async deleteContact(id) { if (m.fail.delete) throw new MailError(500); m.contacts.delete(id); m.deleted.push(id); },
    last: email => m.codes.findLast(c => c.email === email)?.code,
  };
  return m;
}
