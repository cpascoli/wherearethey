/* Where Are They — knowledge map UI. Data comes from data/kb.js (built by scripts/build.mjs). */
(() => {
  'use strict';
  const KB = window.KB;
  const MENTIONS = window.KB_MENTIONS || {};
  const TOGETHER = window.KB_TOGETHER || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  };
  const STATUS = {
    documented: { label: 'Documented', hint: 'Backed by an official record or primary document' },
    claimed: { label: 'On record', hint: 'Stated publicly by a named person' },
    unverified: { label: 'Unverified', hint: 'Not yet tied to a source — needs one' },
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
  const INVERSE = {
    witness: 'testified at / witnessed', 'held by': 'held', 'chaired by': 'chaired', member: 'member of', 'part of': 'includes',
    'founded by': 'founded', 'led by': 'led', led: 'led by', 'succeeded by': 'preceded by', 'run by': 'runs', 'spun off from': 'spin-off',
    'initiated by': 'initiated', 'funded by': 'funded', contractor: 'contractor for', 'owned by': 'owned', 'type of': 'subtypes',
    'studied by': 'studied', about: 'subject of', 'related to': 'related to', 'produced by': 'produced', 'submitted by': 'submitted',
    'published by': 'published', 'authored by': 'authored', 'submitted to': 'received', 'transcript of': 'transcript',
    'found among papers of': 'papers contained', features: 'appears in', 'recording of': 'recordings', 'worked at': 'staff',
    'co-founded': 'co-founded by', 'investigated by': 'investigated', 'testified to': 'received testimony from',
    'statement about': 'statements by', discusses: 'discussed in', 'speaks in': 'speakers', mentions: 'mentioned in',
    'hosted by': 'hosted', 'sponsored by': 'sponsored', 'moderated by': 'moderated',
  };

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
  for (const v of videos) for (const m of v.moments || []) {
    for (const id of new Set([...m.refs, m.speaker].filter(Boolean))) {
      if (!momentsFor.has(id)) momentsFor.set(id, []);
      momentsFor.get(id).push({ video: v.id, ...m });
    }
  }

  const PREFIX = { record: 'R', person: 'P', incident: 'I', hearing: 'H', program: 'PG', organization: 'O', document: 'D', film: 'F', book: 'B', video: 'V', event: 'E', concept: 'C', place: 'L', source: 'S' };
  const fileNo = e => { let h = 2166136261; for (const c of e.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return `${PREFIX[e.type] || 'X'}-${(h >>> 0).toString(16).toUpperCase().slice(-4).padStart(4, '0')}`; };
  // Library files: served locally by the dev server, or from Cloudflare R2 on the hosted site (FILES_BASE at build time)
  const fileUrl = f => (KB.filesBase ? `${KB.filesBase.replace(/\/$/, '')}/${f}` : `../${f}`);
  const fmtT = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = d => { if (!d) return ''; const [y, m, day] = String(d).split('-'); return [day && +day, m && MONTHS[+m - 1], y].filter(Boolean).join(' '); };
  const fmtRange = e => (e.end && e.end !== e.date ? `${fmtD(e.date)} – ${fmtD(e.end)}` : fmtD(e.date));
  const fmtDur = s => { if (!s) return ''; const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const thumb = yt => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;
  // thumbnail for any video entry (non-YouTube videos get a neutral placeholder)
  const VIDEO_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#131a1f"/><circle cx="160" cy="90" r="26" fill="none" stroke="#6fcfbf" stroke-width="3"/><path d="M152 76 L174 90 L152 104 Z" fill="#6fcfbf"/></svg>')}`;
  const vthumb = v => (v.youtube ? thumb(v.youtube) : VIDEO_PLACEHOLDER);
  const vsource = v => (v.youtube ? { url: `https://www.youtube.com/watch?v=${v.youtube}`, label: 'YouTube' } : { url: v.url, label: v.url && /x\.com|twitter\.com/.test(v.url) ? 'X' : 'Source' });
  const subtitle = e => {
    if (e.credentials?.length) return e.credentials[0].role;
    if (e.type === 'video') return [e.channel, fmtD(e.date), fmtDur(e.duration)].filter(Boolean).join(' · ');
    const f = e.facts?.[0]?.text;
    return [fmtRange(e), e.place?.name, !e.date && !e.place ? f : ''].filter(Boolean).join(' · ') || f || '';
  };
  const dot = id => { const e = byId.get(id); return `<i class="dot" style="background:${TYPES[e?.type]?.color || '#999'}"></i>`; };
  const chip = (id, extra = '') => {
    const e = byId.get(id);
    if (!e) return `<span class="chip dim">${esc(id)}?</span>`;
    return `<a class="chip ${e.cred === 'outside' ? 'dim' : ''}" data-goto="${esc(id)}" href="#">${dot(id)}${esc(e.name)}${extra}</a>`;
  };

  // ───────────── state ─────────────
  const allTypes = Object.keys(TYPES);
  const TYPES_BEFORE_SHELF = ['person', 'incident', 'hearing', 'program', 'organization', 'document', 'record', 'video', 'event', 'concept', 'place', 'source'];
  const state = {
    view: 'graph', sel: null,
    credibleOnly: store.get('credibleOnly', true),
    // types added since a visitor saved their filters (e.g. film, book) are switched on for them
    types: new Set(store.get('types', null) ? [...store.get('types'), ...allTypes.filter(t => t !== 'record' && !store.get('typesSeen', TYPES_BEFORE_SHELF).includes(t))] : allTypes.filter(t => t !== 'record')),
    tags: new Set(store.get('tags', [])),
    yr: store.get('yr', [MIN_Y, MAX_Y]),
    showMentions: store.get('showMentions', false),
    video: null,
  };
  let visible = new Set();

  function computeVisible() {
    const full = state.yr[0] <= MIN_Y && state.yr[1] >= MAX_Y;
    const base = e => state.types.has(e.type) && !(state.credibleOnly && e.cred === 'outside') &&
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
    // Faceted counts: each list is counted against the *other* list's selection,
    // so picking types narrows the themes and picking themes narrows the types.
    const credOk = e => !(state.credibleOnly && e.cred === 'outside');
    const tagOk = e => !state.tags.size || e.tags.some(t => state.tags.has(t));
    const counts = {};
    for (const e of ents) if (credOk(e) && tagOk(e)) counts[e.type] = (counts[e.type] || 0) + 1;
    $('#f-types').innerHTML = allTypes.filter(t => counts[t]).map(t => `
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
    // years
    const a = $('#f-yr-a'), b = $('#f-yr-b');
    for (const el of [a, b]) { el.min = MIN_Y; el.max = MAX_Y; el.step = 1; }
    a.value = state.yr[0]; b.value = state.yr[1];
    renderHist();
    $('#f-mentions').checked = state.showMentions;
    const s = KB.stats;
    $('#f-stats').innerHTML = `<b>${s.entities}</b> entries · <b>${s.edges}</b> links<br><b>${s.transcripts}</b> transcripts · <b>${s.transcriptHours}</b> hours · <b>${s.mentions.toLocaleString()}</b> mentions<br>Built ${new Date(KB.built).toLocaleString()}` +
      (KB.warnings.length ? `<details><summary>${KB.warnings.length} build warning${KB.warnings.length > 1 ? 's' : ''}</summary><ul>${KB.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : '');
  }
  function renderHist() {
    const step = 5, start = Math.floor(MIN_Y / step) * step, n = Math.ceil((MAX_Y + 1 - start) / step);
    const buckets = new Array(n).fill(0);
    // count only what the type/theme filters let through (the year filter itself is shown by the highlight)
    const shown = e => !(state.credibleOnly && e.cred === 'outside') && state.types.has(e.type) &&
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
    store.set('credibleOnly', state.credibleOnly); store.set('types', [...state.types]); store.set('typesSeen', allTypes); store.set('tags', [...state.tags]);
    store.set('yr', state.yr); store.set('showMentions', state.showMentions);
    computeVisible();
    renderFilters();
    refreshView(true);
  }
  $('#f-credible').addEventListener('change', e => { state.credibleOnly = e.target.checked; filtersChanged(); });
  // Click toggles a type; a second click on the same type within 400 ms shows only that type
  // (the list re-renders on every click, so the browser's native dblclick never fires).
  let lastTypeClick = { t: null, at: 0, before: null };
  $('#f-types').addEventListener('click', e => {
    const el = e.target.closest('.f-type'); if (!el) return;
    e.preventDefault();
    const t = el.dataset.type, now = Date.now();
    if (lastTypeClick.t === t && now - lastTypeClick.at < 400) {
      // judge by the selection *before* the first click of the pair
      const b = lastTypeClick.before;
      const wasOnlyThis = b.size === 1 && b.has(t);
      state.types = wasOnlyThis ? new Set(allTypes) : new Set([t]);
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
  $('#btn-relayout').addEventListener('click', () => layoutGraph(true));

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
      { selector: '.faded', style: { opacity: 0.08 } },
      { selector: 'node.path', style: { 'border-width': 3, 'border-color': css('--accent'), 'border-style': 'solid', 'font-size': 11, 'font-weight': 600 } },
      { selector: 'edge.path', style: { 'line-color': css('--accent'), width: 2.4, label: 'data(label)', opacity: 1 } },
      { selector: 'edge.hl', style: { 'line-color': css('--accent'), width: 1.6, label: 'data(label)', opacity: 1 } },
      { selector: 'node.hl', style: { 'font-size': 10.5, 'font-weight': 600 } },
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
    const degree = id => adj.get(id).filter(x => x.kind !== 'mention').length;
    const elements = [
      ...ents.map(e => ({ data: {
        id: e.id, label: twoLines(e.name), type: e.type,
        color: TYPES[e.type]?.color || '#999', shape: TYPES[e.type]?.shape || 'ellipse', size: Math.min(48, 12 + Math.sqrt(degree(e.id)) * 6),
      }, classes: e.cred === 'outside' ? 'outside' : '' })),
      ...KB.edges.map((x, i) => ({ data: { id: 'e' + i, source: x.s, target: x.t, label: x.label, kind: x.kind } })),
    ];
    cy = cytoscape({ container: $('#cy'), elements, style: graphStyle(), wheelSensitivity: 0.25, minZoom: 0.15, maxZoom: 3.5, boxSelectionEnabled: false });
    cy.on('tap', 'node', ev => select(ev.target.id(), { from: 'graph' }));
    cy.on('tap', ev => { if (ev.target === cy) select(null); });
    cy.on('mouseover', 'node', ev => { $('#cy').style.cursor = 'pointer'; if (!state.sel) highlight(ev.target.id(), true); });
    cy.on('mouseout', 'node', () => { $('#cy').style.cursor = ''; if (!state.sel) highlight(null); });
    $('#view-graph').insertAdjacentHTML('beforeend', '<div class="graph-hud" id="hud"></div>');
    $('#legend').innerHTML = allTypes.map(t => `<span><i style="background:${TYPES[t].color}"></i>${TYPES[t].plural}</span>`).join('');
    applyGraphFilter();
    layoutGraph(false);
  }
  function applyGraphFilter() {
    if (!cy) return;
    const nv = visible.size, ne = KB.edges.filter(x => visible.has(x.s) && visible.has(x.t) && (x.kind !== 'mention' || state.showMentions)).length;
    if ($('#hud')) $('#hud').innerHTML = `Case network · <b>${nv}</b> files · <b>${ne}</b> links${state.credibleOnly ? ' · official sources only' : ''}`;
    cy.batch(() => {
      cy.nodes().forEach(n => n.toggleClass('hidden', !visible.has(n.id())));
      cy.edges().forEach(ed => ed.toggleClass('hidden', (ed.data('kind') === 'mention' && !state.showMentions) || !visible.has(ed.data('source')) || !visible.has(ed.data('target'))));
    });
  }
  function layoutGraph(animate) {
    if (!cy) return;
    const eles = cy.elements().not('.hidden');
    eles.layout(hasFcose ? {
      name: 'fcose', quality: 'proof', randomize: !animate, animate: !!animate, animationDuration: 700, fit: true, padding: 40,
      nodeRepulsion: n => 9000, idealEdgeLength: ed => (ed.data('kind') === 'mention' ? 160 : 75), edgeElasticity: () => 0.4,
      gravity: 0.3, gravityRangeCompound: 1.5, numIter: 3000, nodeSeparation: 90, packComponents: true, tile: true,
      tilingPaddingVertical: 38, tilingPaddingHorizontal: 90, // room for two-line labels on unconnected nodes
    } : {
      name: 'cose', animate: animate ? 'end' : false, animationDuration: 600, randomize: !animate, fit: true, padding: 40,
      nodeRepulsion: () => 14000, idealEdgeLength: () => 70, edgeElasticity: () => 80, gravity: 0.35, numIter: 1600,
    }).run();
  }
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
        const ext = cy.extent(), p = n.position();
        if (p.x < ext.x1 || p.x > ext.x2 || p.y < ext.y1 || p.y > ext.y2) cy.animate({ center: { eles: n }, duration: 400 });
      }
    }
  }

  // ───────────── timeline ─────────────
  function renderTimeline() {
    const items = ents.filter(e => e.y0 && e.type !== 'video' && visible.has(e.id)).sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.name.localeCompare(b.name));
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
    }
    if (!mapFitted && markers.length) { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.1)); mapFitted = true; }
  }

  // ───────────── index ─────────────
  function renderIndex() {
    const q = $('#iq').value.trim().toLowerCase();
    const items = ents.filter(e => visible.has(e.id) && (!q || searchText(e).includes(q)));
    $('#iq-count').textContent = `${items.length} of ${ents.length}`;
    $('#index').innerHTML = allTypes.map(t => {
      const list = items.filter(e => e.type === t).sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) return '';
      return `<div class="ix-group"><h3><i style="background:${TYPES[t].color}"></i>${TYPES[t].plural} <span class="muted">${list.length}</span></h3>
        <div class="ix-grid">${list.map(e => `<div class="card ${e.cred === 'outside' ? 'outside' : ''}" data-goto="${e.id}">
          <div class="t">${esc(e.name)}</div><div class="s">${esc(subtitle(e))}</div></div>`).join('')}</div></div>`;
    }).join('') || '<p class="muted">No matches.</p>';
  }
  $('#iq').addEventListener('input', renderIndex);

  // ───────────── books & films ─────────────
  let shelfTab = store.get('shelfTab', 'film');
  const PEOPLE_RELS = new Set(['features', 'authored by', 'narrated by', 'directed by', 'co-author of', 'authored', 'appears in']);
  function shelfPeople(e) {
    const ids = new Set();
    for (const x of adj.get(e.id)) if (PEOPLE_RELS.has(x.label) && byId.get(x.other)?.type === 'person') ids.add(x.other);
    return [...ids].map(id => byId.get(id)).sort((a, b) => (a.cred === 'credible' ? 0 : 1) - (b.cred === 'credible' ? 0 : 1));
  }
  const trailerOf = e => adj.get(e.id).map(x => x.dir === 'in' && x.label === 'trailer of' && byId.get(x.other)).find(v => v?.type === 'video');
  const shelfMeta = e => [e.y0, e.runtime ? `${e.runtime} min` : '', e.publisher, e.pages ? `${e.pages} pp.` : ''].filter(Boolean).join(' · ');
  function renderShelf() {
    const count = t => ents.filter(e => e.type === t).length;
    $('#shelf-tabs').innerHTML = ['film', 'book'].map(t => `<button data-shelf="${t}" class="${shelfTab === t ? 'on' : ''}">${TYPES[t].plural} ${count(t)}</button>`).join('');
    const items = ents.filter(e => e.type === shelfTab).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    $('#shelf').innerHTML = items.map(e => {
      const tr = trailerOf(e);
      const people = shelfPeople(e), official = people.filter(p => p.cred === 'credible').length;
      const sum = e.facts[0]?.text || ''; // first fact as the blurb
      const cover = tr ? `<img src="${vthumb(tr)}" alt="" loading="lazy"><span class="wplay">▶</span>`
        : `<div class="sc-spine" style="--c:${TYPES[e.type].color}"><b>${esc(e.name)}</b><span>${esc(e.credits || '')}</span></div>`;
      return `<article class="shelf-card ${e.type}">
        <div class="sc-cover" ${tr ? `data-play="${tr.id}@0" title="Play the trailer"` : `data-goto="${e.id}"`}>${cover}</div>
        <div class="sc-body">
          <div class="sc-kicker">${esc(shelfMeta(e))}</div>
          <h3 data-goto="${e.id}">${esc(e.name)}</h3>
          ${e.credits ? `<div class="sc-credits">${esc(e.credits)}</div>` : ''}
          <p class="sc-sum">${esc(sum.length > 260 ? sum.slice(0, 257).replace(/\s+\S*$/, '') + '…' : sum)}</p>
          ${people.length ? `<div class="sc-people"><span class="small muted">${official ? `${official} official source${official > 1 ? 's' : ''} on record` : 'People'}:</span> ${people.slice(0, 8).map(p => chip(p.id)).join('')}${people.length > 8 ? `<span class="small muted">+${people.length - 8} more</span>` : ''}</div>` : ''}
          <div class="sc-actions">${tr ? `<button class="btn small primary" data-play="${tr.id}@0">▶ Trailer</button>` : ''}<button class="btn small" data-goto="${e.id}">File card</button>${e.links.slice(0, 2).map(l => `<a class="btn small" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>
        </div></article>`;
    }).join('') || '<p class="muted">Nothing here yet.</p>';
  }
  $('#shelf-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-shelf]'); if (!b) return;
    shelfTab = b.dataset.shelf; store.set('shelfTab', shelfTab); renderShelf();
  });

  // ───────────── claims ledger ─────────────
  const claimStatus = new Set(store.get('claimStatus', ['documented', 'claimed', 'unverified']));
  function renderClaims() {
    $('#c-status').innerHTML = Object.entries(STATUS).map(([k, v]) => `<button data-cst="${k}" class="${claimStatus.has(k) ? 'on' : ''}" title="${esc(v.hint)}">${v.label}</button>`).join('');
    const q = $('#cq').value.trim().toLowerCase();
    const rows = [];
    for (const e of ents) {
      if (!visible.has(e.id)) continue;
      for (const f of e.facts) {
        if (!claimStatus.has(f.status)) continue;
        const by = f.by ? byId.get(f.by) : null;
        if (q && !(f.text + ' ' + e.name + ' ' + (by?.name || '')).toLowerCase().includes(q)) continue;
        rows.push({ e, f, by });
      }
    }
    const order = { documented: 0, claimed: 1, unverified: 2 };
    rows.sort((a, b) => order[a.f.status] - order[b.f.status] || String(b.e.date || '').localeCompare(String(a.e.date || '')));
    $('#cq-count').textContent = `${rows.length} claims`;
    $('#claims').innerHTML = rows.map(({ e, f, by }) => {
      const src = f.source ? (f.source.file ? `<a href="${esc(fileUrl(f.source.file))}" target="_blank">📄 ${esc(f.source.file.split('/').pop())}</a>` : f.source.url ? `<a href="${esc(f.source.url)}" target="_blank" rel="noopener">source ↗</a>`
        : byId.get(f.source.id)?.type === 'video' ? `<button class="ts" data-play="${f.source.id}@${f.source.t || 0}">▶ ${f.source.t != null ? fmtT(f.source.t) : 'video'}</button>` : chip(f.source.id)) : (f.status !== 'documented' ? '<span class="needs">needs source</span>' : '');
      return `<div class="claim" style="--st:var(--${f.status})"><div>${esc(f.text)}</div>
        <div class="meta"><span class="stamp" style="--st:var(--${f.status})">${STATUS[f.status].label}</span><span>re: ${chip(e.id)}</span>${by && by.id !== e.id ? `<span>by ${chip(by.id)}</span>` : by ? '<span>self-reported</span>' : ''}${src}</div></div>`;
    }).join('') || '<p class="muted">No claims match.</p>';
  }
  $('#cq').addEventListener('input', renderClaims);
  $('#c-status').addEventListener('click', e => {
    const b = e.target.closest('[data-cst]'); if (!b) return;
    const k = b.dataset.cst;
    claimStatus.has(k) && claimStatus.size > 1 ? claimStatus.delete(k) : claimStatus.add(k);
    store.set('claimStatus', [...claimStatus]);
    renderClaims();
  });

  // ───────────── global search ─────────────
  const searchCache = new Map();
  function searchText(e) {
    if (!searchCache.has(e.id)) {
      searchCache.set(e.id, [e.name, ...e.aka, ...(e.match || []), e.place?.name, ...e.tags, ...(e.credentials || []).map(c => c.role),
        ...e.facts.map(f => f.text), e.channel, e.body?.replace(/<[^>]+>/g, ' ')].filter(Boolean).join(' \n ').toLowerCase());
    }
    return searchCache.get(e.id);
  }
  function searchEntities(q, limit = 12) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    const scored = [];
    for (const e of ents) {
      const name = e.name.toLowerCase(), aka = e.aka.join(' ').toLowerCase(), txt = searchText(e);
      if (!words.every(w => txt.includes(w))) continue;
      let s = 0;
      if (name === q) s += 200; if (name.startsWith(q)) s += 100; if (name.includes(q)) s += 60; if (aka.includes(q)) s += 45;
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
    const res = searchEntities(q);
    ddIndex = -1;
    dd.innerHTML = res.map(e => `<div class="dd-item" data-goto="${e.id}">${dot(e.id)}<div><div class="t">${esc(e.name)} <span class="muted small">${TYPES[e.type].label}</span></div><div class="s">${esc(subtitle(e))}</div></div></div>`).join('') +
      `${res.length ? '<div class="dd-sep"></div>' : ''}<div class="dd-item" data-tsearch="${esc(q)}"><span>🔎</span><div><div class="t">Search transcripts and documents for “${esc(q)}”</div><div class="s">${KB.stats.transcripts} videos · ${KB.stats.transcriptHours} h of speech · ${KB.stats.documents} documents · ${KB.stats.documentPages} pages</div></div></div>`;
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
    if (ts) { $('#q-results').hidden = true; $('#tq').value = ts.dataset.tsearch; go('videos'); runTranscriptSearch(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && state.sel) { if (state.reading) setReading(false); else select(null); }
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && state.sel && state.view !== 'home') setReading(!state.reading);
  });

  // ───────────── detail panel ─────────────
  function renderPanel(e) {
    const t = TYPES[e.type] || TYPES.concept;
    const h = [];
    const nFacts = e.facts.length, nDoc = e.facts.filter(f => f.status === 'documented').length;
    h.push(`<div class="dossier-strip"><span>File <b>${fileNo(e)}</b></span><span>${nFacts ? `${nDoc}/${nFacts} documented` : 'no claims filed'}</span></div>`);
    h.push(`<div class="p-kicker"><span class="badge type" style="background:${t.color}">${t.label}</span>${e.cred ? `<span class="badge ${e.cred}" title="${esc(CRED[e.cred].hint)}">${CRED[e.cred].label}</span>` : ''}</div>`);
    h.push(`<h2 class="p-title">${esc(e.name)}</h2>`);
    if (e.aka.length) h.push(`<div class="p-aka">Also: ${e.aka.map(esc).join(' · ')}</div>`);
    if (e.type === 'film' || e.type === 'book') h.push(`<div class="p-meta">${esc([e.credits, shelfMeta(e), e.isbn ? `ISBN ${e.isbn}` : ''].filter(Boolean).join(' · '))}</div>`);
    const meta = [fmtRange(e) && (e.type === 'video' ? 'Published ' : '') + fmtRange(e), e.place?.name, e.type === 'video' && [e.channel, fmtDur(e.duration)].filter(Boolean).join(' · ')].filter(Boolean);
    if (meta.length) h.push(`<div class="p-meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>`);
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
        <div class="small muted" style="margin-top:6px">${e.transcript ? `${e.transcript.segments.toLocaleString()} transcript lines (${({ 'youtube-auto': 'auto captions', youtube: 'subtitles', whisper: 'Whisper transcript', 'whisper-translated': 'Whisper translation' })[e.transcript.source] || 'transcript'})` : 'No transcript yet'}${e.local ? ' · local copy' : ''}</div></div></div>`);
    }
    // Watch: videos that record, feature or are about this entry — playable straight from the dossier
    if (e.type !== 'video') {
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
    if (e.pursue) {
      const pu = e.pursue;
      const local = e.files.find(f => f.endsWith('.pdf'));
      h.push(`<div class="record-card">${pu.thumbnail ? `<a href="${esc(pu.file || pu.thumbnail)}" target="_blank" rel="noopener"><img src="${esc(pu.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></a>` : ''}
        <dl class="rec-meta"><dt>Agency</dt><dd>${esc(pu.agency || '—')}</dd><dt>Released</dt><dd>${esc(fmtD(pu.released))} · Release ${String(pu.release).padStart(2, '0')}</dd>
        <dt>Incident</dt><dd>${esc([pu.incident_date, pu.incident_location].filter(Boolean).join(' · ') || '—')}</dd><dt>Format</dt><dd>${esc((pu.format || '').toUpperCase())}${pu.redaction ? ' · redacted' : ''}</dd></dl>
        <div class="rec-actions">${pu.file ? `<a class="btn small" href="${esc(pu.file)}" target="_blank" rel="noopener">Official file ↗</a>` : ''}${local ? `<a class="btn small primary" href="${esc(fileUrl(local))}" target="_blank">Local copy</a>` : ''}${pu.dvids ? `<a class="btn small" href="${esc(pu.dvids)}" target="_blank" rel="noopener">DVIDS video ↗</a>` : ''}</div></div>`);
    }
    if (e.credentials?.length) {
      h.push(`<div class="p-sec"><h4>Credentials</h4><ul class="cred-list">${e.credentials.map(c => `<li><span class="cred-cat">${esc(CRED_CAT[c.category] || c.category)}</span><span>${esc(c.role)}</span></li>`).join('')}</ul></div>`);
    }
    if (e.body) h.push(`<div class="p-sec"><h4>${e.type === 'person' ? 'Profile' : 'Summary'}</h4><div class="p-body p-bio">${e.body}</div></div>`);
    if (e.facts.length) {
      h.push(`<div class="p-sec" id="sec-claims"><h4>Notes & claims <span>${e.facts.length}</span></h4><ul class="facts" data-collapse="8">${e.facts.map(f => {
        const src = f.source ? (f.source.file ? `<a href="${esc(fileUrl(f.source.file))}" target="_blank">📄 ${esc(f.source.file.split('/').pop())}</a>` : f.source.url ? `<a href="${esc(f.source.url)}" target="_blank" rel="noopener">source ↗</a>`
          : byId.get(f.source.id)?.type === 'video' ? `<button class="ts" data-play="${f.source.id}@${f.source.t || 0}">▶ ${f.source.t != null ? fmtT(f.source.t) : 'video'}</button> ${chip(f.source.id)}`
          : `source: ${chip(f.source.id)}`) : '';
        const needs = !f.source && f.status !== 'documented' ? `<span class="needs" title="Add a source: video timestamp, document or link">needs source</span>` : '';
        return `<li class="fact" style="--st:var(--${f.status})"><div>${esc(f.text)}</div><div class="meta"><span class="stamp" title="${esc(STATUS[f.status].hint)}">${STATUS[f.status].label}</span>${f.by && f.by !== e.id ? `<span>by ${chip(f.by)}</span>` : ''}${src}${needs}</div></li>`;
      }).join('')}</ul></div>`);
    }
    // curated moments
    const ms = e.type === 'video' ? (e.moments || []).map(m => ({ video: e.id, ...m })) : (momentsFor.get(e.id) || []);
    if (ms.length) {
      h.push(`<div class="p-sec"><h4>Video moments <span>${ms.length}</span></h4>${ms.sort((a, b) => a.video.localeCompare(b.video) || a.t - b.t).map(m => `
        <div class="moment"><button class="ts" data-play="${m.video}@${m.t}">▶ ${fmtT(m.t)}</button><div><div>${esc(m.text)}</div>
        <div class="who">${m.speaker && m.speaker !== e.id ? chip(m.speaker) : ''}${e.type !== 'video' ? chip(m.video) : m.refs.map(r => chip(r)).join('')}</div></div></div>`).join('')}</div>`);
    }
    // connections
    const groups = new Map();
    for (const x of adj.get(e.id)) {
      if (x.kind === 'mention') continue;
      const label = x.dir === 'out' ? x.label : (INVERSE[x.label] || x.label);
      if (!groups.has(label)) groups.set(label, new Set());
      groups.get(label).add(x.other);
    }
    if (groups.size) {
      const nConn = [...groups.values()].reduce((a, ids) => a + ids.size, 0);
      h.push(`<div class="p-sec p-side" id="sec-connections"><h4>Connections <span>${nConn}</span></h4>${[...groups].map(([label, ids]) => `<div class="conn-group"><div class="lbl">${esc(label)}</div><div class="chips" data-collapse="10">${[...ids].map(id => chip(id)).join('')}</div></div>`).join('')}</div>`);
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
    if (e.links.length || e.files.length) {
      h.push(`<div class="p-sec p-side" id="sec-links"><h4>Links & files</h4><ul class="p-links">${e.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)} ↗</a></li>`).join('')}${e.files.map(f => `<li><a href="${esc(fileUrl(f))}" target="_blank">📄 ${esc(f.split('/').pop())}</a></li>`).join('')}</ul></div>`);
    }
    if (e.tags.length) h.push(`<div class="p-sec p-side"><h4>Themes</h4><div class="chips">${e.tags.map(t => `<button class="chip ${state.tags.has(t) ? 'on' : ''}" data-filter-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`);
    h.push(`<div class="p-edit">Edit <code>${esc(e.file)}</code><button class="link" data-copy="${esc(e.file)}">copy path</button></div>`);
    return h.join('');
  }
  // ── connecting the dots ──
  const strongAdj = id => adj.get(id).filter(x => x.kind !== 'mention');
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
        ${pc.map(([o, s]) => `<div class="dots-item"><div>${chip(o)}<div class="why">via ${[...s.via].slice(0, 4).map(v => esc(byId.get(v).name)).join(', ')}${s.via.size > 4 ? ` +${s.via.size - 4}` : ''}</div></div><button class="link" data-trace-to="${o}">trace</button></div>`).join('')}</div>`);
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

  function openPanel(id) {
    const e = byId.get(id);
    if (!e) { closePanel(); return; }
    const body = $('#panel-body');
    body.innerHTML = renderPanel(e);
    if (state.reading) layoutReading(body); else body.classList.remove('reading');
    applyCollapse(body, state.reading ? 2 : 1);
    $('#panel').hidden = false;
    $('#panel').scrollTop = 0;
    $('#app').classList.add('has-panel');
    $('#app').classList.toggle('reading', !!state.reading);
    $('#panel-expand').textContent = state.reading ? '⤡' : '⤢';
    $('#panel-expand').title = state.reading ? 'Back to side panel (R)' : 'Reading view (R)';
    applyPanelWidth();
    afterResize();
  }
  // Long lists start collapsed: show the first N items (×factor in reading view) with a “show all” toggle
  function applyCollapse(root, factor = 1) {
    for (const box of root.querySelectorAll('[data-collapse]')) {
      const n = +box.dataset.collapse * factor;
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
  function setReading(on) {
    state.reading = on;
    if (state.sel) openPanel(state.sel);
    if (!on) afterResize();
  }
  // Drag the panel's left edge to resize (desktop); width remembered per browser
  function applyPanelWidth() {
    const w = store.get('panelW', null);
    if (w && !state.reading && innerWidth > 860) $('#app').style.setProperty('--panel-w', `${w}px`);
    else $('#app').style.removeProperty('--panel-w');
  }
  document.addEventListener('input', ev => {
    if (ev.target.id !== 'trace-q') return;
    const res = searchEntities(ev.target.value, 8).filter(x => x.id !== state.sel);
    const dd = $('#trace-dd');
    dd.innerHTML = res.map(x => `<div class="dd-item" data-trace-target="${x.id}">${dot(x.id)}<div><div class="t">${esc(x.name)}</div><div class="s">${TYPES[x.type].label}</div></div></div>`).join('');
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
  $('#panel-expand').addEventListener('click', () => setReading(!state.reading));
  $('#panel').addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); $('#' + j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  (() => {
    const handle = $('#panel-resize');
    let startX = 0, startW = 0;
    const move = ev => {
      const w = Math.max(320, Math.min(innerWidth - 360, startW + (startX - ev.clientX)));
      $('#app').style.setProperty('--panel-w', `${w}px`);
      cy?.resize(); map?.invalidateSize();
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing');
      store.set('panelW', parseInt(getComputedStyle($('#app')).getPropertyValue('--panel-w')));
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
        s.src = `data/transcripts/${encodeURIComponent(id)}.js`;
        s.onerror = () => { trWaiters.get(id)?.forEach(r => r(null)); trWaiters.delete(id); };
        document.head.append(s);
      }
      trWaiters.get(id).push(res);
    });
  }

  function renderVideoList() {
    if ($('#tq').value.trim()) return;
    const list = videos.filter(v => !(state.credibleOnly && v.cred === 'outside')).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('#tq-info').textContent = `${list.length} videos · ${KB.stats.transcriptHours} hours transcribed`;
    $('#vid-list').innerHTML = list.map(v => `<div class="vl-item ${state.video === v.id ? 'on' : ''}" data-open-video="${v.id}">
      <img src="${vthumb(v)}" alt="" loading="lazy"><div><div class="t">${esc(v.name)}</div><div class="s">${esc([v.channel, fmtD(v.date), fmtDur(v.duration)].filter(Boolean).join(' · '))}</div></div></div>`).join('');
  }
  $('#vid-list').addEventListener('click', e => {
    const o = e.target.closest('[data-open-video]');
    if (o) { openVideo(o.dataset.openVideo, 0, false); return; }
  });

  let tqTimer;
  $('#tq').addEventListener('input', () => {
    clearTimeout(tqTimer);
    if ($('#tq').value.trim().length >= 2) $('#tq-info').textContent = 'Searching…';
    tqTimer = setTimeout(runTranscriptSearch, 300);
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
        s.src = `data/doctext/${encodeURIComponent(id)}.js`;
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
  let tqScope = store.get('tqScope', 'videos');
  let lastSearch = null;

  async function runTranscriptSearch() {
    const q = $('#tq').value.trim();
    if (q.length < 2) { lastSearch = null; renderVideoList(); return; }
    const vids = videos.filter(v => v.transcript && !(state.credibleOnly && v.cred === 'outside'));
    const docs = docEnts.filter(e => !(state.credibleOnly && e.cred === 'outside'));
    if (TR.size < vids.length || DT.size < docs.length) $('#tq-info').textContent = 'Loading transcripts and documents (first search only)…';
    await Promise.all([...vids.map(v => loadTranscript(v.id)), ...docs.map(d => loadDocText(d.id))]);
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
    // documents: one hit per matching page, with a snippet around the first match
    const reG = new RegExp(re.source, 'gi');
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
      if (hits.length) { dTotal += hits.reduce((s, h) => s + h.n, 0); dOut.push([d, hits]); }
    }
    dOut.sort((a, b) => b[1].length - a[1].length);
    lastSearch = { q, needle, vOut, vTotal, dOut, dTotal };
    renderSearchResults();
  }
  function renderSearchResults() {
    const r = lastSearch;
    if (!r) return;
    if (tqScope === 'videos' && !r.vOut.length && r.dOut.length) tqScope = 'docs';
    if (tqScope === 'docs' && !r.dOut.length && r.vOut.length) tqScope = 'videos';
    const hl = s => esc(s).replace(new RegExp(`(${r.needle.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), '<mark>$1</mark>');
    $('#tq-info').innerHTML = `<div class="seg tq-scope"><button data-scope="videos" class="${tqScope === 'videos' ? 'on' : ''}">Videos ${r.vTotal}</button><button data-scope="docs" class="${tqScope === 'docs' ? 'on' : ''}">Documents ${r.dTotal}</button></div>
      <div>${tqScope === 'videos' ? (r.vTotal ? `${r.vTotal} matches in ${r.vOut.length} videos` : 'No matches in transcripts') : (r.dTotal ? `${r.dTotal} matches on ${r.dOut.reduce((s, x) => s + x[1].length, 0)} pages in ${r.dOut.length} documents` : 'No matches in documents')}</div>`;
    if (tqScope === 'videos') {
      $('#vid-list').innerHTML = r.vOut.map(([v, hits]) => `<div class="hit-video" data-open-video="${v.id}" style="cursor:pointer">${esc(v.name)}<span>${hits.length}</span></div>` +
        hits.slice(0, 40).map(([t, s]) => `<div class="hit" data-play="${v.id}@${t}"><button class="ts">${fmtT(t)}</button><span>${hl(s)}</span></div>`).join('') +
        (hits.length > 40 ? `<div class="small muted" style="padding:2px 8px 6px">+${hits.length - 40} more — open the video and search its transcript</div>` : '')).join('');
    } else {
      $('#vid-list').innerHTML = r.dOut.map(([d, hits]) => `<div class="hit-video" data-goto="${d.id}" style="cursor:pointer" title="Open the file card">${esc(d.name)}<span>${hits.length} p.</span></div>` +
        hits.slice(0, 30).map(h => `<a class="hit doc-hit" href="${esc(fileUrl(h.file))}#page=${h.page}" target="_blank" title="Open the PDF at page ${h.page}"><span class="ts">p.${h.page}</span><span>${hl(h.snip)}${h.n > 1 ? ` <span class="muted">(${h.n}×)</span>` : ''}</span></a>`).join('') +
        (hits.length > 30 ? `<div class="small muted" style="padding:2px 8px 6px">+${hits.length - 30} more pages</div>` : '')).join('');
    }
  }
  $('#tq-info').addEventListener('click', e => {
    const b = e.target.closest('[data-scope]'); if (!b) return;
    tqScope = b.dataset.scope; store.set('tqScope', tqScope);
    renderSearchResults();
  });

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
  const usingLocal = () => !$('#local-video').hidden;
  function currentTime() { return usingLocal() ? $('#local-video').currentTime : (yt?.getCurrentTime?.() || 0); }

  async function openVideo(id, t = 0, autoplay = true, { replace = false } = {}) {
    const v = byId.get(id);
    if (!v) return;
    const same = state.video === id;
    state.video = id;
    store.set('lastVideo', id);
    if (state.view !== 'videos') go('videos', { keepSel: true });
    setHash({ replace });
    $('#player-empty').hidden = true;
    $$('.vl-item').forEach(el => el.classList.toggle('on', el.dataset.openVideo === id));
    // show title, moments and transcript at once; the YouTube player loads in parallel
    if (!same) { curTab = v.moments?.length ? 'moments' : v.chapters?.length ? 'chapters' : 'transcript'; renderVideoDetail(v); }
    if (v.local) {
      const el = $('#local-video');
      $('#yt').hidden = true; el.hidden = false;
      if (!same) el.src = '../' + v.local; // local copies live in media/ (served by the dev server; never published)
      el.currentTime = t;
      if (autoplay) el.play().catch(() => {});
    } else if (!v.youtube) {
      // non-YouTube video without a local copy (e.g. on the public site): link to the original post
      $('#local-video').hidden = true; $('#yt').hidden = true;
      const src = vsource(v);
      $('#player-empty').hidden = false;
      $('#player-empty').innerHTML = `This video is hosted on ${esc(src.label)}.<br><br>${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">Watch it on ${esc(src.label)} ↗</a>` : ''}<br><br><span class="small">The transcript and moments below are searchable here.</span>`;
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
          videoId: v.youtube, playerVars: { start: Math.floor(t), autoplay: autoplay ? 1 : 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onReady: () => {
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
    $('#vid-detail').innerHTML = `<div class="vd-head"><h2>${esc(v.name)}</h2>
      <div class="vd-meta"><span>${esc([v.channel, fmtD(v.date), fmtDur(v.duration)].filter(Boolean).join(' · '))}</span>
      ${vsource(v).url ? `<a href="${esc(vsource(v).url)}" target="_blank" rel="noopener">${vsource(v).label} ↗</a>` : ''}
      <a href="#" data-goto="${v.id}">Details</a></div>
      ${people.length ? `<div class="chips" style="margin-top:8px">${[...new Set(people)].map(id => chip(id)).join('')}</div>` : ''}</div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${curTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="tab-body" id="tab-body"></div>`;
    await renderTab(v);
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
      body.innerHTML = `<div class="transcript-tools"><input id="tfind" type="search" placeholder="Find in this transcript…"><label class="check" style="margin:0"><input type="checkbox" id="tfollow" checked> Follow playback</label><span class="small muted">${({ 'youtube-auto': 'Auto-generated captions', youtube: 'Subtitles', whisper: 'Whisper transcript (local AI)', 'whisper-translated': 'Whisper translation to English (local AI)' })[tr.source] || 'Transcript'}</span></div>
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
  // scroll a paragraph to the middle of its own scroll box without moving the page (keeps the player visible)
  function scrollWithin(box, el, smooth) {
    box.scrollTo({ top: el.offsetTop - box.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
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
      [`${facts.filter(f => f.status === 'documented').length}`, 'documented claims', `of ${facts.length} claims, each with its status shown`],
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
    ['graph', 'Network', 'Every person, program and incident, and how they connect. Trace the path between any two.'],
    ['timeline', 'Timeline', 'Eighty years of events, documents and hearings, decade by decade.'],
    ['map', 'World', 'Where it happened: bases, ships, schools and hearing rooms.'],
    ['videos', 'Testimony', 'Hearings and interviews with synced transcripts. Search every word spoken.'],
    ['shelf', 'Books & films', 'Documentaries and books by the people on record, with trailers and where to find them.'],
    ['claims', 'Claims ledger', 'Every claim with its status: documented, on record, or still unverified.'],
    ['index', 'Index', 'All files, by type, filterable.'],
  ];
  function renderHome() {
    const el = $('#view-home');
    const today = new Date().toISOString().slice(0, 10);
    const latest = ents.filter(e => e.date && !['record', 'video', 'source'].includes(e.type))
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
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
            <input id="hq" type="search" placeholder="Search a name, program or incident: Grusch, AAWSAP, Malmstrom…" autocomplete="off" spellcheck="false">
            <div id="hq-dd" class="dropdown" hidden></div>
          </div>
          <div class="hero-cta">
            <a class="btn primary" href="#/graph" data-home-view="graph">Explore the network</a>
            <a class="btn" href="#/videos" data-home-view="videos">Watch the testimony</a>
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
            <a class="way" href="#/${v}" data-home-view="${v}"><span class="way-n">0${i + 1}</span><b>${t}</b><span>${d}</span></a>`).join('')}</div>
        </section>

        <section class="home-sec">
          <div class="home-kicker">Latest on the record</div>
          <h2>Recently dated entries</h2>
          <div class="latest">${latest.map(e => `
            <a class="latest-item" href="#" data-home-goto="${e.id}" style="--c:${TYPES[e.type].color}">
              <span class="li-date">${esc(fmtRange(e))}${String(e.date) > today ? ' <em>upcoming</em>' : ''}</span>
              <span class="li-type">${TYPES[e.type].label}</span><span class="li-name">${esc(e.name)}</span>
            </a>`).join('')}</div>
        </section>

        <footer class="home-foot">
          <div><b>WHERE ARE THEY</b> is a personal research archive. It collects public, on-record statements and official documents. It does not make claims of its own: every statement is attributed, and every status can be checked against its source.</div>
          <div class="muted">Built ${new Date(KB.built).toLocaleDateString()} · ${KB.stats.entities} files · ${KB.stats.edges.toLocaleString()} links · sources include congressional records, war.gov/UFO (PURSUE), the CIA and FBI reading rooms, NARA and The Black Vault.</div>
        </footer>
      </div>`;
    startHero();
  }

  // hero: a live, slowly drifting rendering of the archive's own network
  let heroRaf = null, heroData = null;
  function buildHeroLayout() {
    const nodes = ents.filter(e => !['record', 'video', 'source'].includes(e.type) && !(e.cred === 'outside'));
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
    if (o) { const id = o.dataset.hcOpen; closeHeroCard(); const ent = byId.get(id); if (ent && !state.types.has(ent.type)) { state.types.add(ent.type); filtersChanged(); } go('graph'); select(id); }
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
  $('#view-home').addEventListener('click', e => {
    const pr = e.target.closest('[data-preset]');
    if (pr) { e.preventDefault(); applyPreset(JSON.parse(pr.dataset.preset)); return; }
    const hv = e.target.closest('[data-home-view]');
    if (hv) { e.preventDefault(); go(hv.dataset.homeView); return; }
    const hg = e.target.closest('[data-home-goto]');
    if (hg) {
      e.preventDefault();
      const id = hg.dataset.homeGoto;
      const ent = byId.get(id);
      if (ent && !state.types.has(ent.type)) { state.types.add(ent.type); filtersChanged(); }
      go('graph'); select(id);
    }
  });
  $('#view-home').addEventListener('input', e => {
    if (e.target.id !== 'hq') return;
    const res = searchEntities(e.target.value, 8);
    const dd = $('#hq-dd');
    dd.innerHTML = res.map(x => `<div class="dd-item" data-hq="${x.id}">${dot(x.id)}<div><div class="t">${esc(x.name)} <span class="muted small">${TYPES[x.type].label}</span></div><div class="s">${esc(subtitle(x))}</div></div></div>`).join('')
      + (e.target.value.trim() ? `<div class="dd-sep"></div><div class="dd-item" data-hq-t="1"><span>🔎</span><div><div class="t">Search transcripts and documents for “${esc(e.target.value)}”</div></div></div>` : '');
    dd.hidden = !e.target.value.trim();
  });
  $('#view-home').addEventListener('keydown', e => {
    if (e.target.id === 'hq' && e.key === 'Enter') $('#hq-dd .dd-item')?.click();
  });
  $('#view-home').addEventListener('mousedown', e => {
    const it = e.target.closest('[data-hq]');
    const tq = e.target.closest('[data-hq-t]');
    if (it) { e.preventDefault(); const id = it.dataset.hq; const ent = byId.get(id); if (ent && !state.types.has(ent.type)) { state.types.add(ent.type); filtersChanged(); } go('graph'); select(id); }
    if (tq) { e.preventDefault(); $('#tq').value = $('#hq').value; go('videos'); runTranscriptSearch(); }
  });

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

  // Videos view opens on the most recent video with curated moments (recent *and* annotated)
  function defaultVideo() {
    const withMoments = videos.filter(v => v.moments?.length && v.transcript).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return (withMoments[0] || videos.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0])?.id;
  }

  // ───────────── navigation ─────────────
  function setHash({ replace = false } = {}) {
    let target;
    if (state.view === 'home' && !state.sel) {
      if (!location.hash) return; // home lives at the bare URL
      target = location.pathname + location.search;
    } else {
      const parts = ['', state.view];
      if (state.view === 'videos' && state.video) parts.push(state.video);
      target = '#' + parts.join('/') + (state.sel ? `?sel=${encodeURIComponent(state.sel)}` : '');
      if (location.hash === target) return;
    }
    history[replace ? 'replaceState' : 'pushState'](null, '', target);
  }
  function select(id, { from } = {}) {
    state.sel = id;
    if (id && state.view !== 'home') openPanel(id); else closePanel();
    if (state.view === 'graph') highlight(id);
    if (state.view === 'timeline') $$('.tl-item').forEach(el => el.classList.toggle('sel', el.dataset.goto === id));
    setHash();
  }
  function go(view, { keepSel = true } = {}) {
    if (view === 'home' && state.view !== 'home') teardownApp();
    if (state.reading && view !== state.view) { state.reading = false; $('#app').classList.remove('reading'); } // e.g. ▶ from reading view
    state.view = view;
    $('#side').classList.remove('open'); // close the mobile filter drawer on navigation
    store.set('view', view);
    for (const v of VIEWS) $('#view-' + v).hidden = v !== view;
    $$('#views a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    $('#app').classList.toggle('is-home', view === 'home');
    if (view === 'home') { $('#panel').hidden = true; $('#app').classList.remove('has-panel'); }
    else if (state.sel) openPanel(state.sel);
    $('#filters').hidden = view === 'videos';
    $('#vid-side').hidden = view !== 'videos';
    $$('.only-graph').forEach(el => el.hidden = view !== 'graph');
    if (!keepSel) select(null);
    setHash(); // push the new view's history entry first, so views that adjust it (e.g. default video) replace their own entry
    refreshView(false);
  }
  function refreshView(filtersChangedFlag) {
    if (state.view === 'graph') {
      if (!cy) initGraph();
      else {
        cy.resize();
        if (filtersChangedFlag) { applyGraphFilter(); clearTimeout(layoutTimer); layoutTimer = setTimeout(() => layoutGraph(true), 120); }
      }
      highlight(state.sel);
    } else if (state.view === 'timeline') renderTimeline();
    else if (state.view === 'map') renderMap();
    else if (state.view === 'index') renderIndex();
    else if (state.view === 'shelf') renderShelf();
    else if (state.view === 'claims') renderClaims();
    else if (state.view === 'home') renderHome();
    else if (state.view === 'videos') {
      renderVideoList();
      if (!state.video) {
        const last = store.get('lastVideo', null);
        const def = (last && byId.get(last)?.type === 'video' && last) || defaultVideo();
        if (def) openVideo(def, 0, false, { replace: true });
      }
    }
    if (filtersChangedFlag && cy && state.view !== 'graph') applyGraphFilter();
  }

  // global click delegation for entity links / play buttons
  document.addEventListener('click', e => {
    const play = e.target.closest('[data-play]');
    if (play) {
      e.preventDefault();
      const [vid, t] = play.dataset.play.split('@');
      openVideo(vid, +t || 0, true);
      return;
    }
    const g = e.target.closest('[data-goto]');
    if (g) {
      e.preventDefault();
      if (state.view === 'home') go('graph');
      $('#q-results').hidden = true;
      select(g.dataset.goto, { from: 'link' });
      if (window.innerWidth <= 860) $('#side').classList.remove('open');
    }
  });
  $('#views').addEventListener('click', e => {
    const a = e.target.closest('[data-view]');
    if (!a) return;
    e.preventDefault();
    go(a.dataset.view);
  });
  $('#btn-side').addEventListener('click', e => { e.stopPropagation(); $('#side').classList.toggle('open'); });
  // tapping outside the open drawer closes it
  document.addEventListener('click', e => {
    const side = $('#side');
    if (side.classList.contains('open') && !e.target.closest('#side, #btn-side')) side.classList.remove('open');
  });

  // theme
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    store.set('theme', t);
    if (cy) cy.style(graphStyle());
    setTiles();
    if (state.view === 'map') renderMap();
  }
  $('#btn-theme').addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'));

  // live reload from the dev server
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try { const es = new EventSource('/__events'); es.onmessage = ev => { if (ev.data === 'reload') location.reload(); }; es.onerror = () => es.close(); } catch { /* no dev server */ }
  }

  // ───────────── boot ─────────────
  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  computeVisible();
  renderFilters();
  const VIEWS = ['home', 'graph', 'timeline', 'map', 'videos', 'shelf', 'index', 'claims'];
  function applyRoute(initial) {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const [view, vid] = path.split('/');
    const sel = new URLSearchParams(qs || '').get('sel');
    const v = VIEWS.includes(view) ? view : (!path ? 'home' : initial ? 'home' : state.view);
    if (v !== state.view || initial) go(v);
    if ((sel || null) !== state.sel) select(sel && byId.has(sel) ? sel : null);
    if (v === 'videos' && vid && byId.has(vid) && vid !== state.video) openVideo(vid, 0, false);
  }
  window.addEventListener('hashchange', () => applyRoute(false));
  window.addEventListener('popstate', () => applyRoute(false));
  // the logo returns home without a page reload
  $('.brand').addEventListener('click', e => { e.preventDefault(); go('home'); });
  applyRoute(true);
})();
