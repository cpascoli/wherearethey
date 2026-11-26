// /admin (docs/accounts.md, section 18): the owner's page. Figures about the accounts, and the weekly digest: compose
// a draft from Latest, edit it, save it, read it as it will arrive, send a test, then send it now or on a date.
// Like account.js it is a file of its own with no inline script, and builds the page with DOM nodes and textContent
// only. The one piece of HTML it shows is the email the server wrote from the draft, inside a sandboxed frame.
// Everything comes from /api/admin/*, which answers 404 to anyone but the owner; this file holds no data.
(() => {
  'use strict';
  const root = document.getElementById('ow'), title = document.getElementById('ow-title');
  try { const th = localStorage.getItem('wat:theme'); if (th) document.documentElement.dataset.theme = JSON.parse(th); } catch { /* no storage */ }

  function h(tag, attrs, ...kids) {
    const [name, ...cls] = tag.split('.');
    const el = document.createElement(name);
    if (cls.length) el.className = cls.join(' ');
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const api = (method, path, body) => fetch(path, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
    .then(async r => ({ status: r.status, body: await r.json().catch(() => null) })).catch(() => ({ status: 0, body: null }));
  const when = iso => (iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const day = d => new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const people = n => `${n} ${n === 1 ? 'person' : 'people'}`;
  const ERR = {
    subject: 'Give it a subject.', content: 'The draft is empty.', link: 'Links must be pages of the archive: https://wherearethey.info/…',
    stale: 'This draft was changed somewhere else since you opened it. Go back and open it again.', 'not-a-draft': 'It is already scheduled or sent.',
    invalid: "That code isn't right. Check the latest email.", expired: 'That code has expired. Ask for a new one.', attempts: 'Too many tries with that code. Ask for a new one.',
    'too-many': 'Too many tries for now. Wait a while and try again.', busy: 'Email is busy, try again later.', nobody: 'Nobody has asked for the digest yet: there is no one to send it to.',
    unsynced: "Some members' latest choices haven't reached the email provider yet. Try again in a few minutes.", 'no-topic': "The digest's topic isn't set up yet (RESEND_TOPIC_DIGEST).",
    when: 'Pick a time between a few minutes and 30 days from now.', mail: 'The email provider refused it. Try again.', 'too-many-drafts': 'Too many drafts: delete some first.',
    'too-late': 'Too late to take it back: its time has come.', 'not-scheduled': 'It is not scheduled.',
  };
  const say = r => ERR[r.body?.error] || (r.status === 404 ? 'Not found. Are you still signed in?' : "That didn't work. Try again.");

  let stats = null, list = null, latest = null; // the figures, the digests, Latest as data (for composing)
  let d = null, dirty = false, step = null;     // the digest open in the editor; unsaved changes; the send step
  let err = '', note = '', busy = false;
  const draw = (...nodes) => root.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  const line = () => [err && h('p.ac-err', { role: 'alert' }, err), note && h('p.ow-ok', { role: 'status' }, note)];
  async function act(work) { if (busy) return; busy = true; err = ''; note = ''; for (const b of root.querySelectorAll('button')) b.disabled = true; try { await work(); } finally { busy = false; render(); } }

  // ───────── the first screen: figures and the list of digests ─────────
  const tile = (n, label, warn) => h(`div.ow-tile${warn ? '.warn' : ''}`, {}, h('b', {}, String(n)), h('span', {}, label));
  const TOPIC = { pursue: 'PURSUE release alert', digest: 'Weekly digest' };
  const PLACE = { home: 'the home page', pursue: 'the PURSUE pages', account: 'the account page', file: 'a file', latest: 'Latest' };
  // The first screen's outline as this browser last drew it (how many tiles, bars and digests; no figure, no
  // subject), so the placeholder shown while the server answers has the height of what replaces it.
  const shape = {
    get() { try { const v = JSON.parse(localStorage.getItem('wat:ow-shape')); return v && typeof v === 'object' ? v : null; } catch { return null; } },
    set(v) { try { localStorage.setItem('wat:ow-shape', JSON.stringify(v)); } catch { /* no storage */ } },
  };
  // a view as a placeholder: the same nodes, the text as grey bars (account.css, .ac-skel), nothing reachable
  function skeleton(nodes) {
    const box = h('div.ac-skel', { inert: true, 'aria-hidden': 'true' }, nodes);
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), texts = [];
    while (walk.nextNode()) texts.push(walk.currentNode);
    for (const t of texts) if (t.nodeValue.trim()) { const bar = h('span.ac-sk'); t.replaceWith(bar); bar.append(t); }
    return [h('p.ac-sr', { role: 'status' }, 'Loading…'), box];
  }
  function homeSkeleton() {
    const o = shape.get(), n = k => Array.from({ length: Math.min(60, Math.max(0, o[k] | 0)) });
    const s = { members: 0, new7: 0, new30: 0, noAlert: 0, off30: 0, suppressed: 0, sessions: 0, codesToday: 0, unsynced: o.unsynced, deletions: o.deletions,
      topics: Object.fromEntries((Array.isArray(o.topics) ? o.topics : []).filter(t => Array.isArray(t) && TOPIC[t[0]]).map(([k, less]) => [k, { on: 1, reach: less ? 0 : 1 }])),
      days: n('days').map(() => ['2026-01-01', 1]), placements: o.place ? { home: 1 } : {} };
    return skeleton(homeNodes(s, { topic: !!o.topic, recipients: 0, digests: n('digests').map((_, i) => ({ id: i, status: 'draft', subject: 'Where Are They: the week in the record', updatedAt: '2026-01-01T12:00:00Z' })) }));
  }
  function home() {
    title.textContent = 'Admin';
    if (stats && list) shape.set({ topics: Object.entries(stats.topics).map(([k, v]) => [k, v.reach !== v.on ? 1 : 0]), days: stats.days.length, place: Object.keys(stats.placements).length ? 1 : 0, unsynced: stats.unsynced ? 1 : 0, deletions: stats.deletions ? 1 : 0, topic: list.topic ? 1 : 0, digests: list.digests.length });
    draw(line(), homeNodes(stats, list));
  }
  function homeNodes(s, list) {
    const max = Math.max(1, ...(s?.days || []).map(x => x[1]));
    return [
      h('h2', {}, 'Members'),
      s ? [
        h('div.ow-tiles', {},
          tile(s.members, 'accounts'), tile(s.new7, 'new in 7 days'), tile(s.new30, 'new in 30 days'),
          Object.entries(s.topics).map(([k, v]) => tile(v.on, `${TOPIC[k] || k}: on${v.reach !== v.on ? ` (${v.reach} can be reached)` : ''}`)),
          tile(s.noAlert, 'with no alert on'), tile(s.off30, 'switched off in 30 days'),
          tile(s.suppressed, "addresses email can't reach", s.suppressed > 0), tile(s.sessions, 'sign-ins in use'),
          tile(s.codesToday, 'codes sent today (stops at 95)', s.codesToday >= 60),
          s.unsynced ? tile(s.unsynced, 'choices not yet at the email provider', true) : null,
          s.deletions ? tile(s.deletions, 'deletions not yet confirmed there', true) : null),
        h('p.ac-small', {}, 'Sign-ups by day, last 30 days (UTC)'),
        s.days.length ? h('div.ow-bars', {}, s.days.map(([dd, n]) => { const bar = h('i'); bar.style.width = `${Math.round(n / max * 100)}%`; return h('div', {}, h('span', {}, day(dd)), h('span', {}, bar), h('span', {}, String(n))); })) : h('p.ac-small', {}, 'None.'),
        Object.keys(s.placements).length ? h('p.ac-small', {}, 'Alerts switched on in 30 days, by where: ', Object.entries(s.placements).map(([k, n]) => `${PLACE[k] || k} ${n}`).join(' · ')) : null,
        h('p.ac-small', {}, 'Counts only: this page never shows who the members are. Readers, pages and referrers are in Google Analytics and in ', h('code', {}, 'npm run traffic'), '.'),
      ] : h('p.muted', {}, 'Loading…'),
      h('h2', {}, 'Weekly digest'),
      list ? [
        h('p', {}, list.topic ? `${people(list.recipients)} would get a digest sent now.` : "Members can't choose the digest yet: its topic at the email provider isn't set (RESEND_TOPIC_DIGEST)."),
        h('div.ow-row', {},
          h('button.primary', { type: 'button', onclick: () => act(compose) }, "Compose this week's digest"),
          h('button', { type: 'button', onclick: () => act(() => create({ subject: 'Where Are They: the week in the record', content: { intro: '', sections: [{ title: 'This week', items: [] }], moment: null, outro: '' } })) }, 'Blank draft')),
        list.digests.length ? h('ul.ow-list', {}, list.digests.map(x => h('li', {}, h('button', { type: 'button', onclick: () => act(() => open(x.id)) },
          h('span', {}, h(`span.ow-chip.${x.status}`, {}, x.status), x.subject),
          h('small', {}, x.status === 'sent' ? `sent ${when(x.sentAt)}` : x.status === 'scheduled' ? `for ${when(x.scheduledAt)}` : `saved ${when(x.updatedAt)}`))))) : h('p.ac-small', {}, 'No digests yet.'),
      ] : h('p.muted', {}, 'Loading…')];
  }
  async function load() {
    const [a, b] = await Promise.all([api('GET', '/api/admin/stats'), api('GET', '/api/admin/digests')]);
    if (a.status === 200) stats = a.body;
    if (b.status === 200) list = b.body;
    return a.status === 200;
  }

  // ───────── composing: a proposal from Latest, which the owner then edits ─────────
  const item = e => ({ title: e.name, url: e.url, line: e.summary || '', meta: [e.kind, e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? day(e.date) : ''].filter(Boolean).join(' · ') });
  async function getLatest() {
    if (!latest) latest = await fetch('/latest.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return latest;
  }
  async function compose() {
    const L = await getLatest();
    if (!L) { err = "Latest isn't available as data (latest.json). Start from a blank draft."; return; }
    const week = new Date(Date.parse(L.today) - 7 * 864e5).toISOString().slice(0, 10);
    const recent = L.recent.filter(e => e.date >= week || (e.added || '') >= week).slice(0, 5);
    const filed = L.added.filter(e => e.added >= week).slice(0, 6);
    const moment = [...recent, ...filed, ...L.recent].flatMap(e => e.moments)[0] || null;
    const sections = [['This week', recent], ['Newly filed in the archive', filed], ['Coming up', L.upcoming.slice(0, 3)]].filter(([, xs]) => xs.length).map(([t, xs]) => ({ title: t, items: xs.map(item) }));
    await create({ subject: recent[0] ? `This week: ${recent[0].name}`.slice(0, 150) : 'Where Are They: the week in the record', content: { intro: '', sections: sections.length ? sections : [{ title: 'This week', items: [] }], moment, outro: '' } });
  }
  async function create(draft) {
    const r = await api('POST', '/api/admin/digests', draft);
    if (r.status === 201) { d = r.body; dirty = false; step = null; note = 'Draft saved. Edit it below.'; } else err = say(r);
  }
  async function open(id) { const r = await api('GET', `/api/admin/digests/${id}`); if (r.status === 200) { d = r.body; dirty = false; step = null; await getLatest(); } else err = say(r); }
  async function save() {
    const r = await api('PUT', `/api/admin/digests/${d.id}`, { subject: d.subject, content: d.content, version: d.version });
    if (r.status === 200) { d = r.body; dirty = false; return true; }
    err = say(r); return false;
  }
  const saved = async () => !dirty || save(); // what is sent or tested is what is saved

  // ───────── the editor ─────────
  let state; // the line that says "unsaved changes"
  const touch = () => { dirty = true; if (state) state.textContent = 'Unsaved changes'; };
  const field = (label, obj, key, { area = false, rows = 3, type = 'text', placeholder } = {}) => [
    h('label', {}, label),
    area ? h('textarea', { rows: String(rows), placeholder, value: obj[key] || '', oninput: e => { obj[key] = e.target.value; touch(); } })
      : h('input', { type, placeholder, value: obj[key] || '', oninput: e => { obj[key] = e.target.value; touch(); } }),
  ];
  const move = (arr, i, by) => { const j = i + by; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; touch(); render(); };
  const small = (label, fn, off) => h('button.small', { type: 'button', disabled: !!off, onclick: fn }, label);
  function editor() {
    const c = d.content, used = new Set(c.sections.flatMap(s => s.items.map(i => i.url)));
    const pool = latest ? [...latest.recent, ...latest.added, ...latest.upcoming].filter((e, i, a) => !used.has(e.url) && a.findIndex(x => x.url === e.url) === i) : [];
    const moments = latest ? [...latest.recent, ...latest.added].flatMap(e => e.moments) : [];
    return [
      field('Subject', d, 'subject'),
      field('Opening (optional; a blank line starts a new paragraph)', c, 'intro', { area: true, rows: 4, placeholder: 'A sentence or two on the week, in your own words.' }),
      c.sections.map((s, si) => h('div.ow-sec', {},
        field('Section', s, 'title'),
        s.items.map((it, ii) => h('div.ow-item', {},
          field('Title', it, 'title'), field('Link (a page of the archive)', it, 'url', { type: 'url' }),
          field('Line', it, 'line', { area: true, rows: 3 }), field('Small print beside the title (kind, date)', it, 'meta'),
          h('div.ow-row', {}, small('↑', () => move(s.items, ii, -1), ii === 0), small('↓', () => move(s.items, ii, 1), ii === s.items.length - 1), small('Remove', () => { s.items.splice(ii, 1); touch(); render(); })))),
        h('div.ow-row', {},
          small('Add an item', () => { s.items.push({ title: '', url: '', line: '', meta: '' }); touch(); render(); }),
          pool.length ? h('select', { 'aria-label': 'Add from Latest', onchange: e => { const p = pool[Number(e.target.value)]; if (p) { s.items.push(item(p)); touch(); render(); } } },
            h('option', { value: '' }, 'Add from Latest…'), pool.map((p, i) => h('option', { value: String(i) }, `${p.kind}: ${p.name}`.slice(0, 90)))) : null,
          small('Section ↑', () => move(c.sections, si, -1), si === 0), small('Section ↓', () => move(c.sections, si, 1), si === c.sections.length - 1),
          small('Remove section', () => { c.sections.splice(si, 1); touch(); render(); })))),
      h('div.ow-row', {}, small('Add a section', () => { c.sections.push({ title: '', items: [] }); touch(); render(); })),
      h('div.ow-sec', {},
        h('b', {}, 'A moment worth watching'),
        c.moment ? [
          field('The moment, as on file (put quotation marks only round the speaker\'s own words)', c.moment, 'quote', { area: true, rows: 3 }), field('Who says it', c.moment, 'who'), field('Link to the moment', c.moment, 'url', { type: 'url' }),
          h('div.ow-row', {}, small('Remove the moment', () => { c.moment = null; touch(); render(); })),
        ] : h('div.ow-row', {}, small('Add a moment', () => { c.moment = { quote: '', who: '', url: '' }; touch(); render(); })),
        moments.length ? h('div.ow-row', {}, h('select', { 'aria-label': 'Pick a moment from Latest', onchange: e => { const m = moments[Number(e.target.value)]; if (m) { c.moment = { ...m }; touch(); render(); } } },
          h('option', { value: '' }, 'Pick a moment from Latest…'), moments.map((m, i) => h('option', { value: String(i) }, `${m.who}: ${m.quote}`.slice(0, 90))))) : null),
      field('Closing (optional)', c, 'outro', { area: true, rows: 3 }),
    ];
  }
  // the email as the server wrote it from the saved draft; the frame can run nothing and open nothing
  const preview = () => [
    h('h2', {}, 'As it will arrive'),
    dirty && h('p.ac-small', {}, 'This is the last saved version. Save to see your changes.'),
    h('p.ac-small', {}, 'Subject: ', h('b', {}, d.subject)),
    h('iframe.ow-frame', { sandbox: '', title: 'The email', srcdoc: `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;background:#fff">${d.html}</body>` }),
    h('details', {}, h('summary', {}, 'The plain-text version'), h('pre.ow-text', {}, d.text)),
  ];
  function sendBox() {
    if (!step) return h('div.ow-sec', { id: 'ow-send' },
      h('b', {}, 'Send'),
      h('p.ac-small', {}, `It goes to the members who asked for the digest: ${people(d.recipients)} now. Send yourself a test first and read it in your mail.`),
      h('div.ow-row', {}, h('button', { type: 'button', onclick: () => act(async () => { if (!await saved()) return; const r = await api('POST', `/api/admin/digests/${d.id}/test`, {}); if (r.status === 202) note = 'Test sent to your own address.'; else err = say(r); }) }, 'Send me a test')),
      h('label', {}, 'When (your local time; leave empty to send at once)'),
      h('div.ow-row', {}, h('input', { type: 'datetime-local', id: 'ow-at', oninput: e => { root.querySelector('#ow-go').textContent = e.target.value ? 'Schedule…' : 'Send now…'; } }),
        h('button.primary', { type: 'button', id: 'ow-go', onclick: () => {
          const v = root.querySelector('#ow-at').value, at = v ? new Date(v) : null;
          if (at && !(at.getTime() - Date.now() > 3 * 60000)) { err = ERR.when; return render(); }
          act(async () => { if (!await saved()) return; const r = await api('POST', '/api/admin/code', {}); if (r.status === 202) step = { at: at ? at.toISOString() : null }; else err = say(r); });
        } }, 'Send now…')),
      h('p.ac-small', {}, 'Nothing is sent yet: the next step asks for a code emailed to you.'));
    return h('div.ow-sec.ac-warn', {},
      h('b', {}, step.at ? `Schedule for ${when(step.at)}` : 'Send now'),
      h('p', {}, `“${d.subject}” will go to ${people(d.recipients)}${step.at ? '' : ', at once, and cannot be taken back'}. To confirm, enter the code just sent to your address.`),
      h('form.ac-form', { novalidate: true, onsubmit: e => {
        e.preventDefault();
        const code = e.target.elements.code.value.replace(/\D/g, '');
        if (code.length !== 8) { err = 'The code has 8 digits.'; return render(); }
        act(async () => {
          const r = await api('POST', `/api/admin/digests/${d.id}/send`, { code, version: d.version, ...(step.at && { at: step.at }) });
          if (r.status === 200) { note = r.body.status === 'sent' ? `Sent to ${people(r.body.recipients)}.` : `Scheduled for ${when(r.body.scheduledAt)}, to ${people(r.body.recipients)}.`; step = null; await open(d.id); await load(); } else err = say(r);
        });
      } },
        h('input', { name: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '9', placeholder: '1234 5678', 'aria-label': 'The 8-digit code', required: true }),
        h('button.primary', {}, step.at ? 'Schedule it' : 'Send it')),
      h('p.ac-small', {}, h('button.plain', { type: 'button', onclick: () => { step = null; err = ''; render(); } }, 'Not yet')));
  }
  let sure = false; // "Delete draft" asks twice
  function edit() {
    title.textContent = d.status === 'draft' ? 'Digest draft' : d.status === 'scheduled' ? 'Scheduled digest' : 'Sent digest';
    const back = h('p', {}, h('button.plain', { type: 'button', onclick: () => act(async () => { if (d.status === 'draft' && dirty && !await save()) return; d = null; step = null; sure = false; await load(); }) }, '← All digests'));
    if (d.status !== 'draft') return draw(back, line(),
      h('p', {}, d.status === 'sent' ? `Sent ${when(d.sentAt)}.` : `Scheduled for ${when(d.scheduledAt)}, to the members who have the digest on at that time (${people(d.recipients)} now).`),
      h('div.ow-row', {},
        d.status === 'scheduled' && h('button', { type: 'button', onclick: () => act(async () => { const r = await api('POST', `/api/admin/digests/${d.id}/cancel`, {}); if (r.status === 200) { d = r.body; note = 'Taken back: it is a draft again.'; } else err = say(r); }) }, 'Take it back (make it a draft again)'),
        h('button', { type: 'button', onclick: () => act(() => create({ subject: d.subject, content: d.content })) }, 'Copy into a new draft')),
      preview());
    draw(back, line(), editor(),
      sendBox(), preview(),
      h('div.ow-bar', {}, h('div.ow-row', {},
        h('button.primary', { type: 'button', onclick: () => act(async () => { if (await save()) note = 'Saved.'; }) }, 'Save draft'),
        !step && h('button', { type: 'button', onclick: () => root.querySelector('#ow-send')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, 'Send or schedule…'),
        (state = h('span.ac-small', {}, dirty ? 'Unsaved changes' : `Saved ${when(d.updatedAt)}`)),
        h('button.danger', { type: 'button', onclick: () => { if (!sure) { sure = true; return render(); } act(async () => { const r = await api('DELETE', `/api/admin/digests/${d.id}`); if (r.status === 204) { d = null; sure = false; note = 'Draft deleted.'; await load(); } else err = say(r); }); } }, sure ? 'Really delete it?' : 'Delete draft'))));
  }

  let me = null;
  function render() {
    // before the server has answered: in the owner's browser, the first screen as a placeholder of the same height
    if (!me) return draw(shape.get() ? homeSkeleton() : h('p.muted', {}, 'Loading…'));
    if (!me.admin) { title.textContent = 'Not found'; return draw(h('div.ac-card', {}, h('p', {}, 'There is nothing here.'), h('p', {}, me.signedIn ? h('a', { href: '/' }, '← Back to the archive') : h('a', { href: '/account' }, 'Sign in'))));
    }
    return d ? edit() : home();
  }
  window.addEventListener('beforeunload', e => { if (d && dirty) e.preventDefault(); });
  render();
  // everything is asked for at once (the figures answer 404 to anyone else), and shown together
  Promise.all([api('GET', '/api/me'), load()]).then(([r]) => { me = r.status === 200 ? r.body : { signedIn: false }; if (!me.admin) { try { localStorage.removeItem('wat:ow-shape'); } catch { /* no storage */ } } render(); });
})();
