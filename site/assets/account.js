// /account (docs/accounts.md, section 4.2): sign in with an emailed code, choose the alerts, sign out, delete the
// account. A file of its own, with no inline script, so the page can run under a strict Content-Security-Policy.
// The page is built with DOM nodes and textContent only: nothing here turns a string into HTML.
// The same code draws the account part of the app's "Account and settings" dialog (app.js loads this file when the
// dialog first opens and calls watAccount.mount): there it runs under the app's looser policy, the owner's choice of
// 23 November, since the sign-up block already takes the address and the code in the app.
(() => {
  'use strict';
  const WORDING = '2026-12-b'; // the version of the words agreed to (WORDINGS in api/app.mjs)
  const CONTACT = 'wherearetheyinfo@proton.me';

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
  const remember = on => { try { localStorage.setItem('wat:member', JSON.stringify(!!on)); if (!on) localStorage.removeItem('wat:ac-shape'); } catch { /* no storage */ } };
  const member = () => { try { return JSON.parse(localStorage.getItem('wat:member')) === true; } catch { return false; } };
  // The outline of the signed-in view as this browser last drew it (which alerts, how many extra lines; nothing about
  // who), so the placeholder shown while the server answers is the same height as what replaces it.
  const shape = {
    get() { try { const v = JSON.parse(localStorage.getItem('wat:ac-shape')); return v && Array.isArray(v.t) ? v : null; } catch { return null; } },
    set(v) { try { localStorage.setItem('wat:ac-shape', JSON.stringify(v)); } catch { /* no storage */ } },
  };
  // A view drawn as a placeholder: the same nodes, so the same height, with every piece of text turned into a grey
  // bar (account.css, .ac-skel), nothing in it reachable, and "Loading" said once for screen readers.
  function skeleton(nodes) {
    const box = h('div.ac-skel', { inert: true, 'aria-hidden': 'true' }, nodes.flat(Infinity).filter(Boolean));
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), texts = [];
    while (walk.nextNode()) texts.push(walk.currentNode);
    for (const t of texts) if (t.nodeValue.trim()) { const bar = h('span.ac-sk'); t.replaceWith(bar); bar.append(t); }
    return [h('p.ac-sr', { role: 'status' }, 'Loading…'), box];
  }
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

  // mount(root, title, { page }): root gets the forms, title the heading. On the page of its own the cursor goes
  // into the first field at once; in the app's dialog only after the visitor has done something there (on a phone
  // a focused field opens the keyboard over the settings below).
  function mount(root, title, { page = false } = {}) {
  let me = null, error = '', busy = false, touched = page;
  let step = pending.get() || { name: 'email' }; // signed out: email → code. signed in: null → delete
  const draw = (...nodes) => { root.replaceChildren(...nodes.flat().filter(Boolean)); if (touched) root.querySelector('[data-focus]')?.focus({ preventScroll: true }); };
  const errLine = () => error && h('p.ac-err', { role: 'alert' }, error);
  // run one request at a time, then draw again
  async function act(work) { if (busy) return; busy = true; touched = true; error = ''; for (const b of root.querySelectorAll('button')) b.disabled = true; try { await work(); } finally { busy = false; render(); } }

  function codeForm(label, onCode, again) {
    const wait = () => Math.max(0, 60 - Math.floor((Date.now() - (step.sent || 0)) / 1000));
    const againBtn = h('button.plain', { type: 'button', disabled: !!wait(), onclick: () => act(again) }, wait() ? `Send again in 0:${String(wait()).padStart(2, '0')}` : 'Send again');
    const tick = setInterval(() => { if (!againBtn.isConnected) return clearInterval(tick); const w = wait(); againBtn.disabled = !!w || busy; againBtn.textContent = w ? `Send again in 0:${String(w).padStart(2, '0')}` : 'Send again'; }, 1000);
    return [
      h('form.ac-form', { novalidate: true, onsubmit: e => { e.preventDefault(); const code = e.target.elements.code.value.replace(/\D/g, ''); if (code.length !== 8) { error = 'The code has 8 digits.'; touched = true; return render(); } act(() => onCode(code)); } },
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
        title.textContent = 'Your account'; draw(profileSkeleton()); // what comes next, at its height, while the server checks the code
        const r = await api('POST', '/api/session', { email: step.email, code, ...(step.alert && { subscribe: true, placement: 'account', wording: WORDING }) });
        if (r.status === 200) { me = r.body; remember(true); step = null; pending.set(null); } else error = say(r);
      }, async () => { const r = await api('POST', '/api/code', { email: step.email }); if (r.status === 202) { step.sent = Date.now(); pending.set(step); } else error = say(r); }),
      h('p.ac-small', {}, h('button.plain', { type: 'button', onclick: () => { step = { name: 'email' }; pending.set(null); error = ''; touched = true; render(); } }, 'Change address'))));
    draw(h('div.ac-card', {},
      h('p', {}, 'Enter your email address and we send you a code. There is no password.'),
      h('form.ac-form', { novalidate: true, onsubmit: e => {
        e.preventDefault();
        const email = e.target.elements.email.value.trim(), alert = e.target.elements.alert.checked;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(email)) { error = ERR.email; touched = true; return render(); }
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
    shape.set({ t: Object.keys(me.topics || {}).filter(t => ALERTS[t]), x: me.admin ? 1 : 0, w: me.suppressed ? 1 : 0 });
    draw(profile(me));
  }
  // one switch per alert the server offers (the digest only once it exists there)
  const ALERTS = {
    pursue: ['PURSUE releases', 'An email usually within a day of each release, with the files that matter.'],
    digest: ['Weekly digest', 'About one email a week: what mattered, a moment worth watching, what was newly filed.'],
  };
  function profile(me) {
    const row = topic => {
      const on = !!me.topics[topic], [name, what] = ALERTS[topic];
      return h('div.ac-row', {},
        h('div', {}, h('b', {}, name), h('small', {}, what)),
        h('button.ac-switch', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': name, 'data-topic': topic, disabled: me.suppressed && !on, onclick: () => act(async () => {
          const r = await api('PUT', `/api/subscriptions/${topic}`, { on: !on, placement: 'account', wording: WORDING });
          if (r.status === 200) setMe(r.body); else if (r.status === 401) { setMe({ signedIn: false }); remember(false); step = { name: 'email' }; } else error = say(r);
        }) }, on ? 'On' : 'Off'));
    };
    return [
      me.suppressed && h('div.ac-card.ac-warn', {}, h('h2', {}, "Alerts can't be delivered to this address"),
        h('p', {}, 'An email to you bounced, or one was reported as spam, so our email provider no longer sends to this address. If that is a mistake, write to ', mailto(), '.')),
      h('div.ac-card', {},
        h('p.ac-who', {}, badge(me.maskedEmail), h('span', {}, h('small', {}, 'Signed in as '), h('b', {}, me.maskedEmail))), // two lines that never wrap, so the row is the same height for any address
        Object.keys(me.topics || {}).filter(t => ALERTS[t]).map(row),
        errLine(),
        h('div.ac-actions', {},
          h('button', { type: 'button', onclick: () => signOut(false) }, 'Sign out'),
          h('button', { type: 'button', onclick: () => signOut(true) }, 'Sign out everywhere'),
          h('button.danger', { type: 'button', onclick: () => act(async () => { const r = await api('POST', '/api/account/code', {}); if (r.status === 202) step = { name: 'delete', sent: Date.now() }; else error = say(r); }) }, 'Delete account…'))),
      h('p.ac-small', {}, 'For a copy of your data, or anything else, write to ', mailto(), '.'),
      me.admin && h('p.ac-small', {}, h('a', { href: '/admin' }, 'Admin: members and the weekly digest'))];
  }
  const setMe = v => { me = v; };
  // the signed-in view as a placeholder, from the outline remembered here (else both alerts)
  const profileSkeleton = () => { const o = shape.get() || { t: Object.keys(ALERTS) }; return skeleton(profile({ signedIn: true, maskedEmail: 'm…@example.com', topics: Object.fromEntries(o.t.filter(t => ALERTS[t]).map(t => [t, false])), suppressed: !!o.w, admin: !!o.x })); };
  const signOut = everywhere => act(async () => { await api('DELETE', '/api/session', { everywhere }); me = { signedIn: false }; remember(false); step = { name: 'email' }; });

  // the app keeps its own picture of who is signed in (the header badge, the sign-up blocks): tell it what we know
  let told = '';
  function tell() {
    if (!me || me.off) return;
    const detail = me.signedIn ? { signedIn: true, maskedEmail: me.maskedEmail, topics: me.topics || {}, suppressed: !!me.suppressed } : { signedIn: false };
    const key = JSON.stringify(detail); if (key === told) return; told = key;
    document.dispatchEvent(new CustomEvent('wat:me', { detail }));
  }
  function render() {
    tell();
    // Before the server has said who this is: the view this browser last had, as a placeholder of the same height
    // (the signed-in one), or the sign-in form itself, which needs no answer to be used.
    if (!me && member()) { title.textContent = 'Your account'; return draw(profileSkeleton()); }
    if (!me) return signedOut();
    if (me.off) return draw(h('div.ac-card', {}, h('p', {}, "Accounts aren't available right now. The archive needs none: everything is open to read."), h('p', {}, h('a', { href: '/' }, '← Back to the archive'))));
    if (me.signedIn) return signedIn();
    if (me.deleted) { me = { signedIn: false }; signedOut(); root.prepend(h('div.ac-card', {}, h('p', {}, 'Your account is deleted.'))); return; }
    signedOut();
  }
  // ask who is signed in (again, when the dialog reopens: the sign-up block may have signed the visitor in since)
  function refresh() {
    if (busy) return;
    return api('GET', '/api/me').then(r => {
      if (busy) return;
      me = r.status === 200 ? r.body : { off: true };
      if (r.status === 200) remember(me.signedIn);
      if (me.signedIn) { if (step?.name !== 'delete') step = null; pending.set(null); } else if (!step || step.name === 'delete') step = { name: 'email' };
      render();
    });
  }
  render();
  refresh();
  return { refresh };
  }

  window.watAccount = { mount, pending: () => !!pending.get() };
  const page = document.querySelector('#ac[data-page]');
  if (page) {
    try { const th = localStorage.getItem('wat:theme'); if (th) document.documentElement.dataset.theme = JSON.parse(th); } catch { /* no storage */ }
    mount(page, document.getElementById('ac-title'), { page: true });
  }
})();
