// /account (docs/accounts.md, section 4.2): sign in with an emailed code, choose the alerts, sign out, delete the
// account. A file of its own, with no inline script, so the page can run under a strict Content-Security-Policy.
// The page is built with DOM nodes and textContent only: nothing here turns a string into HTML.
(() => {
  'use strict';
  const WORDING = '2026-12-a'; // the version of the words agreed to (WORDINGS in api/app.mjs)
  const CONTACT = 'wherearetheyinfo@proton.me';
  const root = document.getElementById('ac'), title = document.getElementById('ac-title');
  try { const th = localStorage.getItem('wat:theme'); if (th) document.documentElement.dataset.theme = JSON.parse(th); } catch { /* no storage */ }

  // h('p.cls', { attr }, child, 'text', …)
  function h(tag, attrs, ...kids) {
    const [name, ...cls] = tag.split('.');
    const el = document.createElement(name);
    if (cls.length) el.className = cls.join(' ');
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const api = (method, path, body) => fetch(path, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json().catch(() => null) })).catch(() => ({ status: 0, body: null }));
  const remember = on => { try { localStorage.setItem('wat:member', JSON.stringify(!!on)); } catch { /* no storage */ } };
  const pending = {
    get() { try { const v = JSON.parse(sessionStorage.getItem('wat:ac')); return v && Date.now() - v.at < 600000 ? v : null; } catch { return null; } },
    set(v) { try { v ? sessionStorage.setItem('wat:ac', JSON.stringify(v)) : sessionStorage.removeItem('wat:ac'); } catch { /* no storage */ } },
  };
  const ERR = {
    email: "That doesn't look like an email address.", 'too-many': 'Too many tries for now. Wait a few minutes and try again.', busy: 'Email is busy, try again later.',
    invalid: "That code isn't right. Check the latest email.", expired: 'That code has expired. Send a new one.', attempts: 'Too many tries with that code. Send a new one.',
    suppressed: "Alerts can't be delivered to this address.", 'signed-out': 'You are signed out. Sign in again.',
  };
  const say = r => ERR[r.body?.error] || "That didn't work. Please try again later.";
  const mask = email => String(email).replace(/^(.)[^@]*/, '$1…');
  // A badge to tell accounts apart at a glance: the first letter of the address, on a colour worked out from what
  // /api/me gives us (the masked address). No picture is stored or fetched from anywhere. The colour is set through
  // the style object, which the page's policy allows; a style attribute in markup it would refuse.
  function badge(masked) {
    let n = 0; for (const ch of String(masked)) n = (n * 31 + ch.codePointAt(0)) % 360;
    const el = h('span.ac-badge', { 'aria-hidden': 'true' }, (String(masked).match(/[a-z0-9]/i)?.[0] || '?').toUpperCase());
    el.style.backgroundColor = `hsl(${n} 45% 38%)`;
    return el;
  }
  const mailto = () => h('a', { href: `mailto:${CONTACT}` }, CONTACT);

  let me = null, error = '', busy = false;
  let step = pending.get() || { name: 'email' }; // signed out: email → code. signed in: null → delete
  const draw = (...nodes) => { root.replaceChildren(...nodes.flat().filter(Boolean)); root.querySelector('[data-focus]')?.focus({ preventScroll: true }); };
  const errLine = () => error && h('p.ac-err', { role: 'alert' }, error);
  // run one request at a time, then draw again
  async function act(work) { if (busy) return; busy = true; error = ''; for (const b of root.querySelectorAll('button')) b.disabled = true; try { await work(); } finally { busy = false; render(); } }

  function codeForm(label, onCode, again) {
    const wait = () => Math.max(0, 60 - Math.floor((Date.now() - (step.sent || 0)) / 1000));
    const againBtn = h('button.plain', { type: 'button', disabled: !!wait(), onclick: () => act(again) }, wait() ? `Send again in 0:${String(wait()).padStart(2, '0')}` : 'Send again');
    const tick = setInterval(() => { if (!againBtn.isConnected) return clearInterval(tick); const w = wait(); againBtn.disabled = !!w || busy; againBtn.textContent = w ? `Send again in 0:${String(w).padStart(2, '0')}` : 'Send again'; }, 1000);
    return [
      h('form.ac-form', { novalidate: true, onsubmit: e => { e.preventDefault(); const code = e.target.elements.code.value.replace(/\D/g, ''); if (code.length !== 8) { error = 'The code has 8 digits.'; return render(); } act(() => onCode(code)); } },
        h('input', { name: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '9', placeholder: '1234 5678', 'aria-label': 'The 8-digit code', required: true, 'data-focus': true }),
        h('button.primary', {}, label)),
      errLine(),
      h('p.ac-small', {}, 'Use the latest email · ', againBtn),
    ];
  }

  function signedOut() {
    title.textContent = 'Sign in or create an account';
    if (step.name === 'code') return draw(h('div.ac-card', {},
      h('h2', {}, `Enter the 8-digit code sent to ${mask(step.email)}`),
      codeForm('Confirm', async code => {
        const r = await api('POST', '/api/session', { email: step.email, code, ...(step.alert && { subscribe: true, placement: 'account', wording: WORDING }) });
        if (r.status === 200) { me = r.body; remember(true); step = null; pending.set(null); } else error = say(r);
      }, async () => { const r = await api('POST', '/api/code', { email: step.email }); if (r.status === 202) { step.sent = Date.now(); pending.set(step); } else error = say(r); }),
      h('p.ac-small', {}, h('button.plain', { type: 'button', onclick: () => { step = { name: 'email' }; pending.set(null); error = ''; render(); } }, 'Change address'))));
    draw(h('div.ac-card', {},
      h('p', {}, 'Enter your email address and we send you a code. There is no password.'),
      h('form.ac-form', { novalidate: true, onsubmit: e => {
        e.preventDefault();
        const email = e.target.elements.email.value.trim(), alert = e.target.elements.alert.checked;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(email)) { error = ERR.email; return render(); }
        act(async () => {
          const r = await api('POST', '/api/code', { email });
          if (r.status === 202) { step = { name: 'code', email, alert, at: Date.now(), sent: Date.now() }; pending.set(step); }
          else error = r.status === 404 || r.status === 0 ? "Accounts aren't available right now." : say(r);
        });
      } },
        h('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'you@example.com', 'aria-label': 'Your email address', required: true, 'data-focus': true }),
        h('button.primary', {}, 'Send the code'),
        h('label.ac-check', {}, h('input', { type: 'checkbox', name: 'alert' }), h('span', {}, 'Also email me when a PURSUE release is out, usually within a day, with the files that matter. Unsubscribe in one click.'))),
      errLine(),
      h('p.ac-small', {}, 'A new address creates a free account (16+). ', h('a', { href: '/privacy' }, 'Privacy'))));
  }

  function signedIn() {
    title.textContent = 'Your account';
    if (step?.name === 'delete') return draw(h('div.ac-card.ac-warn', {},
      h('h2', {}, 'Delete your account'),
      h('p', {}, 'This deletes, now and for good:'),
      h('ul.ac-list', {}, h('li', {}, 'your email address and your account'), h('li', {}, 'the alerts you chose and the record of when you chose them'), h('li', {}, 'your sign-ins on every device'), h('li', {}, 'your contact at our email provider')),
      h('p', {}, 'What remains: copies in our backups, which expire within 30 days; and, if an email to you bounced or was reported as spam, our email provider keeps your address on its do-not-send list.'),
      h('p', {}, `To confirm, enter the code we just sent to ${me.maskedEmail}.`),
      codeForm('Delete my account', async code => {
        const r = await api('DELETE', '/api/account', { code });
        if (r.status === 204) { me = { signedIn: false, deleted: true }; remember(false); step = { name: 'email' }; } else error = say(r);
      }, async () => { const r = await api('POST', '/api/account/code', {}); if (r.status === 202) step.sent = Date.now(); else error = say(r); }),
      h('p.ac-small', {}, h('button.plain', { type: 'button', onclick: () => { step = null; error = ''; render(); } }, 'Keep my account'))));
    const on = !!me.topics?.pursue;
    draw(
      me.suppressed && h('div.ac-card.ac-warn', {}, h('h2', {}, "Alerts can't be delivered to this address"),
        h('p', {}, 'An email to you bounced, or one was reported as spam, so our email provider no longer sends to this address. If that is a mistake, write to ', mailto(), '.')),
      h('div.ac-card', {},
        h('p.ac-who', {}, badge(me.maskedEmail), h('span', {}, 'Signed in as ', h('b', {}, me.maskedEmail))),
        h('div.ac-row', {},
          h('div', {}, h('b', {}, 'PURSUE releases'), h('small', {}, 'An email usually within a day of each release, with the files that matter.')),
          h('button.ac-switch', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': 'PURSUE release alerts', disabled: me.suppressed && !on, onclick: () => act(async () => {
            const r = await api('PUT', '/api/subscriptions/pursue', { on: !on, placement: 'account', wording: WORDING });
            if (r.status === 200) me = r.body; else if (r.status === 401) { me = { signedIn: false }; remember(false); step = { name: 'email' }; } else error = say(r);
          }) }, on ? 'On' : 'Off')),
        errLine(),
        h('div.ac-actions', {},
          h('button', { type: 'button', onclick: () => signOut(false) }, 'Sign out'),
          h('button', { type: 'button', onclick: () => signOut(true) }, 'Sign out everywhere'),
          h('button.danger', { type: 'button', onclick: () => act(async () => { const r = await api('POST', '/api/account/code', {}); if (r.status === 202) step = { name: 'delete', sent: Date.now() }; else error = say(r); }) }, 'Delete account…'))),
      h('p.ac-small', {}, 'For a copy of your data, or anything else, write to ', mailto(), '.'));
  }
  const signOut = everywhere => act(async () => { await api('DELETE', '/api/session', { everywhere }); me = { signedIn: false }; remember(false); step = { name: 'email' }; });

  function render() {
    if (!me) return draw(h('p.muted', {}, 'Loading…'));
    if (me.off) return draw(h('div.ac-card', {}, h('p', {}, "Accounts aren't available right now. The archive needs none: everything is open to read."), h('p', {}, h('a', { href: '/' }, '← Back to the archive'))));
    if (me.signedIn) return signedIn();
    if (me.deleted) { me = { signedIn: false }; signedOut(); root.prepend(h('div.ac-card', {}, h('p', {}, 'Your account is deleted.'))); return; }
    signedOut();
  }
  render();
  api('GET', '/api/me').then(r => {
    me = r.status === 200 ? r.body : { off: true };
    if (r.status === 200) remember(me.signedIn);
    if (me.signedIn) { step = null; pending.set(null); } else if (!step) step = { name: 'email' };
    render();
  });
})();
