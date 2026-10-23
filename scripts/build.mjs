#!/usr/bin/env node
// Compile content/ + media/ into site/data/ for the browser.
//
//   node scripts/build.mjs           build
//   node scripts/build.mjs --check   validate only (non-zero exit on errors)
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { ROOT, TYPES, STATUSES, readEntries, toSeconds, youtubeId } from './lib.mjs';
import { computeLayouts } from './layout.mjs';
import { assignPaths, writePages } from './pages.mjs';
import { assignAdded } from './added.mjs';

export const CREDIBLE = ['congress', 'government', 'intelligence', 'military', 'aviator', 'sensor-operator', 'academia', 'astronaut', 'aerospace', 'law-enforcement'];
const REPORTER = ['journalist', 'policy-expert'];
export const MASS_MIN_WITNESSES = 50;
export const OUTCOMES = ['open', 'disputed', 'explained', 'hoax'];
// news items: short dated updates (a statement, a post, an article) too slight for a full entry
export const NEWS_KINDS = ['statement', 'post', 'article', 'interview', 'podcast', 'hearing', 'legislation', 'release', 'research', 'incident', 'event'];
// not graph nodes: shown in context (dossiers, index, search, Latest) instead
export const OFF_GRAPH = new Set(['record', 'news']);

export async function build({ check = false, quiet = false } = {}) {
  const t0 = Date.now();
  const errors = [];
  const warnings = [];
  const raw = readEntries();
  const byId = new Map();

  for (const r of raw) {
    if (byId.has(r.id)) errors.push(`duplicate id "${r.id}" (${r.file} and ${byId.get(r.id).file})`);
    if (!TYPES.includes(r.type) && r.type !== 'source') warnings.push(`${r.file}: unknown type folder "${r.type}"`);
    byId.set(r.id, r);
  }

  const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const str = v => (v == null ? null : String(v));

  // "entity-id", "entity-id@1:02:03", or a URL
  function parseSource(s, file) {
    if (!s) return null;
    s = String(s);
    if (/^https?:\/\//.test(s)) return { url: s };
    if (s.startsWith('library/')) {
      if (!fs.existsSync(path.join(ROOT, s))) warnings.push(`${file}: source file "${s}" not found`);
      return { file: s };
    }
    const [id, t] = s.split('@');
    if (!byId.has(id)) warnings.push(`${file}: source "${id}" not found`);
    return { id, t: t != null ? toSeconds(t) : null };
  }

  const entities = raw.map(r => {
    const d = r.data;
    const e = {
      id: r.id, type: r.type, file: r.file,
      name: str(d.name) || r.id,
      aka: arr(d.aka).map(String),
      date: str(d.date), end: str(d.end),
      place: d.place && d.place.lat != null ? { name: d.place.name || '', lat: +d.place.lat, lng: +d.place.lng } : null,
      tags: arr(d.tags).map(String),
      links: arr(d.links).map(l => (typeof l === 'string' ? { label: l, url: l } : l)),
      files: arr(d.files).map(String),
      facts: arr(d.facts).map(f => {
        const fact = typeof f === 'string' ? { text: f, status: 'unverified' } : { ...f };
        if (!STATUSES.includes(fact.status)) {
          warnings.push(`${r.file}: fact status "${fact.status}" should be one of ${STATUSES.join(', ')}`);
          fact.status = 'unverified';
        }
        if (fact.by && !byId.has(fact.by)) warnings.push(`${r.file}: fact.by "${fact.by}" not found`);
        fact.source = parseSource(fact.source, r.file);
        // the sourcing rule: Wikipedia can point the way, but never backs a documented fact
        if (fact.status === 'documented' && /wikipedia\.org/i.test(fact.source?.url || '')) warnings.push(`${r.file}: documented fact cites Wikipedia; cite the primary record or use claimed/unverified`);
        return fact;
      }),
      rel: arr(d.rel).map(x => (Array.isArray(x) ? { label: String(x[0]), id: String(x[1]) } : { label: String(x.label), id: String(x.id) })),
      body: r.body.trim() ? marked.parse(r.body) : '',
    };
    if (d.credentials) e.credentials = arr(d.credentials).map(c => ({ category: String(c.category || 'unknown'), role: c.role || '' }));
    if (d.match) e.match = arr(d.match).map(String);
    if (d.nomatch) e.nomatch = true;
    if (d.channels) e.channels = arr(d.channels).map(String);
    if (d.pursue) e.pursue = d.pursue;
    if (d.witnesses != null) e.witnesses = Number(d.witnesses);
    // search results: optional hand-written page title and meta description (otherwise generated in pages.mjs)
    if (d.seo_title) e.seoTitle = String(d.seo_title);
    if (d.seo_description) e.seoDescription = String(d.seo_description);
    // Latest: pinned above the dated list until this date (YYYY-MM-DD), then it drops back into place
    if (d.featured) e.featured = d.featured instanceof Date ? d.featured.toISOString().slice(0, 10) : String(d.featured);
    // books & films: shown first, as a large “featured” card, on the Documentaries / Books page
    if (d.shelf_featured) e.shelfFeatured = true;
    // books & films: free-text credits plus bibliographic / runtime metadata
    for (const k of ['credits', 'publisher', 'isbn', 'pages']) if (d[k] != null) e[k] = String(d[k]);
    if (d.runtime != null) e.runtime = Number(d.runtime);
    // books & films: a cover image saved as site/assets/covers/<id>.jpg is picked up automatically
    if (['book', 'film'].includes(r.type) && fs.existsSync(path.join(ROOT, 'site', 'assets', 'covers', `${r.id}.jpg`))) e.cover = `/assets/covers/${r.id}.jpg`;
    // videos we host ourselves on R2 (only with an explicit decision): stream file and thumbnail, relative to FILES_BASE
    if (d.stream) e.stream = String(d.stream);
    if (d.thumb) e.thumb = String(d.thumb);
    if (d.coverage) e.coverage = arr(d.coverage).map(c => (typeof c === 'string' ? { outlet: c } : c));
    // incidents: where the case stands — open (default), disputed, explained or hoax — with a short note and its source
    if (r.type === 'incident') {
      e.outcome = d.outcome ? String(d.outcome) : 'open';
      if (!OUTCOMES.includes(e.outcome)) { warnings.push(`${r.file}: outcome "${e.outcome}" should be one of ${OUTCOMES.join(', ')}`); e.outcome = 'open'; }
      if (d.outcome_note) e.outcomeNote = String(d.outcome_note);
      if (d.outcome_source) e.outcomeSource = parseSource(d.outcome_source, r.file);
      if (['explained', 'hoax', 'disputed'].includes(e.outcome) && !d.outcome_source) warnings.push(`${r.file}: outcome "${e.outcome}" needs an outcome_source`);
    }
    if (r.type === 'news') {
      e.kind = d.kind ? String(d.kind) : 'article';
      if (!NEWS_KINDS.includes(e.kind)) warnings.push(`${r.file}: news kind "${e.kind}" should be one of ${NEWS_KINDS.join(', ')}`);
      e.url = d.url ? String(d.url) : null;
      if (d.outlet) e.outlet = String(d.outlet);
      if (!e.url) warnings.push(`${r.file}: news item needs a "url" (the original source)`);
      if (!e.date) warnings.push(`${r.file}: news item needs a "date" (when it happened)`);
    }
    if (r.type === 'video') {
      e.youtube = d.youtube ? youtubeId(d.youtube) : null;
      // non-YouTube videos (X, news sites, local files): `media:` names the folder under media/, `url:` the original post
      if (!e.youtube && d.media) { e.media = String(d.media); e.url = d.url ? String(d.url) : null; }
      if (!e.youtube && !e.media) errors.push(`${r.file}: video needs a "youtube" id/URL or a "media" folder`);
      if (d.youtube && !e.youtube) errors.push(`${r.file}: invalid "youtube" value`);
      e.moments = arr(d.moments).map(m => ({
        t: toSeconds(m.t), text: m.text || '', speaker: m.speaker || null, refs: arr(m.refs).map(String),
      }));
      for (const m of e.moments) {
        if (m.t == null) errors.push(`${r.file}: moment has an invalid time`);
        for (const ref of [...m.refs, ...(m.speaker ? [m.speaker] : [])]) if (!byId.has(ref)) warnings.push(`${r.file}: moment ref "${ref}" not found`);
      }
    }
    for (const x of e.rel) if (!byId.has(x.id)) warnings.push(`${r.file}: rel target "${x.id}" not found`);
    for (const f of e.files) if (!fs.existsSync(path.join(ROOT, f))) warnings.push(`${r.file}: file "${f}" not found`);
    if (e.date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(e.date)) warnings.push(`${r.file}: date "${e.date}" should be YYYY, YYYY-MM or YYYY-MM-DD`);
    return e;
  });
  const ent = new Map(entities.map(e => [e.id, e]));

  // ── Video metadata + transcripts from media/<youtubeId>/ ──
  const transcripts = new Map();
  const videoByYt = new Map();
  for (const e of entities.filter(e => e.type === 'video' && (e.youtube || e.media))) {
    const mid = e.youtube || e.media;
    videoByYt.set(mid, e);
    const dir = path.join(ROOT, 'media', mid);
    const metaPath = path.join(dir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (e.name === e.id) e.name = m.title;
      e.date ||= m.date ? String(m.date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') : m.date; // yt-dlp writes YYYYMMDD
      e.channel = m.channel;
      if (!e.url && m.url) e.url = m.url;
      e.duration = m.duration;
      e.chapters = m.chapters || [];
      e.description = m.description || '';
    } else warnings.push(`${e.file}: not fetched yet — run: npm run fetch -- ${mid}`);
    const tPath = path.join(dir, 'transcript.json');
    if (fs.existsSync(tPath)) {
      const t = JSON.parse(fs.readFileSync(tPath, 'utf8'));
      transcripts.set(e.id, t);
      e.transcript = { source: t.source, segments: t.segments.length };
    }
    if (fs.existsSync(path.join(dir, 'video.mp4'))) e.local = `media/${mid}/video.mp4`;
  }
  // ── Document full text: the extracted .txt next to each file (pdftotext/OCR), split into pages on form feeds ──
  const doctexts = new Map();
  let docPages = 0;
  for (const e of entities) {
    const parts = [];
    for (const f of e.files) {
      const txt = path.join(ROOT, f.replace(/\.[^./]+$/, '.txt'));
      if (!fs.existsSync(txt)) continue;
      const pages = fs.readFileSync(txt, 'utf8').split('\f').map(p => p.replace(/(?:\s*[.·…_]){5,}/g, ' … ').replace(/\s+/g, ' ').trim());
      while (pages.length && !pages[pages.length - 1]) pages.pop();
      if (pages.some(Boolean)) parts.push({ file: f, pages });
    }
    if (!parts.length) continue;
    doctexts.set(e.id, parts);
    const n = parts.reduce((a, p) => a + p.pages.length, 0);
    docPages += n;
    e.doctext = { pages: n };
  }
  if (fs.existsSync(path.join(ROOT, 'media'))) {
    for (const yt of fs.readdirSync(path.join(ROOT, 'media'))) {
      if (fs.existsSync(path.join(ROOT, 'media', yt, 'meta.json')) && !videoByYt.has(yt)) warnings.push(`media/${yt} has no content/video entry`);
    }
  }
  // Link videos to channel sources by channel name
  const sources = entities.filter(e => e.type === 'source');
  for (const v of entities.filter(e => e.type === 'video' && e.channel)) {
    const s = sources.find(s => [s.name, ...(s.channels || [])].some(n => n.toLowerCase() === v.channel.toLowerCase()));
    if (s && !v.rel.some(r => r.id === s.id)) v.rel.push({ label: 'published by', id: s.id });
  }

  // ── Edges ──
  const edges = new Map();
  const linked = new Set(); // "a|b" both directions, for quick "already connected?" checks
  const addEdge = (a, b, label, kind = 'rel', weight = 1) => {
    if (!ent.has(a) || !ent.has(b) || a === b) return;
    linked.add(`${a}|${b}`); linked.add(`${b}|${a}`);
    const key = `${a}|${b}|${label}`;
    if (edges.has(key)) edges.get(key).w += weight;
    else edges.set(key, { s: a, t: b, label, kind, w: weight });
  };
  for (const e of entities) {
    for (const r of e.rel) addEdge(e.id, r.id, r.label);
    for (const f of e.facts) if (f.by && f.by !== e.id) addEdge(f.by, e.id, 'statement about', 'fact');
    for (const m of e.moments || []) {
      for (const ref of m.refs) addEdge(e.id, ref, 'discusses', 'moment');
      if (m.speaker) addEdge(m.speaker, e.id, 'speaks in', 'moment');
    }
  }

  // ── Credibility (the project's sourcing rule) ──
  for (const e of entities.filter(e => e.type === 'person')) {
    const cats = (e.credentials || []).map(c => c.category);
    e.cred = cats.some(c => CREDIBLE.includes(c)) ? 'credible' : cats.some(c => REPORTER.includes(c)) ? 'reporter' : 'outside';
  }
  const nbr = new Map();
  for (const x of edges.values()) { (nbr.get(x.s) || nbr.set(x.s, []).get(x.s)).push(x.t); (nbr.get(x.t) || nbr.set(x.t, []).get(x.t)).push(x.s); }
  const neighbors = id => nbr.get(id) || [];
  for (const e of entities.filter(e => e.type === 'incident')) {
    const via = neighbors(e.id).filter(n => ent.get(n)?.cred === 'credible');
    const documented = e.facts.some(f => f.status === 'documented');
    // Mass-sighting rule: 50+ independent witnesses AND contemporary press/TV/radio coverage
    const mass = (e.witnesses || 0) >= MASS_MIN_WITNESSES && (e.coverage || []).length > 0;
    e.cred = via.length || documented ? 'credible' : mass ? 'mass' : 'outside';
    e.credVia = [...new Set(via)];
    if (e.coverage?.length && !(e.witnesses >= 1)) warnings.push(`${e.file}: coverage listed but no witnesses count`);
  }

  // ── Transcript mentions: find every name/alias in every transcript ──
  const norm = s => s.replace(/[^\p{L}\p{N}']+/gu, ' ');
  const termMap = new Map(); // normalized term → [entity ids]
  for (const e of entities) {
    if (['video', 'source', 'record', 'news'].includes(e.type) || e.nomatch) continue;
    for (const term of new Set([e.name, ...e.aka, ...(e.match || [])])) {
      const n = norm(term).trim();
      if (n.length < 3 || n.length > 60) continue; // long document titles are never spoken verbatim
      const short = n.length <= 4;
      const key = short ? n : n.toLowerCase();
      if (!termMap.has(key)) termMap.set(key, new Set());
      termMap.get(key).add(e.id);
    }
  }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  const sortTerms = ts => ts.sort((a, b) => b.length - a.length).map(esc).join('|');
  const longTerms = [...termMap.keys()].filter(k => k.length > 4);
  const shortTerms = [...termMap.keys()].filter(k => k.length <= 4);
  const reLong = new RegExp(`(?<![\\p{L}\\p{N}])(${sortTerms(longTerms)})(?![\\p{L}\\p{N}])`, 'giu');
  const reShort = shortTerms.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${sortTerms(shortTerms)})(?![\\p{L}\\p{N}])`, 'gu') : null;

  const mentions = {};
  const comention = new Map(); // "a|b" → { n, vid, t } — names said within the same minute
  let mentionCount = 0;
  for (const [vid, t] of transcripts) {
    const segs = t.segments;
    const offsets = [];
    let text = '';
    for (const [, s] of segs) { offsets.push(text.length); text += norm(s) + ' '; }
    const segAt = off => { let lo = 0, hi = offsets.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offsets[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
    const last = new Map();
    const perEntity = new Map();
    const scan = (re, lower) => {
      if (!re) return;
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        const key = norm(m[1]).replace(/\s+/g, ' ').trim();
        const ids = termMap.get(lower ? key.toLowerCase() : key);
        if (!ids) continue;
        const si = segAt(m.index);
        const time = segs[si][0];
        for (const id of ids) {
          if (id === vid) continue;
          if (last.has(id) && time - last.get(id) < 30) continue;
          last.set(id, time);
          const snippet = [segs[si - 1]?.[1], segs[si][1], segs[si + 1]?.[1]].filter(Boolean).join(' ');
          (mentions[id] ||= []).push([vid, time, snippet.slice(0, 240)]);
          perEntity.set(id, (perEntity.get(id) || 0) + 1);
          mentionCount++;
        }
      }
    };
    scan(reLong, true);
    scan(reShort, false);
    // co-mentions: distinct entities named within 60 s of each other in this video
    const hits = [];
    for (const [id, list] of Object.entries(mentions)) for (const [v, time] of list) if (v === vid) hits.push([time, id]);
    hits.sort((a, b) => a[0] - b[0]);
    const seenPair = new Set();
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length && hits[j][0] - hits[i][0] <= 60; j++) {
        const [a, b] = [hits[i][1], hits[j][1]].sort();
        if (a === b) continue;
        const key = `${a}|${b}`;
        const bucket = `${key}|${Math.floor(hits[i][0] / 60)}`;
        if (seenPair.has(bucket)) continue;
        seenPair.add(bucket);
        const c = comention.get(key) || { n: 0, vids: new Set(), vid, t: hits[i][0] };
        c.n++; c.vids.add(vid);
        comention.set(key, c);
      }
    }
    for (const [id, n] of perEntity) if (n >= 3) addEdge(vid, id, 'mentions', 'mention', n);
  }
  const direct = new Set([...edges.values()].filter(x => x.kind !== 'mention').flatMap(x => [`${x.s}|${x.t}`, `${x.t}|${x.s}`]));
  const together = {};
  for (const [key, c] of comention) {
    if (c.n < 2) continue;
    const [a, b] = key.split('|');
    const row = (o) => [o, c.n, c.vids.size, c.vid, c.t, direct.has(key) ? 1 : 0];
    (together[a] ||= []).push(row(b));
    (together[b] ||= []).push(row(a));
  }
  for (const id in together) together[id] = together[id].sort((x, y) => y[1] - x[1]).slice(0, 15);
  // names found in written descriptions (official record blurbs, document summaries)
  let textLinks = 0;
  for (const e of entities) {
    if (!e.body || ['person', 'video', 'source'].includes(e.type)) continue;
    // skip the importer's attribution line ("Official PURSUE description (Department of War / AARO …)")
    const text = norm(e.body.replace(/<p><strong>Official PURSUE description[\s\S]*?<\/p>/, '').replace(/<[^>]+>/g, ' '));
    const found = new Set();
    for (const [re, lower] of [[reLong, true], [reShort, false]]) {
      if (!re) continue;
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        // "National Archives of Brazil" names a different body than "National Archives": skip "<term> of <Name>"
        if (/^\s+of\s+\p{Lu}/u.test(text.slice(m.index + m[0].length))) continue;
        const key = norm(m[1]).replace(/\s+/g, ' ').trim();
        for (const id of termMap.get(lower ? key.toLowerCase() : key) || []) if (id !== e.id) found.add(id);
      }
    }
    const implied = e.type === 'record' ? new Set(['aaro', 'pursue', 'department-of-war']) : new Set(); // annotators/publishers of every record
    for (const id of found) {
      if (linked.has(`${e.id}|${id}`) || implied.has(id)) continue;
      addEdge(e.id, id, 'mentions', 'text');
      textLinks++;
    }
  }
  for (const id in mentions) mentions[id].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1));

  // PURSUE "paired with" links: keep genuine pairs (e.g. a video and its report), drop release-wide cliques
  // (a record "paired with" dozens of others says no more than "released together")
  const pairCount = new Map();
  for (const x of edges.values()) if (x.label === 'paired with') for (const id of [x.s, x.t]) pairCount.set(id, (pairCount.get(id) || 0) + 1);
  for (const [k, x] of edges) if (x.label === 'paired with' && (pairCount.get(x.s) > 8 || pairCount.get(x.t) > 8)) edges.delete(k);

  const stats = {
    entities: entities.length,
    byType: Object.fromEntries([...TYPES, 'source'].map(t => [t, entities.filter(e => e.type === t).length])),
    edges: edges.size, videos: videoByYt.size, transcripts: transcripts.size, mentions: mentionCount, textLinks,
    documents: doctexts.size, documentPages: docPages,
    transcriptHours: Math.round(entities.filter(e => e.transcript).reduce((a, e) => a + (e.duration || 0), 0) / 360) / 10,
  };

  // Explore's starting map (content/explore.json): key files and starting points, ids checked here
  const exploreFile = path.join(ROOT, 'content', 'explore.json');
  const explore = fs.existsSync(exploreFile) ? JSON.parse(fs.readFileSync(exploreFile, 'utf8')) : { core: [], starts: [] };
  for (const id of [...(explore.core || []), ...(explore.starts || []).map(s => s.id)]) {
    const e = byId.get(id);
    if (!e) errors.push(`content/explore.json: unknown id "${id}"`);
    else if (OFF_GRAPH.has(e.type) || ['video', 'source'].includes(e.type)) errors.push(`content/explore.json: "${id}" is not a graph file`);
  }

  if (!quiet || check) {
    for (const w of warnings) console.warn(`  warn  ${w}`);
    for (const er of errors) console.error(`  ERROR ${er}`);
  }
  if (check) return { errors, warnings, stats };

  // ── Write site/data ──
  assignPaths(entities); // real URLs (/person/david-fravor), frozen in content/slugs.json
  assignAdded(entities, raw); // when each entry entered the archive, frozen in content/added.json
  const out = path.join(ROOT, 'site', 'data');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'transcripts'), { recursive: true });
  fs.mkdirSync(path.join(out, 'doctext'), { recursive: true });
  const edgeList = [...edges.values()];
  // graph layout, precomputed (node size = links to other graph nodes, as in the app)
  const isRecord = new Set(entities.filter(e => OFF_GRAPH.has(e.type)).map(e => e.id));
  const degree = new Map();
  for (const x of edgeList) if (x.kind !== 'mention' && !isRecord.has(x.s) && !isRecord.has(x.t)) for (const id of [x.s, x.t]) degree.set(id, (degree.get(id) || 0) + 1);
  const layouts = await computeLayouts(entities, edgeList, id => degree.get(id) || 0);
  fs.writeFileSync(path.join(out, 'layout.js'), `window.KB_LAYOUT=${JSON.stringify(layouts)};\n`);
  // PURSUE record summaries load on demand (records.js), keeping the first download small
  const recordBodies = {};
  const kbEntities = entities.map(e => {
    if (e.type !== 'record' || !e.body) return e;
    recordBodies[e.id] = e.body;
    return { ...e, body: '', bodyLazy: true };
  });
  fs.writeFileSync(path.join(out, 'records.js'), `window.KB_RECORD_BODIES=${JSON.stringify(recordBodies)};window.KBR&&KBR();\n`);
  const kb = { built: new Date().toISOString(), filesBase: process.env.FILES_BASE || null, entities: kbEntities, edges: edgeList, explore: { core: explore.core || [], starts: explore.starts || [] }, stats, warnings, errors };
  fs.writeFileSync(path.join(out, 'kb.js'), `window.KB=${JSON.stringify(kb)};\n`);
  fs.writeFileSync(path.join(out, 'mentions.js'), `window.KB_MENTIONS=${JSON.stringify(mentions)};\nwindow.KB_TOGETHER=${JSON.stringify(together)};\n`);
  for (const [vid, t] of transcripts) {
    fs.writeFileSync(path.join(out, 'transcripts', `${vid}.js`), `window.KBT&&KBT(${JSON.stringify(vid)},${JSON.stringify(t)});\n`);
  }
  for (const [id, parts] of doctexts) {
    fs.writeFileSync(path.join(out, 'doctext', `${id}.js`), `window.KBD&&KBD(${JSON.stringify(id)},${JSON.stringify(parts)});\n`);
  }
  const pageStats = writePages({ entities, edges: edgeList, transcripts, stats, filesBase: process.env.FILES_BASE || null });
  if (!quiet) {
    console.log(`built ${stats.entities} entries, ${stats.edges} links, ${stats.transcripts} transcripts (${stats.transcriptHours} h), ${stats.documents} documents (${stats.documentPages} pages), ${stats.mentions} mentions, ${pageStats.pages} pages (${pageStats.indexed} indexable) — ${Date.now() - t0} ms`);
  }
  return { errors, warnings, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const { errors, warnings, stats } = await build({ check });
  if (check) console.log(`${stats.entities} entries · ${warnings.length} warnings · ${errors.length} errors`);
  process.exit(errors.length ? 1 : 0);
}
