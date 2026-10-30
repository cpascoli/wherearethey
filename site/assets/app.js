/* Where Are They — knowledge map UI. Data comes from data/kb.js (built by scripts/build.mjs). */
(() => {
  'use strict';
  const KB = window.KB;
  const MENTIONS = window.KB_MENTIONS || {};
  const TOGETHER = window.KB_TOGETHER || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // a web source also gets its archived copy on the Wayback Machine (the latest snapshot), for pages that move, vanish or go behind a paywall
  const archived = u => /^https?:\/\//i.test(u || '') && !/(^|\.)archive\.org\//i.test(u.replace(/^https?:\/\//i, '')) ? ` <a class="arch" href="https://web.archive.org/web/${esc(u)}" target="_blank" rel="noopener" title="Archived copy (Internet Archive Wayback Machine)">archived</a>` : '';
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wat:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('wat:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  // ───────────── vocabulary ─────────────
  const TYPES = {
    person: { label: 'Person', plural: 'People', color: '#E0A458', shape: 'ellipse' },
    incident: { label: 'Incident', plural: 'Incidents', color: '#4FB286', shape: 'star' },
    hearing: { label: 'Hearing', plural: 'Hearings & briefings', color: '#E5636B', shape: 'diamond' },
    program: { label: 'Program', plural: 'Programs', color: '#4EA8DE', shape: 'hexagon' },
    organization: { label: 'Organization', plural: 'Organizations', color: '#8E7DDB', shape: 'round-rectangle' },
    document: { label: 'Document', plural: 'Documents', color: '#B49A78', shape: 'rectangle' },
    film: { label: 'Documentary', plural: 'Documentaries', color: '#E07B53', shape: 'barrel' },
    book: { label: 'Book', plural: 'Books', color: '#9CB86B', shape: 'tag' },
    record: { label: 'Official record', plural: 'Official records (PURSUE)', color: '#8FB3C9', shape: 'rectangle' },
    video: { label: 'Video', plural: 'Videos', color: '#D978B0', shape: 'round-tag' },
    event: { label: 'Event', plural: 'Events', color: '#38B2AC', shape: 'round-diamond' },
    concept: { label: 'Concept', plural: 'Concepts', color: '#BDB55C', shape: 'octagon' },
    place: { label: 'Place', plural: 'Places', color: '#A98467', shape: 'pentagon' },
    source: { label: 'Source', plural: 'Channels & sources', color: '#8C9AAB', shape: 'vee' },
    news: { label: 'News', plural: 'News', color: '#F2C14E', shape: 'rectangle' },
    claim: { label: 'Claim', plural: 'Claims', color: '#F07167', shape: 'rectangle' },
  };
  const STATUS = {
    documented: { label: 'Documented', hint: 'Backed by an official record or primary document' },
    claimed: { label: 'On record', hint: 'Stated publicly by a named person' },
    unverified: { label: 'Unverified', hint: 'Not yet tied to a source — needs one' },
  };
  // where an incident stands; explained and hoax cases are hidden while "Hide explained cases" is on
  const OUTCOME = {
    open: { label: 'Open', hint: 'No credible conventional explanation has been established' },
    disputed: { label: 'Partly explained', hint: 'A credible explanation covers part of the case, or is offered but contested' },
    explained: { label: 'Explained', hint: 'A credible conventional explanation has been established' },
    hoax: { label: 'Hoax', hint: 'Shown to be fabricated' },
  };
  const resolved = e => e.outcome === 'explained' || e.outcome === 'hoax';
  // claims: where a proposition stands (keep in sync with CLAIM_STATUSES in build.mjs), and each assertion's position
  const CLAIM_STATUS = {
    open: { label: 'Open', hint: 'Neither established nor ruled out by the record' },
    disputed: { label: 'Disputed', hint: 'Official records or findings contradict it; its proponents contest them' },
    supported: { label: 'Supported by records', hint: 'Official or primary records back it' },
    refuted: { label: 'Refuted', hint: 'Shown to be false by the record' },
  };
  const STANCE = { supports: 'says so', disputes: 'disputes it', context: 'context' };
  const BASIS = { 'first-hand': { label: 'first-hand', hint: 'Says they saw or did it themselves' }, relayed: { label: 'relayed', hint: 'Says they were told by others' }, documented: { label: 'record', hint: 'An official or primary record' }, opinion: { label: 'opinion', hint: 'A judgement, not a report of what they saw or were told' } };
  // news item kinds (keep in sync with NEWS_KINDS in build.mjs)
  const NEWS_KIND = {
    statement: { label: 'Statement' }, post: { label: 'Post' }, article: { label: 'Article' }, interview: { label: 'Interview' }, podcast: { label: 'Podcast' },
    hearing: { label: 'Hearing' }, legislation: { label: 'Legislation' }, release: { label: 'Official release' }, research: { label: 'Research' }, incident: { label: 'Incident' }, event: { label: 'Event' },
  };
  const CRED = {
    credible: { label: 'Official source', hint: 'Meets the project rule: an official role in government, Congress, the military (incl. pilots and sensor operators), intelligence or academia' },
    mass: { label: 'Mass sighting', hint: 'Included by the mass-sighting rule: 50+ independent witnesses with contemporary press, TV or radio coverage' },
    reporter: { label: 'Reporter / expert', hint: 'Journalist or policy expert: relays or analyses testimony, not a primary witness' },
    outside: { label: 'Outside criteria', hint: 'Civilian, disputed or unknown credentials — hidden when “Official sources only” is on' },
  };
  const CRED_CAT = {
    congress: 'Congress', government: 'Government', intelligence: 'Intelligence', military: 'Military', aviator: 'Aviator',
    'sensor-operator': 'Radar / sensor', academia: 'Academia', astronaut: 'Astronaut', aerospace: 'Aerospace', 'law-enforcement': 'Law enforcement',
    journalist: 'Journalist', 'policy-expert': 'Policy expert', civilian: 'Civilian', disputed: 'Disputed', unknown: 'Unknown',
  };
  // a link's reading from the other end ("based at" → "home of"); the vocabulary lives in scripts/relations.mjs
  const INVERSE = KB.inverse || {};
  const WEAK_LINKS = new Set(['statement about', 'statements by', 'related to', 'discusses', 'discussed in', 'speaks in', 'speakers', 'mentions', 'mentioned in']);

  // ───────────── index ─────────────
  const ents = KB.entities;
  const byId = new Map(ents.map(e => [e.id, e]));
  const adj = new Map(ents.map(e => [e.id, []]));
  for (const x of KB.edges) {
    adj.get(x.s)?.push({ ...x, other: x.t, dir: 'out' });
    adj.get(x.t)?.push({ ...x, other: x.s, dir: 'in' });
  }
  const yearOf = d => (d ? parseInt(String(d).slice(0, 4), 10) : null);
  for (const e of ents) { e.y0 = yearOf(e.date); e.y1 = yearOf(e.end) ?? e.y0; }
  const NOW_Y = new Date().getFullYear();
  const dated = ents.filter(e => e.y0 && e.type !== 'video');
  const MIN_Y = Math.min(1940, ...dated.map(e => e.y0));
  const MAX_Y = Math.max(NOW_Y, ...dated.map(e => e.y1));
  const videos = ents.filter(e => e.type === 'video');
  const videoMentions = new Map(); // videoId → Map(entityId → [t…])
  for (const [id, list] of Object.entries(MENTIONS)) {
    for (const [vid, t] of list) {
      if (!videoMentions.has(vid)) videoMentions.set(vid, new Map());
      const m = videoMentions.get(vid);
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(t);
    }
  }
  const momentsFor = new Map();
  for (const v of videos) {
    // a hearing, event or news item shows every moment of its recordings, not only the ones that name it
    const of = adj.get(v.id).filter(x => x.dir === 'out' && x.label === 'recording of' && ['hearing', 'event', 'news'].includes(byId.get(x.other)?.type)).map(x => x.other);
    for (const m of v.moments || []) {
      for (const id of new Set([...m.refs, m.speaker, ...of].filter(Boolean))) {
        if (!momentsFor.has(id)) momentsFor.set(id, []);
        momentsFor.get(id).push({ video: v.id, ...m });
      }
    }
  }
  // Hearing documents come alive with the recording: a transcript shows every moment of the hearing's videos (or of
  // the video it transcribes), and a written statement the moments in which its author speaks at that hearing.
  const recordingsOf = id => byId.get(id)?.type === 'video' ? [byId.get(id)]
    : adj.get(id).filter(x => x.dir === 'in' && x.label === 'recording of').map(x => byId.get(x.other)).filter(v => v?.type === 'video');
  for (const d of ents.filter(e => e.type === 'document')) {
    const out = adj.get(d.id).filter(x => x.dir === 'out'), have = new Set((momentsFor.get(d.id) || []).map(m => `${m.video}@${m.t}`));
    const add = (v, m) => { const k = `${v.id}@${m.t}`; if (have.has(k)) return; have.add(k); if (!momentsFor.has(d.id)) momentsFor.set(d.id, []); momentsFor.get(d.id).push({ video: v.id, ...m }); };
    for (const x of out.filter(x => x.label === 'transcript of')) for (const v of recordingsOf(x.other)) for (const m of v.moments || []) add(v, m);
    const authors = new Set(out.filter(x => x.label === 'authored by').map(x => x.other));
    if (authors.size) for (const x of out.filter(x => x.label === 'submitted to')) for (const v of recordingsOf(x.other)) for (const m of v.moments || []) if (authors.has(m.speaker)) add(v, m);
  }

  const PREFIX = { record: 'R', person: 'P', incident: 'I', hearing: 'H', program: 'PG', organization: 'O', document: 'D', film: 'F', book: 'B', video: 'V', event: 'E', concept: 'C', place: 'L', source: 'S' };
  const fileNo = e => { let h = 2166136261; for (const c of e.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return `${PREFIX[e.type] || 'X'}-${(h >>> 0).toString(16).toUpperCase().slice(-4).padStart(4, '0')}`; };
  // Library files: served locally by the dev server, or from Cloudflare R2 on the hosted site (FILES_BASE at build time)
  const hrefOf = id => byId.get(id)?.path || '/'; // the file's own page (/person/david-fravor)
  const fileUrl = f => (KB.filesBase ? `${KB.filesBase.replace(/\/$/, '')}/${f}` : `/${f}`);
  const fmtT = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = d => { if (!d) return ''; const [y, m, day] = String(d).split('-'); return [day && +day, m && MONTHS[+m - 1], y].filter(Boolean).join(' '); };
  const fmtRange = e => (e.end && e.end !== e.date ? `${fmtD(e.date)} – ${fmtD(e.end)}` : fmtD(e.date));
  const fmtDur = s => { if (!s) return ''; const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const thumb = yt => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;
  // thumbnail for any video entry (non-YouTube videos get a neutral placeholder)
  const VIDEO_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#131a1f"/><circle cx="160" cy="90" r="26" fill="none" stroke="#6fcfbf" stroke-width="3"/><path d="M152 76 L174 90 L152 104 Z" fill="#6fcfbf"/></svg>')}`;
  const vthumb = v => (v.youtube ? thumb(v.youtube) : v.thumb ? fileUrl(v.thumb) : VIDEO_PLACEHOLDER);
  const vsource = v => (v.youtube ? { url: `https://www.youtube.com/watch?v=${v.youtube}`, label: 'YouTube' } : { url: v.url, label: v.url && /x\.com|twitter\.com/.test(v.url) ? 'X' : 'Source' });
  const subtitle = e => {
    if (e.credentials?.length) return e.credentials[0].role;
    if (e.type === 'video') return [e.channel, fmtD(e.date), fmtDur(e.duration)].filter(Boolean).join(' · ');
    const f = e.facts?.[0]?.text;
    return [fmtRange(e), e.place?.name, !e.date && !e.place ? f : ''].filter(Boolean).join(' · ') || f || '';
  };
  // search-dropdown rows carry their type's colour (left bar, tinted badge and highlight)
  const ddTyped = e => `class="dd-item typed" style="--c:${TYPES[e.type]?.color || '#999'}"`;
  const ddType = e => `<span class="dd-type">${TYPES[e.type].label}</span>`;
  const dot = id => { const e = byId.get(id); return `<i class="dot" style="background:${TYPES[e?.type]?.color || '#999'}"></i>`; };
  const chip = (id, extra = '') => {
    const e = byId.get(id);
    if (!e) return `<span class="chip dim">${esc(id)}?</span>`;
    return `<a class="chip ${e.cred === 'outside' ? 'dim' : ''}" data-goto="${esc(id)}" href="${hrefOf(id)}">${dot(id)}${esc(e.name)}${extra}</a>`;
  };

  // ───────────── state ─────────────
  const allTypes = Object.keys(TYPES);
  // PURSUE records and news items stay out of the graph and the type filter; they appear in context (dossiers, index, search, Latest)
  const offGraph = t => t === 'record' || t === 'news' || t === 'claim';
  const graphTypes = allTypes.filter(t => !offGraph(t));
  const TYPES_BEFORE_SHELF = ['person', 'incident', 'hearing', 'program', 'organization', 'document', 'record', 'video', 'event', 'concept', 'place', 'source'];
  const state = {
    view: 'graph', sel: null,
    credibleOnly: store.get('credibleOnly', true),
    hideExplained: store.get('hideExplained', true),
    // types added since a visitor saved their filters (e.g. film, book) are switched on for them
    types: new Set(store.get('types', null) ? [...store.get('types'), ...allTypes.filter(t => !offGraph(t) && !store.get('typesSeen', TYPES_BEFORE_SHELF).includes(t))] : allTypes.filter(t => !offGraph(t))),
    tags: new Set(store.get('tags', [])),
    // Open-ended ends are stored as null so new earlier/later files stay in range. Older saves stored the
    // full range as numbers (lower end 1940, the old floor); treat those as open too.
    yr: (([a, b] = []) => [a == null || a === 1940 ? MIN_Y : a, b == null || b >= NOW_Y ? MAX_Y : b])(store.get('yr', null) || []),
    showMentions: store.get('showMentions', false),
    video: null,
    trail: null,                                  // exploration mode: { steps: [ids], open: Set (connections shown), pinned: Set }; core: true = the key-files map
    full: new URLSearchParams(location.search).has('full'), // Explore shows the whole network instead of the key files (/explore?full)
    hiddenIds: new Set(),                         // files hidden by hand (right-click → Hide)
  };
  state.types.delete('record'); state.types.delete('news'); state.types.delete('claim');
  let visible = new Set();

  function computeVisible() {
    const full = state.yr[0] <= MIN_Y && state.yr[1] >= MAX_Y;
    const base = e => state.types.has(e.type) && !(state.credibleOnly && e.cred === 'outside') && !(state.hideExplained && resolved(e)) &&
      (!state.tags.size || e.tags.some(t => state.tags.has(t)));
    const inRange = e => e.y0 && e.y0 <= state.yr[1] && e.y1 >= state.yr[0];
    const v = new Set();
    for (const e of ents) if (base(e) && (full || (e.y0 && e.type !== 'video' ? inRange(e) : false))) v.add(e.id);
    if (!full) {
      // undated things (people, concepts, videos…) stay if they connect to something in range
      for (const e of ents) {
        if (v.has(e.id) || !base(e) || (e.y0 && e.type !== 'video')) continue;
        if (adj.get(e.id).some(x => x.kind !== 'mention' && v.has(x.other) && byId.get(x.other).y0 && byId.get(x.other).type !== 'video')) v.add(e.id);
      }
    }
    visible = v;
  }

  // ───────────── filters UI ─────────────
  function renderFilters() {
    $('#f-credible').checked = state.credibleOnly;
    $('#f-explained').checked = state.hideExplained;
    $('#btn-settings .set-dot').hidden = state.credibleOnly && state.hideExplained; // a dot on the cog when a setting is off its default
    // Faceted counts: each list is counted against the *other* list's selection,
    // so picking types narrows the themes and picking themes narrows the types.
    const credOk = e => !(state.credibleOnly && e.cred === 'outside') && !(state.hideExplained && resolved(e));
    const tagOk = e => !state.tags.size || e.tags.some(t => state.tags.has(t));
    // the timeline shows only dated files, and not people or videos (see renderTimeline): its Types list offers just
    // the types that appear on it, counted by their dated files
    const onTimeline = state.view === 'timeline', tlOk = e => !onTimeline || (e.y0 && e.type !== 'video' && e.type !== 'person');
    const counts = {};
    for (const e of ents) if (credOk(e) && tagOk(e) && tlOk(e)) counts[e.type] = (counts[e.type] || 0) + 1;
    const listTypes = onTimeline ? graphTypes.filter(t => ents.some(e => e.type === t && tlOk(e))) : graphTypes;
    $('#f-types').innerHTML = listTypes.filter(t => counts[t]).map(t => `
      <label class="f-type ${state.types.has(t) ? '' : 'off'}" data-type="${t}" title="Click to toggle · double-click to show only this type">
        <span class="sw" style="background:${TYPES[t].color}"></span>${TYPES[t].plural}<span class="n">${counts[t]}</span>
      </label>`).join('') || '<p class="muted small">No types match the selected themes.</p>';
    const tagCounts = {};
    for (const e of ents) if (credOk(e) && state.types.has(e.type)) for (const t of e.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    for (const t of state.tags) tagCounts[t] ??= 0; // keep selected themes visible so they can be cleared
    const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    $('#f-tags').innerHTML = tags.map(([t, n]) => `<button class="chip ${state.tags.has(t) ? 'on' : ''} ${n ? '' : 'dim'}" data-tag="${esc(t)}">${esc(t)}<span class="n">${n}</span></button>`).join('')
      || '<p class="muted small">No themes for the selected types.</p>';
    $('#f-tags-clear').hidden = !state.tags.size;
    $('#f-types-clear').hidden = listTypes.every(t => state.types.has(t)); // shown once any type is switched off
    // years
    const a = $('#f-yr-a'), b = $('#f-yr-b');
    for (const el of [a, b]) { el.min = MIN_Y; el.max = MAX_Y; el.step = 1; }
    a.value = state.yr[0]; b.value = state.yr[1];
    renderHist();
    $('#f-mentions').checked = state.showMentions;
    const s = KB.stats;
    $('#f-stats').innerHTML = `<b>${s.entities}</b> entries · <b>${s.edges}</b> links<br><b>${s.transcripts}</b> transcripts · <b>${s.transcriptHours}</b> hours · <b>${s.mentions.toLocaleString()}</b> mentions<br>Built ${new Date(KB.built).toLocaleString()}<div class="side-links">© ${new Date().getFullYear()} Carlo Pascoli · <a href="/about">About</a> · <a href="https://x.com/WhereAreTheyUAP" target="_blank" rel="noopener" data-social="x" data-placement="side-footer">X</a> · <a href="https://github.com/cpascoli/wherearethey" target="_blank" rel="noopener" data-social="github" data-placement="side-footer">GitHub</a> · <a href="/privacy">Privacy &amp; cookies</a></div>` +
      (KB.warnings.length ? `<details><summary>${KB.warnings.length} build warning${KB.warnings.length > 1 ? 's' : ''}</summary><ul>${KB.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : '');
  }
  function renderHist() {
    const step = 5, start = Math.floor(MIN_Y / step) * step, n = Math.ceil((MAX_Y + 1 - start) / step);
    const buckets = new Array(n).fill(0);
    // count only what the type/theme filters let through (the year filter itself is shown by the highlight)
    const shown = e => !(state.credibleOnly && e.cred === 'outside') && !(state.hideExplained && resolved(e)) && state.types.has(e.type) &&
      (!state.tags.size || e.tags.some(t => state.tags.has(t)));
    let total = 0;
    for (const e of dated) if (shown(e)) { buckets[Math.min(n - 1, Math.floor((e.y0 - start) / step))]++; total++; }
    const max = Math.max(1, ...buckets), w = 240 / n;
    $('#f-hist').innerHTML = buckets.map((c, i) => {
      const y0 = start + i * step, h = c ? Math.max(2, (c / max) * 42) : 0;
      return `<rect x="${i * w + .5}" y="${44 - h}" width="${w - 1}" height="${h}" class="${y0 + step > state.yr[0] && y0 <= state.yr[1] ? 'in' : ''}"><title>${y0}–${y0 + step - 1}: ${c}</title></rect>`;
    }).join('');
    $('#f-yr-label').textContent = (state.yr[0] <= MIN_Y && state.yr[1] >= MAX_Y ? 'all' : `${state.yr[0]}–${state.yr[1]}`) + ` · ${total} dated`;
  }
  function filtersChanged() {
    clearTimeout(filtersChanged.t); filtersChanged.t = setTimeout(() => track('filter_change', { credible_only: state.credibleOnly, hide_explained: state.hideExplained, types: [...state.types].sort().join(','), tags: [...state.tags].join(',') || 'none' }), 1500);
    store.set('credibleOnly', state.credibleOnly); store.set('hideExplained', state.hideExplained); store.set('types', [...state.types]); store.set('typesSeen', allTypes); store.set('tags', [...state.tags]);
    store.set('yr', [state.yr[0] <= MIN_Y ? null : state.yr[0], state.yr[1] >= MAX_Y ? null : state.yr[1]]); store.set('showMentions', state.showMentions);
    computeVisible();
    renderFilters();
    refreshView(true);
  }
  $('#f-credible').addEventListener('change', e => { state.credibleOnly = e.target.checked; filtersChanged(); });
  $('#f-explained').addEventListener('change', e => { state.hideExplained = e.target.checked; filtersChanged(); });
  // Click toggles a type; a second click on the same type within 400 ms shows only that type
  // (the list re-renders on every click, so the browser's native dblclick never fires).
  let lastTypeClick = { t: null, at: 0, before: null };
  // "only this type": double-click/double-tap, or long-press (hold ~0.5 s), which is the natural gesture on touchscreens.
  // A second long-press on the type already shown alone brings all types back.
  const onlyType = t => { state.types = state.types.size === 1 && state.types.has(t) ? new Set(graphTypes) : new Set([t]); filtersChanged(); };
  let pressTimer = null, pressStart = null, suppressClick = false, lastDown = 0;
  $('#f-types').addEventListener('pointerdown', e => {
    const el = e.target.closest('.f-type'); if (!el || e.button > 0) return;
    pressStart = { x: e.clientX, y: e.clientY };
    lastDown = e.timeStamp; // double-taps are timed from when the finger touched down, not from when the (possibly busy) page handled it
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null; suppressClick = true; // the click that follows the release must not toggle again
      navigator.vibrate?.(12);
      lastTypeClick = { t: null, at: 0, before: null };
      onlyType(el.dataset.type);
    }, 500);
  });
  const cancelPress = e => { if (pressTimer && (e.type !== 'pointermove' || Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10)) { clearTimeout(pressTimer); pressTimer = null; } };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) $('#f-types').addEventListener(ev, cancelPress);
  $('#f-types').addEventListener('contextmenu', e => { if (e.target.closest('.f-type')) e.preventDefault(); }); // no long-press menu
  $('#f-types').addEventListener('click', e => {
    const el = e.target.closest('.f-type'); if (!el) return;
    e.preventDefault();
    if (suppressClick) { suppressClick = false; return; }
    const t = el.dataset.type, now = lastDown || e.timeStamp;
    if (lastTypeClick.t === t && now - lastTypeClick.at < 400) {
      // judge by the selection *before* the first click of the pair
      const b = lastTypeClick.before;
      const wasOnlyThis = b.size === 1 && b.has(t);
      state.types = wasOnlyThis ? new Set(graphTypes) : new Set([t]);
      lastTypeClick = { t: null, at: 0, before: null };
    } else {
      lastTypeClick = { t, at: now, before: new Set(state.types) };
      state.types.has(t) ? state.types.delete(t) : state.types.add(t);
    }
    filtersChanged();
  });
  $('#f-tags').addEventListener('click', e => {
    const el = e.target.closest('[data-tag]'); if (!el) return;
    const t = el.dataset.tag;
    state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t);
    filtersChanged();
  });
  $('#f-tags-clear').addEventListener('click', () => { state.tags.clear(); filtersChanged(); });
  // like the themes' "clear": drop the type filter, i.e. show every type again
  $('#f-types-clear').addEventListener('click', () => { state.types = new Set(graphTypes); filtersChanged(); });
  let yrTimer;
  for (const id of ['#f-yr-a', '#f-yr-b']) {
    $(id).addEventListener('input', () => {
      let a = +$('#f-yr-a').value, b = +$('#f-yr-b').value;
      if (a > b) [a, b] = [b, a];
      state.yr = [a, b];
      renderHist();
      clearTimeout(yrTimer);
      yrTimer = setTimeout(filtersChanged, 180);
    });
  }
  $('#f-mentions').addEventListener('change', e => { state.showMentions = e.target.checked; filtersChanged(); });
  $('#btn-relayout').addEventListener('click', () => layoutGraph(true, { fresh: true }));

  // ───────────── graph ─────────────
  let cy = null, layoutTimer = null, hasFcose = false;
  try { if (window.cytoscapeFcose) { cytoscape.use(window.cytoscapeFcose); hasFcose = true; } } catch { hasFcose = !!window.cytoscapeFcose; }
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function graphStyle() {
    return [
      { selector: 'node', style: {
        'background-color': 'data(color)', shape: 'data(shape)', width: 'data(size)', height: 'data(size)',
        label: 'data(label)', 'font-size': 9, 'font-family': 'IBM Plex Sans, system-ui, sans-serif', color: css('--text'),
        'text-valign': 'bottom', 'text-margin-y': 3, 'min-zoomed-font-size': 7, 'text-wrap': 'wrap', 'text-max-width': 190, 'line-height': 1.15, 'text-justification': 'center',
        'text-background-color': css('--bg'), 'text-background-opacity': 0.75, 'text-background-padding': 1, 'text-background-shape': 'roundrectangle',
        'border-width': 0, 'overlay-opacity': 0,
      } },
      { selector: 'node.outside', style: { 'background-opacity': 0.45, 'border-width': 1.5, 'border-color': css('--outside'), 'border-style': 'dashed' } },
      { selector: 'node:selected', style: { 'border-width': 3, 'border-color': css('--accent'), 'border-style': 'solid' } },
      { selector: 'edge', style: {
        width: 1, 'line-color': css('--edge'), 'curve-style': 'straight', opacity: 0.85, 'overlay-opacity': 0,
        'target-arrow-shape': 'none', 'font-size': 8, color: css('--muted'), 'text-rotation': 'autorotate',
        'text-background-color': css('--bg'), 'text-background-opacity': 0.85, 'text-background-padding': 1,
      } },
      { selector: 'edge[kind="mention"]', style: { 'line-style': 'dashed', 'line-dash-pattern': [3, 3], opacity: 0.6 } },
      // generic links (“related to”) stay visible but recede, so the specific ones stand out
      { selector: 'edge[label="related to"]', style: { 'line-style': 'dashed', 'line-dash-pattern': [4, 3], opacity: 0.45 } },
      { selector: '.faded', style: { opacity: 0.08 } },
      { selector: 'node.path', style: { 'border-width': 3, 'border-color': css('--accent'), 'border-style': 'solid', 'font-size': 11, 'font-weight': 600 } },
      { selector: 'edge.path', style: { 'line-color': css('--accent'), width: 2.4, label: 'data(label)', opacity: 1 } },
      { selector: 'edge.hl', style: { 'line-color': css('--accent'), width: 1.6, label: 'data(label)', opacity: 1 } },
      { selector: 'node.hl', style: { 'font-size': 10.5, 'font-weight': 600 } },
      { selector: 'node.trail', style: { 'border-width': 3, 'border-color': css('--accent'), 'border-style': 'solid', 'font-size': 11, 'font-weight': 600, opacity: 1 } },
      { selector: 'edge.trail', style: { 'line-color': css('--accent'), width: 3, label: 'data(label)', opacity: 1 } },
      { selector: 'node.big', style: { 'font-size': 12.5, 'min-zoomed-font-size': 5.5, 'text-max-width': 160 } }, // exploring: labels readable zoomed out
      { selector: 'node.later', style: { opacity: 0.22 } }, // a story's steps still to come
      { selector: 'edge.later', style: { opacity: 0.06 } },
      { selector: '.hidden', style: { display: 'none' } },
    ];
  }
  // Graph labels: up to two lines, broken at a word boundary so both lines are similar in length;
  // only names that still don't fit get an ellipsis on the second line.
  function twoLines(name, max = 28) {
    if (name.length <= max) return name;
    const words = name.split(/\s+/);
    const long = name.length > 2 * max; // long names: fill line 1 greedily so line 2 keeps more of the name
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      if (a.length > max) break;
      const score = long ? -a.length : Math.max(a.length, b.length);
      if (!best || score < best.score) best = { a, b, score };
    }
    if (!best) return name.slice(0, max - 1) + '-\n' + (name.length > 2 * max ? name.slice(max - 1, 2 * max - 3) + '…' : name.slice(max - 1));
    const b = best.b.length > max ? best.b.slice(0, max).replace(/\s+\S*$/, '') + '…' : best.b;
    return `${best.a}\n${b}`;
  }
  function initGraph() {
    const degree = id => adj.get(id).filter(x => x.kind !== 'mention' && !offGraph(byId.get(x.other)?.type)).length;
    const elements = [
      ...ents.filter(e => !offGraph(e.type)).map(e => ({ data: {
        id: e.id, label: twoLines(e.name), type: e.type,
        color: TYPES[e.type]?.color || '#999', shape: TYPES[e.type]?.shape || 'ellipse', size: Math.min(48, 12 + Math.sqrt(degree(e.id)) * 6),
      }, classes: e.cred === 'outside' ? 'outside' : '' })),
      ...KB.edges.map((x, i) => [x, i]).filter(([x]) => !offGraph(byId.get(x.s)?.type) && !offGraph(byId.get(x.t)?.type))
        .map(([x, i]) => ({ data: { id: 'e' + i, source: x.s, target: x.t, label: x.label, kind: x.kind, ...(x.note ? { tip: x.note } : {}) } })),
    ];
    cy = cytoscape({ container: $('#cy'), elements, style: graphStyle(), wheelSensitivity: 0.25, minZoom: 0.15, maxZoom: 3.5, boxSelectionEnabled: false });
    // tap: open the file's card. Double-tap / double-click: follow it (start a trail, or take the next step).
    let heldAt = 0, lastTap = { id: null, at: 0 }; // a long-press opens the menu; the tap that ends it does nothing else
    cy.on('tap', 'node', ev => {
      const id = ev.target.id(), now = Date.now();
      if (now - heldAt < 700) return;
      if (lastTap.id === id && now - lastTap.at < 400) { clearTimeout(lastTap.timer); lastTap = { id: null, at: 0 }; followFile(id); return; }
      // phones: the card opens full screen and would catch the second tap, so wait to see if one is coming
      // a clicked file is already in view: don't move the camera (it would also make a double-click miss)
      const open = () => { noFrame = true; try { select(id, { from: 'graph' }); } finally { noFrame = false; } };
      lastTap = { id, at: now, timer: window.innerWidth <= 860 ? setTimeout(open, 400) : (open(), null) };
    });
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__cy = cy; // for local UI tests
    cy.on('tap', ev => { if (ev.target === cy) select(null); });
    cy.on('mouseover', 'node', ev => { $('#cy').style.cursor = 'pointer'; if (!state.sel) highlight(ev.target.id(), true); });
    cy.on('mouseout', 'node', () => { $('#cy').style.cursor = ''; if (!state.sel) highlight(null); });
    // full text of a link on hover (tap on touch screens): labels on the line stay a few words long
    const tip = document.createElement('div');
    tip.className = 'edge-tip'; tip.hidden = true;
    $('#view-graph').appendChild(tip);
    const showTip = ev => {
      const ed = ev.target, a = byId.get(ed.data('source')), b = byId.get(ed.data('target'));
      tip.innerHTML = `<b>${esc(a?.name || '')}</b> — ${esc(ed.data('label'))} — <b>${esc(b?.name || '')}</b>${ed.data('tip') ? `<div>${esc(ed.data('tip'))}</div>` : ''}`;
      const r = $('#cy').getBoundingClientRect(), g = $('#view-graph').getBoundingClientRect(), p = ev.renderedPosition;
      tip.style.left = `${Math.min(r.left - g.left + p.x + 12, g.width - 300)}px`; tip.style.top = `${r.top - g.top + p.y + 12}px`;
      tip.hidden = false;
    };
    cy.on('cxttap', 'node', ev => openNodeMenu(ev.target.id(), ev.renderedPosition));
    cy.on('taphold', 'node', ev => { heldAt = Date.now(); openNodeMenu(ev.target.id(), ev.renderedPosition); });
    cy.on('viewport', closeNodeMenu);
    $('#cy').addEventListener('contextmenu', e => e.preventDefault());
    cy.on('mouseover', 'edge', showTip);
    cy.on('tap', 'edge', showTip);
    cy.on('mouseout', 'edge', () => { tip.hidden = true; });
    cy.on('tap', ev => { if (ev.target === cy || ev.target.isNode?.()) tip.hidden = true; });
    cy.on('viewport', () => { tip.hidden = true; });
    $('#view-graph').insertAdjacentHTML('beforeend', '<div class="graph-hud" id="hud"></div>');
    $('#legend').innerHTML = graphTypes.map(t => `<span><i style="background:${TYPES[t].color}"></i>${TYPES[t].plural}</span>`).join('');
    applyGraphFilter();
    layoutGraph(false, { instant: true }); // first draw: framed in place, not flown in
  }
  function applyGraphFilter() {
    if (!cy) return;
    const nv = visible.size, ne = KB.edges.filter(x => visible.has(x.s) && visible.has(x.t) && (x.kind !== 'mention' || state.showMentions)).length;
    if ($('#hud') && state.trail?.story) setTimeout(() => { $('#hud').innerHTML = `Story · <b>${cy.nodes().not('.hidden').length}</b> files · <b>${cy.edges().not('.hidden').length}</b> links between them`; });
    else if ($('#hud') && state.trail?.core) setTimeout(() => { $('#hud').innerHTML = `Key files · <b>${cy.nodes().not('.hidden').length}</b> files · <b>${cy.edges().not('.hidden').length}</b> links between them`; });
    else if ($('#hud') && state.trail) setTimeout(() => { $('#hud').innerHTML = `Exploring · <b>${cy.nodes().not('.hidden').length}</b> files on screen · <b>${cy.edges().not('.hidden').length}</b> links${state.credibleOnly ? ' · official sources only' : ''}`; });
    else if ($('#hud')) $('#hud').innerHTML = `Case network · <b>${nv}</b> files · <b>${ne}</b> links${state.credibleOnly ? ' · official sources only' : ''}`;
    const shown = state.trail ? trailShown() : null;
    const show = id => visible.has(id) && !state.hiddenIds.has(id) && (!shown || shown.has(id));
    cy.batch(() => {
      cy.nodes().forEach(n => n.toggleClass('hidden', !show(n.id())));
      cy.edges().forEach(ed => ed.toggleClass('hidden', (ed.data('kind') === 'mention' && !state.showMentions) || !show(ed.data('source')) || !show(ed.data('target'))));
      // the trail: its files and the links between them (the path)
      cy.elements().removeClass('trail later');
      cy.nodes().toggleClass('big', !!state.trail);
      const steps = new Set(state.trail?.steps || []);
      for (const id of steps) cy.getElementById(id).addClass('trail');
      if (steps.size > 1) cy.edges().filter(ed => !ed.hasClass('hidden') && steps.has(ed.data('source')) && steps.has(ed.data('target'))).addClass('trail');
      // a story: the current step outlined, with its links to the steps before it; later steps wait, faded
      const story = state.trail?.story && storyById(state.trail.story);
      if (story) {
        const at = state.trail.at, cur = new Set(story.steps[at].ids), done = new Set(story.steps.slice(0, at).flatMap(st => st.ids));
        const later = new Set(story.steps.slice(at + 1).flatMap(st => st.ids).filter(id => !cur.has(id) && !done.has(id)));
        for (const id of cur) cy.getElementById(id).addClass('trail');
        for (const id of later) cy.getElementById(id).addClass('later');
        cy.edges().not('.hidden').forEach(ed => {
          const a = ed.data('source'), b = ed.data('target');
          if (later.has(a) || later.has(b)) ed.addClass('later');
          else if ((cur.has(a) && (cur.has(b) || done.has(b))) || (cur.has(b) && done.has(a))) ed.addClass('trail');
        });
      }
    });
    renderTrailBar();
  }
  // ───────────── exploration mode: follow a trail through the graph ─────────────
  // Start from one file ("Explore from here"): the graph shows it and its connections. Clicking a file only opens
  // its card. "Show its connections" (right-click / long-press) adds it to the trail and reveals its neighbours;
  // "Remove its connections" hides them again, except those that are themselves on the trail — the file stays on
  // the trail. The × on a trail chip takes a file off the trail. Files opened from search or a link while
  // exploring are pinned on screen.
  // Links generated from video moments ("discusses") are left out, like transcript mentions, except when the file
  // itself is a video: otherwise every interview that names a person would crowd that person's trail. "Speaks in"
  // (a speaker's own moments) stays.
  function graphNeighbours(id) {
    const out = new Set(), fromVideo = byId.get(id)?.type === 'video';
    for (const x of adj.get(id) || []) if (x.kind !== 'mention' && (x.kind !== 'moment' || x.label === 'speaks in' || fromVideo) && visible.has(x.other) && !offGraph(byId.get(x.other)?.type)) out.add(x.other);
    return out;
  }
  function trailShown() {
    const T = state.trail, shown = new Set([...T.steps, ...T.pinned]);
    for (const id of T.open) for (const o of graphNeighbours(id)) shown.add(o);
    return shown;
  }
  // Extending a trail must not reshuffle it: files already on screen keep their place, new ones fan out around the
  // file that revealed them (away from the previous step), a short settle pass moves only the new ones, and the
  // camera pans just enough to show them. A full layout happens only for a new trail (or a filter change).
  function trailChanged(anchorId, { relayout = false } = {}) {
    if (!cy) return;
    const before = cy.nodes().not('.hidden');
    const prev = new Set(before.map(n => n.id()));
    applyGraphFilter();
    highlight(state.sel);
    if (relayout) { hideGraph(); clearTimeout(layoutTimer); layoutTimer = setTimeout(() => layoutGraph(false, { instant: true }), 60); return; }
    const fresh = cy.nodes().not('.hidden').filter(n => !prev.has(n.id()));
    if (!fresh.length) return; // only removals: nothing moves
    const anchor = anchorId ? cy.getElementById(anchorId) : null;
    if (!state.trail || prev.size === 0) { clearTimeout(layoutTimer); layoutTimer = setTimeout(() => layoutGraph(prev.size > 0, { instant: prev.size === 0 }), 60); return; }
    let head = anchor?.length && prev.has(anchorId) ? anchor : null;
    if (!head) {
      // a file pinned from search: put it in the free space at the edge of what's on screen, then settle
      const bb = before.boundingBox();
      fresh.forEach((n, k) => n.position({ x: bb.x2 + 140, y: (bb.y1 + bb.y2) / 2 + k * 70 }));
      head = fresh[0];
    } else fanOut(head, fresh.not(head));
    settle(before.filter(n => !n.hasClass('hidden')), fresh, head);
  }
  // new neighbours on an arc facing away from the previous step (or from the centre of what's already shown)
  // Exploration layouts have far fewer files than the full network, so they can afford real room: nodes are sized
  // with their labels, repel strongly, and links to well-connected files are longer (busy hubs get more space).
  // The full network keeps its own options, in sync with the precomputed layout (scripts/layout.mjs).
  const visDeg = n => n.connectedEdges().not('.hidden').length;
  const TRAIL_SPACING = {
    nodeDimensionsIncludeLabels: true,
    nodeRepulsion: () => 24000,
    idealEdgeLength: ed => 110 + 14 * Math.sqrt(Math.max(visDeg(ed.source()), visDeg(ed.target()))),
    edgeElasticity: () => 0.3,
    nodeSeparation: 140,
    numIter: 2500,
  };
  const CORE_SPACING = {
    nodeDimensionsIncludeLabels: true,
    nodeRepulsion: () => 12000,
    idealEdgeLength: () => 95,
    edgeElasticity: () => 0.45,
    nodeSeparation: 80,
    gravity: 1.2, gravityRange: 1.0,
    numIter: 2500,
    packComponents: false, tile: false, // files with no link among the key files (PURSUE, Rendlesham…) are pulled in by gravity, not set apart
  };
  function fanOut(head, nodes) {
    if (!nodes.length) return;
    const c = head.position(), steps = state.trail.steps, i = steps.indexOf(head.id());
    const from = i > 0 ? cy.getElementById(steps[i - 1]) : null;
    const others = cy.nodes().not('.hidden').not(nodes).not(head);
    const ref = from?.length ? from.position() : others.length ? (b => ({ x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }))(others.boundingBox()) : { x: c.x, y: c.y + 1 };
    const dir = Math.atan2(c.y - ref.y, c.x - ref.x) || 0;
    // start beyond whatever is already on screen in that direction, so the new files don't land on the old ones
    const ux = Math.cos(dir), uy = Math.sin(dir);
    const clear = others.reduce((m, o) => { const q = o.position(); return Math.max(m, (q.x - c.x) * ux + (q.y - c.y) * uy); }, 0);
    // stay on the far side (a half circle at most): more files go on further rings rather than wrapping round;
    // spacing is sized for a node plus its two-line label
    const arc = nodes.length <= 3 ? Math.PI / 2 : Math.PI * 0.9;
    const r0 = Math.max(220, Math.min(clear + 140, 520));
    let k = 0, ring = 0;
    while (k < nodes.length) {
      const r = r0 + ring * 160, cap = Math.max(1, Math.floor((arc * r) / 170)), n = Math.min(cap, nodes.length - k);
      for (let j = 0; j < n; j++, k++) {
        const a = dir + (n === 1 ? 0 : -arc / 2 + (arc * j) / (n - 1));
        nodes[k].position({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
      }
      ring++;
    }
  }
  // settle overlaps by moving only the new files; everything already on screen is pinned in place
  function settle(fixed, fresh, head) {
    const done = () => showNew(fresh.union(head));
    if (!hasFcose) { done(); return; }
    cy.elements().not('.hidden').layout({
      name: 'fcose', randomize: false, animate: true, animationDuration: 450, fit: false, quality: 'default', numIter: 800,
      fixedNodeConstraint: fixed.map(n => ({ nodeId: n.id(), position: { ...n.position() } })),
      ...TRAIL_SPACING, gravity: 0.05, packComponents: false, tile: false,
    }).one('layoutstop', done).run();
  }
  // the area the graph is visible in (left of the side panel on desktop)
  function viewArea() {
    cy.resize();
    const cr = cy.container().getBoundingClientRect(), panel = $('#panel');
    const pr = !panel.hidden && window.innerWidth > 860 ? panel.getBoundingClientRect() : null;
    return { w: pr && pr.left < cr.right ? Math.max(200, pr.left - cr.left) : cy.width(), h: cy.height() };
  }
  // bring files into view with the smallest move: no move if visible, else a pan, else zoom out just enough
  function showNew(eles) {
    const { w, h } = viewArea(), m = 40, top = state.trail ? 90 : m; // leave room for the trail bar…
    const legend = $('#legend'), bottom = legend && legend.offsetParent ? Math.max(m, cy.container().getBoundingClientRect().bottom - legend.getBoundingClientRect().top + 16) : m; // …and the legend
    const rb = eles.renderedBoundingBox();
    const scale = Math.min(1, (w - 2 * m) / Math.max(rb.w, 1), (h - top - bottom) / Math.max(rb.h, 1));
    if (scale < 1) {
      // never zoom out so far that labels vanish (they need about 0.8); centre the new files instead and let the
      // viewer pan or zoom for the rest
      const z = Math.max(Math.min(cy.zoom(), 0.8), cy.zoom() * scale), bb = eles.boundingBox();
      cy.animate({ zoom: z, pan: { x: w / 2 - z * (bb.x1 + bb.x2) / 2, y: top + (h - top - bottom) / 2 - z * (bb.y1 + bb.y2) / 2 } }, { duration: 350 });
      return;
    }
    const dx = rb.x1 < m ? m - rb.x1 : rb.x2 > w - m ? w - m - rb.x2 : 0;
    const dy = rb.y1 < top ? top - rb.y1 : rb.y2 > h - bottom ? h - bottom - rb.y2 : 0;
    if (dx || dy) cy.animate({ panBy: { x: dx, y: dy } }, { duration: 350 });
  }
  // Explore opens on a small map of the key files (content/explore.json) rather than the whole network, which is
  // slow to draw and unreadable at a glance. It is a trail with no steps whose files are pinned on screen, so
  // search, selection and the menu work as in any trail; following a file starts a real trail from it.
  // /explore?full (no button: the whole network is too big to read) leaves it (state.full); "Back to the key files" and "Exit trail" return to it.
  const EXPLORE = KB.explore || { core: [], starts: [], stories: [] };
  const coreTrail = () => ({ core: true, steps: [], open: new Set(), pinned: new Set(EXPLORE.core.filter(id => byId.has(id))) });
  function enterCore() {
    if (new URLSearchParams(location.search).has('story')) history.replaceState(history.state, '', '/explore');
    state.full = false;
    state.trail = coreTrail();
    hideGraph(); // hidden at once: the files would show at their old places until the layout runs
    applyGraphFilter();
    highlight(state.sel);
    clearTimeout(layoutTimer); layoutTimer = setTimeout(() => layoutGraph(false, { instant: true }), 60);
  }
  function showFull() {
    state.full = true;
    state.trail = null;
    track('explore_full');
    applyGraphFilter();
    highlight(state.sel);
    layoutGraph(true);
  }
  function startTrail(id) {
    if (!byId.has(id)) return;
    state.trail = { steps: [id], open: new Set([id]), pinned: new Set() };
    state.hiddenIds.delete(id);
    if (state.view !== 'graph') go('graph');
    if (state.sel !== id) select(id, { from: 'trail', noPanel: window.innerWidth <= 860 });
    if (window.innerWidth <= 860) closePanel(); // on a phone the panel would cover the graph you're exploring
    trailChanged(id, { relayout: true });
  }
  // Stories (content/explore.json `stories`): a trail that opens with all of a story's files on screen, told step by
  // step: the current step is outlined with its links to the earlier ones, later steps wait faded. Following or
  // opening a file works as in any trail, and the story stays on screen. /explore?story=<id> opens one.
  function storyById(id) { return (EXPLORE.stories || []).find(s => s.id === id); }
  function startStory(id, at = 0) {
    const s = storyById(id); if (!s) return;
    const ids = s.steps.flatMap(st => st.ids).filter(x => byId.has(x));
    clearFilters(null);
    if (ids.some(x => byId.get(x).cred === 'outside')) state.credibleOnly = false;
    if (ids.some(x => resolved(byId.get(x)))) state.hideExplained = false;
    state.full = false;
    state.trail = { story: id, at: Math.max(0, Math.min(at, s.steps.length - 1)), steps: [], open: new Set(), pinned: new Set(ids) };
    if (state.view !== 'graph') go('graph');
    history.replaceState(history.state, '', `/explore?story=${encodeURIComponent(id)}`);
    if (window.innerWidth <= 860) closePanel();
    trailChanged(null, { relayout: true });
  }
  function storyStep(i) {
    const T = state.trail, s = T?.story && storyById(T.story); if (!s) return;
    const at = Math.max(0, Math.min(i, s.steps.length - 1)); if (at === T.at) return;
    T.at = at;
    applyGraphFilter();
    highlight(state.sel);
    frameEles(cy.nodes('.trail').not('.hidden'), true); // bring the step's own files into view
  }
  function expandFile(id) {
    const T = state.trail;
    if (!T.steps.includes(id)) T.steps.push(id);
    T.open.add(id);
    T.pinned.delete(id);
    state.hiddenIds.delete(id);
    trailChanged(id);
  }
  function collapseFile(id) { state.trail.open.delete(id); trailChanged(); } // stays on the trail
  // Double-click: follow a file. Outside a trail it starts one; on the trail's edge it becomes the next step and the
  // earlier steps fold their connections away (the path stays); on an earlier step it goes back there and drops
  // the steps after it. "Show its connections" (menu) remains the additive way to open other directions.
  function followFile(id) {
    if (!byId.has(id) || offGraph(byId.get(id).type)) return;
    if (!state.trail || state.trail.core) { if (state.trail?.core) track('explore_start', { item_id: id, method: 'key_files' }); startTrail(id); return; }
    const T = state.trail, i = T.steps.indexOf(id);
    if (i >= 0) T.steps.length = i + 1; else T.steps.push(id);
    T.open = new Set([id]);
    T.pinned.delete(id);
    state.hiddenIds.delete(id);
    if (state.sel !== id) select(id, { from: 'trail', noPanel: window.innerWidth <= 860 });
    if (window.innerWidth <= 860) closePanel(); // phones: keep following in the graph; a single tap opens the card
    trailChanged(id);
  }
  function popStep(id) {
    const T = state.trail;
    if (T.steps.length === 1) return; // keep one file to explore from
    T.steps = T.steps.filter(x => x !== id);
    T.open.delete(id);
    trailChanged();
  }
  function exitTrail() { enterCore(); } // back to the key files
  function hideFile(id) {
    if (state.trail) {
      const T = state.trail;
      if (T.steps.length === 1 && T.steps[0] === id) return; // keep at least one file to explore from
      T.steps = T.steps.filter(x => x !== id);
      T.open.delete(id); T.pinned.delete(id);
    }
    state.hiddenIds.add(id);
    if (state.sel === id) select(null, { from: 'trail' });
    trailChanged();
  }
  const narrowScreen = () => matchMedia('(max-width: 860px)').matches;
  function renderTrailBar() {
    let bar = $('#trail-bar');
    if (!bar) { $('#view-graph').insertAdjacentHTML('beforeend', '<div class="trail-bar" id="trail-bar" hidden></div>'); bar = $('#trail-bar'); }
    const T = state.trail, nh = state.hiddenIds.size;
    $('#view-graph').classList.toggle('exploring', !!T);
    bar.hidden = !T && !nh && !state.full;
    if (bar.hidden) return;
    const hiddenNote = nh ? `<span class="tb-hidden">${nh} hidden · <button class="link" data-unhide>show</button></span>` : '';
    if (T?.core) {
      const stories = (EXPLORE.stories || []).filter(s => byId.has(s.steps[0]?.ids[0]));
      const starts = stories.length ? `<span class="tb-lbl tb-lbl-start">Start <span>a story</span></span>${stories.map(s => `<button class="tb-start" style="--c:${TYPES[byId.get(s.steps[0].ids[0]).type].color}" data-story-start="${esc(s.id)}" title="${esc(s.blurb || '')}">${esc(s.label)}</button>`).join('')}`
        : `<span class="tb-lbl">Start from</span>${EXPLORE.starts.filter(s => byId.has(s.id)).map(s => `<button class="tb-start" style="--c:${TYPES[byId.get(s.id).type].color}" data-core-start="${esc(s.id)}">${esc(s.label)}</button>`).join('')}`;
      bar.innerHTML = `<div class="tb-row tb-starts">${starts}</div>
        <div class="tb-row tb-tools"><span class="tb-hint">${narrowScreen() ? 'The key files · tap to read · double-tap to follow' : 'The key files of the story · click one to read it · double-click to follow its connections'}</span>${hiddenNote}</div>`;
      return;
    }
    if (!T) {
      bar.innerHTML = `<div class="tb-row tb-tools">${hiddenNote}<button class="btn small" data-core>◎ Back to the key files</button></div>`;
      return;
    }
    const story = T.story && storyById(T.story);
    const storyRows = story ? (() => {
      const st = story.steps[T.at], last = story.steps.length - 1;
      // a pager: ‹ 1 2 3 › — on the first step the left arrow becomes ✕ (back to the key files); no › on the last
      return `<div class="tb-row tb-story"><b class="tb-stitle">${esc(story.title)}</b><nav class="tb-pager" aria-label="Story steps">
        ${T.at > 0 ? `<button class="tb-arrow" data-story-at="${T.at - 1}" title="Previous step" aria-label="Previous step"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : `<button class="tb-arrow tb-close" data-trail-exit title="Back to the key files" aria-label="Close the story and go back to the key files"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
        <span class="tb-dots">${story.steps.map((x, i) => `<button class="tb-dot ${i === T.at ? 'on' : i < T.at ? 'done' : ''}" data-story-at="${i}" title="${esc(x.title)}" aria-label="Step ${i + 1}: ${esc(x.title)}">${i + 1}</button>`).join('')}</span>
        ${T.at < last ? `<button class="tb-arrow tb-next" data-story-at="${T.at + 1}" title="Next step" aria-label="Next step"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}</nav></div>
        <div class="tb-row tb-caption"><div><b>${esc(st.title)}.</b> ${esc(st.text)}</div><div class="tb-files">${st.ids.filter(id => byId.has(id)).map(id => `<button class="tb-start tb-file" style="--c:${TYPES[byId.get(id).type].color}" data-trail-open="${esc(id)}" title="Open the file card">${esc(byId.get(id).name)}</button>`).join('')}</div></div>`;
    })() : '';
    const steps = T ? T.steps.map(id => `<span class="tb-step ${state.sel === id ? 'on' : ''} ${T.open.has(id) ? '' : 'closed'}" style="--c:${TYPES[byId.get(id).type].color}"><button class="tb-name" data-trail-open="${esc(id)}" title="Open the file card">${esc(byId.get(id).name)}</button>${T.steps.length > 1 ? `<button class="tb-x" data-trail-pop="${esc(id)}" title="Take off the trail" aria-label="Take off the trail">×</button>` : ''}</span>`).join('<span class="tb-sep">›</span>') : '';
    bar.innerHTML = `${storyRows}${T.steps.length ? `<div class="tb-row"><span class="tb-lbl">Trail</span>${steps}</div>` : ''}
      <div class="tb-row tb-tools">${story && !T.steps.length ? `<span class="tb-hint">${narrowScreen() ? 'Tap a file to read it · double-tap to follow it' : 'Click a file to read it · double-click to follow its connections · ← → to move through the story · Esc to close it'}</span>` : ''}${T && T.steps.length === 1 ? `<span class="tb-hint">${narrowScreen() ? 'Tap to read · double-tap to follow · hold for more' : 'Click a file to read it · double-click to follow it · right-click for more'}</span>` : ''}
        ${hiddenNote}
        ${story ? '' : '<button class="btn small" data-trail-exit>◎ Back to the key files</button>'}</div>`; // a story has its own way back (breadcrumb)
  }
  $('#view-graph').addEventListener('click', e => {
    const op = e.target.closest('[data-trail-open]'); if (op) { select(op.dataset.trailOpen, { from: 'trail' }); return; }
    const pp = e.target.closest('[data-trail-pop]'); if (pp) { popStep(pp.dataset.trailPop); return; }
    if (e.target.closest('[data-trail-exit]')) { exitTrail(); return; }
    const ss = e.target.closest('[data-story-start]'); if (ss) { track('explore_start', { item_id: ss.dataset.storyStart, method: 'story' }); startStory(ss.dataset.storyStart); return; }
    const sa = e.target.closest('[data-story-at]'); if (sa) { storyStep(+sa.dataset.storyAt); return; }
    const cs = e.target.closest('[data-core-start]'); if (cs) { track('explore_start', { item_id: cs.dataset.coreStart, method: 'starting_point' }); exploreFrom(cs.dataset.coreStart); return; }
    if (e.target.closest('[data-core]')) { enterCore(); return; }
    if (e.target.closest('[data-unhide]')) { state.hiddenIds.clear(); trailChanged(null, { relayout: true }); return; }
  });

  // right-click (long-press on touch) menu on a file
  function openNodeMenu(id, pos) {
    closeNodeMenu();
    const e = byId.get(id), T = state.trail?.core ? null : state.trail;
    const items = [
      !T && ['explore', '◎ Explore from here'],
      // same as a double-click: follow the file (a step already on the trail goes back to it)
      T && !T.steps.includes(id) && ['follow', '➜ Add to trail'],
      T && T.steps.includes(id) && T.steps[T.steps.length - 1] !== id && ['follow', '↩ Back to this step'],
      T && (T.open.has(id) ? ['collapse', '− Remove its connections'] : ['expand', '✚ Show its connections']),
      !(T && T.steps.length === 1 && T.steps[0] === id) && ['hide', '⊘ Hide this file'],
      ['path', '⇢ Find a path to…'],
    ].filter(Boolean);
    const m = document.createElement('div');
    m.className = 'node-menu'; m.id = 'node-menu';
    m.innerHTML = `<div class="nm-title" style="--c:${TYPES[e.type].color}">${esc(e.name)}</div>${items.map(([k, l]) => `<button data-nm="${k}">${l}</button>`).join('')}`;
    m.dataset.id = id;
    $('#view-graph').appendChild(m);
    const g = $('#view-graph').getBoundingClientRect(), r = $('#cy').getBoundingClientRect();
    m.style.left = `${Math.max(8, Math.min(r.left - g.left + pos.x, g.width - m.offsetWidth - 8))}px`;
    const tabBar = window.innerWidth <= 860 ? $('#views').getBoundingClientRect().top - g.top : g.height; // phones: stay above the bottom tab bar
    m.style.top = `${Math.max(8, Math.min(r.top - g.top + pos.y, tabBar - m.offsetHeight - 8))}px`;
  }
  function closeNodeMenu() { $('#node-menu')?.remove(); }
  $('#view-graph').addEventListener('click', e => {
    const b = e.target.closest('#node-menu [data-nm]'); if (!b) return;
    const id = $('#node-menu').dataset.id, k = b.dataset.nm;
    closeNodeMenu();
    if (k === 'explore') startTrail(id);
    else if (k === 'follow') followFile(id);
    else if (k === 'expand') expandFile(id);
    else if (k === 'collapse') collapseFile(id);
    else if (k === 'hide') hideFile(id);
    else if (k === 'path') {
      select(id, { from: 'card' });
      if (k === 'path') setTimeout(() => { const q = $('#trace-q'); if (q) { q.scrollIntoView({ block: 'center', behavior: 'smooth' }); q.focus(); } }, 150);
    }
  });
  document.addEventListener('pointerdown', e => { if ($('#node-menu') && !e.composedPath().includes($('#node-menu'))) closeNodeMenu(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#node-menu')) { closeNodeMenu(); e.menuClosed = true; } });
  document.addEventListener('keydown', e => { // Escape closes a story (when no menu, card or field has it)
    if (e.key !== 'Escape' || e.menuClosed || state.view !== 'graph' || !state.trail?.story || state.sel || e.target.closest('input, textarea, select, [contenteditable]')) return;
    exitTrail();
  });
  document.addEventListener('keydown', e => { // ← → move through a story
    if (state.view !== 'graph' || !state.trail?.story || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); storyStep(state.trail.at + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); storyStep(state.trail.at - 1); }
  });

  // Positions computed at build time (scripts/layout.mjs) for the default view and the full network
  const LAYOUT = window.KB_LAYOUT || null;
  function presetFor(eles) {
    if (!LAYOUT || state.showMentions || state.trail || state.hiddenIds.size) return null;
    const ids = eles.nodes().map(n => n.id());
    for (const pos of [LAYOUT.official, LAYOUT.all]) if (pos && ids.length === Object.keys(pos).length && ids.every(id => pos[id])) return pos;
    return null;
  }
  // a layout fits the whole graph; bring the selected file and its connections back into view afterwards
  // (an animated layout can still be moving the nodes when it reports done: tidy up once they have stopped)
  const whenStill = fn => cy.nodes().some(n => n.animated()) ? setTimeout(() => whenStill(fn), 60) : fn();
  const reframeSel = () => {
    if (state.view !== 'graph') { if (instantFrame) { instantFrame = false; fadeIn(); } return; }
    whenStill(() => {
      if (state.trail?.core) { pullInCore(); orientCore(); } else if (state.trail) pullOutliers();
      const instant = instantFrame; instantFrame = false;
      if (state.trail) setTimeout(() => { frameEles(cy.nodes().not('.hidden'), true, instant); if (instant) fadeIn(); }, instant ? 0 : 50);
      else { if (state.sel) setTimeout(() => frameHood(cy.getElementById(state.sel)), 50); if (instant) fadeIn(); }
    });
  };
  // files with no link among the key files (PURSUE, Rendlesham…) would float far off: set each loose group just
  // outside the main cluster, in the direction it already lies
  function pullInCore() {
    const comps = cy.elements().not('.hidden').components().sort((a, b) => b.nodes().length - a.nodes().length);
    if (comps.length < 2) return;
    const main = comps[0].nodes().boundingBox(), mx = (main.x1 + main.x2) / 2, my = (main.y1 + main.y2) / 2, gap = 30;
    cy.batch(() => comps.slice(1).forEach(c => {
      const ns = c.nodes(), b = ns.boundingBox(), cx = (b.x1 + b.x2) / 2, cyy = (b.y1 + b.y2) / 2;
      let dx = cx - mx, dy = cyy - my; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      // distance from the main centre to its box edge along that direction, plus half the group and a gap
      const t = Math.min(Math.abs(dx) > 1e-6 ? (main.w / 2) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? (main.h / 2) / Math.abs(dy) : Infinity);
      const reach = t + (Math.abs(dx) * b.w + Math.abs(dy) * b.h) / 2 + gap, tx = mx + dx * reach, ty = my + dy * reach;
      ns.forEach(n => { const p = n.position(); n.position({ x: p.x + tx - cx, y: p.y + ty - cyy }); });
    }));
  }
  // a trail's layout can leave a file or two far out on a long spoke, which forces the zoom so low that no label
  // reads: bring any file more than 1.7× the median distance from the centre back in to 1.4×
  function pullOutliers() {
    const nodes = cy.nodes().not('.hidden');
    if (nodes.length < 6) return;
    const head = cy.getElementById(state.trail.steps[state.trail.steps.length - 1]);
    const bb = nodes.boundingBox(), c = head.length && !head.hasClass('hidden') ? head.position() : { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 };
    const d = nodes.map(n => Math.hypot(n.position('x') - c.x, n.position('y') - c.y)).sort((a, b) => a - b);
    const typical = d[Math.floor(d.length / 2)], limit = 1.7 * typical;
    if (!typical) return;
    cy.batch(() => nodes.forEach(n => {
      const p = n.position(), dist = Math.hypot(p.x - c.x, p.y - c.y);
      if (dist > limit) n.position({ x: c.x + (p.x - c.x) * typical * 1.4 / dist, y: c.y + (p.y - c.y) * typical * 1.4 / dist });
    }));
  }
  // the key-files map fills a phone (tall) or a desktop (wide) screen better when its long side matches: turn it 90°
  function orientCore() {
    const nodes = cy.nodes().not('.hidden'), bb = nodes.boundingBox(), { w, h } = viewArea();
    if ((bb.w > bb.h) === (w > h) || Math.abs(bb.w - bb.h) < 0.05 * Math.max(bb.w, bb.h)) return;
    const cx = (bb.x1 + bb.x2) / 2, cyy = (bb.y1 + bb.y2) / 2;
    cy.batch(() => nodes.forEach(n => { const p = n.position(); n.position({ x: cx + (p.y - cyy), y: cyy - (p.x - cx) }); }));
  }
  // instant: a fresh map (the key files, a new trail) is laid out in one go, framed without moving the camera, and
  // faded in, instead of flying in from wherever its raw coordinates fall before it is framed
  let instantFrame = false;
  const hideGraph = () => { if (!cy) return; const c = cy.container(); c.style.transition = 'none'; c.style.opacity = 0; };
  const fadeIn = () => { const c = cy.container(); requestAnimationFrame(() => { c.style.transition = 'opacity .25s ease'; c.style.opacity = 1; }); };
  function layoutGraph(animate, { fresh = false, instant = false } = {}) {
    if (!cy) return;
    cy.resize(); // the side panel may have just opened or closed
    if (instant) { instantFrame = true; const c = cy.container(); c.style.transition = 'none'; c.style.opacity = 0; }
    const eles = cy.elements().not('.hidden');
    const preset = !fresh && presetFor(eles);
    if (preset) {
      eles.layout({ name: 'preset', positions: n => ({ x: preset[n.id()][0], y: preset[n.id()][1] }), fit: true, padding: 40, animate: !!animate, animationDuration: 500 })
        .one('layoutstop', reframeSel).run();
      return;
    }
    // first draw of a filtered view: start from the precomputed full-network positions so the force layout settles fast
    // (the key files always start from there too, so their map is the same every time)
    const core = !!state.trail?.core, seeded = (core || (!animate && !fresh)) && LAYOUT?.all;
    if (seeded) cy.batch(() => eles.nodes().forEach(n => { const p = LAYOUT.all[n.id()]; if (p) n.position({ x: p[0], y: p[1] }); }));
    eles.layout(hasFcose ? {
      name: 'fcose', quality: seeded ? 'default' : 'proof', randomize: !animate && !seeded, animate: !!animate, animationDuration: 700, fit: !state.trail, padding: 40, // a trail is framed afterwards, in the area left of the panel
      nodeRepulsion: n => 9000, idealEdgeLength: ed => (ed.data('kind') === 'mention' ? 160 : 75), edgeElasticity: () => 0.4,
      gravity: 0.3, gravityRangeCompound: 1.5, numIter: 3000, nodeSeparation: 90, packComponents: true, tile: true,
      tilingPaddingVertical: 38, tilingPaddingHorizontal: 90, // room for two-line labels on unconnected nodes
      ...(state.trail?.core ? CORE_SPACING : state.trail ? { ...TRAIL_SPACING, gravity: 0.15 } : {}), // exploring: fewer files, so give each one room
    } : {
      name: 'cose', animate: animate ? 'end' : false, animationDuration: 600, randomize: !animate, fit: true, padding: 40,
      nodeRepulsion: () => 14000, idealEdgeLength: () => 70, edgeElasticity: () => 80, gravity: 0.35, numIter: 1600,
    }).one('layoutstop', reframeSel).run();
  }
  // Frame a selected file and its connections, unless they're already comfortably in view. The canvas may run
  // under the side panel, so "in view" means left of the panel.
  function frameHood(n) {
    if (!cy || n.removed() || n.hasClass('hidden')) return;
    frameEles(n.closedNeighborhood().nodes().not('.hidden'));
  }
  function frameEles(hood, always = false, instant = false) {
    if (!cy || !hood.length) return;
    const { w, h } = viewArea();
    const rb = hood.renderedBoundingBox(), m = 24, bb = hood.boundingBox(), pad = 40;
    // room taken by the trail bar (top) and the legend (bottom)
    const cr = cy.container().getBoundingClientRect(), tb = $('#trail-bar'), lg = $('#legend');
    const top = tb && !tb.hidden ? Math.max(pad, tb.getBoundingClientRect().bottom - cr.top + 16) : pad;
    const bottom = lg && lg.offsetParent ? Math.max(pad, cr.bottom - lg.getBoundingClientRect().top + 12) : pad;
    const ah = Math.max(120, h - top - bottom);
    const z = Math.min(1.4, Math.max(state.trail ? 0.45 : 0.3, Math.min((w - 2 * pad) / Math.max(bb.w, 1), ah / Math.max(bb.h, 1))));
    // leave it alone when it's in view and big enough to read
    if (!always && rb.x1 >= m && rb.x2 <= w - m && rb.y1 >= top && rb.y2 <= h - bottom && cy.zoom() >= z * 0.6) return;
    const view = { zoom: z, pan: { x: w / 2 - z * (bb.x1 + bb.x2) / 2, y: top + ah / 2 - z * (bb.y1 + bb.y2) / 2 } };
    cy.stop(true); // a camera move still under way (e.g. the first draw's) would pull the view back
    if (instant) cy.viewport(view); else cy.animate(view, { duration: 450 });
  }
  let noFrame = false; // set while handling a click on a node in the graph
  function highlight(id, hover = false) {
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass('faded hl');
      if (!id) return;
      const n = cy.getElementById(id);
      if (!n.length || n.hasClass('hidden')) return;
      const hood = n.closedNeighborhood().not('.hidden');
      cy.elements().not(hood).addClass('faded');
      hood.edges().addClass('hl');
      hood.nodes().addClass('hl');
    });
    if (!hover) {
      cy.nodes().unselect();
      const n = cy.getElementById(id);
      if (n.length && !n.hasClass('hidden')) {
        n.select();
        if (!state.trail && !noFrame) requestAnimationFrame(() => frameHood(n)); // after the panel has opened and the canvas has its new size
      }
    }
  }

  // ───────────── timeline ─────────────
  function renderTimeline() {
    // videos (upload dates) and people (birth dates) aren't events: they appear through the events they're part of
    const items = ents.filter(e => e.y0 && e.type !== 'video' && e.type !== 'person' && visible.has(e.id)).sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.name.localeCompare(b.name));
    if (!items.length) { $('#timeline').innerHTML = '<p class="muted" style="padding:24px">Nothing dated matches the current filters.</p>'; return; }
    const groups = new Map();
    for (const e of items) { const d = Math.floor(e.y0 / 10) * 10; if (!groups.has(d)) groups.set(d, []); groups.get(d).push(e); }
    $('#timeline').innerHTML = [...groups].map(([d, list]) => `
      <div class="tl-decade">${d}s <small>${list.length} ${list.length === 1 ? 'entry' : 'entries'}</small></div>
      <div class="tl-items">${list.map(e => `
        <div class="tl-item ${state.sel === e.id ? 'sel' : ''}" data-goto="${e.id}" style="--c:${TYPES[e.type].color}">
          <div class="tl-date">${esc(fmtRange(e))}</div>
          <div><div><span class="tl-type">${TYPES[e.type].label}</span><span class="tl-name">${esc(e.name)}</span></div>
          <div class="tl-desc">${esc([e.place?.name, e.facts?.[0]?.text].filter(Boolean).join(' — '))}</div></div>
        </div>`).join('')}</div>`).join('');
  }

  // ───────────── world map ─────────────
  let map = null, mapLayer = null, tileLayer = null, mapFitted = false;
  const mapMarkers = new Map(); // file id → its dot, so search and selection can find it
  const isDark = () => document.documentElement.dataset.theme !== 'light';
  function setTiles() {
    if (!map) return;
    if (tileLayer) tileLayer.remove();
    tileLayer = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${isDark() ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Tiles &copy; Esri — Esri, HERE, Garmin, &copy; OpenStreetMap contributors', maxZoom: 16,
    }).addTo(map);
  }
  function renderMap() {
    if (!window.L) { $('#map').innerHTML = '<p class="muted" style="padding:24px">Map library failed to load (offline?).</p>'; return; }
    if (!map) {
      map = L.map('map', { worldCopyJump: true, zoomControl: true }).setView([32, -40], 3);
      setTiles();
      mapLayer = L.layerGroup().addTo(map);
    }
    map.invalidateSize();
    mapLayer.clearLayers();
    mapMarkers.clear();
    const pts = ents.filter(e => e.place && visible.has(e.id));
    const seen = new Map();
    const markers = [];
    for (const e of pts) {
      const key = e.place.lat.toFixed(3) + ',' + e.place.lng.toFixed(3);
      const i = seen.get(key) || 0; seen.set(key, i + 1);
      const ang = i * 2.4, r = i ? 0.004 * Math.sqrt(i) * 6 : 0;
      const ll = [e.place.lat + r * Math.sin(ang), e.place.lng + r * Math.cos(ang)];
      const m = L.circleMarker(ll, {
        radius: e.type === 'incident' ? 8 : 6, color: isDark() ? '#0d1015' : '#ffffff', weight: 1.5,
        fillColor: TYPES[e.type].color, fillOpacity: e.cred === 'outside' ? 0.45 : 0.95,
      }).bindTooltip(`<b>${esc(e.name)}</b><br><span class="muted">${esc(TYPES[e.type].label)} · ${esc(fmtRange(e) || e.place.name)}</span>`, { direction: 'top', offset: [0, -6] });
      m.on('click', () => select(e.id, { from: 'map' }));
      m.addTo(mapLayer);
      markers.push(m);
      mapMarkers.set(e.id, m);
    }
    markMapSel();
    if (!mapFitted && markers.length) {
      // a tall phone screen would show the whole world as a thin strip between blank bands: open on the United States,
      // where most incidents are, filling the screen (pan or search for the rest); wider screens fit every marker
      if (innerHeight > innerWidth * 1.2) map.fitBounds([[22, -126], [50, -66]]);
      else map.fitBounds(L.featureGroup(markers).getBounds().pad(0.1));
      mapFitted = true;
    }
  }

  // the open file's dot stands out: larger, with an accent ring, drawn on top
  let mapSelId = null;
  function markMapSel() {
    const prev = mapMarkers.get(mapSelId);
    if (prev) prev.setStyle({ radius: byId.get(mapSelId)?.type === 'incident' ? 8 : 6, color: isDark() ? '#0d1015' : '#ffffff', weight: 1.5 });
    mapSelId = state.sel;
    const m = mapMarkers.get(state.sel);
    if (m) { m.setStyle({ radius: 12, color: css('--accent'), weight: 3 }); m.bringToFront(); }
  }
  // from search on the World page: fly to the file's dot and open it, rather than leaving for Explore
  function showOnMap(id) {
    const m = mapMarkers.get(id);
    if (!map || !m) return false;
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 6), { duration: 0.8 });
    select(id, { from: 'search' });
    map.once('moveend', () => m.openTooltip());
    return true;
  }

  // ───────────── index ─────────────
  function renderIndex() {
    const q = $('#iq').value.trim().toLowerCase();
    const items = ents.filter(e => (visible.has(e.id) || e.type === 'news') && (!q || searchText(e).includes(q)));
    $('#iq-count').textContent = `${items.length} of ${ents.length}`;
    $('#index').innerHTML = allTypes.map(t => {
      const list = items.filter(e => e.type === t).sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) return '';
      return `<div class="ix-group"><h3><i style="background:${TYPES[t].color}"></i>${TYPES[t].plural} <span class="muted">${list.length}</span></h3>
        <div class="ix-grid">${list.map(e => `<div class="card ${e.cred === 'outside' ? 'outside' : ''}" data-goto="${e.id}">
          <div class="t">${esc(e.name)}</div><div class="s">${esc(subtitle(e))}</div></div>`).join('')}</div></div>`;
    }).join('') || '<p class="muted">No matches.</p>';
    const recs = ents.filter(e => e.type === 'record' && (!q || searchText(e).includes(q))).sort((a, b) => a.name.localeCompare(b.name));
    if (recs.length) $('#index').insertAdjacentHTML('beforeend', `<details class="ix-group ix-records" ${q ? 'open' : ''}><summary><h3><i style="background:${TYPES.record.color}"></i>${TYPES.record.plural} <span class="muted">${recs.length}</span></h3></summary>
      <div class="ix-grid">${recs.map(e => `<div class="card" data-goto="${e.id}"><div class="t">${esc(e.name)}</div><div class="s">${esc(subtitle(e))}</div></div>`).join('')}</div></details>`);
  }
  $('#iq').addEventListener('input', renderIndex);

  // ───────────── Amazon links for books ─────────────
  // The visitor's local Amazon store (country from the Netlify edge function), defaulting to amazon.com.
  // To earn referral fees later, put your Amazon Associates tag for each store in AMAZON_TAGS
  // (e.g. { com: 'yourtag-20', 'co.uk': 'yourtag-21' }) and add the required disclosure to about/privacy.
  const AMAZON_STORE = { US: 'com', GB: 'co.uk', IE: 'co.uk', DE: 'de', AT: 'de', CH: 'de', IT: 'it', FR: 'fr', BE: 'com.be', ES: 'es', NL: 'nl', SE: 'se', PL: 'pl', CA: 'ca', AU: 'com.au', NZ: 'com.au', JP: 'co.jp', IN: 'in', BR: 'com.br', MX: 'com.mx', SG: 'sg', AE: 'ae', SA: 'sa', TR: 'com.tr', EG: 'eg' };
  const AMAZON_TAGS = {};
  function amazonLink(isbn) {
    const digits = String(isbn || '').replace(/[^0-9X]/gi, '');
    if (!digits) return null;
    const store = AMAZON_STORE[window.VISITOR_COUNTRY] || 'com';
    const tag = AMAZON_TAGS[store] ? `tag=${encodeURIComponent(AMAZON_TAGS[store])}` : '';
    let url;
    if (digits.length === 13 && digits.startsWith('978')) {
      // ISBN-13 (978) → ISBN-10, which Amazon uses as the product id
      const s9 = digits.slice(3, 12);
      const c = (11 - [...s9].reduce((a, d, i) => a + (10 - i) * +d, 0) % 11) % 11;
      url = `https://www.amazon.${store}/dp/${s9}${c === 10 ? 'X' : c}`;
    } else url = `https://www.amazon.${store}/s?k=${digits}`; // 979 ISBNs have no ISBN-10: search by ISBN
    return { url: url + (tag ? (url.includes('?') ? '&' : '?') + tag : ''), store: `amazon.${store}` };
  }

  // ───────────── facet lists (the Latest and Videos side panels) ─────────────
  // Rows like Types, with the same gestures: click toggles a row; double-click (or hold) shows only that row, and
  // doing it again on the only row shows them all. `sel` is the Set of keys switched on.
  const facetRows = (items, sel) => items.map(it => `
      <label class="f-type ${sel.has(it.k) ? '' : 'off'}" data-fk="${esc(it.k)}" title="Click to toggle · double-click to show only this">
        <span class="sw" style="background:${it.color || 'var(--muted)'}"></span>${esc(it.label)}<span class="n">${it.n}</span>
      </label>`).join('');
  function bindFacet(el, get, set) { // get() → { sel, all }; set(newSel)
    let last = { k: null, at: 0, before: null }, timer = null, start = null, suppress = false, down = 0;
    el.addEventListener('pointerdown', e => {
      const r = e.target.closest('[data-fk]'); if (!r || e.button > 0) return;
      start = { x: e.clientX, y: e.clientY }; down = e.timeStamp; clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null; suppress = true; navigator.vibrate?.(12); last = { k: null, at: 0, before: null };
        const { sel, all } = get(), k = r.dataset.fk;
        set(sel.size === 1 && sel.has(k) ? new Set(all) : new Set([k]));
      }, 500);
    });
    const cancel = e => { if (timer && (e.type !== 'pointermove' || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10)) { clearTimeout(timer); timer = null; } };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) el.addEventListener(ev, cancel);
    el.addEventListener('contextmenu', e => { if (e.target.closest('[data-fk]')) e.preventDefault(); });
    el.addEventListener('click', e => {
      const r = e.target.closest('[data-fk]'); if (!r) return;
      e.preventDefault();
      if (suppress) { suppress = false; return; }
      const k = r.dataset.fk, now = down || e.timeStamp, { sel, all } = get();
      if (last.k === k && now - last.at < 400) { // judge by the selection before the first click of the pair
        const b = last.before; last = { k: null, at: 0, before: null };
        set(b.size === 1 && b.has(k) ? new Set(all) : new Set([k]));
      } else {
        last = { k, at: now, before: new Set(sel) };
        const n = new Set(sel); n.has(k) ? n.delete(k) : n.add(k); set(n);
      }
    });
  }

  // ───────────── Latest ─────────────
  // What happened recently (by event `date`) and what is new to the archive (by `added`, older material).
  // Keep LATEST in sync with scripts/pages.mjs (server pages and the RSS feed use the same rules).
  const LATEST = { types: ['news', 'video', 'hearing', 'document', 'incident', 'event', 'film', 'book'], windowDays: 90, upcomingDays: 60, addedDays: 60, baseline: '2026-10-17' };
  const LATEST_CATS = [
    ['all', 'All'], ['hearings', 'Hearings & legislation'], ['interviews', 'Interviews & podcasts'], ['statements', 'Statements & posts'],
    ['releases', 'Official releases'], ['research', 'Research & analysis'], ['incidents', 'Incidents'], ['press', 'In the press'], ['media', 'Books & films'],
  ];
  const isoToday = () => new Date().toISOString().slice(0, 10);
  const dayOffset = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);
  const dateEnd = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : /^\d{4}-\d{2}$/.test(d) ? new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).toISOString().slice(0, 10) : null;
  const recordingOf = v => adj.get(v.id).find(x => x.dir === 'out' && x.label === 'recording of' && ['hearing', 'event', 'news'].includes(byId.get(x.other)?.type))?.other;
  function latestCat(e) {
    if (e.type === 'news') return { hearing: 'hearings', legislation: 'hearings', interview: 'interviews', podcast: 'interviews', statement: 'statements', post: 'statements', release: 'releases', research: 'research', incident: 'incidents', event: 'releases', article: 'press' }[e.kind] || 'press';
    if (e.type === 'hearing') return 'hearings';
    if (e.type === 'video') return recordingOf(e) ? 'hearings' : 'interviews';
    if (e.type === 'document' || e.type === 'event') return 'releases';
    if (e.type === 'incident') return 'incidents';
    return 'media';
  }
  function latestData() {
    const today = isoToday();
    const from = dayOffset(today, -LATEST.windowDays), until = dayOffset(today, LATEST.upcomingDays), since = dayOffset(today, -LATEST.addedDays);
    let recent = ents.filter(e => !e.noLatest && LATEST.types.includes(e.type) && e.date && dateEnd(e.date) && dateEnd(e.end || e.date) >= from && e.date <= until)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.added).localeCompare(String(a.added)));
    // a hearing and its recording (or transcript) make one card: the hearing, with the recording's play button
    const ids = new Set(recent.map(e => e.id));
    const folded = new Map(); // hearing id → recording video
    recent = recent.filter(e => {
      const parent = e.type === 'video' ? recordingOf(e) : e.type === 'document' ? adj.get(e.id).find(x => x.dir === 'out' && x.label === 'transcript of')?.other : null;
      if (parent && ids.has(parent)) { if (e.type === 'video' && !folded.has(parent)) folded.set(parent, e); return false; }
      return true;
    });
    // featured entries (frontmatter `featured: <until date>`) are pinned above the dated list
    const featured = ents.filter(e => !e.noLatest && e.featured && e.featured >= today).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    recent = recent.filter(e => !featured.includes(e));
    const inRecent = new Set([...recent, ...featured].map(e => e.id));
    const added = ents.filter(e => !e.noLatest && !inRecent.has(e.id) && !folded.has(e.id) && !['record', 'source'].includes(e.type) && e.added >= since && e.added > LATEST.baseline)
      .sort((a, b) => String(b.added).localeCompare(String(a.added)) || a.name.localeCompare(b.name));
    return { featured, recent, added, folded, today };
  }
  // people on a card: those linked to it (featured, speaking, quoted), official sources first
  function latestPeople(e) {
    const ids = new Set();
    for (const x of adj.get(e.id)) if (x.kind !== 'mention' && byId.get(x.other)?.type === 'person') ids.add(x.other);
    for (const m of e.moments || []) if (m.speaker) ids.add(m.speaker);
    return [...ids].map(id => byId.get(id)).sort((a, b) => (a.cred === 'credible' ? 0 : 1) - (b.cred === 'credible' ? 0 : 1)).slice(0, 6);
  }
  const latestSummary = e => {
    const t = (e.body ? new DOMParser().parseFromString(e.body, 'text/html').body.textContent : '').replace(/\s+/g, ' ').trim() || e.facts[0]?.text || (e.moments || []).slice(0, 2).map(m => m.text).join(' ') || '';
    return t.length > 260 ? t.slice(0, 257).replace(/\s+\S*$/, '') + '…' : t;
  };
  // "new since your last visit": the previous visit's date, read once per page load
  const LATEST_SEEN = store.get('latestSeen', null);
  // side-panel filters: the types (LATEST_CATS) and when (upcoming, the last 90 days, newly filed older material)
  const LT_CAT_KEYS = LATEST_CATS.map(([k]) => k).filter(k => k !== 'all');
  const LT_CAT_COLOR = { hearings: TYPES.hearing.color, interviews: TYPES.video.color, statements: TYPES.person.color, releases: TYPES.document.color, research: TYPES.concept.color, incidents: TYPES.incident.color, press: TYPES.source.color, media: TYPES.book.color };
  const LT_WHEN_KEYS = ['upcoming', 'recent', 'added'];
  let ltCats = new Set(LT_CAT_KEYS), ltWhen = new Set(LT_WHEN_KEYS), latestShowAll = false;
  const ltFiltered = () => ltCats.size < LT_CAT_KEYS.length || ltWhen.size < LT_WHEN_KEYS.length;
  function renderLatest() {
    const { featured, recent, added, folded, today } = latestData();
    const isNew = e => LATEST_SEEN && e.added > LATEST_SEEN;
    const whenOf = e => (e.date > today ? 'upcoming' : 'recent');
    const items = [...featured, ...recent];
    // faceted counts: each list is counted against the other list's selection
    const catN = new Map(LT_CAT_KEYS.map(k => [k, 0])), whenN = new Map(LT_WHEN_KEYS.map(k => [k, 0]));
    for (const e of items) {
      if (ltWhen.has(whenOf(e))) catN.set(latestCat(e), catN.get(latestCat(e)) + 1);
      if (ltCats.has(latestCat(e))) whenN.set(whenOf(e), whenN.get(whenOf(e)) + 1);
    }
    whenN.set('added', added.length);
    const present = new Set(items.map(latestCat));
    $('#lt-types').innerHTML = facetRows(LT_CAT_KEYS.filter(k => present.has(k)).map(k => ({ k, label: LATEST_CATS.find(c => c[0] === k)[1], n: catN.get(k), color: LT_CAT_COLOR[k] })), ltCats);
    $('#lt-when').innerHTML = facetRows([
      { k: 'upcoming', label: 'Upcoming', n: whenN.get('upcoming'), color: 'var(--claimed)' },
      { k: 'recent', label: `Last ${LATEST.windowDays} days`, n: whenN.get('recent'), color: 'var(--accent)' },
      { k: 'added', label: 'Newly filed, from the record', n: whenN.get('added'), color: 'var(--muted)' },
    ], ltWhen);
    $('#lt-types-clear').hidden = ltCats.size === LT_CAT_KEYS.length;
    $('#lt-when-clear').hidden = ltWhen.size === LT_WHEN_KEYS.length;
    const list = items.filter(e => ltCats.has(latestCat(e)) && ltWhen.has(whenOf(e)));
    // the filter line: name the smaller side ("only X" or "everything except X")
    const catName = k => LATEST_CATS.find(c => c[0] === k)[1], whenName = k => ({ upcoming: 'upcoming', recent: `the last ${LATEST.windowDays} days`, added: 'newly filed' })[k];
    const sayFilter = (keys, sel, name) => { const onK = keys.filter(k => sel.has(k)), offK = keys.filter(k => !sel.has(k)); return !offK.length ? null : !onK.length ? 'nothing' : onK.length <= offK.length ? 'only ' + onK.map(name).join(', ') : 'all except ' + offK.map(name).join(', '); };
    const on = [sayFilter(LT_CAT_KEYS.filter(k => present.has(k)), ltCats, catName), sayFilter(LT_WHEN_KEYS, ltWhen, whenName)].filter(Boolean);
    const card = e => {
      const rec = e.type === 'video' ? e : folded.get(e.id);
      const late = e.added && dateEnd(e.date) && e.added > dayOffset(dateEnd(e.date), 3);
      const kind = e.type === 'news' ? NEWS_KIND[e.kind]?.label || e.kind : TYPES[e.type].label;
      const people = latestPeople(e);
      const pinned = featured.includes(e);
      const cover = !rec && e.cover ? `<div class="lt-thumb lt-cover" data-goto="${esc(e.id)}"><img src="${esc(e.cover)}" alt="Cover of ${esc(e.name)}" loading="lazy"></div>`
        : !rec && e.image ? `<div class="lt-thumb lt-image" data-goto="${esc(e.id)}" title="${esc(e.imageCaption || '')}"><img src="${esc(e.image)}" alt="${esc(e.imageCaption || e.name)}" loading="lazy"></div>` : '';
      return `<article class="lt-card ${isNew(e) ? 'is-new' : ''} ${pinned ? 'is-featured' : ''}" style="--c:${TYPES[e.type].color}">${cover}
        ${rec ? `<div class="lt-thumb" data-play="${rec.id}@0" title="Play"><img src="${vthumb(rec)}" alt="" loading="lazy"><span class="wplay">▶</span>${rec.duration ? `<span class="wdur">${fmtDur(rec.duration)}</span>` : ''}</div>` : ''}
        <div class="lt-body">
          <div class="lt-kicker"><span class="lt-date">${esc(fmtRange(e))}</span>${pinned ? '<em class="lt-tag feat">featured</em>' : ''}${e.date > today ? '<em class="lt-tag up">upcoming</em>' : ''}${isNew(e) ? '<em class="lt-tag new">new</em>' : ''}<span class="lt-kind">${esc(kind)}</span>${e.type === 'video' && e.channel ? `<span class="lt-src">${esc(e.channel)}</span>` : e.outlet ? `<span class="lt-src">${esc(e.outlet)}</span>` : ''}</div>
          <h3><a href="${hrefOf(e.id)}" data-goto="${esc(e.id)}">${esc(e.name)}</a></h3>
          ${latestSummary(e) ? `<p class="lt-sum">${esc(latestSummary(e))}</p>` : ''}
          ${people.length ? `<div class="lt-people">${people.map(p => chip(p.id)).join('')}</div>` : ''}
          <div class="lt-actions">${rec ? `<button class="btn small primary" data-play="${rec.id}@0">▶ Play${rec.moments?.length ? ` · ${rec.moments.length} moments` : ''}</button>` : ''}<a class="btn small" href="${hrefOf(e.id)}" data-goto="${esc(e.id)}">File card</a>${e.url && e.type === 'news' ? `<a class="btn small" href="${esc(e.url)}" target="_blank" rel="noopener">Original source ↗</a>` : ''}${e.type === 'book' && amazonLink(e.isbn) ? `<a class="btn small" href="${esc(amazonLink(e.isbn).url)}" target="_blank" rel="noopener sponsored">Buy on Amazon ↗</a>` : ''}${late ? `<span class="small muted">added ${esc(fmtD(e.added))}</span>` : ''}</div>
        </div></article>`;
    };
    const shown = latestShowAll ? added : added.slice(0, 25);
    $('#latest').innerHTML = `
      <header class="lt-head">
        <div class="lt-top"><div class="home-kicker" title="The last ${LATEST.windowDays} days, sorted by when things happened">Latest</div>
          </div>
        <button class="btn small only-mobile vb-open-side" data-open-side>Filters${ltFiltered() ? ' · on' : ''}</button>
        ${ltFiltered() ? `<p class="lt-filtering">Filtered: ${esc(on.join(' · '))} <button class="link" data-lt-clear>show everything</button></p>` : ''}
      </header>
      ${ltWhen.has('upcoming') || ltWhen.has('recent') ? `<div class="lt-list">${list.map(card).join('') || `<p class="muted">Nothing matches these filters in the last ${LATEST.windowDays} days.</p>`}</div>` : ''}
      ${added.length && ltWhen.has('added') ? `<section class="lt-added">
        <div class="home-kicker">Recently added to the archive</div>
        <h2>New to the archive, from the record</h2>
        <p class="muted">Older material filed in the last ${LATEST.addedDays} days: archival interviews, declassified files, historical cases.</p>
        <div class="lt-rows">${shown.map(e => `<a class="lt-row ${isNew(e) ? 'is-new' : ''}" href="${hrefOf(e.id)}" data-goto="${esc(e.id)}" style="--c:${TYPES[e.type].color}">
          <span class="lt-row-type">${TYPES[e.type].label}</span><span class="lt-row-name">${esc(e.name)}${isNew(e) ? ' <em class="lt-tag new">new</em>' : ''}</span><span class="lt-row-date">${esc(fmtRange(e) || '')}</span><span class="lt-row-added">added ${esc(fmtD(e.added))}</span></a>`).join('')}</div>
        ${added.length > shown.length ? `<button class="btn small" data-lt-more>Show all ${added.length}</button>` : ''}
      </section>` : ''}`;
    store.set('latestSeen', today); // the next visit marks what was added after today
  }
  $('#view-latest').addEventListener('click', e => {
    if (e.target.closest('[data-open-side]')) { $('#side').classList.add('open'); return; }
    if (e.target.closest('[data-lt-clear]')) { ltCats = new Set(LT_CAT_KEYS); ltWhen = new Set(LT_WHEN_KEYS); renderLatest(); return; }
    if (e.target.closest('[data-lt-more]')) { latestShowAll = true; renderLatest(); }
  });
  const ltChanged = () => { renderLatest(); clearTimeout(ltChanged.t); ltChanged.t = setTimeout(() => track('filter_change', { view: 'latest', types: [...ltCats].sort().join(','), when: [...ltWhen].sort().join(',') }), 1500); };
  bindFacet($('#lt-types'), () => ({ sel: ltCats, all: LT_CAT_KEYS }), s => { ltCats = s; ltChanged(); });
  bindFacet($('#lt-when'), () => ({ sel: ltWhen, all: LT_WHEN_KEYS }), s => { ltWhen = s; ltChanged(); });
  $('#lt-types-clear').addEventListener('click', () => { ltCats = new Set(LT_CAT_KEYS); ltChanged(); });
  $('#lt-when-clear').addEventListener('click', () => { ltWhen = new Set(LT_WHEN_KEYS); ltChanged(); });

  // ───────────── books & films ─────────────
  let shelfTab = store.get('shelfTab', 'film');
  const PEOPLE_RELS = new Set(['features', 'authored by', 'narrated by', 'directed by', 'co-author of', 'authored', 'appears in']);
  function shelfPeople(e) {
    const ids = new Set();
    for (const x of adj.get(e.id)) if (PEOPLE_RELS.has(x.label) && byId.get(x.other)?.type === 'person') ids.add(x.other);
    return [...ids].map(id => byId.get(id)).sort((a, b) => (a.cred === 'credible' ? 0 : 1) - (b.cred === 'credible' ? 0 : 1));
  }
  const trailerOf = e => adj.get(e.id).map(x => x.dir === 'in' && x.label === 'trailer of' && byId.get(x.other)).find(v => v?.type === 'video');
  // short button text: "The Black Vault — documents on…" → "The Black Vault", "Lab 9 Films (official site)" → "Lab 9 Films"
  const btnLabel = label => String(label || 'Link').split(' — ')[0].replace(/\s*\([^)]*\)\s*$/, '');
  const shelfMeta = e => [e.y0, e.runtime ? `${e.runtime} min` : '', e.publisher, e.pages ? `${e.pages} pp.` : ''].filter(Boolean).join(' · ');
  function renderShelf() {
    const count = t => ents.filter(e => e.type === t).length;
    $('#shelf-title').textContent = TYPES[shelfTab].plural; // Documentaries or Books: separate pages (/documentaries, /books)
    const items = ents.filter(e => e.type === shelfTab).sort((a, b) => !!b.shelfFeatured - !!a.shelfFeatured || String(b.date || '').localeCompare(String(a.date || '')));
    $('#shelf').innerHTML = items.map(e => {
      const tr = trailerOf(e);
      const people = shelfPeople(e), official = people.filter(p => p.cred === 'credible').length;
      const sum = e.facts[0]?.text || ''; // first fact as the blurb
      const cover = e.cover ? `<img class="sc-book" src="${esc(e.cover)}" alt="Cover of ${esc(e.name)}" loading="lazy">`
        : tr ? `<img src="${vthumb(tr)}" alt="" loading="lazy"><span class="wplay">▶</span>`
        : `<div class="sc-spine" style="--c:${TYPES[e.type].color}"><b>${esc(e.name)}</b><span>${esc(e.credits || '')}</span></div>`;
      const amz = e.type === 'book' && amazonLink(e.isbn);
      const actions = `<div class="sc-actions">${tr ? `<button class="btn small primary" data-play="${tr.id}@0">▶ Trailer</button>` : ''}<button class="btn small" data-goto="${e.id}">File card</button>${amz ? `<a class="btn small sc-btn-buy" href="${esc(amz.url)}" target="_blank" rel="noopener sponsored" title="Opens ${amz.store}">Buy on Amazon ↗</a>` : ''}${e.links.slice(0, 2).map(l => `<a class="btn small" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label)}">${esc(btnLabel(l.label))} ↗</a>`).join('')}</div>`;
      return `<article class="shelf-card ${e.type}${e.shelfFeatured ? ' is-featured' : ''}">
        <div class="sc-left">
          <div class="sc-cover" ${tr ? `data-play="${tr.id}@0" title="Play the trailer"` : `data-goto="${e.id}"`}>${cover}</div>
          ${e.type === 'book' ? '' : actions}
        </div>
        <div class="sc-body">
          <div class="sc-kicker">${e.shelfFeatured ? `${esc(e.y0 || '')}<em class="lt-tag feat">featured</em>${esc(shelfMeta(e).replace(/^\d{4}( · )?/, ''))}` : esc(shelfMeta(e))}</div>
          <h3 data-goto="${e.id}">${esc(e.name)}</h3>
          ${e.credits ? `<div class="sc-credits">${esc(e.credits)}</div>` : ''}
          <p class="sc-sum">${esc(sum.length > (e.shelfFeatured ? 640 : 320) ? sum.slice(0, e.shelfFeatured ? 637 : 317).replace(/\s+\S*$/, '') + '…' : sum)}</p>
          ${people.length ? `<div class="sc-people"><span class="small muted">${official ? `${official} official source${official > 1 ? 's' : ''} on record` : 'People'}:</span> ${people.slice(0, 10).map(p => chip(p.id)).join('')}${people.length > 10 ? `<span class="small muted">+${people.length - 10} more</span>` : ''}</div>` : ''}
          ${e.type === 'book' ? actions : ''}
        </div></article>`;
    }).join('') || '<p class="muted">Nothing here yet.</p>';
  }

  // ───────────── claims ledger ─────────────
  // strongest first: statements made first-hand or from documents (either way), then volume; keep in sync with pages.mjs
  const claimWeight = c => c.assertions.filter(a => a.basis === 'first-hand' || a.basis === 'documented').length;
  const claimOrder = (a, b) => claimWeight(b) - claimWeight(a) || b.assertions.length - a.assertions.length;
  function renderClaimCards() {
    const cs = ents.filter(e => e.type === 'claim').sort(claimOrder);
    $('#claims-key').innerHTML = cs.map(c => {
      const sup = c.assertions.filter(a => a.stance === 'supports'), dis = c.assertions.filter(a => a.stance === 'disputes');
      const first = sup.find(a => a.date);
      return `<a class="claim-card" href="${hrefOf(c.id)}" data-goto="${esc(c.id)}"><div class="cc-top"><span class="badge claim-${c.status}">${CLAIM_STATUS[c.status].label}</span><span class="muted small">${sup.length} say so · ${dis.length} dispute it · ${claimWeight(c)} first-hand or documented</span></div>
        <div class="cc-name">${esc(c.name)}</div>${first ? `<div class="small muted">First on file: ${esc(byId.get(first.by)?.name || byId.get(first.on)?.name || '')}, ${esc(fmtD(first.date))}</div>` : ''}</a>`;
    }).join('') || '<p class="muted">No claims yet.</p>';
  }
  // /claims lists the claims only; each claim's page gathers the statements that support or dispute it
  function renderClaims() { renderClaimCards(); }

  // ───────────── global search ─────────────
  const searchCache = new Map();
  function searchText(e) {
    if (!searchCache.has(e.id)) {
      searchCache.set(e.id, [e.name, ...e.aka, ...(e.match || []), e.place?.name, ...e.tags, ...(e.credentials || []).map(c => c.role),
        ...e.facts.map(f => f.text), e.channel, e.body?.replace(/<[^>]+>/g, ' ')].filter(Boolean).join(' \n ').toLowerCase());
    }
    return searchCache.get(e.id);
  }
  function searchEntities(q, limit = 12, keep = null) { // keep: optional filter (e.g. on the map)
    q = q.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    const scored = [];
    for (const e of ents) {
      if (keep && !keep(e)) continue;
      const name = e.name.toLowerCase(), aka = e.aka.join(' ').toLowerCase(), txt = searchText(e);
      if (!words.every(w => txt.includes(w))) continue;
      let s = 0;
      // an exact alias (an acronym such as AAWSAP) ranks almost like the exact name
      if (name === q) s += 200; else if (e.aka.some(a => a.toLowerCase() === q)) s += 190;
      if (name.startsWith(q)) s += 100; if (name.includes(q)) s += 60; if (aka.includes(q)) s += 45;
      s += Math.min(20, adj.get(e.id).length);
      if (e.cred === 'outside') s -= 30;
      scored.push([s, e]);
    }
    return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
  }
  let ddIndex = -1;
  function renderDropdown() {
    const q = $('#q').value;
    const dd = $('#q-results');
    if (!q.trim()) { dd.hidden = true; return; }
    const onMap = state.view === 'map' && mapMarkers.size ? e => mapMarkers.has(e.id) : null;
    const res = searchEntities(q, 12, onMap);
    ddIndex = -1;
    dd.innerHTML = (onMap ? `<div class="dd-head">${res.length ? 'On the map' : `Nothing on the map matches “${esc(q)}”`}</div>` : '') + res.map(e => `<div ${ddTyped(e)} data-goto="${e.id}"><div><div class="t">${esc(e.name)} ${ddType(e)}</div><div class="s">${esc(subtitle(e))}</div></div></div>`).join('') +
      `${res.length ? '<div class="dd-sep"></div>' : ''}<div class="dd-item" data-dsearch="${esc(q)}"><span>📄</span><div><div class="t">Search inside documents for “${esc(q)}”</div><div class="s">${KB.stats.documents} documents · ${KB.stats.documentPages.toLocaleString('en-US')} pages, opened at the page</div></div></div>`
      + `<div class="dd-item" data-tsearch="${esc(q)}"><span>🎥</span><div><div class="t">Search video transcripts for “${esc(q)}”</div><div class="s">${KB.stats.transcripts} videos · ${KB.stats.transcriptHours} h of speech, on the Videos page</div></div></div>`;
    dd.hidden = false;
  }
  $('#q').addEventListener('input', renderDropdown);
  $('#q').addEventListener('focus', renderDropdown);
  $('#q').addEventListener('keydown', e => {
    const items = $$('#q-results .dd-item');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ddIndex = (ddIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === ddIndex));
    } else if (e.key === 'Enter') {
      (items[ddIndex] || items[0])?.click();
    } else if (e.key === 'Escape') { $('#q-results').hidden = true; $('#q').blur(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) $('#q-results').hidden = true; });
  $('#q-results').addEventListener('click', e => {
    const ts = e.target.closest('[data-tsearch]');
    if (ts) { $('#q-results').hidden = true; searchVideosFor(ts.dataset.tsearch); return; }
    const ds = e.target.closest('[data-dsearch]');
    if (ds) { showDocResults(ds.dataset.dsearch); return; }
    if (e.target.closest('[data-dd-back]')) { requestAnimationFrame(renderDropdown); return; }
  });
  // document full text, shown in the top dropdown: the matching pages of each document, each opening the PDF there.
  // Rendered on the next frame, so the click that asked for it is not taken as a click outside the search box.
  // MoD UFO files: a Pagefind index (site/pagefind-mod, built by scripts/mod-index.mjs) fetched in small pieces per query
  let modPf = null;
  const modFilesCount = q => (modPf ||= import('/pagefind-mod/pagefind.js').catch(() => null))
    .then(pf => pf ? pf.search(q.trim()) : null).then(r => r?.results.length || 0).catch(() => 0);
  async function showDocResults(q, dd = $('#q-results'), input = '#q') {
    requestAnimationFrame(() => { dd.innerHTML = `<div class="dd-head">Searching ${KB.stats.documents} documents for “${esc(q)}”…</div>`; dd.hidden = false; });
    trackSearch(q, 'documents');
    const r = await searchDocuments(q);
    if ($(input).value.trim() !== q.trim()) return;
    const hl = t => esc(t).replace(new RegExp(`(${r.needle.split(' ').filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), '<mark>$1</mark>');
    const pages = r.dOut.reduce((n, x) => n + x[1].length, 0);
    requestAnimationFrame(() => {
      dd.innerHTML = `<div class="dd-head dd-doc-head"><button class="link" data-dd-back>‹ Back</button><span>${r.dTotal ? `${r.dTotal} matches on ${pages} page${pages > 1 ? 's' : ''} in ${r.dOut.length} document${r.dOut.length > 1 ? 's' : ''}` : `No document mentions “${esc(q)}”`}</span></div>`
        + r.dOut.slice(0, 15).map(([d, hits]) => `<div class="dd-doc"><a class="dd-doc-t" href="${hrefOf(d.id)}" data-goto="${esc(d.id)}">${esc(d.name)}<span>${hits.length} p.</span></a>`
          + hits.slice(0, 3).map(h => `<a class="dd-doc-hit" href="${esc(fileUrl(h.file))}#page=${h.page}" target="_blank" title="Open the PDF at page ${h.page}"><span class="ts">p.${h.page}</span><span>${hl(h.snip)}${h.n > 1 ? ` <span class="muted">(${h.n}×)</span>` : ''}</span></a>`).join('')
          + (hits.length > 3 ? `<div class="small muted dd-doc-more">+${hits.length - 3} more pages</div>` : '') + '</div>').join('')
        + (r.dOut.length > 15 ? `<div class="small muted dd-doc-more">+${r.dOut.length - 15} more documents</div>` : '')
        + '<div class="dd-mod" hidden></div>';
    });
    // the MoD UFO files have their own search page: here, just how many of their pages match, and a link there
    modFilesCount(q).then(n => {
      const slot = dd.querySelector('.dd-mod');
      if (!n || !slot || $(input).value.trim() !== q.trim()) return;
      slot.outerHTML = `<a class="dd-mod" href="/mod-files?q=${encodeURIComponent(q.trim())}" data-mod-files>${n.toLocaleString('en-US')} page${n > 1 ? 's' : ''} in the MoD UFO files mention “${esc(q.trim())}” →</a>`;
      dd.querySelector('[data-mod-files]').addEventListener('click', () => track('select_content', { content_type: 'mod_files_search', item_id: q.trim(), method: 'document_search' }));
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && state.sel) { if (state.reading) setReading(false); else select(null); }
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && state.sel && state.view !== 'home') { trackReading('key'); setReading(!state.reading); }
  });

  // ───────────── claims ─────────────
  // one assertion: who, when, how they know, and where to check it (a playable moment, a document, a link)
  const assertionSource = a => {
    const s = a.source; if (!s) return '';
    if (s.file) return `<a href="${esc(fileUrl(s.file))}" target="_blank">📄 ${esc(s.file.split('/').pop())}</a>`;
    if (s.url) { let host = s.url; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { /* keep */ } return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(host)} ↗</a>${archived(s.url)}`; }
    const se = byId.get(s.id);
    return se?.type === 'video' ? `<button class="ts" data-play="${s.id}@${s.t || 0}">▶ ${fmtT(s.t || 0)}</button> ${chip(s.id)}` : chip(s.id);
  };
  function claimSections(e) {
    const as = e.assertions || [];
    const out = [];
    const n = k => as.filter(a => a.stance === k).length;
    const fh = as.filter(a => a.stance === 'supports' && a.basis === 'first-hand').length, rel = as.filter(a => a.stance === 'supports' && a.basis === 'relayed').length;
    out.push(`<div class="cl-sum"><span><b>${n('supports')}</b> say so</span><span><b>${n('disputes')}</b> dispute it</span>${n('context') ? `<span><b>${n('context')}</b> context</span>` : ''}<span class="muted">of those who say so: ${fh} first-hand, ${rel} relayed</span></div>`);
    // the evidence filed on the claim (documents, records, news) and its links to other claims; claims, news and records
    // aren't graph nodes, so the Connections list below leaves them out
    const lbl = x => (x.dir === 'out' ? x.label : (INVERSE[x.label] || x.label));
    const rels = adj.get(e.id).filter(x => x.kind === 'rel');
    const ev = { for: [], against: [], comment: [] };
    for (const x of rels) { const l = lbl(x); if (l === 'evidence for') ev.for.push(x); else if (l === 'evidence against') ev.against.push(x); else if (l === 'comments by' || l === 'comments on claim') ev.comment.push(x); }
    const evLi = x => `<li>${chip(x.other)}${x.note ? `<span>${esc(x.note)}</span>` : ''}</li>`;
    const evGroups = [['Evidence for', ev.for, 'supports'], ['Evidence against', ev.against, 'disputes'], ['Comment', ev.comment, 'context']].filter(g => g[1].length);
    if (evGroups.length) out.push(`<div class="p-sec"><h4>Evidence on file <span>${evGroups.reduce((n, g) => n + g[1].length, 0)}</span></h4>${evGroups.map(([t, xs, k]) => `<div class="conn-group cl-ev cl-${k}"><div class="lbl">${t}</div><ul class="conn-notes">${xs.map(evLi).join('')}</ul></div>`).join('')}</div>`);
    const related = rels.filter(x => byId.get(x.other)?.type === 'claim');
    if (related.length) out.push(`<div class="p-sec"><h4>Related claims <span>${related.length}</span></h4><ul class="rec-list">${related.map(x => { const c = byId.get(x.other); return `<li><span class="cl-lbl">${esc(lbl(x))}</span> <a href="${hrefOf(c.id)}" data-goto="${esc(c.id)}">${esc(c.name)}</a><div class="small muted"><span class="claim-st claim-${c.status}">${esc(CLAIM_STATUS[c.status].label)}</span>${x.note ? ` · ${esc(x.note)}` : ''}</div></li>`; }).join('')}</ul></div>`);
    if (as.length) {
      const firstSupport = as.find(a => a.stance === 'supports' && a.date);
      out.push(`<div class="p-sec"><h4>Who has said it, in order <span>${as.length}</span></h4><ol class="cl-time" data-collapse="14">${as.map(a => `
        <li class="cl-${a.stance}"><div class="cl-date">${a.date ? esc(fmtD(a.date)) : '<span class="muted">undated</span>'}</div><div class="cl-body">
          <div class="cl-who">${a.by ? chip(a.by) : a.kind === 'moment' ? '<span class="small muted">speaker not on file</span>' : chip(a.on)}${a.via ? `<span class="small muted">as reported by</span>${chip(a.via)}` : ''}<span class="cl-stance">${esc(STANCE[a.stance])}</span>${a.basis ? `<span class="cl-basis" title="${esc(BASIS[a.basis]?.hint || '')}">${esc(BASIS[a.basis]?.label || a.basis)}</span>` : ''}${a === firstSupport ? '<span class="cl-first">first on file</span>' : ''}</div>
          <div class="cl-text">${esc(a.text)}</div><div class="cl-src">${assertionSource(a)}</div></div></li>`).join('')}</ol></div>`);
    }
    return out.join('');
  }

  // how the people making the claim are connected: shows whether many voices trace back to a few sources. Last in the
  // side column (it can run long); links with a note, which say how, come first
  function claimPeople(e) {
    const as = e.assertions || [];
    const people = [...new Set(as.map(a => a.by).concat(as.map(a => a.via)).filter(id => byId.get(id)?.type === 'person'))];
    const inSet = new Set(people), links = [];
    for (const p of people) for (const x of adj.get(p)) if (x.dir === 'out' && x.kind === 'rel' && inSet.has(x.other) && x.label !== 'related to') links.push(x);
    links.sort((a, b) => !!b.note - !!a.note);
    return links.length ? `<div class="p-sec p-side"><h4>How the people making it are connected <span>${links.length}</span></h4><ul class="cl-links" data-collapse="5">${links.map(x => `<li>${chip(x.s)}<span class="cl-lbl">${esc(x.label)}</span>${chip(x.t)}${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</li>`).join('')}</ul></div>` : '';
  }
  // ───────────── detail panel ─────────────
  function renderPanel(e) {
    const t = TYPES[e.type] || TYPES.concept;
    const h = [];
    const nFacts = e.facts.length, nDoc = e.facts.filter(f => f.status === 'documented').length;
    h.push(`<div class="dossier-strip"><span>File <b>${fileNo(e)}</b></span><span>${e.type === 'claim' ? `${e.assertions.length} statements` : nFacts ? `${nDoc}/${nFacts} documented` : 'no claims filed'}</span></div>`);
    h.push(`<div class="p-kicker"><span class="badge type" style="background:${t.color}">${t.label}</span>${e.cred ? `<span class="badge ${e.cred}" title="${esc(CRED[e.cred].hint)}">${CRED[e.cred].label}</span>` : ''}${e.outcome && e.outcome !== 'open' ? `<span class="badge outcome-${e.outcome}" title="${esc(OUTCOME[e.outcome].hint)}">${OUTCOME[e.outcome].label}</span>` : ''}${e.type === 'claim' ? `<span class="badge claim-${e.status}" title="${esc(CLAIM_STATUS[e.status].hint)}">${CLAIM_STATUS[e.status].label}</span>` : ''}</div>`);
    if (e.outcome && e.outcome !== 'open' && e.outcomeNote) h.push(`<div class="p-outcome outcome-${e.outcome}"><b>${OUTCOME[e.outcome].label}.</b> ${esc(e.outcomeNote)}${e.outcomeSource ? ` <span class="src">${e.outcomeSource.id ? chip(e.outcomeSource.id) : e.outcomeSource.url ? `<a href="${esc(e.outcomeSource.url)}" target="_blank" rel="noopener">source ↗</a>` : ''}</span>` : ''}</div>`);
    // books and films with a cover: the title block on the left, the cover beside it (stacked on phones)
    const head = [], hp = x => (e.cover ? head : h).push(x);
    hp(`<h2 class="p-title">${esc(e.name)}</h2>`);
    if (e.type === 'claim' && e.statusNote) hp(`<div class="p-outcome claim-${e.status}"><b>${CLAIM_STATUS[e.status].label}.</b> ${esc(e.statusNote)}${e.statusSource ? ` <span class="src">${e.statusSource.id ? (byId.get(e.statusSource.id)?.type === 'video' ? `<button class="ts" data-play="${e.statusSource.id}@${e.statusSource.t || 0}">▶ ${fmtT(e.statusSource.t || 0)}</button> ` : '') + chip(e.statusSource.id) : e.statusSource.url ? `<a href="${esc(e.statusSource.url)}" target="_blank" rel="noopener">source ↗</a>` : ''}</span>` : ''}</div>`);
    // credentials right under the name: on this archive they are the headline fact (they decide the source badge)
    if (e.credentials?.length) hp(`<ul class="cred-list p-creds">${e.credentials.map(c => `<li><span class="cred-cat">${esc(CRED_CAT[c.category] || c.category)}</span><span>${esc(c.role)}</span></li>`).join('')}</ul>`);
    if (!offGraph(e.type) && !(state.trail && !state.trail.core && state.view === 'graph')) hp(`<button class="btn small p-explore" data-explore="${esc(e.id)}" title="Show only this file and its connections, then follow a trail">◎ Explore from here</button>`);
    if (e.aka.length) hp(`<div class="p-aka">Also: ${e.aka.map(esc).join(' · ')}</div>`);
    if (e.type === 'film' || e.type === 'book') hp(`<div class="p-meta">${esc([e.credits, shelfMeta(e), e.isbn ? `ISBN ${e.isbn}` : ''].filter(Boolean).join(' · '))}</div>`);
    if (e.cover) h.push(`<div class="p-head has-cover"><div class="p-head-main">${head.join('')}</div><img class="p-cover" src="${esc(e.cover)}" alt="Cover of ${esc(e.name)}" loading="lazy"></div>`);
    if (e.image) h.push(`<figure class="p-image"><img src="${esc(e.image)}" alt="${esc(e.imageCaption || e.name)}" loading="lazy">${e.imageCaption ? `<figcaption>${esc(e.imageCaption)}</figcaption>` : ''}</figure>`);
    const meta = [e.type !== 'book' && e.type !== 'film' && fmtRange(e) && (e.type === 'video' ? 'Published ' : '') + fmtRange(e), e.place?.name, // books and films: the year is already in the credits line
      e.type === 'video' && [e.channel, fmtDur(e.duration)].filter(Boolean).join(' · ')].filter(Boolean);
    if (meta.length) h.push(`<div class="p-meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>`);
    if (e.type === 'news') h.push(`<div class="p-meta"><span>${esc(NEWS_KIND[e.kind]?.label || e.kind)}</span>${e.outlet ? `<span>${esc(e.outlet)}</span>` : ''}${e.url ? `<a class="btn small" href="${esc(e.url)}" target="_blank" rel="noopener">Original source ↗</a>${archived(e.url)}` : ''}</div>`);
    if (e.type === 'incident' && e.credVia?.length) h.push(`<div class="p-meta"><span>On record via ${e.credVia.map(id => chip(id)).join(' ')}</span></div>`);
    if (e.witnesses || e.coverage?.length) {
      h.push(`<div class="mass-box"><div class="mb-head"><span class="mb-n">${e.witnesses ? `~${e.witnesses.toLocaleString()}` : '?'}</span> witnesses${e.cred === 'mass' ? ' · <b>included as a mass sighting</b>' : ''}</div>${e.coverage?.length ? `<div class="mb-cov">Contemporary coverage: ${e.coverage.map(c => {
        const label = [c.outlet, c.title && `“${c.title}”`, c.date && fmtD(String(c.date))].filter(Boolean).join(', ');
        return c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : esc(label);
      }).join(' · ')}</div>` : ''}</div>`);
    }
    if (e.type === 'video') {
      h.push(`<div class="play-card"><img src="${vthumb(e)}" alt="" data-play="${e.id}@0" loading="lazy"><div>
        <button class="btn primary" data-play="${e.id}@0">▶ Play with transcript</button>
        <div class="small muted" style="margin-top:6px">${e.transcript ? `${e.transcript.segments.toLocaleString()} transcript lines (${({ 'youtube-auto': 'auto captions', youtube: 'subtitles', whisper: 'Whisper transcript', 'whisper-translated': 'Whisper translation', translation: 'English translation of the published subtitles' })[e.transcript.source] || 'transcript'})` : 'No transcript yet'}${e.local ? ' · local copy' : ''}</div></div></div>`);
    }
    // the summary (a person's profile) comes before the videos
    if (e.body) h.push(`<div class="p-sec"><h4>${e.type === 'person' ? 'Profile' : 'Summary'}</h4><div class="p-body p-bio">${e.body}</div></div>`);
    // glimpses: short passages from the book itself, each linked to the authorized excerpt or review it was checked against
    if (e.glimpses?.length) h.push(`<div class="p-sec" id="sec-glimpses"><h4>Glimpses <span>${e.glimpses.length}</span></h4><div class="glimpses" data-collapse="4">${e.glimpses.map(g => `
      <blockquote class="glimpse"><p>${esc(g.text)}</p><footer>${esc(g.where)}${g.url ? `${g.where ? ' · ' : ''}<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.via || 'source')} ↗</a>` : g.via ? ` · ${esc(g.via)}` : ''}</footer></blockquote>`).join('')}</div></div>`);
    if (e.type === 'claim') h.push(claimSections(e));
    // a person's positions on the claims (from the assertions tagged on their facts and moments)
    if (e.type === 'person') {
      const pos = new Map();
      for (const c of ents.filter(c => c.type === 'claim')) for (const a of c.assertions) if (a.by === e.id) (pos.get(c.id) || pos.set(c.id, []).get(c.id)).push(a);
      if (pos.size) h.push(`<div class="p-sec p-side"><h4>Positions on claims <span>${pos.size}</span></h4><ul class="rec-list">${[...pos].map(([cid, as]) => {
        const c = byId.get(cid), st = [...new Set(as.map(a => STANCE[a.stance]))].join(', ');
        return `<li><a href="${hrefOf(cid)}" data-goto="${esc(cid)}">${esc(c.name)}</a><div class="small muted">${esc(st)} · ${as.length} statement${as.length > 1 ? 's' : ''} · <span class="claim-st claim-${c.status}">${esc(CLAIM_STATUS[c.status].label)}</span></div></li>`;
      }).join('')}</ul></div>`);
    }
    // Watch: videos that record, feature or are about this entry — playable straight from the dossier
    if (e.type !== 'video' && e.type !== 'claim') {
      const WATCH = { 'trailer of': 'Trailer', 'recording of': 'Recording', features: 'Appearance', about: 'About this', 'speaks in': 'Speaks in' };
      const vids = new Map();
      for (const x of adj.get(e.id)) {
        const v = byId.get(x.other);
        if (v?.type !== 'video') continue;
        const label = x.dir === 'in' ? WATCH[x.label] : x.label === 'speaks in' ? WATCH['speaks in'] : null;
        if (label && !vids.has(v.id)) vids.set(v.id, label);
      }
      if (vids.size) {
        const list = [...vids].map(([id, label]) => [byId.get(id), label])
          .sort((a, b) => { const rank = l => (l === 'Trailer' ? 0 : l === 'Recording' ? 1 : 2); return rank(a[1]) - rank(b[1]) || String(b[0].date).localeCompare(String(a[0].date)); });
        h.push(`<div class="p-sec"><h4>Watch <span>${list.length} video${list.length > 1 ? 's' : ''}</span></h4><div class="watch">${list.map(([v, label]) => `
          <div class="watch-item" data-play="${v.id}@0" title="Play with synced transcript">
            <div class="wthumb"><img src="${vthumb(v)}" alt="" loading="lazy"><span class="wplay">▶</span>${v.duration ? `<span class="wdur">${fmtDur(v.duration)}</span>` : ''}</div>
            <div><div class="wt">${esc(v.name)}</div><div class="ws">${esc([label, v.channel, fmtD(v.date)].filter(Boolean).join(' · '))}</div>
            <div class="wlinks"><button class="ts" data-play="${v.id}@0">▶ Play</button>${vsource(v).url ? `<a href="${esc(vsource(v).url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${vsource(v).label} ↗</a>` : ''}</div></div>
          </div>`).join('')}</div></div>`);
      }
    }
    // curated moments
    const ms = e.type === 'video' ? (e.moments || []).map(m => ({ video: e.id, ...m })) : (momentsFor.get(e.id) || []);
    if (ms.length) {
      h.push(`<div class="p-sec"><h4>Video moments <span>${ms.length}</span></h4><div data-collapse="10" data-fixed>${ms.sort((a, b) => a.video.localeCompare(b.video) || a.t - b.t).map(m => `
        <div class="moment"><button class="ts" data-play="${m.video}@${m.t}">▶ ${fmtT(m.t)}</button><div><div>${esc(m.text)}</div>
        <div class="who">${m.speaker && m.speaker !== e.id ? chip(m.speaker) : ''}${e.type !== 'video' ? chip(m.video) : m.refs.map(r => chip(r)).join('')}</div></div></div>`).join('')}</div></div>`);
    }
    if (e.pursue) {
      const pu = e.pursue;
      const local = e.files.find(f => f.endsWith('.pdf'));
      h.push(`<div class="record-card">${pu.thumbnail ? `<a href="${esc(pu.file || pu.thumbnail)}" target="_blank" rel="noopener"><img src="${esc(pu.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></a>` : ''}
        <dl class="rec-meta"><dt>Agency</dt><dd>${esc(pu.agency || '—')}</dd><dt>Released</dt><dd>${esc(fmtD(pu.released))} · Release ${String(pu.release).padStart(2, '0')}</dd>
        <dt>Incident</dt><dd>${esc([pu.incident_date, pu.incident_location].filter(Boolean).join(' · ') || '—')}</dd><dt>Format</dt><dd>${esc((pu.format || '').toUpperCase())}${pu.redaction ? ' · redacted' : ''}</dd></dl>
        <div class="rec-actions">${pu.file ? `<a class="btn small" href="${esc(pu.file)}" target="_blank" rel="noopener">Official file ↗</a>` : ''}${local ? `<a class="btn small primary" href="${esc(fileUrl(local))}" target="_blank">Local copy</a>` : ''}${pu.dvids ? `<a class="btn small" href="${esc(pu.dvids)}" target="_blank" rel="noopener">DVIDS video ↗</a>` : ''}</div></div>`);
    }
    if (e.links.length || e.files.length) {
      const amzP = e.type === 'book' && amazonLink(e.isbn);
      h.push(`<div class="p-sec p-side" id="sec-links"><h4>Sources, links & files</h4><ul class="p-links">${amzP ? `<li><a href="${esc(amzP.url)}" target="_blank" rel="noopener sponsored">Buy on Amazon (${esc(amzP.store)}) ↗</a></li>` : ''}${e.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)} ↗</a></li>`).join('')}${e.files.map(f => `<li><a href="${esc(fileUrl(f))}" target="_blank">📄 ${esc(f.split('/').pop())}</a></li>`).join('')}</ul></div>`);
    }
    // news items linked to this entry (either direction), newest first
    if (e.type !== 'news') {
      const news = [...new Set(adj.get(e.id).filter(x => x.kind !== 'mention' && byId.get(x.other)?.type === 'news').map(x => x.other))].map(id => byId.get(id)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      if (news.length) h.push(`<div class="p-sec p-side"><h4>In the news <span>${news.length}</span></h4><ul class="rec-list" data-collapse="6">${news.map(n => `<li><a href="${hrefOf(n.id)}" data-goto="${esc(n.id)}">${esc(n.name)}</a><div class="small muted">${esc([fmtD(n.date), NEWS_KIND[n.kind]?.label, n.outlet].filter(Boolean).join(' · '))}${n.url ? ` · <a href="${esc(n.url)}" target="_blank" rel="noopener">source ↗</a>` : ''}</div></li>`).join('')}</ul></div>`);
    }
    // official records (PURSUE) linked to this entry
    const recs = [...new Set(adj.get(e.id).filter(x => x.kind !== 'mention' && byId.get(x.other)?.type === 'record').map(x => x.other))]
      .map(id => byId.get(id)).sort((a, b) => String(a.pursue?.released || a.date || '').localeCompare(String(b.pursue?.released || b.date || '')) || a.name.localeCompare(b.name));
    if (recs.length) {
      h.push(`<div class="p-sec p-side" id="sec-records"><h4>${e.type === 'record' ? 'Related records' : 'Official records'} <span>${recs.length}</span></h4><ul class="rec-list" data-collapse="8">${recs.map(r => {
        const pu = r.pursue || {};
        return `<li><a href="${hrefOf(r.id)}" data-goto="${esc(r.id)}">${esc(r.name)}</a><div class="small muted">${esc([pu.agency, pu.released && `released ${fmtD(pu.released)}`].filter(Boolean).join(' · '))}${pu.file ? ` · <a href="${esc(pu.file)}" target="_blank" rel="noopener">official file ↗</a>` : ''}</div></li>`;
      }).join('')}</ul></div>`);
    }
    // connections; a file listed under a specific link ("authored", "worked at"…) is not repeated under a generic one
    // ("statement about", "related to"…): those come from quotes and loose ties, and would list it twice
    const groups = new Map(), strong = new Set(), notes = new Map(); // notes: "label|id" → the link's one-line note
    for (const x of adj.get(e.id)) {
      if (x.kind === 'mention' || offGraph(byId.get(x.other)?.type)) continue;
      const label = x.dir === 'out' ? x.label : (INVERSE[x.label] || x.label);
      if (e.type === 'claim' && /^(evidence (for|against)|comments (by|on claim))$/.test(label)) continue; // shown under "Evidence on file"
      if (!groups.has(label)) groups.set(label, new Set());
      groups.get(label).add(x.other);
      if (x.note) notes.set(`${label}|${x.other}`, x.note);
      if (!WEAK_LINKS.has(label)) strong.add(x.other);
    }
    const placed = new Set(strong); // …and among generic links, under the first one only
    for (const [label, ids] of groups) if (WEAK_LINKS.has(label)) { for (const id of ids) if (placed.has(id)) ids.delete(id); else placed.add(id); if (!ids.size) groups.delete(label); }
    if (groups.size) {
      const nConn = new Set([...groups.values()].flatMap(ids => [...ids])).size;
      h.push(`<div class="p-sec p-side" id="sec-connections"><h4>Connections <span>${nConn}</span></h4>${[...groups].map(([label, ids]) => {
        // links with a note say how: one per line, note beside the chip; the rest stay as a row of chips
        const noted = [...ids].filter(id => notes.has(`${label}|${id}`)), plain = [...ids].filter(id => !notes.has(`${label}|${id}`));
        return `<div class="conn-group"><div class="lbl">${esc(label)}</div>${noted.length ? `<ul class="conn-notes" data-collapse="5">${noted.map(id => `<li>${chip(id)}<span>${esc(notes.get(`${label}|${id}`))}</span></li>`).join('')}</ul>` : ''}${plain.length ? `<div class="chips" data-collapse="10">${plain.map(id => chip(id)).join('')}</div>` : ''}</div>`;
      }).join('')}</div>`);
    }
    // transcript mentions
    if (e.type === 'video') {
      const vm = videoMentions.get(e.id);
      if (vm?.size) h.push(`<div class="p-sec"><h4>Mentioned in this video <span>${vm.size}</span></h4><div class="chips">${[...vm].sort((a, b) => b[1].length - a[1].length).map(([id, ts]) => chip(id, `<span class="n">${ts.length}</span>`)).join('')}</div></div>`);
    } else {
      const list = MENTIONS[e.id] || [];
      if (list.length) {
        const byVid = new Map();
        for (const [vid, t, snip] of list) { if (!byVid.has(vid)) byVid.set(vid, []); byVid.get(vid).push([t, snip]); }
        const sorted = [...byVid].sort((a, b) => b[1].length - a[1].length);
        h.push(`<div class="p-sec p-side" id="sec-mentions"><h4>Mentioned in transcripts <span>${list.length} in ${byVid.size} video${byVid.size > 1 ? 's' : ''}</span></h4>
          <div class="small muted" style="margin:-4px 0 6px">Automatic name matches; click a time to jump there.</div>
          <div data-collapse="3">${sorted.map(([vid, hits]) => {
            const v = byId.get(vid);
            return `<div class="mention-video"><div class="mv-t" data-goto="${vid}">${esc(v.name)}<span>${hits.length}×</span></div>
            <div class="mv-ts">${hits.slice(0, 12).map(([t, s]) => `<button class="ts" data-play="${vid}@${t}" title="${esc(s)}">${fmtT(t)}</button>`).join('')}${hits.length > 12 ? `<button class="link" data-more="${vid}">+${hits.length - 12} more</button>` : ''}</div>
            <div class="snip"><button class="ts" data-play="${vid}@${hits[0][0]}">${fmtT(hits[0][0])}</button><span>“…${esc(hits[0][1])}…”</span></div></div>`;
          }).join('')}</div></div>`);
      }
    }
    h.push(renderDots(e));
    if (e.type === 'claim') h.push(claimPeople(e));
    if (e.tags.length) h.push(`<div class="p-sec p-side"><h4>Themes</h4><div class="chips">${e.tags.map(t => `<button class="chip ${state.tags.has(t) ? 'on' : ''}" data-filter-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`);
    // notes & claims come last, after the videos and links
    if (e.facts.length) {
      h.push(`<div class="p-sec" id="sec-claims"><h4>Notes & claims <span>${e.facts.length}</span></h4><ul class="facts" data-collapse="5" data-fixed>${e.facts.map(f => {
        const src = f.source ? (f.source.file ? `<a href="${esc(fileUrl(f.source.file))}" target="_blank">📄 ${esc(f.source.file.split('/').pop())}</a>` : f.source.url ? `<a href="${esc(f.source.url)}" target="_blank" rel="noopener">source ↗</a>${archived(f.source.url)}`
          : byId.get(f.source.id)?.type === 'video' ? `<button class="ts" data-play="${f.source.id}@${f.source.t || 0}">▶ ${f.source.t != null ? fmtT(f.source.t) : 'video'}</button> ${chip(f.source.id)}`
          : `source: ${chip(f.source.id)}`) : '';
        const needs = !f.source && f.status !== 'documented' ? `<span class="needs" title="Add a source: video timestamp, document or link">needs source</span>` : '';
        return `<li class="fact" style="--st:var(--${f.status})"><div>${esc(f.text)}</div><div class="meta"><span class="stamp" title="${esc(STATUS[f.status].hint)}">${STATUS[f.status].label}</span>${f.by && f.by !== e.id ? `<span>by ${chip(f.by)}</span>` : ''}${src}${needs}</div></li>`;
      }).join('')}</ul></div>`);
    }
    h.push(`<div class="p-edit">Edit <code>${esc(e.file)}</code><button class="link" data-copy="${esc(e.file)}">copy path</button></div>`);
    return h.join('');
  }
  // ── connecting the dots ──
  const strongAdj = id => adj.get(id).filter(x => x.kind !== 'mention' && !offGraph(byId.get(x.other)?.type));
  function possibleConnections(e, limit = 8) {
    const direct = new Set(strongAdj(e.id).map(x => x.other));
    const score = new Map();
    for (const n of direct) {
      const deg = strongAdj(n).length;
      if (deg > 40) continue; // hubs (e.g. NASA, Congress) connect everything and say little
      for (const x of strongAdj(n)) {
        const o = x.other;
        if (o === e.id || direct.has(o) || !visible.has(o)) continue;
        const s = score.get(o) || { w: 0, via: new Set() };
        s.w += 1 / Math.log2(2 + deg); s.via.add(n);
        score.set(o, s);
      }
    }
    return [...score].filter(([, s]) => s.via.size >= 2).sort((a, b) => b[1].w - a[1].w).slice(0, limit);
  }
  function shortestPath(a, b, withMentions) {
    const prev = new Map([[a, null]]);
    const q = [a];
    while (q.length) {
      const cur = q.shift();
      if (cur === b) break;
      for (const x of adj.get(cur)) {
        if (!withMentions && x.kind === 'mention') continue;
        if (prev.has(x.other)) continue;
        if (x.other !== b && strongAdj(x.other).length > 40) continue; // don't route through mega-hubs
        prev.set(x.other, { from: cur, edge: x });
        q.push(x.other);
      }
    }
    if (!prev.has(b)) return null;
    const hops = [];
    for (let cur = b; prev.get(cur); cur = prev.get(cur).from) hops.unshift({ id: cur, edge: prev.get(cur).edge, from: prev.get(cur).from });
    return hops;
  }
  function renderDots(e) {
    const out = [];
    const tog = (TOGETHER[e.id] || []).filter(r => byId.has(r[0]) && !(state.credibleOnly && byId.get(r[0]).cred === 'outside')).slice(0, 8);
    if (tog.length) {
      out.push(`<div class="p-sec p-side"><h4>Mentioned together <span>in transcripts</span></h4>
        <div class="small muted" style="margin:-4px 0 4px">Named within the same minute of video. <span class="new" style="font-family:var(--mono);font-size:9.5px;color:var(--accent);border:1px solid var(--accent);padding:0 4px;border-radius:2px">NEW</span> = not yet linked in the archive.</div>
        ${tog.map(([o, n, nv, vid, t, linked]) => `<div class="dots-item"><div>${chip(o)}${linked ? '' : '<span class="new">NEW</span>'}<div class="why">${n}× in ${nv} video${nv > 1 ? 's' : ''}</div></div><button class="ts" data-play="${vid}@${t}" title="First time they come up together">▶ ${fmtT(t)}</button></div>`).join('')}</div>`);
    }
    const pc = possibleConnections(e);
    if (pc.length) {
      out.push(`<div class="p-sec p-side"><h4>Possible connections <span>shared links</span></h4>
        <div data-collapse="5">${pc.map(([o, s]) => `<div class="dots-item"><div>${chip(o)}<div class="why">via ${[...s.via].slice(0, 4).map(v => esc(byId.get(v).name)).join(', ')}${s.via.size > 4 ? ` +${s.via.size - 4}` : ''}</div></div><button class="link" data-trace-to="${o}">trace</button></div>`).join('')}</div></div>`);
    }
    out.push(`<div class="p-sec p-side"><h4>Trace a connection</h4><div class="trace"><input id="trace-q" type="search" placeholder="From ${esc(e.name)} to…" autocomplete="off"><div class="dropdown" id="trace-dd" hidden></div></div>
      <label class="check small" style="margin:8px 0 0"><input type="checkbox" id="trace-mentions"> include transcript mentions</label><div id="trace-out"></div></div>`);
    return out.join('');
  }
  function runTrace(from, to) {
    const withM = $('#trace-mentions')?.checked;
    const hops = shortestPath(from, to, withM) || (!withM && shortestPath(from, to, true));
    const out = $('#trace-out');
    if (!out) return;
    if (!hops) { out.innerHTML = '<p class="muted small">No connection found yet.</p>'; return; }
    out.innerHTML = `<div class="path"><div class="hop">${chip(from)}</div>${hops.map(h => {
      const lbl = h.edge.dir === 'out' ? h.edge.label : (INVERSE[h.edge.label] || h.edge.label);
      return `<div class="via">${esc(lbl)}${h.edge.kind === 'mention' ? ' (transcript)' : ''}</div><div class="hop">${chip(h.id)}</div>`;
    }).join('')}</div><button class="btn small" style="margin-top:10px" data-show-path="${[from, ...hops.map(h => h.id)].join(',')}">Show on graph</button>`;
  }
  function showPath(ids) {
    go('graph');
    if (!cy) return;
    for (const id of ids) if (!visible.has(id)) visible.add(id);
    applyGraphFilter();
    cy.batch(() => {
      cy.elements().removeClass('faded hl path').addClass('faded');
      const nodes = cy.collection(ids.map(id => cy.getElementById(id)));
      nodes.removeClass('faded hidden').addClass('path');
      for (let i = 0; i < ids.length - 1; i++) {
        cy.edges().filter(ed => (ed.data('source') === ids[i] && ed.data('target') === ids[i + 1]) || (ed.data('source') === ids[i + 1] && ed.data('target') === ids[i]))
          .removeClass('faded hidden').addClass('path');
      }
    });
    cy.animate({ fit: { eles: cy.$('.path'), padding: 80 }, duration: 500 });
  }

  // PURSUE record summaries live in data/records.js, fetched on first need (or when the browser is idle)
  let recordsLoading = null;
  function loadRecordBodies() {
    if (!recordsLoading) recordsLoading = new Promise(res => {
      window.KBR = () => {
        for (const [id, html] of Object.entries(window.KB_RECORD_BODIES || {})) { const e = byId.get(id); if (e) { e.body = html; e.bodyLazy = false; searchCache.delete(id); } }
        res();
      };
      const s = document.createElement('script');
      s.src = `/data/records.js${window.BUILD ? `?v=${window.BUILD}` : ''}`;
      s.onerror = () => res();
      document.head.append(s);
    });
    return recordsLoading;
  }
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => loadRecordBodies(), { timeout: 8000 });
  // expand: arrows pointing out to the corners; back to the side panel: arrows pointing in
  const ICON_EXPAND = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const ICON_COLLAPSE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  function openPanel(id) {
    const e = byId.get(id);
    if (!e) { closePanel(); return; }
    if (e.bodyLazy) loadRecordBodies().then(() => { if (state.sel === id && !$('#panel').hidden) openPanel(id); });
    const body = $('#panel-body');
    body.innerHTML = renderPanel(e);
    if (state.reading) layoutReading(body); else body.classList.remove('reading');
    applyCollapse(body, state.reading ? 2 : 1);
    $('#panel').hidden = false;
    $('#panel').scrollTop = 0;
    $('#app').classList.add('has-panel');
    $('#app').classList.toggle('reading', !!state.reading);
    $('#panel-expand').innerHTML = state.reading ? ICON_COLLAPSE : ICON_EXPAND;
    $('#panel-expand').title = state.reading ? 'Back to side panel (R)' : 'Reading view (R)';
    $('#panel-expand').setAttribute('aria-label', state.reading ? 'Back to side panel' : 'Open in reading view');
    applyPanelWidth();
    afterResize();
  }
  // Long lists start collapsed: show the first N items (×factor in reading view) with a “show all” toggle
  function applyCollapse(root, factor = 1) {
    for (const box of root.querySelectorAll('[data-collapse]')) {
      const n = +box.dataset.collapse * (box.closest('.p-side') || box.hasAttribute('data-fixed') ? 1 : factor); // side-column lists, and moments and notes (data-fixed), stay short in reading view too
      const items = [...box.children];
      if (items.length <= n + 1) continue;
      items.slice(n).forEach(el => el.classList.add('collapsed'));
      const btn = document.createElement('button');
      btn.className = 'link show-all';
      btn.textContent = `show all ${items.length} ▾`;
      btn.onclick = () => { items.forEach(el => el.classList.remove('collapsed')); btn.remove(); };
      box.after(btn);
    }
  }
  // Reading view: header across the top, jump links, main content left, connections/mentions right
  function layoutReading(body) {
    body.classList.add('reading');
    const secs = [...body.querySelectorAll(':scope > .p-sec')];
    const left = document.createElement('div'), right = document.createElement('div');
    left.className = 'rd-main'; right.className = 'rd-side';
    const nav = document.createElement('nav');
    nav.className = 'rd-nav';
    nav.innerHTML = secs.map((sec, i) => { sec.id ||= `sec-${i}`; const h = sec.querySelector('h4'); return h ? `<a href="#" data-jump="${sec.id}">${esc(h.childNodes[0].textContent.trim())}${h.querySelector('span') ? ` <span>${esc(h.querySelector('span').textContent)}</span>` : ''}</a>` : ''; }).join('');
    const firstSec = secs[0];
    if (firstSec) body.insertBefore(nav, firstSec);
    const grid = document.createElement('div');
    grid.className = 'rd-grid';
    grid.append(left, right);
    body.append(grid);
    for (const sec of secs) (sec.classList.contains('p-side') ? right : left).append(sec);
    const edit = body.querySelector(':scope > .p-edit');
    if (edit) left.append(edit); // keep the edit hint at the end of the main column
  }
  // Panel animations: the browser's View Transitions morph the panel between its old and new box (narrow ↔ reading
  // view, slide in/out on open/close; a sheet on phones). Without support, or with reduced motion, changes are instant.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function panelTransition(kind, update) {
    // no animation when the change comes from the address (opening a link, Back/Forward): only for clicks
    if (!document.startViewTransition || reduceMotion.matches || document.hidden || routing) { update(); return; }
    const root = document.documentElement;
    root.dataset.vt = kind; // open | close | expand | collapse: picks the keyframes in app.css
    const t = document.startViewTransition(update);
    t.finished.finally(() => { if (root.dataset.vt === kind) delete root.dataset.vt; });
  }
  function setReading(on) {
    panelTransition(on ? 'expand' : 'collapse', () => {
      state.reading = on;
      if (state.sel) openPanel(state.sel);
      if (!on) afterResize();
    });
  }
  // Drag the panel's left edge to resize (desktop); width remembered per browser
  function applyPanelWidth() {
    const w = store.get('panelW', null);
    if (w && !state.reading && innerWidth > 860) $('#app').style.setProperty('--panel-user-w', `${w}px`);
    else $('#app').style.removeProperty('--panel-user-w');
  }
  document.addEventListener('input', ev => {
    if (ev.target.id !== 'trace-q') return;
    const res = searchEntities(ev.target.value, 8).filter(x => x.id !== state.sel);
    const dd = $('#trace-dd');
    dd.innerHTML = res.map(x => `<div ${ddTyped(x)} data-trace-target="${x.id}"><div><div class="t">${esc(x.name)} ${ddType(x)}</div></div></div>`).join('');
    dd.hidden = !res.length;
  });
  function closePanel() {
    state.reading = false;
    $('#app').classList.remove('reading');
    $('#panel').hidden = true;
    $('#app').classList.remove('has-panel');
    afterResize();
  }
  function afterResize() { requestAnimationFrame(() => { cy?.resize(); map?.invalidateSize(); }); }
  $('#panel-close').addEventListener('click', () => select(null));
  // claims page: a click opens the claim beside the list, a double-click opens it full width (the reading view)
  document.addEventListener('dblclick', e => {
    const card = e.target.closest('.claim-card');
    if (!card || state.reading || window.innerWidth <= 860) return;
    window.getSelection()?.removeAllRanges(); // a double-click also selects a word
    if (state.sel !== card.dataset.goto) select(card.dataset.goto, { from: 'claims' });
    trackReading('dblclick');
    setReading(true);
  });
  // so we can see whether people discover the reading view: which way, from which file, by button or the R key
  function trackReading(method) { track('reading_view', { action: state.reading ? 'collapse' : 'expand', method, content_type: byId.get(state.sel)?.type, item_id: state.sel }); }
  $('#panel-expand').addEventListener('click', () => { trackReading('button'); setReading(!state.reading); });
  $('#panel').addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); $('#' + j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  (() => {
    const handle = $('#panel-resize');
    let startX = 0, startW = 0;
    const move = ev => {
      const w = Math.max(320, Math.min(innerWidth - 360, startW + (startX - ev.clientX)));
      $('#app').style.setProperty('--panel-user-w', `${w}px`);
      cy?.resize(); map?.invalidateSize();
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing');
      store.set('panelW', parseInt($('#app').style.getPropertyValue('--panel-user-w')) || null);
      afterResize();
    };
    handle.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      startX = ev.clientX; startW = $('#panel').getBoundingClientRect().width;
      document.body.classList.add('resizing');
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
    handle.addEventListener('dblclick', () => { store.set('panelW', null); applyPanelWidth(); afterResize(); });
  })();
  $('#panel').addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if (more) {
      const vid = more.dataset.more, id = state.sel;
      const hits = (MENTIONS[id] || []).filter(m => m[0] === vid);
      more.parentElement.innerHTML = hits.map(([, t, s]) => `<button class="ts" data-play="${vid}@${t}" title="${esc(s)}">${fmtT(t)}</button>`).join('');
      return;
    }
    const tt = e.target.closest('[data-trace-to]');
    if (tt) { runTrace(state.sel, tt.dataset.traceTo); $('#trace-out')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const sp = e.target.closest('[data-show-path]');
    if (sp) { showPath(sp.dataset.showPath.split(',')); return; }
    const td = e.target.closest('#trace-dd .dd-item');
    if (td) { $('#trace-dd').hidden = true; $('#trace-q').value = byId.get(td.dataset.traceTarget).name; runTrace(state.sel, td.dataset.traceTarget); return; }
    const ft = e.target.closest('[data-filter-tag]');
    if (ft) { state.tags = new Set([ft.dataset.filterTag]); filtersChanged(); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { navigator.clipboard?.writeText(cp.dataset.copy); cp.textContent = 'copied'; }
  });

  // ───────────── videos ─────────────
  const TR = new Map();
  const trWaiters = new Map();
  window.KBT = (id, data) => { TR.set(id, data); trWaiters.get(id)?.forEach(r => r(data)); trWaiters.delete(id); };
  function loadTranscript(id) {
    if (TR.has(id)) return Promise.resolve(TR.get(id));
    if (!byId.get(id)?.transcript) return Promise.resolve(null);
    return new Promise(res => {
      if (!trWaiters.has(id)) {
        trWaiters.set(id, []);
        const s = document.createElement('script');
        s.src = `/data/transcripts/${encodeURIComponent(id)}.js${window.BUILD ? `?v=${window.BUILD}` : ''}`;
        s.onerror = () => { trWaiters.get(id)?.forEach(r => r(null)); trWaiters.delete(id); };
        document.head.append(s);
      }
      trWaiters.get(id).push(res);
    });
  }

  document.addEventListener('click', e => { if (e.target.closest('[data-close-video]')) { e.preventDefault(); closeVideo(); } });
  $('#vid-list').addEventListener('click', e => {
    const o = e.target.closest('[data-open-video]');
    if (o) { openVideo(o.dataset.openVideo, 0, false); return; }
  });

  // the Videos search box: titles, people and cases filter the list at once; transcripts are searched after a pause
  let tqTimer, tqListTimer;
  $('#tq').addEventListener('input', () => {
    clearTimeout(tqTimer); clearTimeout(tqListTimer);
    tqListTimer = setTimeout(() => { renderVidSide(); if (!state.video) renderBrowse(); }, 150);
    tqTimer = setTimeout(runTranscriptSearch, 350);
  });
  // document full text (extracted PDFs), loaded lazily like transcripts
  const DT = new Map();
  const dtWaiters = new Map();
  window.KBD = (id, parts) => { DT.set(id, parts); dtWaiters.get(id)?.forEach(r => r(parts)); dtWaiters.delete(id); };
  function loadDocText(id) {
    if (DT.has(id)) return Promise.resolve(DT.get(id));
    return new Promise(res => {
      if (!dtWaiters.has(id)) {
        dtWaiters.set(id, []);
        const s = document.createElement('script');
        s.src = `/data/doctext/${encodeURIComponent(id)}.js${window.BUILD ? `?v=${window.BUILD}` : ''}`;
        s.onerror = () => { dtWaiters.get(id)?.forEach(r => r(null)); dtWaiters.delete(id); };
        document.head.append(s);
      }
      dtWaiters.get(id).push(res);
    });
  }
  const docEnts = ents.filter(e => e.doctext);
  // one-to-one character normalisation, so match offsets point back into the original page text
  const normCache = new Map();
  const normPage = (key, txt) => { let n = normCache.get(key); if (n === undefined) { n = txt.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ' '); normCache.set(key, n); } return n; };
  let lastSearch = null;

  async function runTranscriptSearch() {
    trackSearch($('#tq').value, 'transcripts');
    const q = $('#tq').value.trim();
    if (q.length < 2) { lastSearch = null; return; }
    const vids = videos.filter(v => v.transcript && !(state.credibleOnly && v.cred === 'outside'));
    if (TR.size < vids.length) $('#tq-info').textContent = 'Loading transcripts (first search only)…';
    await Promise.all(vids.map(v => loadTranscript(v.id)));
    if ($('#tq').value.trim() !== q) return;
    const needle = q.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
    // "non-human" should also match "non human" and "nonhuman" in auto-captions
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), 'i');
    const vOut = [];
    let vTotal = 0;
    for (const v of vids) {
      const segs = TR.get(v.id)?.segments || [];
      const hits = [];
      for (let i = 0; i < segs.length; i++) {
        // join with the next line so phrases split across caption lines still match
        const win = segs[i][1] + ' ' + (segs[i + 1]?.[1] || '');
        if (re.test(win.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ')) && !(hits.length && segs[i][0] - hits[hits.length - 1][0] < 8)) hits.push([segs[i][0], win]);
      }
      if (hits.length) { vTotal += hits.length; vOut.push([v, hits]); }
    }
    vOut.sort((a, b) => b[1].length - a[1].length);
    lastSearch = { q, needle, vOut, vTotal };
    renderVidSide();
    if (!state.video && state.view === 'videos') renderBrowse();
  }
  // document full text, searched from the top search bar: one hit per matching page, with a snippet around the
  // first match
  async function searchDocuments(q) {
    // the bulk MoD UFO files are searched on their own page (/mod-files), not here
    const docs = docEnts.filter(e => !(state.credibleOnly && e.cred === 'outside') && !e.doctext.optin);
    await Promise.all(docs.map(d => loadDocText(d.id)));
    const needle = q.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
    const reG = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), 'gi');
    const dOut = [];
    let dTotal = 0;
    for (const d of docs) {
      const hits = [];
      (DT.get(d.id) || []).forEach((part, pi) => part.pages.forEach((txt, i) => {
        if (!txt) return;
        const norm = normPage(`${d.id}|${pi}|${i}`, txt);
        reG.lastIndex = 0;
        const m = reG.exec(norm);
        if (!m) return;
        let n = 1;
        while (reG.exec(norm) && n < 99) n++;
        const a = Math.max(0, m.index - 90), b = Math.min(txt.length, m.index + m[0].length + 110);
        hits.push({ file: part.file, page: i + 1, n, snip: (a ? '…' : '') + txt.slice(a, b) + (b < txt.length ? '…' : '') });
      }));
      if (hits.length) { dTotal += hits.reduce((s2, h) => s2 + h.n, 0); dOut.push([d, hits]); }
    }
    dOut.sort((a, b) => b[1].length - a[1].length);
    return { needle, dOut, dTotal };
  }


  let yt = null, ytReady = null, ytPending = null, ytReadyFlag = false, syncTimer = null, curTab = 'moments';
  const playYT = ({ id, t, autoplay }) => (autoplay ? yt.loadVideoById({ videoId: id, startSeconds: t }) : yt.cueVideoById({ videoId: id, startSeconds: t }));
  function ensureYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(res => {
      window.onYouTubeIframeAPIReady = res;
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.append(s);
    });
    return ytReady;
  }
  // X's embed script, loaded once on first use
  let xWidgets = null;
  const loadXWidgets = () => xWidgets ||= new Promise(res => {
    if (window.twttr?.widgets) return res(window.twttr);
    const sc = document.createElement('script');
    sc.src = 'https://platform.twitter.com/widgets.js'; sc.async = true;
    sc.onload = () => (window.twttr?.ready ? twttr.ready(t => res(t)) : res(window.twttr));
    sc.onerror = () => res(null);
    document.head.append(sc);
  });
  // brief non-blocking notice at the bottom of the screen
  let toastTimer;
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.append(el); }
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 4000);
  }
  const usingLocal = () => !$('#local-video').hidden;
  function currentTime() { return usingLocal() ? $('#local-video').currentTime : (yt?.getCurrentTime?.() || 0); }

  async function openVideo(id, t = 0, autoplay = true, { replace = false } = {}) {
    const v = byId.get(id);
    if (!v) return;
    const same = state.video === id;
    state.video = id;
    state.videoT = Math.floor(t) || 0; // the moment, kept in the address (?t=) so a copied link reopens it
    // phones: the file card covers the whole screen, so close it to show the player (Back reopens it)
    if (state.sel && matchMedia('(max-width: 860px)').matches) { state.sel = null; panelTransition('close', () => { if (!state.sel) closePanel(); }); }
    if (state.view !== 'videos') go('videos', { keepSel: true });
    setHash({ replace });
    $('#player-empty').hidden = true;
    $('#vid-browse').hidden = true; $('#player-col').hidden = false;
    vsShowFilters = false; renderVidSide(); // the side panel becomes the playlist
    $('#player-wrap').classList.remove('x-embed');
    $$('.vl-item').forEach(el => el.classList.toggle('on', el.dataset.openVideo === id));
    // show title, moments and transcript at once; the YouTube player loads in parallel
    if (!same) { curTab = v.moments?.length ? 'moments' : v.chapters?.length ? 'chapters' : 'transcript'; renderVideoDetail(v); }
    if (v.local || v.stream) {
      const el = $('#local-video');
      $('#yt').hidden = true; el.hidden = false;
      try { yt?.pauseVideo?.(); } catch { /* not ready */ }
      // dev server: local copy in media/; public site: our own copy streamed from R2 (videos with `stream:`)
      if (!same) { el.src = v.local ? '/' + v.local : fileUrl(v.stream); if (v.thumb) el.poster = fileUrl(v.thumb); }
      el.currentTime = t;
      if (autoplay) el.play().catch(() => {});
    } else if (!v.youtube) {
      // non-YouTube video without a local copy (e.g. on the public site): link to the original post
      $('#local-video').hidden = true; $('#yt').hidden = true;
      const src = vsource(v);
      const xId = (v.url || '').match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/)?.[1];
      $('#player-empty').hidden = false;
      if (xId) {
        // X posts play in place through X's official embed (X serves the video; the archive never re-hosts it).
        // The embed has no seek API, so moment timestamps show the time to skip to instead of jumping.
        $('#player-wrap').classList.add('x-embed');
        yt?.pauseVideo?.();
        if (!same || !$('#player-empty .x-post')) {
          $('#player-empty').innerHTML = `<div class="x-post" data-x="${xId}"><a href="${esc(v.url)}" target="_blank" rel="noopener">Loading the post from X… ↗</a></div>`;
          loadXWidgets().then(tw => {
            const box = $(`#player-empty .x-post[data-x="${xId}"]`);
            if (!tw || !box) return;
            tw.widgets.createTweet(xId, box, { theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', dnt: true, conversation: 'none', align: 'center', width: 550 })
              .then(el => { if (el) box.querySelector('a')?.remove(); });
          });
        }
        if (t > 0) toast(`Skip to ${fmtT(t)} in the X player`);
      } else {
        $('#player-empty').innerHTML = `This video is hosted on ${esc(src.label)}.<br><br>${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">Watch it on ${esc(src.label)} ↗</a>` : ''}<br><br><span class="small">The transcript and moments below are searchable here.</span>`;
      }
    } else if (location.protocol === 'file:') {
      $('#player-empty').hidden = false;
      $('#player-empty').innerHTML = `Embedded playback needs the local server (<code>npm run dev</code>).<br><br><a href="https://www.youtube.com/watch?v=${v.youtube}&t=${Math.floor(t)}s" target="_blank" rel="noopener">Open on YouTube at ${fmtT(t)} ↗</a>`;
    } else {
      $('#local-video').hidden = true; $('#local-video').pause?.(); $('#yt').hidden = false;
      await ensureYT();
      const want = { id: v.youtube, t, autoplay };
      if (!yt) {
        ytReadyFlag = false;
        yt = new YT.Player('yt', {
          host: 'https://www.youtube-nocookie.com', // privacy-enhanced mode: no YouTube cookies until a video is played
          videoId: v.youtube, playerVars: { start: Math.floor(t), autoplay: autoplay ? 1 : 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onStateChange: ev => { if (ev.data === 0) videoTick(state.video, 1, 1, true); }, onReady: () => {
            ytReadyFlag = true;
            // a different video may have been requested while the player was still loading
            const p = ytPending; ytPending = null;
            if (p && p.id !== v.youtube) playYT(p);
          } },
        });
      } else if (!ytReadyFlag) {
        ytPending = want; // player still initialising: apply once ready
      } else if (same) {
        yt.seekTo(t, true); if (autoplay) yt.playVideo();
      } else playYT(want);
    }
    if (same && curTab === 'transcript') syncTranscript(true);
  }

  async function renderVideoDetail(v) {
    const vm = videoMentions.get(v.id);
    const tabs = [
      ['moments', `Moments${v.moments?.length ? ` (${v.moments.length})` : ''}`],
      ['chapters', `Chapters${v.chapters?.length ? ` (${v.chapters.length})` : ''}`],
      ['transcript', 'Transcript'],
      ['mentions', `Mentioned${vm?.size ? ` (${vm.size})` : ''}`],
      ['about', 'About'],
    ];
    const people = adj.get(v.id).filter(x => x.kind !== 'mention' && x.label !== 'mentions').map(x => x.other);
    $('#vid-detail').innerHTML = `<div class="vd-head"><button class="link vd-back" data-close-video>← All videos</button><h2>${esc(v.name)}</h2>
      <div class="vd-meta"><span>${esc([v.channel, fmtD(v.date), fmtDur(v.duration)].filter(Boolean).join(' · '))}</span>
      ${vsource(v).url ? `<a href="${esc(vsource(v).url)}" target="_blank" rel="noopener">${vsource(v).label} ↗</a>` : ''}
      <a href="${hrefOf(v.id)}" data-goto="${v.id}">Details</a></div>
      ${seriesNav(v)}
      ${people.length ? `<div class="chips" style="margin-top:8px">${[...new Set(people)].map(id => chip(id)).join('')}</div>` : ''}</div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${curTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="tab-body" id="tab-body"></div>`;
    await renderTab(v);
  }

  // sessions of one recording (series: <hearing id>, part: N): previous / next, and every session on file
  function seriesNav(v) {
    if (!v.series) return '';
    const parts = videos.filter(x => x.series === v.series).sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
    const i = parts.indexOf(v), s = byId.get(v.series), prev = parts[i - 1], next = parts[i + 1];
    const btn = (x, l) => x ? `<button class="link" data-open-video="${x.id}" title="${esc(x.name)}">${l}</button>` : `<span class="muted">${l}</span>`;
    return `<div class="vd-series"><div><span class="muted small">${s ? esc(s.name) : 'Series'}${v.part ? ` · session ${v.part}${s?.parts ? ` of ${s.parts}` : ''}` : ''}${s?.parts && parts.length < s.parts ? ` · ${parts.length} on file` : ''}</span>
      ${btn(prev, '← Previous')}${btn(next, 'Next →')}</div>
      <div class="vd-parts">${parts.map(x => `<button data-open-video="${x.id}" class="${x === v ? 'on' : ''}" title="${esc(x.name)}">${x.part ?? '•'}</button>`).join('')}</div></div>`;
  }

  // YouTube descriptions: make URLs clickable (new tab) and timestamps seek the player.
  function linkifyDescription(v) {
    const text = v.description || 'No description.';
    const dur = v.duration || Infinity;
    const re = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'])|((?<![\d:])(?:\d{1,2}:)?\d{1,2}:\d{2}(?![\d:]))/g;
    let out = '', last = 0;
    for (const m of text.matchAll(re)) {
      out += esc(text.slice(last, m.index));
      last = m.index + m[0].length;
      if (m[1]) {
        const url = m[1];
        const sameVideo = /(?:youtube\.com\/watch\?[^\s]*v=|youtu\.be\/)([\w-]{11})/.exec(url);
        const t = /[?&#]t=(\d+h)?(\d+m)?(\d+)s?/.exec(url);
        if (sameVideo && sameVideo[1] === v.youtube && t) {
          const secs = (parseInt(t[1]) || 0) * 3600 + (parseInt(t[2]) || 0) * 60 + (parseInt(t[3]) || 0);
          out += `<button class="ts" data-play="${v.id}@${secs}">▶ ${fmtT(secs)}</button>`;
        } else {
          out += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
        }
      } else {
        const parts = m[2].split(':').map(Number);
        const secs = parts.reduce((a, p) => a * 60 + p, 0);
        const valid = parts.slice(1).every(p => p < 60) && secs <= dur + 1;
        out += valid ? `<button class="ts" data-play="${v.id}@${secs}">${esc(m[2])}</button>` : esc(m[2]);
      }
    }
    return out + esc(text.slice(last));
  }

  async function renderTab(v) {
    const body = $('#tab-body');
    if (!body) return;
    $$('#vid-detail .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
    if (curTab === 'moments') {
      body.innerHTML = v.moments?.length ? v.moments.slice().sort((a, b) => a.t - b.t).map(m => `<div class="moment"><button class="ts" data-play="${v.id}@${m.t}">▶ ${fmtT(m.t)}</button><div><div>${esc(m.text)}</div><div class="who">${m.speaker ? chip(m.speaker) : ''}${m.refs.map(r => chip(r)).join('')}</div></div></div>`).join('')
        : `<p class="muted">No curated moments yet. Add them under <code>moments:</code> in <code>${esc(v.file)}</code> — or use the Transcript tab to find the exact time.</p>`;
    } else if (curTab === 'chapters') {
      body.innerHTML = v.chapters?.length ? v.chapters.map(c => `<div class="moment"><button class="ts" data-play="${v.id}@${c.t}">${fmtT(c.t)}</button><div>${esc(c.title)}</div></div>`).join('') : '<p class="muted">This video has no chapter markers.</p>';
    } else if (curTab === 'mentions') {
      const vm = videoMentions.get(v.id);
      body.innerHTML = vm?.size ? [...vm].sort((a, b) => b[1].length - a[1].length).map(([id, ts]) => `<div class="moment"><div>${chip(id, `<span class="n">${ts.length}</span>`)}</div><div class="mv-ts" style="display:flex;flex-wrap:wrap;gap:4px">${ts.map(t => `<button class="ts" data-play="${v.id}@${t}">${fmtT(t)}</button>`).join('')}</div></div>`).join('')
        : '<p class="muted">No known names found in this transcript.</p>';
    } else if (curTab === 'about') {
      body.innerHTML = `<div class="p-body about" style="white-space:pre-wrap;color:var(--muted);font-size:13px">${linkifyDescription(v)}</div>`;
    } else if (curTab === 'transcript') {
      body.innerHTML = '<p class="muted">Loading transcript…</p>';
      const tr = await loadTranscript(v.id);
      if (state.video !== v.id || curTab !== 'transcript') return;
      if (!tr) {
        const id = v.youtube || v.media;
        // the how-to is only useful on the dev server
        body.innerHTML = `<p class="muted">No transcript yet for this video.</p>` + (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? `<p class="small muted">Try <code>npm run fetch -- ${esc(id)}</code>. If YouTube has no captions for it, download the audio and transcribe it locally: <code>yt-dlp -f bestaudio[ext=m4a] -o media/${esc(id)}/audio.m4a -- ${esc(id)}</code> then <code>node scripts/transcribe.mjs -- ${esc(id)}</code>.</p>` : '');
        return;
      }
      // group caption lines into ~20-second paragraphs
      const paras = [];
      for (const [t, s] of tr.segments) {
        const last = paras[paras.length - 1];
        if (!last || t - last.t >= 20) paras.push({ t, text: s }); else last.text += ' ' + s;
      }
      body.innerHTML = `<div class="transcript-tools"><input id="tfind" type="search" placeholder="Find in this transcript…"><label class="check" style="margin:0"><input type="checkbox" id="tfollow" checked> Follow playback</label><span class="small muted">${({ 'youtube-auto': 'Auto-generated captions', youtube: 'Subtitles', whisper: 'Whisper transcript (local AI)', 'whisper-translated': 'Whisper translation to English (local AI)', translation: 'English translation of the published subtitles (by the archive)' })[tr.source] || 'Transcript'}</span></div>
        <div class="transcript" id="transcript">${paras.map(p => `<p data-t="${p.t}"><button class="ts">${fmtT(p.t)}</button><span>${esc(p.text)}</span></p>`).join('')}</div>`;
      $('#tfind').addEventListener('input', ev => {
        const q = ev.target.value.trim();
        const re = q.length > 1 ? new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;
        let first = null;
        $$('#transcript p').forEach((p, i) => {
          const span = p.querySelector('span');
          const text = paras[i].text;
          const has = re && re.test(text);
          if (re) re.lastIndex = 0;
          span.innerHTML = has ? esc(text).replace(re, '<mark>$1</mark>') : esc(text);
          if (has && !first) first = p;
        });
        if (first) scrollWithin($('#transcript'), first, false);
      });
      syncTranscript(true);
    }
  }
  // scroll a paragraph to the middle of its own scroll box without moving the page (keeps the player visible);
  // measured on screen, since offsetTop depends on which ancestor is positioned (the box itself is position: relative)
  function scrollWithin(box, el, smooth) {
    const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }
  function syncTranscript(force) {
    const el = $('#transcript');
    if (!el || !state.video) return;
    const t = currentTime();
    const ps = $$('p', el);
    let cur = null;
    for (const p of ps) { if (+p.dataset.t <= t + 0.5) cur = p; else break; }
    const prev = $('p.now', el);
    if (cur !== prev || force) {
      prev?.classList.remove('now');
      cur?.classList.add('now');
      if (cur && ($('#tfollow')?.checked || force)) scrollWithin(el, cur, !force);
    }
  }
  clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (state.view !== 'videos' || curTab !== 'transcript') return;
    const playing = usingLocal() ? !$('#local-video').paused : yt?.getPlayerState?.() === 1;
    if (playing) syncTranscript(false);
  }, 700);
  $('#vid-detail').addEventListener('click', e => {
    const o = e.target.closest('[data-open-video]');
    if (o) { openVideo(o.dataset.openVideo, 0, false); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { curTab = tab.dataset.tab; renderTab(byId.get(state.video)); return; }
    const p = e.target.closest('#transcript p');
    if (p) { seek(+p.dataset.t); }
  });
  function seek(t) {
    if (usingLocal()) { $('#local-video').currentTime = t; $('#local-video').play().catch(() => {}); }
    else if (yt?.seekTo) { yt.seekTo(t, true); yt.playVideo(); }
    setTimeout(() => syncTranscript(true), 150);
  }


  // ───────────── home / landing ─────────────
  function homeStats() {
    const people = ents.filter(e => e.type === 'person' && e.cred === 'credible').length;
    const facts = ents.flatMap(e => e.facts);
    return [
      [people, 'official sources', 'people with an official role, on the record'],
      [KB.stats.transcriptHours, 'hours of testimony', `${KB.stats.transcripts} transcribed videos, searchable to the second`],
      [ents.filter(e => e.type === 'record').length, 'official records', 'declassified files from the PURSUE releases'],
      [ents.filter(e => e.type === 'hearing').length, 'hearings & briefings', 'from 1966 to today, with transcripts'],
      [`${facts.filter(f => f.status === 'documented').length}`, 'documented statements', `of ${facts.length} sourced statements, each with its status shown`],
    ];
  }
  const START_HERE = [
    { kicker: 'Testimony · 2023', title: 'Under oath: David Grusch', text: 'A former intelligence officer tells Congress about “a multi-decade UAP crash retrieval and reverse-engineering program”. Jump to the exact second.', action: 'data-play="v-2023-07-26-hearing-a@1926"', need: 'v-2023-07-26-hearing-a', cta: '▶ Watch at 32:06' },
    { kicker: 'Incident · 2004', title: 'The Nimitz “Tic Tac”', text: 'Pilots, radar operators and a FLIR video: one object, eight military witnesses, and two decades of testimony.', action: 'data-home-goto="inc-nimitz-2004"', need: 'inc-nimitz-2004', cta: 'Open the case file' },
    { kicker: 'Paper trail · 2008–2012', title: 'AAWSAP, in its own documents', text: 'The DIA program behind the 2017 revelations, from its Statement of Objectives to all 37 research papers, now declassified.', action: 'data-home-goto="aawsap"', need: 'aawsap', cta: 'Follow the documents' },
    { kicker: 'Pattern · 1964–2003', title: 'Nuclear sites', text: 'Missile silos, launch facilities and warheads: a recurring thread across forty years of service-member accounts.', action: `data-preset='{"view":"map","tags":["nuclear"]}'`, cta: 'See them on the map' },
    { kicker: 'Provenance · 2002', title: 'The Wilson memo', text: 'Entered into the congressional record in 2022. What that proves, and what it doesn’t: provenance kept separate from claims.', action: 'data-home-goto="doc-wilson-memo"', need: 'doc-wilson-memo', cta: 'Read the dossier' },
    { kicker: 'Official record · 1947 → 2026', title: 'From Twining to PURSUE', text: '“Something real and not visionary or fictitious.” Eighty years of official statements, from the first Air Force opinion to the 2026 releases.', action: `data-preset='{"view":"timeline","types":["document","event","program","hearing"]}'`, cta: 'Walk the timeline' },
  ];
  const WAYS_IN = [
    ['graph', 'Explore', 'Every person, program and incident, and how they connect. Trace the path between any two.'],
    ['timeline', 'Timeline', 'Eighty years of events, documents and hearings, decade by decade.'],
    ['map', 'World', 'Where it happened: bases, ships, schools and hearing rooms.'],
    ['videos', 'Videos', 'Hearings and interviews with synced transcripts. Search every word spoken.'],
    ['shelf', 'Documentaries', 'Films featuring the people on record, with trailers and where to watch them.'],
    ['claims', 'Claims', 'The key propositions of the debate, each open, disputed, supported or refuted, with who said it and the evidence.'],
    ['index', 'Index', 'All files, by type, filterable.'],
  ];
  function renderHome() {
    const el = $('#view-home');
    const today = new Date().toISOString().slice(0, 10);
    const ld = latestData(), latest = [...ld.featured, ...ld.recent].slice(0, 6);
    el.innerHTML = `
      <div class="hero">
        <canvas id="hero-canvas" aria-hidden="true"></canvas>
        <div id="hero-card" class="hero-card" hidden></div>
        <div class="hero-inner">
          <div class="hero-kicker"><span class="dot-live"></span> Case archive · UAP · NHI · <b>${ents.length}</b> files</div>
          <h1>Where are they?</h1>
          <p class="hero-tagline">Connecting the dots</p>
          <p class="hero-qualifier">All that we know so far.</p>
          <p class="hero-lede">An open, sourced archive of what officials, pilots, radar operators, intelligence officers and scientists have said <em>on the record</em> about unidentified anomalous phenomena and non-human intelligence.</p>
          <div class="hero-search">
            <input id="hq" type="search" placeholder="Search a person, program or case: Grusch, AARO, Tic Tac, Roswell…" autocomplete="off" spellcheck="false">
            <div id="hq-dd" class="dropdown" hidden></div>
          </div>
          <div class="hero-cta">
            <a class="btn primary" href="/explore" data-home-view="graph">Explore the network</a>
            <a class="btn" href="/videos" data-home-view="videos">Watch the testimony</a>
          </div>
        </div>
        <div class="hero-scroll" aria-hidden="true">↓</div>
      </div>

      <div class="home-wrap">
        <section class="home-stats">${homeStats().map(([n, l, s]) => `<div class="hs"><b>${n}</b><span>${l}</span><small>${s}</small></div>`).join('')}</section>

        <section class="home-rule">
          <div>
            <div class="home-kicker">How to read this archive</div>
            <h2>Official sources only.</h2>
            <p>Every claim here is tied to a named person with an official role: members of Congress, government and intelligence officials, military personnel, fighter pilots, radar operators, scientists. Civilian-only accounts, disputed figures and known forgeries are kept, but hidden by default and clearly marked.</p>
            <p>Each claim carries one of three stamps, and every stamp can be traced to its source:</p>
          </div>
          <ul class="stamps">
            <li style="--st:var(--documented)"><span class="stamp">Documented</span><p>Backed by an official record or primary document: a hearing transcript, a declassified file.</p></li>
            <li style="--st:var(--claimed)"><span class="stamp">On record</span><p>Stated publicly by a named person, under oath, in an interview or in writing, and linked to that moment.</p></li>
            <li style="--st:var(--unverified)"><span class="stamp">Unverified</span><p>Reported but not yet tied to a source. Shown so the gaps are visible, not hidden.</p></li>
          </ul>
        </section>

        <section class="home-sec">
          <div class="home-kicker">Start here</div>
          <h2>Six threads to pull</h2>
          <div class="paths">${START_HERE.filter(p => !p.need || byId.has(p.need)).map(p => `
            <a class="path-card" href="#" ${p.action}>
              <div class="pc-kicker">${esc(p.kicker)}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><span class="pc-cta">${esc(p.cta)} →</span>
            </a>`).join('')}</div>
        </section>

        <section class="home-sec">
          <div class="home-kicker">Ways in</div>
          <h2>Navigate the complexity</h2>
          <div class="ways">${WAYS_IN.map(([v, t, d], i) => `
            <a class="way" href="${VIEW_PATH[v]}" data-home-view="${v}"><span class="way-n">0${i + 1}</span><b>${t}</b><span>${d}</span></a>`).join('')}</div>
        </section>

        <section class="home-sec">
          <div class="home-kicker">Latest</div>
          <h2>What's happening on the record</h2>
          <div class="latest">${latest.map(e => `
            <a class="latest-item" href="${hrefOf(e.id)}" data-home-latest="${e.id}" style="--c:${TYPES[e.type].color}">
              <span class="li-date">${esc(fmtRange(e))}${String(e.date) > today ? ' <em>upcoming</em>' : ''}</span>
              <span class="li-type">${e.type === 'news' ? esc(NEWS_KIND[e.kind]?.label || 'News') : TYPES[e.type].label}</span><span class="li-name">${esc(e.name)}</span>
            </a>`).join('') || '<p class="muted">Nothing in the last few months yet.</p>'}</div>
          <p class="home-more"><a href="/latest" data-home-view="latest">See everything on Latest →</a> · <a href="/feed.xml" target="_blank" rel="noopener">RSS feed</a></p>
        </section>

        <footer class="home-foot">
          <div><b>WHERE ARE THEY</b> is a personal research archive. It collects public, on-record statements and official documents. It does not make claims of its own: every statement is attributed, and every status can be checked against its source.</div>
          <div class="muted">Built ${new Date(KB.built).toLocaleDateString()} · ${KB.stats.entities} files · ${KB.stats.edges.toLocaleString()} links · sources include congressional records, war.gov/UFO (PURSUE), the CIA and FBI reading rooms, NARA and The Black Vault.</div>
          <div class="home-links">© ${new Date().getFullYear()} Carlo Pascoli · <a href="/about">About</a> · <a class="foot-social" href="https://x.com/WhereAreTheyUAP" target="_blank" rel="noopener" data-social="x" data-placement="home-footer"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> @WhereAreTheyUAP</a> · <a class="foot-social" href="https://github.com/cpascoli/wherearethey" target="_blank" rel="noopener" data-social="github" data-placement="home-footer"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"/></svg> GitHub</a> · <a href="/privacy">Privacy &amp; cookies</a></div>
        </footer>
      </div>`;
    startHero();
  }

  // hero: a live, slowly drifting rendering of the archive's own network
  let heroRaf = null, heroData = null;
  function buildHeroLayout() {
    const nodes = ents.filter(e => !['record', 'news', 'video', 'source'].includes(e.type) && !(e.cred === 'outside'));
    const idx = new Map(nodes.map((e, i) => [e.id, i]));
    const links = KB.edges.filter(x => x.kind !== 'mention' && idx.has(x.s) && idx.has(x.t)).map(x => [idx.get(x.s), idx.get(x.t)]);
    // deterministic pseudo-random start so the picture is stable between visits
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const P = nodes.map(() => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, vx: 0, vy: 0 }));
    const deg = new Array(nodes.length).fill(0); for (const [a, b] of links) { deg[a]++; deg[b]++; }
    for (let it = 0; it < 260; it++) {
      const k = 0.0009, cool = 1 - it / 260;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d2 = dx * dx + dy * dy + 0.0004;
        const f = k / d2; P[i].vx += dx * f; P[i].vy += dy * f; P[j].vx -= dx * f; P[j].vy -= dy * f;
      }
      for (const [a, b] of links) {
        const dx = P[b].x - P[a].x, dy = P[b].y - P[a].y; const f = 0.012;
        P[a].vx += dx * f; P[a].vy += dy * f; P[b].vx -= dx * f; P[b].vy -= dy * f;
      }
      for (const p of P) { p.vx -= p.x * 0.004; p.vy -= p.y * 0.004; p.x += Math.max(-.05, Math.min(.05, p.vx)) * cool; p.y += Math.max(-.05, Math.min(.05, p.vy)) * cool; p.vx *= .5; p.vy *= .5; }
    }
    // normalise so ~95% of nodes fall inside [-1, 1]; outliers just spill past the edge
    const ext = P.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))).sort((a, b) => a - b)[Math.floor(P.length * .95)] || 1;
    for (const p of P) { p.x /= ext; p.y /= ext; }
    return { nodes, P, links, deg, pulses: [] };
  }
  // the most quotable thing we hold about an entry: a curated video moment, else its strongest claim, else its bio
  function bestQuote(e) {
    const ms = momentsFor.get(e.id) || [];
    const own = ms.find(m => m.speaker === e.id) || ms[0];
    if (own) return { text: own.text, play: `${own.video}@${own.t}`, meta: `${byId.get(own.video)?.name || 'video'} · ${fmtT(own.t)}` };
    const order = { documented: 0, claimed: 1, unverified: 2 };
    const f = [...e.facts].sort((a, b) => order[a.status] - order[b.status])[0];
    if (f) {
      const vidSrc = f.source?.id && byId.get(f.source.id)?.type === 'video' ? `${f.source.id}@${f.source.t || 0}` : null;
      return { text: f.text, status: f.status, play: vidSrc };
    }
    const bio = (e.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (bio) return { text: bio.split(/(?<=\.)\s/)[0] };
    return { text: subtitle(e) || 'No notes filed yet.' };
  }
  function openHeroCard(i) {
    const e = heroData.nodes[i];
    heroData.selected = i;
    const q = bestQuote(e);
    const t = TYPES[e.type];
    const card = $('#hero-card');
    card.innerHTML = `<button class="icon-btn hc-close" aria-label="Close">✕</button>
      <div class="hc-kicker"><span class="badge type" style="background:${t.color}">${t.label}</span>${e.cred ? `<span class="badge ${e.cred}">${CRED[e.cred].label}</span>` : ''}<span class="hc-file">File ${fileNo(e)}</span></div>
      <div class="hc-name">${esc(e.name)}</div>
      ${subtitle(e) ? `<div class="hc-sub">${esc(subtitle(e))}</div>` : ''}
      <blockquote class="hc-quote">${esc(q.text.length > 260 ? q.text.slice(0, 257) + '…' : q.text)}</blockquote>
      ${q.status ? `<span class="stamp" style="--st:var(--${q.status})">${STATUS[q.status].label}</span>` : ''}${q.meta ? `<div class="hc-meta">${esc(q.meta)}</div>` : ''}
      <div class="hc-actions">${q.play ? `<button class="btn small primary" data-play="${q.play}">▶ Play</button>` : ''}<button class="btn small" data-hc-open="${e.id}">Open file →</button><button class="link hc-random">another →</button></div>`;
    card.hidden = false;
    positionHeroCard();
  }
  function positionHeroCard() {
    const card = $('#hero-card'), cv = $('#hero-canvas');
    if (!card || card.hidden || heroData.selected == null || !heroData.pos) return;
    const [x, y] = heroData.pos[heroData.selected];
    const W = cv.clientWidth, H = cv.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    let left = x + 18, top = y - ch / 2;
    if (left + cw > W - 12) left = x - cw - 18;
    top = Math.max(12, Math.min(H - ch - 12, top));
    card.style.left = `${Math.max(12, left)}px`; card.style.top = `${top}px`;
  }
  function closeHeroCard() {
    heroData.selected = null;
    const c = $('#hero-card'); if (c) c.hidden = true;
  }
  $('#view-home').addEventListener('click', e => {
    if (e.target.closest('.hc-close')) { closeHeroCard(); return; }
    if (e.target.closest('.hc-random')) {
      // jump to a random well-documented entry so “another” always lands on something substantive
      const pool = heroData.nodes.map((n, i) => [n, i]).filter(([n]) => n.facts.length || momentsFor.has(n.id) || n.body);
      openHeroCard(pool[Math.floor(Math.random() * pool.length)][1]);
      return;
    }
    const o = e.target.closest('[data-hc-open]');
    if (o) { closeHeroCard(); exploreFrom(o.dataset.hcOpen); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.view === 'home') closeHeroCard(); });
  function startHero() {
    const cv = $('#hero-canvas');
    if (!cv) return;
    heroData ||= buildHeroLayout();
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mx = 0, my = 0, px = -1, py = -1;
    const hero = cv.parentElement;
    const nearest = (x, y, max = 12) => {
      let best = -1, bd = max * max;
      (heroData.pos || []).forEach(([nx, ny], i) => { const d = (nx - x) ** 2 + (ny - y) ** 2; if (d < bd) { bd = d; best = i; } });
      return best;
    };
    hero.onmousemove = ev => {
      const r = cv.getBoundingClientRect();
      mx = (ev.clientX - r.left) / r.width - .5; my = (ev.clientY - r.top) / r.height - .5;
      px = ev.clientX - r.left; py = ev.clientY - r.top;
      // don't steal hover from the text/search column
      const overUi = ev.target.closest('.hero-inner > *, .hero-card');
      heroData.hover = overUi ? -1 : nearest(px, py);
      cv.style.cursor = heroData.hover >= 0 ? 'pointer' : '';
      if (reduce) requestAnimationFrame(frame);
    };
    hero.onmouseleave = () => { heroData.hover = -1; };
    hero.onclick = ev => {
      if (ev.target.closest('.hero-inner > *, .hero-card')) return;
      const r = cv.getBoundingClientRect();
      const i = nearest(ev.clientX - r.left, ev.clientY - r.top, 14);
      if (i < 0) { closeHeroCard(); return; }
      openHeroCard(i);
    };
    heroData.rot ??= 0;
    let lastT = performance.now();
    const t0 = performance.now();
    cancelAnimationFrame(heroRaf);
    const frame = now => {
      if (state.view !== 'home' || !document.body.contains(cv)) return;
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const t = (now - t0) / 1000;
      const narrow = W < 860;
      const cx = narrow ? W * .5 : W * .74, cy = H * .5, scale = Math.min(W * (narrow ? .45 : .27), H * .44);
      // rotation pauses while a card is open or a dot is hovered, so things stay where you're looking
      if (!reduce && heroData.selected == null && !(heroData.hover >= 0)) heroData.rot += (now - lastT) / 1000 * 0.018;
      lastT = now;
      const rot = heroData.rot, cr = Math.cos(rot), sr = Math.sin(rot);
      const { P, links, nodes, deg, pulses } = heroData;
      const pos = P.map((p, i) => {
        const wob = reduce ? 0 : Math.sin(t * .6 + i) * .004;
        const x = p.x * cr - p.y * sr + wob, y = p.x * sr + p.y * cr - wob;
        return [cx + x * scale + mx * 18 * (1 + deg[i] * .05), cy + y * scale * .82 + my * 14 * (1 + deg[i] * .05)];
      });
      heroData.pos = pos;
      const dark = isDark();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = dark ? 'rgba(111,207,191,0.13)' : 'rgba(15,118,110,0.14)';
      ctx.beginPath();
      for (const [a, b] of links) { ctx.moveTo(pos[a][0], pos[a][1]); ctx.lineTo(pos[b][0], pos[b][1]); }
      ctx.stroke();
      for (let i = 0; i < pos.length; i++) {
        const r = 1.6 + Math.min(5, Math.sqrt(deg[i]) * 1.0);
        ctx.globalAlpha = dark ? .75 : .8;
        ctx.fillStyle = TYPES[nodes[i].type].color;
        ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // signals travelling along links
      if (!reduce && Math.random() < .12 && pulses.length < 26) pulses.push({ l: links[(Math.random() * links.length) | 0], s: now });
      ctx.fillStyle = dark ? '#bff3ea' : '#0f766e';
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i], k = (now - p.s) / 1400;
        if (k >= 1) { pulses.splice(i, 1); continue; }
        const [a, b] = p.l, x = pos[a][0] + (pos[b][0] - pos[a][0]) * k, y = pos[a][1] + (pos[b][1] - pos[a][1]) * k;
        ctx.globalAlpha = Math.sin(k * Math.PI) * .9;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const i of new Set([heroData.hover, heroData.selected].filter(i => i != null && i >= 0))) {
        const [x, y] = pos[i];
        ctx.strokeStyle = dark ? '#e4e8ee' : '#1e2124'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.stroke();
        if (i === heroData.hover && i !== heroData.selected) {
          ctx.font = '500 12px "IBM Plex Sans", system-ui, sans-serif';
          const label = nodes[i].name.length > 40 ? nodes[i].name.slice(0, 38) + '…' : nodes[i].name;
          const w = ctx.measureText(label).width;
          ctx.fillStyle = dark ? 'rgba(14,19,23,.88)' : 'rgba(250,248,242,.92)';
          ctx.fillRect(x + 13, y - 10, w + 12, 20);
          ctx.fillStyle = dark ? '#e4e8ee' : '#1e2124';
          ctx.fillText(label, x + 19, y + 4);
        }
      }
      if (heroData.selected != null) positionHeroCard();
      if (!reduce) heroRaf = requestAnimationFrame(frame);
    };
    heroRaf = requestAnimationFrame(frame);
  }
  function applyPreset(p) {
    if (p.tags) state.tags = new Set(p.tags);
    if (p.types) state.types = new Set(p.types);
    filtersChanged();
    go(p.view || 'graph');
  }
  // From the home page into Explore: start clean every time (no leftover type/theme/year filters or hidden
  // files) and make the chosen file the first step of a trail. "Official sources only" stays on unless the
  // file itself is outside the criteria, which would otherwise hide it.
  function exploreFrom(id) {
    const ent = byId.get(id);
    if (!ent) return;
    if (offGraph(ent.type)) { go(ent.type === 'news' ? 'latest' : ent.type === 'claim' ? 'claims' : 'graph'); select(id); return; } // records and news aren't graph nodes: just open the card
    clearFilters(ent);
    startTrail(id);
  }
  function clearFilters(ent) {
    state.types = new Set(graphTypes);
    state.tags.clear();
    state.yr = [MIN_Y, MAX_Y];
    state.showMentions = false;
    state.credibleOnly = !ent || ent.cred !== 'outside';
    if (ent && resolved(ent)) state.hideExplained = false; // opening an explained case shows it
    state.hiddenIds.clear();
    filtersChanged();
  }
  $('#view-home').addEventListener('click', e => {
    const pr = e.target.closest('[data-preset]');
    if (pr) { e.preventDefault(); applyPreset(JSON.parse(pr.dataset.preset)); return; }
    const hv = e.target.closest('[data-home-view]');
    if (hv) { e.preventDefault(); go(hv.dataset.homeView); return; }
    const hl = e.target.closest('[data-home-latest]');
    if (hl) { e.preventDefault(); go('latest'); select(hl.dataset.homeLatest); return; }
    const hg = e.target.closest('[data-home-goto]');
    if (hg) {
      e.preventDefault();
      exploreFrom(hg.dataset.homeGoto);
    }
  });
  $('#view-home').addEventListener('input', e => {
    if (e.target.id !== 'hq') return;
    const res = searchEntities(e.target.value, 8);
    const dd = $('#hq-dd');
    dd.innerHTML = res.map(x => `<div ${ddTyped(x)} data-hq="${x.id}"><div><div class="t">${esc(x.name)} ${ddType(x)}</div><div class="s">${esc(subtitle(x))}</div></div></div>`).join('')
      + (e.target.value.trim() ? `<div class="dd-sep"></div><div class="dd-item" data-hq-d="1"><span>📄</span><div><div class="t">Search inside documents for “${esc(e.target.value)}”</div><div class="s">${KB.stats.documents} documents · ${KB.stats.documentPages.toLocaleString('en-US')} pages, opened at the page</div></div></div>`
        + `<div class="dd-item" data-hq-t="1"><span>🎥</span><div><div class="t">Search video transcripts for “${esc(e.target.value)}”</div><div class="s">${KB.stats.transcripts} videos · ${KB.stats.transcriptHours} h of speech, on the Videos page</div></div></div>` : '');
    dd.hidden = !e.target.value.trim();
    // phones: bring the search box to the top of the screen so the results have room above the bottom menu
    // (after the keystroke: the browser's own keep-the-caret-visible scroll would cancel a smooth scroll started now)
    if (!dd.hidden && innerWidth <= 860) setTimeout(() => {
      const v = $('#view-home'), off = $('#hq').getBoundingClientRect().top - v.getBoundingClientRect().top - 12;
      if (off > 40) v.scrollTo({ top: v.scrollTop + off, behavior: 'smooth' });
    }, 80);
  });
  $('#view-home').addEventListener('keydown', e => {
    if (e.target.id === 'hq' && e.key === 'Enter') $('#hq-dd .dd-item')?.click();
  });
  $('#view-home').addEventListener('mousedown', e => {
    const it = e.target.closest('[data-hq]');
    const tq = e.target.closest('[data-hq-t]');
    if (it) { e.preventDefault(); exploreFrom(it.dataset.hq); } // a home search starts a clean trail
    if (tq) { e.preventDefault(); searchVideosFor($('#hq').value); }
    if (e.target.closest('[data-hq-d]')) { e.preventDefault(); showDocResults($('#hq').value, $('#hq-dd'), '#hq'); }
    if (e.target.closest('#hq-dd [data-dd-back]')) { e.preventDefault(); requestAnimationFrame(() => $('#hq').dispatchEvent(new Event('input', { bubbles: true }))); }
  });
  // the header search hides on the landing page while the hero's own search box is on screen, and returns once
  // it scrolls out of view (one search box at a time)
  function heroSearchInView() {
    const box = state.view === 'home' && $('#view-home .hero-search');
    const r = box && box.getBoundingClientRect();
    document.body.classList.toggle('hero-q', !!r && r.bottom > $('.top').getBoundingClientRect().bottom && r.top < innerHeight);
  }
  $('#view-home').addEventListener('scroll', heroSearchInView, { passive: true });
  addEventListener('resize', heroSearchInView);

  // Leaving the app for the landing page: stop media and free the heavy views (rebuilt on return)
  function teardownApp() {
    try { yt?.stopVideo?.(); yt?.destroy?.(); } catch { /* player not ready */ }
    yt = null; ytReadyFlag = false; ytPending = null;
    const wrap = $('#player-wrap');
    if (!$('#yt')) wrap.insertAdjacentHTML('afterbegin', '<div id="yt"></div>');
    const lv = $('#local-video');
    lv.pause(); lv.removeAttribute('src'); lv.load(); lv.hidden = true;
    state.video = null;
    $('#vid-detail').innerHTML = '';
    $('#player-empty').hidden = false;
    if (cy) { cy.destroy(); cy = null; $('#hud')?.remove(); }
    if (map) { map.remove(); map = null; mapLayer = null; tileLayer = null; mapFitted = false; }
  }

  // ───────────── video browser (the Videos view when no video is open) ─────────────
  const NEWS = /\b(CBS|CNN|NBC|ABC|BBC|CTV|FOX ?\d*|NewsNation|7NEWS|Sky News|i24NEWS|CBC|KLAS|8 News|PBS|60 Minutes)\b/i;
  // Tabs: Congress hearings (hearing recordings, plus events with lawmakers in CONGRESS_EVENTS); the 2013 Citizen
  // Hearing; conferences (any other event recording: press conferences, forums); news (news-channel segments under
  // 20 minutes; longer ones are interviews); archive (footage from before 2005, and official sensor video)
  const CONGRESS_EVENTS = new Set(['ev-capitol-uap-press-conference-2026']);
  function vidKind(v) {
    const rels = adj.get(v.id).filter(x => x.dir === 'out');
    if (rels.some(x => x.label === 'trailer of')) return 'trailer';
    const rec = rels.filter(x => ['recording of', 'records'].includes(x.label) && ['hearing', 'event'].includes(byId.get(x.other)?.type)).map(x => x.other);
    if (v.series === 'h-2013-citizen-hearing' || rec.includes('h-2013-citizen-hearing')) return 'citizen';
    if (rec.some(id => byId.get(id).type === 'hearing' || CONGRESS_EVENTS.has(id)) || /hearing|testimony before|subcommittee|committee/i.test(v.name)) return 'congress';
    if (rec.length) return 'conference';
    if ((v.y0 && v.y0 < 2005) || /^navair-/.test(v.media || '')) return 'archive';
    if (NEWS.test(v.channel || '') || NEWS.test(v.name)) return (v.duration || 0) < 1200 ? 'news' : 'interview';
    return 'interview';
  }
  const VKINDS = [['all', 'All'], ['congress', 'Congress hearings'], ['citizen', 'Citizen Hearing'], ['conference', 'Conferences'], ['interview', 'Interviews & podcasts'], ['news', 'News'], ['archive', 'Archive & official footage']]; // trailers show under All and on their film's card
  // side-panel filters (VKINDS without All), decades, speakers, "has moments"; the search box (#tq) matches titles,
  // people and cases and, from two letters, the transcripts
  const VKIND_KEYS = VKINDS.map(([k]) => k).filter(k => k !== 'all');
  const decadeOf = v => (v.y0 ? `${Math.floor(v.y0 / 10) * 10}s` : 'undated');
  let vbKinds = new Set(VKIND_KEYS), vbDecades = null, vbPeople = new Set(), vbMoments = false, vsShowFilters = false;
  const vbBase = () => videos.filter(v => !(state.credibleOnly && v.cred === 'outside'));
  const vbDecadeKeys = () => { const ks = [...new Set(vbBase().map(decadeOf))].sort((a, b) => (a === 'undated') - (b === 'undated') || b.localeCompare(a)); vbDecades ??= new Set(ks); return ks; };
  const vbQuery = () => ($('#tq')?.value || '').trim().toLowerCase();
  // a video passes every filter except the one named in `skip` (for faceted counts); trailers count as passing
  // the category filter only when every category is on (they show under All, as before)
  const vbPass = (v, skip) => (skip === 'kind' || (vbKinds.size === VKIND_KEYS.length ? true : vbKinds.has(vidKind(v))))
    && (skip === 'dec' || vbDecades.has(decadeOf(v)))
    && (skip === 'ppl' || !vbPeople.size || vidPeople(v).some(id => vbPeople.has(id)))
    && (!vbMoments || v.moments?.length)
    && (skip === 'q' || !vbQuery() || vbQuery().split(/\s+/).every(w => vbText(v).includes(w)));
  const vbSort = (a, b) => (a.series && a.series === b.series && a.part != null && b.part != null ? b.part - a.part : 0) || String(b.date || '').localeCompare(String(a.date || ''));
  const vbFilterCount = () => (vbKinds.size < VKIND_KEYS.length) + (vbDecades && vbDecades.size < vbDecadeKeys().length) + (vbPeople.size > 0) + vbMoments;
  const vbFiltered = () => { vbDecadeKeys(); return vbBase().filter(v => vbPass(v)).sort(vbSort); };
  const vidPeople = v => [...new Set([...(v.moments || []).map(m => m.speaker), ...adj.get(v.id).filter(x => x.dir === 'out' && x.label === 'features').map(x => x.other)].filter(id => byId.get(id)?.type === 'person'))];
  // the filter box also matches the people tied to a video (speakers, features, any link), not just its own text
  const vbTextCache = new Map();
  const vbText = v => {
    if (!vbTextCache.has(v.id)) {
      const ids = new Set([...vidPeople(v), ...adj.get(v.id).map(x => x.other)]);
      vbTextCache.set(v.id, [searchText(v), ...[...ids].map(id => byId.get(id)).filter(e => e?.type === 'person').flatMap(e => [e.name, ...e.aka])].join(' \n ').toLowerCase());
    }
    return vbTextCache.get(v.id);
  };
  const vidCard = v => {
    const ppl = vidPeople(v);
    return `<div class="vb-card" data-open-video="${v.id}"><div class="vb-thumb"><img src="${vthumb(v)}" alt="" loading="lazy">${v.duration ? `<span class="wdur">${fmtDur(v.duration)}</span>` : ''}${v.moments?.length ? `<span class="vb-mom">${v.moments.length} moments</span>` : ''}</div>
      <div class="vb-t">${esc(v.name)}</div><div class="vb-s">${esc([v.channel, fmtD(v.date)].filter(Boolean).join(' · '))}</div>
      ${ppl.length ? `<div class="vb-p">${ppl.slice(0, 3).map(id => esc(byId.get(id).name)).join(' · ')}${ppl.length > 3 ? ` +${ppl.length - 3}` : ''}</div>` : ''}</div>`;
  };
  function showBrowse() {
    $('#vid-browse').hidden = false; $('#player-col').hidden = true;
    try { yt?.pauseVideo?.(); } catch { /* not ready */ }
    $('#local-video').pause?.();
    renderBrowse();
    renderVidSide();
  }
  function renderBrowse() {
    const base = vbBase(), q = vbQuery();
    vbDecadeKeys();
    let list = base.filter(v => vbPass(v)).sort(vbSort);
    // “Start here”: hand-picked (top_pick: 1, 2… in the video's frontmatter), plus the recording of the latest
    // congressional hearing, so a new hearing shows up without editing the list; at most eight (two rows).
    // Shown only when no filter or search is on.
    const picks = base.filter(v => v.topPick != null).sort((a, b) => a.topPick - b.topPick);
    const latestHearing = ents.filter(e => e.type === 'hearing' && !/citizen/i.test(e.id) && e.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map(h => base.find(v => adj.get(v.id).some(x => x.dir === 'out' && x.label === 'recording of' && x.other === h.id))).find(Boolean);
    if (latestHearing && !picks.includes(latestHearing)) picks.splice(Math.min(2, picks.length), 0, latestHearing);
    const featured = picks.slice(0, 8);
    const filtering = vbFilterCount() > 0 || !!q;
    const showFeatured = !filtering && featured.length > 0;
    if (showFeatured) list = list.filter(v => !featured.includes(v)); // listed once, at the top
    const hits = q.length >= 2 ? transcriptHitsHTML(false) : '';
    $('#vid-browse').innerHTML = `<div class="vb-head"><h2>Videos</h2><p class="muted">Hearings, interviews and archival footage, with synced transcripts and curated moments. ${base.length} videos · ${KB.stats.transcriptHours} hours transcribed.</p>
      <button class="btn small only-mobile vb-open-side" data-open-side>Search &amp; filters${filtering ? ` · ${vbFilterCount() + !!q} on` : ''}</button>
      ${filtering ? `<p class="lt-filtering">${q ? `Matching “${esc($('#tq').value.trim())}”` : 'Filtered'}${vbFilterCount() ? ` · ${vbFilterCount()} filter${vbFilterCount() > 1 ? 's' : ''} on` : ''} <button class="link" data-vb-clear>show everything</button></p>` : ''}</div>
      ${showFeatured ? `<h3 class="vb-sec">Start here <span class="muted small">top picks and the latest hearing</span></h3><div class="vb-grid">${featured.map(vidCard).join('')}</div>` : ''}
      <h3 class="vb-sec">${showFeatured ? 'More videos' : `${list.length} video${list.length === 1 ? '' : 's'}${q ? ' by title, person or case' : ''}`}</h3>
      <div class="vb-grid">${list.map(vidCard).join('') || '<p class="muted">No videos match.</p>'}</div>
      ${hits ? `<section class="vb-hits">${hits}</section>` : ''}`;
  }
  // the transcript matches for the current search, among the videos the side-panel filters let through
  function transcriptHitsHTML(compact) {
    const q = vbQuery();
    if (!lastSearch || lastSearch.q.toLowerCase() !== q) return `<h3 class="vb-sec">In transcripts</h3><p class="muted small">Searching ${KB.stats.transcriptHours} hours of transcripts…</p>`;
    const ok = new Set(vbBase().filter(v => vbPass(v, 'q')).map(v => v.id));
    const rows = lastSearch.vOut.filter(([v]) => ok.has(v.id));
    const total = rows.reduce((n, r) => n + r[1].length, 0);
    const hl = s => esc(s).replace(new RegExp(`(${lastSearch.needle.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), '<mark>$1</mark>');
    const perVideo = compact ? 3 : 6, videosShown = compact ? 8 : 20;
    return `<h3 class="vb-sec">In transcripts <span class="muted small">${total ? `${total} passage${total > 1 ? 's' : ''} in ${rows.length} video${rows.length > 1 ? 's' : ''}` : `no matches for “${esc(q)}”`}</span></h3>`
      + rows.slice(0, videosShown).map(([v, hs]) => `<div class="hit-video" data-open-video="${v.id}" style="cursor:pointer">${esc(v.name)}<span>${hs.length}</span></div>`
        + hs.slice(0, perVideo).map(([t, sn]) => `<div class="hit" data-play="${v.id}@${t}"><button class="ts">${fmtT(t)}</button><span>${hl(sn)}</span></div>`).join('')
        + (hs.length > perVideo ? `<div class="small muted hit-more">+${hs.length - perVideo} more in this video: open it and search its transcript</div>` : '')).join('')
      + (rows.length > videosShown ? `<p class="small muted">+${rows.length - videosShown} more videos</p>` : '');
  }
  // the side panel: filters while browsing; while a video plays, the videos the filters and search let through
  function renderVidSide() {
    if (state.view !== 'videos') return;
    const base = vbBase(), decs = vbDecadeKeys(), q = vbQuery();
    const playing = !!state.video && !vsShowFilters;
    $('#vs-filters').hidden = playing; $('#vs-playlist').hidden = !playing;
    const count = (skip, key) => { const m = new Map(); for (const v of base) if (vbPass(v, skip)) { const k = key(v); m.set(k, (m.get(k) || 0) + 1); } return m; };
    const kN = count('kind', vidKind), dN = count('dec', decadeOf);
    const kColor = { congress: TYPES.hearing.color, citizen: TYPES.event.color, conference: TYPES.organization.color, interview: TYPES.video.color, news: TYPES.source.color, archive: TYPES.document.color };
    $('#vs-kinds').innerHTML = facetRows(VKINDS.filter(([k]) => k !== 'all').map(([k, l]) => ({ k, label: l, n: kN.get(k) || 0, color: kColor[k] })), vbKinds);
    $('#vs-decades').innerHTML = facetRows(decs.map(k => ({ k, label: k === 'undated' ? 'Undated' : k, n: dN.get(k) || 0, color: 'var(--accent)' })), vbDecades);
    const pN = new Map();
    for (const v of base) if (vbPass(v, 'ppl')) for (const id of vidPeople(v)) pN.set(id, (pN.get(id) || 0) + 1);
    const top = [...pN].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || byId.get(a[0]).name.localeCompare(byId.get(b[0]).name)).slice(0, 16).map(x => x[0]);
    for (const id of vbPeople) if (!top.includes(id)) top.push(id);
    $('#vs-people').innerHTML = top.map(id => `<button class="chip ${vbPeople.has(id) ? 'on' : ''}" data-vp="${esc(id)}">${esc(byId.get(id).name)}<span class="n">${pN.get(id) || 0}</span></button>`).join('') || '<p class="muted small">No speakers for these filters.</p>';
    $('#vs-moments').checked = vbMoments;
    $('#vs-kinds-clear').hidden = vbKinds.size === VKIND_KEYS.length;
    $('#vs-dec-clear').hidden = vbDecades.size === decs.length;
    $('#vs-people-clear').hidden = !vbPeople.size;
    const list = base.filter(v => vbPass(v)).sort(vbSort);
    $('#tq-info').textContent = q ? `${list.length} video${list.length === 1 ? '' : 's'} by title, person or case${q.length >= 2 && lastSearch?.q.toLowerCase() === q ? ` · ${lastSearch.vTotal} transcript passages` : ''}` : `${base.length} videos · ${KB.stats.transcriptHours} hours transcribed`;
    if (playing) {
      const n = vbFilterCount() + !!q;
      $('#vs-back').textContent = `‹ Filters${n ? ` (${n} on)` : ''}`;
      $('#vs-pl-info').textContent = `${list.length} video${list.length === 1 ? '' : 's'}`;
      $('#vid-list').innerHTML = (list.map(v => `<div class="vl-item ${state.video === v.id ? 'on' : ''}" data-open-video="${v.id}">
        <img src="${vthumb(v)}" alt="" loading="lazy"><div><div class="t">${esc(v.name)}</div><div class="s">${esc([v.channel, fmtD(v.date), fmtDur(v.duration)].filter(Boolean).join(' · '))}</div></div></div>`).join('') || '<p class="muted small" style="padding:8px">No videos match.</p>')
        + (q.length >= 2 ? `<div class="vs-hits">${transcriptHitsHTML(true)}</div>` : '');
    }
    $('#vs-to-list').hidden = !(state.video && vsShowFilters);
  }
  const vbChanged = () => { renderVidSide(); if (!state.video) renderBrowse(); clearTimeout(vbChanged.t); vbChanged.t = setTimeout(() => track('filter_change', { view: 'videos', kinds: [...vbKinds].sort().join(','), decades: vbDecades.size, people: [...vbPeople].join(','), moments: vbMoments }), 1500); };
  bindFacet($('#vs-kinds'), () => ({ sel: vbKinds, all: VKIND_KEYS }), sel => { vbKinds = sel; vbChanged(); });
  bindFacet($('#vs-decades'), () => ({ sel: vbDecades, all: vbDecadeKeys() }), sel => { vbDecades = sel; vbChanged(); });
  $('#vs-people').addEventListener('click', e => { const c = e.target.closest('[data-vp]'); if (!c) return; const id = c.dataset.vp; vbPeople.has(id) ? vbPeople.delete(id) : vbPeople.add(id); vbChanged(); });
  $('#vs-moments').addEventListener('change', e => { vbMoments = e.target.checked; vbChanged(); });
  $('#vs-kinds-clear').addEventListener('click', () => { vbKinds = new Set(VKIND_KEYS); vbChanged(); });
  $('#vs-dec-clear').addEventListener('click', () => { vbDecades = new Set(vbDecadeKeys()); vbChanged(); });
  $('#vs-people-clear').addEventListener('click', () => { vbPeople.clear(); vbChanged(); });
  $('#vs-back').addEventListener('click', () => { vsShowFilters = true; renderVidSide(); });
  $('#vs-to-list-btn').addEventListener('click', () => { vsShowFilters = false; renderVidSide(); });
  const vbClearAll = () => { vbKinds = new Set(VKIND_KEYS); vbDecades = new Set(vbDecadeKeys()); vbPeople.clear(); vbMoments = false; $('#tq').value = ''; lastSearch = null; vbChanged(); };
  $('#vid-browse').addEventListener('click', e => {
    if (e.target.closest('[data-vb-clear]')) { vbClearAll(); return; }
    if (e.target.closest('[data-open-side]')) { $('#side').classList.add('open'); return; }
    const c = e.target.closest('[data-open-video]'); if (c) openVideo(c.dataset.openVideo, 0, false);
  });
  function searchVideosFor(q) {
    $('#tq').value = q;
    go('videos');
    if (state.video) closeVideo(); else { renderVidSide(); renderBrowse(); }
    runTranscriptSearch();
  }
  function closeVideo() {
    state.video = null;
    $$('.vl-item').forEach(el => el.classList.remove('on'));
    showBrowse();
    setHash();
    $('#view-videos').scrollTop = 0;
  }

  // ───────────── navigation ─────────────
  // Real URLs: each view has a path (/explore) and each file its own page (/person/david-fravor), generated by
  // scripts/pages.mjs. The view a file was opened from lives in history.state, so Back/Forward restore it.
  const VIEW_PATH = { home: '/', latest: '/latest', graph: '/explore', timeline: '/timeline', map: '/world', videos: '/videos', shelf: '/documentaries', index: '/a-z', claims: '/claims' };
  const PATH_VIEW = Object.fromEntries(Object.entries(VIEW_PATH).map(([v, p]) => [p, v]));
  const SHELF_PATH = { '/documentaries': 'film', '/books': 'book' }; // one page component, two lists
  const byPath = new Map(ents.filter(e => e.path).map(e => [e.path, e.id]));
  let routing = false; // true while applying a URL, so the steps don't push history entries of their own
  function urlFor() {
    if (state.view === 'videos' && state.video) return hrefOf(state.video); // the video's page
    if (state.sel && state.view !== 'home') return hrefOf(state.sel);
    if (state.view === 'shelf') return shelfTab === 'book' ? '/books' : '/documentaries';
    return VIEW_PATH[state.view] || '/';
  }
  // A new deploy while this tab is open: noticed when the tab comes back into view (and every 10 minutes), by comparing
  // the build this page runs with /version.json. A small notice offers to reload; moving to another section (Latest,
  // Explore…) reloads by itself, since that address restores the whole page.
  let newBuild = false, buildChecked = 0;
  function checkBuild() {
    if (!window.BUILD || newBuild || Date.now() - buildChecked < 60000) return;
    buildChecked = Date.now();
    fetch('/version.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(v => {
      if (!v?.build || v.build === window.BUILD) return;
      newBuild = true;
      let el = $('#update');
      if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="update" id="update" role="status">The site has been updated. <button class="btn small primary" data-reload>Reload</button><button class="icon-btn" data-update-close aria-label="Dismiss">✕</button></div>'); el = $('#update'); }
      el.addEventListener('click', e => { if (e.target.closest('[data-reload]')) location.reload(); if (e.target.closest('[data-update-close]')) el.remove(); });
    }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkBuild(); });
  setInterval(() => { if (document.visibilityState === 'visible') checkBuild(); }, 10 * 60 * 1000);
  // On the Videos page the address also carries the moment (?t=) and the file open beside the player (&file=), so a
  // copied link reopens both. Phones leave the file out: there the card would cover the player.
  function searchFor() {
    if (state.view !== 'videos' || !state.video) return '';
    const q = [];
    if (state.videoT) q.push(`t=${state.videoT}`);
    if (state.sel && byId.has(state.sel) && !matchMedia('(max-width: 860px)').matches) q.push(`file=${encodeURI(hrefOf(state.sel).slice(1))}`);
    return q.length ? `?${q.join('&')}` : '';
  }
  function setHash({ replace = false } = {}) {
    if (routing) return;
    const target = urlFor(), st = { view: state.view, sel: state.sel, video: state.video };
    if (newBuild && !replace && !state.sel && !state.video && target !== location.pathname) { location.assign(target); return; }
    const search = state.view === 'videos' && state.video ? searchFor() : null; // elsewhere keep what the address had (e.g. ?explore)
    if (location.pathname === target && !location.hash) { history.replaceState(st, '', target + (search ?? location.search)); return; }
    history[replace ? 'replaceState' : 'pushState'](st, '', target + (search ?? ''));
    trackView();
  }
  // Google Analytics: one page_view per in-app view, with the hash route turned into a readable path
  // (the page's own path, e.g. /person/david-fravor). Replaced history entries don't count twice.
  let lastTracked = null;
  function trackView(force) {
    if (!window.GA_ON || typeof gtag !== 'function') return; // only after consent
    const route = location.pathname + location.search;
    if (route === lastTracked && !force) return;
    lastTracked = route;
    const [path, qs] = route.split('?');
    const title = [state.sel && byId.get(state.sel)?.name, state.view === 'videos' && state.video && byId.get(state.video)?.name, state.view !== 'home' && state.view, 'Where Are They'].filter(Boolean).join(' · ');
    gtag('event', 'page_view', { page_location: location.origin + path + (qs ? '?' + qs : ''), page_path: path + (qs ? '?' + qs : ''), page_title: title });
  }
  // Google Analytics events: sent only after consent, like page views. clickCtx records where the current click
  // happened (search box, Latest, home, panel…) so select() can report how a file was opened.
  function track(name, params = {}) { if (window.GA_ON && typeof gtag === 'function') gtag('event', name, params); }
  var clickCtx = null; // var: select() may run during start-up, before this line
  document.addEventListener('click', e => {
    const t = e.target;
    clickCtx = t.closest('#q-results, #hq-dd') ? 'search' : t.closest('#view-latest, [data-home-latest]') ? 'latest' : t.closest('#view-home') ? 'home'
      : t.closest('#panel') ? 'panel' : t.closest('#view-claims') ? 'claims' : t.closest('#view-index') ? 'a-z' : t.closest('#view-shelf') ? 'shelf' : null;
    setTimeout(() => { clickCtx = null; }, 0);
    const a = t.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href') || '';
    let url; try { url = new URL(a.href); } catch { return; }
    // our X and GitHub links: which network, and where on the page (header, more-menu, home-footer, side-footer)
    if (a.dataset.social) { track('social_click', { network: a.dataset.social, placement: a.dataset.placement || clickCtx || state.view }); return; }
    if (/\.pdf(#|$)/i.test(href)) track('file_open', { file_name: url.pathname.split('/').pop(), page: (href.match(/#page=(\d+)/) || [])[1], context: clickCtx || state.view });
    else if (/^https?:$/.test(url.protocol) && url.host !== location.host) track('link_out', { link_domain: url.host.replace(/^www\./, ''), link_url: a.href, context: clickCtx || state.view });
  }, true);
  // searches: reported once the visitor stops typing (≥ 3 characters), one event per distinct term and box
  var searchSent = {}, searchTimers = {};
  function trackSearch(term, type) {
    clearTimeout(searchTimers[type]);
    searchTimers[type] = setTimeout(() => {
      const q = String(term || '').trim().toLowerCase();
      if (q.length < 3 || searchSent[type] === q) return;
      searchSent[type] = q; track('search', { search_term: q, search_type: type });
    }, 1500);
  }
  document.addEventListener('input', e => {
    const id = e.target.id, type = { q: 'site', hq: 'site', cq: 'claims', iq: 'a-z', tfind: 'in-transcript' }[id];
    if (type) trackSearch(e.target.value, type);
  });
  // video engagement: start, 25/50/75% progress and completion, once per video per visit
  var vidSeen = new Map();
  function videoTick(id, cur, dur, ended) {
    if (!id) return;
    const v = vidSeen.get(id) || vidSeen.set(id, new Set()).get(id);
    const send = (k, extra = {}) => { if (!v.has(k)) { v.add(k); track(k === 'start' ? 'video_start' : k === 'complete' ? 'video_complete' : 'video_progress', { video_id: id, video_title: byId.get(id)?.name, ...extra }); } };
    send('start');
    if (dur > 0) for (const pct of [25, 50, 75]) if (cur / dur * 100 >= pct) send(`p${pct}`, { video_percent: pct });
    if (ended) send('complete');
  }
  setInterval(() => {
    if (!state.video || !window.GA_ON) return;
    const local = !$('#local-video').hidden;
    const playing = local ? !$('#local-video').paused : yt?.getPlayerState?.() === 1;
    if (!playing) return;
    const cur = local ? $('#local-video').currentTime : yt.getCurrentTime?.() || 0, dur = local ? $('#local-video').duration : yt.getDuration?.() || 0;
    videoTick(state.video, cur, dur, false);
  }, 5000);
  $('#local-video')?.addEventListener('ended', () => videoTick(state.video, 1, 1, true));
  function select(id, { from, noPanel = false } = {}) { // noPanel: select without opening the card (phones, while exploring)
    state.sel = id;
    if (id && !routing) track('select_content', { content_type: byId.get(id)?.type, item_id: id, method: clickCtx || from || 'link' });
    // exploring: a file opened from search or a link that isn't on screen is pinned there (no connections yet)
    if (state.trail && id && state.view === 'graph' && !offGraph(byId.get(id)?.type) && cy?.getElementById(id).hasClass('hidden') && visible.has(id)) {
      state.trail.pinned.add(id); state.hiddenIds.delete(id);
      trailChanged(id);
    }
    const panelShown = !$('#panel').hidden;
    if (id && state.view !== 'home' && !noPanel) {
      if (panelShown) openPanel(id);
      else panelTransition('open', () => { if (state.sel === id) openPanel(id); });
    } else if (panelShown) panelTransition('close', () => { if (!state.sel || state.view === 'home') closePanel(); });
    else closePanel();
    if (state.trail) renderTrailBar(); // highlight the open file's chip
    if (state.view === 'graph') highlight(id);
    if (state.view === 'map') markMapSel();
    if (state.view === 'timeline') $$('.tl-item').forEach(el => el.classList.toggle('sel', el.dataset.goto === id));
    setHash();
  }
  function go(view, { keepSel = true } = {}) {
    // leaving Videos pauses the player and remembers where it stopped: coming back shows the same video at that point,
    // ready to resume (its address carries ?t=); "All videos" is the way back to the grid
    if (state.view === 'videos' && view !== 'videos' && state.video) {
      state.videoT = Math.floor(currentTime()) || state.videoT;
      try { yt?.pauseVideo?.(); } catch { /* not ready */ }
      $('#local-video').pause?.();
    }
    if (view === 'home' && state.view !== 'home') teardownApp();
    if (state.reading && view !== state.view) { state.reading = false; $('#app').classList.remove('reading'); } // e.g. ▶ from reading view
    state.view = view;
    $('#side').classList.remove('open'); // close the mobile filter drawer on navigation
    store.set('view', view);
    renderFilters(); // the Types list depends on the view (the timeline offers only the types it shows)
    for (const v of VIEWS) $('#view-' + v).hidden = v !== view;
    const narrow = matchMedia('(max-width: 860px)').matches; // the bottom tab bar folds Timeline into More
    $$('#views [data-group], #views [data-view]').forEach(a => a.classList.toggle('active', [...(a.dataset.group || a.dataset.view).split(' '), ...(narrow && a.dataset.groupNarrow ? a.dataset.groupNarrow.split(' ') : [])].includes(view)));
    $('#app').classList.toggle('is-home', view === 'home');
    document.body.classList.toggle('is-home', view === 'home'); // the header sits outside #app
    if (view === 'home') { $('#panel').hidden = true; $('#app').classList.remove('has-panel'); }
    else if (state.sel) openPanel(state.sel);
    $('#filters').hidden = view === 'videos' || view === 'latest'; // Latest and Videos have their own side panels
    $('#lt-side').hidden = view !== 'latest';
    $('#vid-side').hidden = view !== 'videos';
    $$('.only-graph').forEach(el => el.hidden = view !== 'graph');
    if (view === 'graph' && !state.trail && !state.full) state.trail = coreTrail();
    if (!keepSel) select(null);
    setHash(); // push the new view's history entry first, so views that adjust it (e.g. default video) replace their own entry
    refreshView(false);
    requestAnimationFrame(heroSearchInView); // the header search hides behind the landing page's own
  }
  function refreshView(filtersChangedFlag) {
    if (state.view === 'graph') {
      if (!cy) initGraph();
      else {
        cy.resize();
        if (filtersChangedFlag) { applyGraphFilter(); clearTimeout(layoutTimer); layoutTimer = setTimeout(() => layoutGraph(true), 350); }
      }
      highlight(state.sel);
    } else if (state.view === 'timeline') renderTimeline();
    else if (state.view === 'map') renderMap();
    else if (state.view === 'index') renderIndex();
    else if (state.view === 'shelf') renderShelf();
    else if (state.view === 'claims') renderClaims();
    else if (state.view === 'latest') renderLatest();
    else if (state.view === 'home') renderHome();
    else if (state.view === 'videos') {
      renderVidSide();
      if (!state.video) showBrowse();
    }
    if (filtersChangedFlag && cy && state.view !== 'graph') applyGraphFilter();
  }

  // global click delegation for entity links / play buttons
  document.addEventListener('click', e => {
    const play = e.target.closest('[data-play]');
    if (play) {
      e.preventDefault();
      const [vid, t] = play.dataset.play.split('@');
      track(+t > 0 ? 'moment_click' : 'video_play_click', { video_id: vid, video_title: byId.get(vid)?.name, moment_seconds: +t || 0, context: clickCtx || state.view });
      if (state.reading) setReading(false); // shrink the reading view back to the side so the player is visible
      openVideo(vid, +t || 0, true);
      return;
    }
    const ex = e.target.closest('[data-explore]');
    if (ex) {
      e.preventDefault();
      // from the reading view: the panel goes back to the side so the trail is visible beside it
      if (state.reading) panelTransition('collapse', () => { state.reading = false; if (state.sel) openPanel(state.sel); afterResize(); startTrail(ex.dataset.explore); });
      else startTrail(ex.dataset.explore);
      return;
    }
    const g = e.target.closest('[data-goto]');
    if (g && g.matches('a[href^="/"]') && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // new tab / window
    if (g) {
      e.preventDefault();
      const fromSearch = !!g.closest('#q-results'), ent = byId.get(g.dataset.goto);
      $('#q-results').hidden = true;
      // a search result picked from any page opens Explore and starts a trail from it: the first step, ready to
      // follow (filters are cleared if they would hide it)
      if (fromSearch && ent && state.view === 'map' && showOnMap(ent.id)) return;
      if (fromSearch && ent && !offGraph(ent.type)) {
        if (!visible.has(ent.id)) clearFilters(ent);
        else if (!state.types.has(ent.type)) { state.types.add(ent.type); filtersChanged(); }
        startTrail(ent.id);
        if (window.innerWidth > 860 && state.sel === ent.id) openPanel(ent.id); // desktop: the card opens alongside
        if (window.innerWidth <= 860) $('#side').classList.remove('open');
        return;
      }
      if (state.view === 'home' || (fromSearch && state.view !== 'graph')) go('graph'); // records: Explore with the card open
      // following a link from the reading view stays in the reading view: the new file opens full width
      if (state.reading && g.closest('#panel') && ent) { select(ent.id, { from: 'link' }); return; }
      select(g.dataset.goto, { from: 'link' });
      if (window.innerWidth <= 860) $('#side').classList.remove('open');
    }
  });
  // phones: the file card covers the screen, so any tap on the tab bar (or a More item) closes it first
  const narrowNav = () => matchMedia('(max-width: 860px)').matches;
  $('#views').addEventListener('click', e => {
    const a = e.target.closest('a[data-view]');
    if (!a) return;
    e.preventDefault();
    go(a.dataset.view, { keepSel: !(narrowNav() && state.sel) });
  });
  // "More": dropdown on desktop, bottom sheet on phones. Holds Index, Claims, About and site links.
  const moreMenu = $('#more-menu'), moreBtn = $('#btn-more');
  const setMore = open => {
    if (open && innerWidth > 860) moreMenu.style.right = Math.max(8, innerWidth - moreBtn.getBoundingClientRect().right) + 'px'; else moreMenu.style.right = '';
    moreMenu.hidden = !open; moreBtn.setAttribute('aria-expanded', String(open)); moreBtn.classList.toggle('open', open); };
  moreBtn.addEventListener('click', e => { e.stopPropagation(); if (moreMenu.hidden && narrowNav() && state.sel) select(null); if (moreMenu.hidden) setOpen(false); setMore(moreMenu.hidden); });
  moreMenu.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.dataset.view) { e.preventDefault(); if (a.dataset.shelf) shelfTab = a.dataset.shelf; go(a.dataset.view, { keepSel: !(narrowNav() && state.sel) }); }
    setMore(false);
  });
  document.addEventListener('click', e => { if (!moreMenu.hidden && !e.composedPath().includes(moreMenu)) setMore(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !moreMenu.hidden) setMore(false); });
  if (!window.GA_ID) moreMenu.querySelector('.mm-consent')?.remove();
  $('#btn-side').addEventListener('click', e => { e.stopPropagation(); $('#side').classList.toggle('open'); });
  // tapping outside the open drawer closes it. Use the event path recorded at dispatch: filter clicks re-render the
  // list, so by now e.target may be detached and closest('#side') would wrongly say "outside".
  document.addEventListener('click', e => {
    const side = $('#side');
    if (!side.classList.contains('open')) return;
    const path = e.composedPath();
    if (!path.includes(side) && !path.includes($('#btn-side')) && !path.some(n => n.dataset?.openSide !== undefined)) side.classList.remove('open'); // in-page "Filters" buttons open it too
  });

  // theme
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    store.set('theme', t);
    if (cy) cy.style(graphStyle());
    setTiles();
    if (state.view === 'map') renderMap();
  }
  // theme: a choice in Settings (dark unless light was chosen)
  const syncThemeSeg = () => $$('#set-theme [data-theme-set]').forEach(b => { const on = (b.dataset.themeSet === 'light') !== isDark(); b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
  $('#set-theme').addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (!b) return; applyTheme(b.dataset.themeSet); syncThemeSeg(); });
  $('#side-close').addEventListener('click', () => $('#side').classList.remove('open'));
  // settings: a small panel under the cog (choices are kept in localStorage by filtersChanged)
  const setPop = $('#settings-pop'), setBtn = $('#btn-settings');
  const setOpen = open => {
    if (open && innerWidth > 860) setPop.style.right = Math.max(8, innerWidth - setBtn.getBoundingClientRect().right) + 'px'; else setPop.style.right = '';
    setPop.hidden = !open; setBtn.setAttribute('aria-expanded', String(open));
    if (open) { setMore(false); setPop.querySelector('input')?.focus(); }
  };
  setBtn.addEventListener('click', e => { e.stopPropagation(); setOpen(setPop.hidden); });
  document.addEventListener('click', e => { if (!setPop.hidden && !e.composedPath().includes(setPop)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !setPop.hidden) { setOpen(false); setBtn.focus(); } });

  // live reload from the dev server
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try { const es = new EventSource('/__events'); es.onmessage = ev => { if (ev.data === 'reload') location.reload(); }; es.onerror = () => es.close(); } catch { /* no dev server */ }
  }

  // ───────────── boot ─────────────
  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  syncThemeSeg();
  computeVisible();
  renderFilters();
  const VIEWS = ['home', 'latest', 'graph', 'timeline', 'map', 'videos', 'shelf', 'index', 'claims'];
  function routeFromUrl() {
    const p = decodeURIComponent(location.pathname).replace(/\.html$/, '').replace(/(.)\/+$/, '$1');
    const t = +new URLSearchParams(location.search).get('t') || 0;
    if (SHELF_PATH[p]) return { view: 'shelf', sel: null, video: null, shelf: SHELF_PATH[p] };
    if (PATH_VIEW[p]) return { view: PATH_VIEW[p], sel: null, video: null };
    const id = byPath.get(p);
    if (!id) return { view: 'home', sel: null, video: null };
    const type = byId.get(id).type;
    // a shared moment: /video/<title>?t=SECONDS&file=person/<name> plays it with that file open beside (desktop only)
    const file = byPath.get('/' + (new URLSearchParams(location.search).get('file') || '').replace(/^\/+/, ''));
    return type === 'video' ? { view: 'videos', sel: file && innerWidth > 860 ? file : null, video: id, t } : { view: type === 'claim' ? 'claims' : 'graph', sel: id, video: null };
  }
  function applyRoute(initial) {
    const fromUrl = routeFromUrl();
    const r = history.state?.view && !location.hash ? { ...history.state, t: fromUrl.t } : fromUrl;
    routing = true;
    const shelfChanged = fromUrl.shelf && fromUrl.shelf !== shelfTab;
    if (fromUrl.shelf) shelfTab = fromUrl.shelf; // the address picks Documentaries or Books
    try {
      if (r.view !== state.view || initial || shelfChanged) go(r.view);
      // a file's own address (/person/eric-davis) opens it full width on desktop, like on phones;
      // ?panel=side opens it in the side panel beside the network instead
      // ?explore starts a trail from it, as "Explore from here" would: beside the panel on desktop, the graph alone on phones
      const qs = new URLSearchParams(location.search);
      const explore = initial && r.sel && byId.has(r.sel) && !offGraph(byId.get(r.sel).type) && qs.has('explore') && qs.get('explore') !== '0';
      if (initial && r.sel && byId.has(r.sel) && innerWidth > 860) state.reading = !explore && qs.get('panel') !== 'side' && r.view !== 'videos'; // beside a video: the side panel
      if ((r.sel || null) !== state.sel) { select(r.sel && byId.has(r.sel) ? r.sel : null); if (initial && state.sel) openPanel(state.sel); }
      if (explore) { track('explore_start', { item_id: r.sel, method: 'url' }); startTrail(r.sel); }
      else if (initial && r.view === 'graph' && !r.sel && storyById(qs.get('story'))) { track('explore_start', { item_id: qs.get('story'), method: 'url' }); startStory(qs.get('story')); }
      if (r.view === 'videos' && r.video && byId.has(r.video) && (r.video !== state.video || r.t || initial)) openVideo(r.video, r.t || 0, false);
      else if (r.view === 'videos' && !r.video && state.video) closeVideo();
    } finally { routing = false; }
    // store the state on this entry
    history.replaceState({ view: state.view, sel: state.sel, video: state.video }, '', urlFor() + (state.view === 'videos' && state.video ? searchFor() : location.search));
  }
  window.addEventListener('popstate', () => { applyRoute(false); trackView(); }); // Back/Forward count as page views too
  document.getElementById('ssr')?.remove(); // the server-rendered article is for crawlers and no-JS readers
  // the logo returns home without a page reload
  $('.brand').addEventListener('click', e => { e.preventDefault(); go('home'); });
  applyRoute(true);
  window.trackView = trackView; // the consent banner records the current page once the visitor accepts
  trackView();
})();
