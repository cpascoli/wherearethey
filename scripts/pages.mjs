// Static pages for search engines and sharing: one real URL per view and per file (/person/david-fravor),
// each the app shell plus a server-rendered article (title, description, canonical, JSON-LD, the full content).
// The app hides the article on boot and shows the same file in its own UI; crawlers and no-JS readers get the article.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { pageDates } from './lastmod.mjs';
import { INVERSE } from './relations.mjs';
import { writeCards } from './cards.mjs';

const DEFAULT_IMAGE = '/assets/images/share-default.jpg';
export const SITE_URL = (process.env.SITE_URL || 'https://wherearethey.info').replace(/\/$/, '');

// URL segment per type (singular, readable); records get pages but stay out of search results
export const SEG = {
  person: 'person', incident: 'incident', hearing: 'hearing', program: 'program', organization: 'organization', document: 'document',
  film: 'documentary', book: 'book', record: 'record', video: 'video', event: 'event', concept: 'concept', place: 'place', source: 'source', news: 'news', claim: 'claim',
};
const LABEL = {
  person: 'Person', incident: 'Incident', hearing: 'Hearing / briefing', program: 'Program', organization: 'Organization', document: 'Document',
  film: 'Documentary', book: 'Book', record: 'Official record (PURSUE)', video: 'Video', event: 'Event', concept: 'Concept', place: 'Place', source: 'Channel / source', news: 'News', claim: 'Claim',
};
const PLURAL = {
  person: 'People', incident: 'Incidents', hearing: 'Hearings & briefings', program: 'Programs', organization: 'Organizations', document: 'Documents',
  film: 'Documentaries', book: 'Books', record: 'Official records (PURSUE)', video: 'Videos', event: 'Events', concept: 'Concepts', place: 'Places', source: 'Channels & sources', news: 'News', claim: 'Claims',
};
// app views → paths (keep in sync with VIEW_PATH in app.js)
export const VIEW_PATH = { home: '/', latest: '/latest', graph: '/explore', timeline: '/timeline', map: '/world', videos: '/videos', shelf: '/documentaries', books: '/books', index: '/a-z', claims: '/claims' };
// full transcripts on every video page (switch to a kind check to limit some videos to moments + excerpts)
const FULL_TRANSCRIPT = () => true;
// types whose ids are already clean word slugs; the rest are slugged from their name
const ID_SLUG = new Set(['person', 'organization', 'program', 'concept', 'place', 'source', 'record', 'claim']);

// Latest: what happened recently (by event `date`), and what is new to the archive (by `added`). Keep in sync with app.js.
// baseline: the initial import (git's first commit); entries from it are the archive's starting point, not "recently added"
export const LATEST = { types: ['news', 'video', 'hearing', 'document', 'incident', 'event', 'film', 'book'], windowDays: 90, upcomingDays: 60, addedDays: 60, baseline: '2026-10-17' };
const dayOffset = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);
// the last day an entry's date covers ("2026-10" → 2026-10-31); year-only dates are too coarse for news
const dateEnd = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : /^\d{4}-\d{2}$/.test(d) ? new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).toISOString().slice(0, 10) : null;
export function latestSplit(entities, today = new Date().toISOString().slice(0, 10)) {
  entities = entities.filter(e => !e.noLatest); // `latest: false` in the frontmatter
  const from = dayOffset(today, -LATEST.windowDays), until = dayOffset(today, LATEST.upcomingDays), since = dayOffset(today, -LATEST.addedDays);
  const recent = entities.filter(e => LATEST.types.includes(e.type) && e.date && dateEnd(e.end || e.date) >= from && dateEnd(e.date) && e.date <= until)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.added).localeCompare(String(a.added)));
  const featured = entities.filter(e => e.featured && e.featured >= today).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const inRecent = new Set([...recent, ...featured].map(e => e.id));
  const recentOnly = recent.filter(e => !featured.includes(e));
  const added = entities.filter(e => !inRecent.has(e.id) && !['record', 'source'].includes(e.type) && e.added >= since && e.added > LATEST.baseline)
    .sort((a, b) => String(b.added).localeCompare(String(a.added)) || a.name.localeCompare(b.name));
  return { featured, recent: recentOnly, added };
}

const kebab = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const trimSlug = (s, max = 72) => (s.length <= max ? s : s.slice(0, max).replace(/-[^-]*$/, '')) || s.slice(0, max);

// Slugs are frozen in content/slugs.json once assigned, so renaming an entry never breaks a shared link.
export function assignPaths(entities, { save = !process.env.NETLIFY } = {}) {
  const lockFile = path.join(ROOT, 'content', 'slugs.json');
  const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')) : {};
  const taken = new Set(Object.entries(lock).map(([id, slug]) => slug));
  let added = 0;
  for (const e of [...entities].sort((a, b) => a.id.localeCompare(b.id))) {
    let key = lock[e.id];
    if (!key) {
      let base = trimSlug(ID_SLUG.has(e.type) ? e.id : kebab(e.name) || e.id, 66);
      const year = e.date?.slice(0, 4);
      if (['incident', 'hearing', 'event', 'news'].includes(e.type) && year && !base.includes(year)) base += `-${year}`;
      let slug = base, n = 2;
      while (taken.has(`${e.type}/${slug}`)) slug = `${base}-${n++}`;
      key = `${e.type}/${slug}`;
      taken.add(key);
      // a video still waiting for its metadata is named after its id: don't freeze that slug yet
      if (e.name !== e.id || ID_SLUG.has(e.type)) { lock[e.id] = key; added++; }
    }
    e.path = `/${SEG[e.type]}/${key.split('/')[1]}`;
  }
  if (added && save) fs.writeFileSync(lockFile, JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 0).replace(/","/g, '",\n"') + '\n');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const text = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const clip = (s, n = 158) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
// search snippets: whole sentences up to ~150 characters (no mid-sentence cut), skipping housekeeping lines
const BOILERPLATE = /archive (doesn't|does not) hold|copyrighted|can be bought or borrowed|links above/i;
const ABBREV = /(?:\b[A-Z]|\bU\.S|\bU\.K|\bD\.C|\bDr|\bMr|\bMrs|\bMs|\bLt|\bCol|\bGen|\bCmdr|\bCapt|\bSgt|\bAdm|\bRep|\bSen|\bSt|\bJr|\bNo|\bvs|\bInc|\bCo|\be\.g|\bi\.e|\bret)\.$/;
const sentencesOf = s => {
  const parts = String(s).split(/(?<=[.!?]["”’)]*)\s+(?=["“(]?[A-Z0-9])/), out = [];
  for (const p of parts) (out.length && ABBREV.test(out[out.length - 1]) ? out[out.length - 1] += ' ' + p : out.push(p));
  return out.map(x => x.trim()).filter(x => x && !BOILERPLATE.test(x));
};
const leadSentences = (s, n = 150) => {
  let out = '';
  for (const x of sentencesOf(s)) { if ((out + ' ' + x).trim().length > n) break; out = (out + ' ' + x).trim(); }
  return out || clip(sentencesOf(s).join(' ') || s, n);
};
// what a searcher gets from a file, appended to its title (kept short so the whole title shows in results)
// /claims order: statements made first-hand or from documents, then volume (keep in sync with app.js)
const offGraph = t => t === 'record' || t === 'news' || t === 'claim'; // not graph nodes (as in app.js)
// books: the summary's opening paragraph is shown in the header, beside the cover (as a person's bio is), so the space
// beside the cover isn't left empty; the Summary keeps the rest, or is left out when only its Sources line remains
// (`only`: the rest is shown under the lead). Same rule as bookLead() in app.js.
export function bookLead(e) {
  if (e.type !== 'book' || !e.body) return null;
  const m = String(e.body).match(/^\s*<p>([\s\S]*?)<\/p>\s*/);
  if (!m || /^<em>Sources?:/.test(m[1])) return null;
  const rest = e.body.slice(m[0].length).trim();
  return { lead: m[1], rest, only: !rest || /^<p><em>Sources?:[\s\S]*<\/p>$/.test(rest) && rest.split('<p>').length === 2 };
}
const claimWeight = c => c.assertions.filter(a => a.basis === 'first-hand' || a.basis === 'documented').length;
const claimOrder = (a, b) => claimWeight(b) - claimWeight(a) || b.assertions.length - a.assertions.length;
const CLAIM_LABEL = { open: 'Open', disputed: 'Disputed', supported: 'Supported by records', refuted: 'Refuted' };
const STANCE_LABEL = { supports: 'says so', disputes: 'disputes it', context: 'context' };
const TITLE_SUFFIX = { person: 'testimony & sources', program: 'claims & evidence', incident: 'witnesses & evidence', hearing: 'testimony & transcript', document: 'text & key findings', video: 'transcript & key moments', claim: 'who said it, and the evidence' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// the PURSUE explainer, as the app draws it (pursueSections in app.js); the next release's window as of the build
const PU_AGENCY = { 'Department of War': 'War', 'Department of State': 'State', 'Department of Energy': 'Energy', 'Office of the Director of National Intelligence': 'ODNI', 'Executive Office of the President': 'White House', 'Local Law Enforcement': 'Local police', 'Intelligence Community Agency': 'IC agency', 'U.S. Government': 'U.S. Gov.' };
function pursueHtml(s, today = new Date().toISOString().slice(0, 10)) {
  const last = s.releases.at(-1), x = s.next;
  const next = !x ? '' : today < x.earliest ? `next, not announced; on past form ${fmtDate(x.earliest).replace(/ \d{4}$/, '')} – ${fmtDate(x.latest)}`
    : today <= x.latest ? `next, not announced; on past form due by ${fmtDate(x.latest)}` : `next, not announced; later than any gap so far (${s.gaps.max} days)`;
  const rows = [...s.releases].reverse().map(r => `<tr><td>${r.event ? `<a href="${r.eventPath}">Release ${r.n}</a>` : `Release ${r.n}`}</td><td>${fmtDate(r.date)}</td><td class="n">${r.records}</td><td class="n">${r.video}</td><td class="n pu-wide">${r.gap ?? '–'}</td><td class="pu-wide pu-ag">${r.agencies.map(([a, n]) => `<span title="${esc(a)}">${esc(PU_AGENCY[a] || a)} ${n}</span>`).join(' · ')}</td></tr>`).join('');
  return `<h2>Every release</h2><div class="pu"><div class="pu-stats"><div><b>${s.releases.length}</b><span>releases</span></div><div><b>${s.total}</b><span>records</span></div><div><b>Release ${last.n}</b><span>latest, ${fmtDate(last.date)}</span></div><div><b>Release ${x ? x.n : last.n + 1}</b><span>${esc(next)}</span></div></div>`
    + `<table class="pu-table"><thead><tr><th>Release</th><th>Date</th><th class="n">Records</th><th class="n">Video &amp; audio</th><th class="n pu-wide">Gap (days)</th><th class="pu-wide">From</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + `<p class="pu-note">Counted from the records on war.gov/UFO, each with a page here. ${s.gaps ? `Releases have come ${s.gaps.min} to ${s.gaps.max} days apart (median ${s.gaps.median}); the window for the next is our estimate, not an official schedule.` : ''}</p>`;
}
const fmtDate = d => { if (!d) return ''; const [y, m, day] = d.split('-'); return [day && +day, m && MONTHS[+m - 1], y].filter(Boolean).join(' '); };
const hms = t => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`; };
const isoDur = s => s ? `PT${Math.floor(s / 3600) ? Math.floor(s / 3600) + 'H' : ''}${Math.floor(s / 60) % 60}M${Math.floor(s % 60)}S` : undefined;

export function writePages({ entities, edges, transcripts, stats, filesBase }) {
  const site = path.join(ROOT, 'site');
  // Versioned code and data: each URL carries a hash of the file, so a deploy changes only the URLs of what changed and
  // browsers never run stale code (the files can then be cached for a year, see netlify.toml). BUILD changes with any
  // of them; open tabs compare it with /version.json to notice a new deploy (app.js).
  const hashOf = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(site, f))).digest('hex').slice(0, 10);
  const BOOT = ['data/kb.js', 'data/mentions.js', 'data/layout.js', 'assets/app.js'];
  const ver = Object.fromEntries([...BOOT, 'assets/app.css', 'data/records.js'].map(f => [f, hashOf(f)]));
  const build = crypto.createHash('sha1').update(Object.values(ver).join()).digest('hex').slice(0, 10);
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'app.html'), 'utf8')
    .replace('/*V:app.css*/', ver['assets/app.css'])
    .replace('/*BUILD*/', build)
    .replace('/*BOOT_FILES*/[]', JSON.stringify(BOOT.map(f => [`/${f}?v=${ver[f]}`, fs.statSync(path.join(site, f)).size])));
  fs.writeFileSync(path.join(site, 'version.json'), JSON.stringify({ build }) + '\n');
  const byId = new Map(entities.map(e => [e.id, e]));
  const fileUrl = f => (/^https?:\/\//.test(f) ? f : filesBase ? `${filesBase.replace(/\/$/, '')}/${f}` : `/${f}`);
  const link = id => { const e = byId.get(id); return e ? `<a href="${e.path}">${esc(e.name)}</a>` : esc(id); };
  const videoUrl = (v, t) => (v.youtube ? `https://www.youtube.com/watch?v=${v.youtube}${t ? `&t=${Math.floor(t)}s` : ''}` : v.url || null);
  const thumbOf = v => (v.youtube ? `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg` : v.thumb ? fileUrl(v.thumb) : null);
  const imageOf = e => (e.cover ? SITE_URL + e.cover : e.image ? SITE_URL + e.image : e.type === 'video' ? thumbOf(e) : null);
  const sourceHtml = s => {
    if (!s) return '';
    if (s.url) { let host = s.url; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch {} return `<a href="${esc(s.url)}" rel="noopener">${esc(host)}</a>${/(^|\.)archive\.org\//i.test(s.url.replace(/^https?:\/\//i, '')) ? '' : ` (<a href="https://web.archive.org/web/${esc(s.url)}" rel="noopener nofollow">archived</a>)`}`; }
    if (s.file) return `<a href="${esc(fileUrl(s.file))}">${esc(s.file.split('/').pop())}</a>`;
    const e = byId.get(s.id);
    if (!e) return esc(s.id);
    return s.t != null ? `<a href="${e.path}?t=${Math.floor(s.t)}">${esc(e.name)} at ${hms(s.t)}</a>` : link(s.id);
  };
  const factsHtml = facts => `<ul class="ssr-facts">${facts.map(f => `<li><span class="ssr-st ssr-${f.status}">${f.status}</span> ${esc(f.text)}${f.by ? ` <span class="ssr-by">— ${link(f.by)}</span>` : ''}${f.source ? ` <span class="ssr-src">Source: ${sourceHtml(f.source)}</span>` : ''}</li>`).join('')}</ul>`;

  // neighbours per entity (direct links; transcript/text mentions listed separately)
  const near = new Map();
  for (const x of edges) for (const [a, b, dir] of [[x.s, x.t, 'out'], [x.t, x.s, 'in']]) (near.get(a) || near.set(a, []).get(a)).push({ other: b, label: x.label, shown: dir === 'out' ? x.label : (INVERSE[x.label] || x.label), kind: x.kind, dir, note: x.note });
  // how many video moments feature each file (as speaker, or linked in refs), for search snippets
  const momentsAbout = new Map();
  for (const v of entities) for (const m of v.moments || []) for (const id of new Set([m.speaker, ...(m.refs || [])].filter(Boolean))) momentsAbout.set(id, (momentsAbout.get(id) || 0) + 1);

  const pages = []; // { path, title, description, body, jsonld, image, noindex, type }
  const cardJobs = [];
  const nav = `<nav class="ssr-nav">${Object.entries({ Home: '/', Latest: '/latest', Explore: '/explore', Timeline: '/timeline', World: '/world', Videos: '/videos', Documentaries: '/documentaries', Books: '/books', 'A–Z index': '/a-z', Claims: '/claims', About: '/about' }).map(([l, h]) => `<a href="${h}">${l}</a>`).join(' · ')}</nav>`;

  for (const e of entities) {
    const h = [];
    const kicker = [LABEL[e.type], fmtDate(e.date) + (e.end ? ` – ${fmtDate(e.end)}` : ''), e.place?.name].filter(Boolean).join(' · ');
    h.push(`<nav class="ssr-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/a-z#${e.type}">${PLURAL[e.type]}</a> › ${esc(e.name)}</nav>`);
    h.push(`<p class="ssr-kicker">${esc(kicker)}</p>`);
    // as in the app, an explanation note sits above the title, so the picture below doesn't move down when the app takes over
    if (e.outcome && e.outcome !== 'open') {
      const lbl = { disputed: 'Partly explained', explained: 'Explained', hoax: 'Hoax' }[e.outcome];
      const src = e.outcomeSource?.id ? ` (${link(e.outcomeSource.id)})` : e.outcomeSource?.url ? ` (<a href="${esc(e.outcomeSource.url)}" rel="noopener">source</a>)` : '';
      h.push(`<p class="ssr-outcome outcome-${e.outcome}"><strong>${lbl}.</strong> ${esc(e.outcomeNote || '')}${src}</p>`);
    }
    // people with a portrait, and books with a cover: the title block on the left, the picture on the right (below on phones),
    // as in the app's header, so the page doesn't rearrange itself when the app takes over
    const bLead = bookLead(e); // books: the summary's opening paragraph, shown beside the cover (as a person's bio is)
    const head = [];
    head.push(`<h1>${esc(e.name)}</h1>`);
    if (e.credentials?.length) head.push(`<ul class="ssr-creds">${e.credentials.map(c => `<li>${esc(c.role || c.category)}</li>`).join('')}</ul>`);
    if (e.bio) head.push(`<p class="ssr-lead">${e.bio}</p>`); // a person's short bio, as in the app's header
    if (!offGraph(e.type)) head.push(`<p class="ssr-explore"><a href="${e.path}?explore">◎ Explore from here</a></p>`); // as the app's button (same place, same height)
    if (e.aka?.length) head.push(`<p class="ssr-aka">Also known as ${e.aka.map(esc).join(', ')}</p>`);
    if (e.type === 'book') head.push(`<p class="ssr-meta">${[e.credits, e.publisher, e.pages && `${e.pages} pages`, e.isbn && `ISBN ${e.isbn}`].filter(Boolean).map(esc).join(' · ')}</p>`);
    if (e.type === 'film') head.push(`<p class="ssr-meta">${[e.credits, e.runtime && `${e.runtime} min`].filter(Boolean).map(esc).join(' · ')}</p>`);
    if (bLead) head.push(`<p class="ssr-lead">${bLead.lead}</p>${bLead.only ? `<div class="ssr-lead-src">${bLead.rest}</div>` : ''}`);
    const pic = e.portrait ? `<figure class="ssr-portrait"><img src="${esc(e.portrait)}" alt="${esc(e.imageCaption || e.name)}" width="220" height="275" fetchpriority="high">${e.imageCaption ? `<figcaption>${esc(e.imageCaption)}</figcaption>` : ''}</figure>`
      : e.cover ? `<img class="ssr-cover" src="${esc(e.cover)}" alt="Cover of ${esc(e.name)}" width="200">` : '';
    h.push(pic ? `<div class="ssr-head ${e.portrait ? 'has-portrait' : 'has-cover'}"><div class="ssr-head-main">${head.join('')}</div>${pic}</div>` : `<div class="ssr-head">${head.join('')}</div>`);
    if (!e.portrait && e.image) h.push(`<figure><img src="${esc(e.image)}" alt="${esc(e.imageCaption || e.name)}" width="800" fetchpriority="high">${e.imageCaption ? `<figcaption>${esc(e.imageCaption)}</figcaption>` : ''}</figure>`);
    if (e.type === 'video') {
      const url = videoUrl(e);
      h.push(`<p>${[e.channel, fmtDate(e.date), e.duration && `${Math.round(e.duration / 60)} min`].filter(Boolean).map(esc).join(' · ')}${url ? ` · <a href="${esc(url)}" rel="noopener">Watch the original</a>` : ''}</p>`);
    }
    if (e.type === 'news' && e.url) h.push(`<p>${[e.kind, e.outlet].filter(Boolean).map(esc).join(' · ')} · <a href="${esc(e.url)}" rel="noopener">Original source</a></p>`);
    if (e.type === 'claim') {
      const src = e.statusSource?.id ? ` (${link(e.statusSource.id)})` : e.statusSource?.url ? ` (<a href="${esc(e.statusSource.url)}" rel="noopener">source</a>)` : '';
      h.push(`<p class="ssr-outcome"><strong>${CLAIM_LABEL[e.status]}.</strong> ${esc(e.statusNote || '')}${src}</p>`);
    }
    const body = bLead ? (bLead.only ? '' : bLead.rest) : e.body; // a book's opening paragraph is in the header already
    if (body) h.push(`<h2>${e.type === 'person' ? 'Profile' : 'Summary'}</h2><div class="ssr-body">${body}</div>`); // headed as in the app
    if (e.pursueStats?.releases?.length) {
      for (const r of e.pursueStats.releases) r.eventPath = r.event && byId.get(r.event)?.path;
      h.push(pursueHtml(e.pursueStats));
    }
    if (e.faq?.length) h.push(`<h2>Questions</h2><dl class="faq">${e.faq.map(q => `<dt>${esc(q.q)}</dt><dd>${q.a}</dd>`).join('')}</dl>`);
    if (e.pursueStats?.about?.length) h.push(`<h2>What the records concern</h2><ul>${e.pursueStats.about.filter(([id]) => byId.has(id)).map(([id, n]) => `<li>${link(id)} <span class="ssr-by">(${n} record${n > 1 ? 's' : ''})</span></li>`).join('')}</ul>`);
    if (e.glimpses?.length) h.push(`<h2>Glimpses</h2>${e.glimpses.map(g => `<blockquote${g.url ? ` cite="${esc(g.url)}"` : ''}><p>${esc(g.text)}</p><footer>${esc(g.where)}${g.url ? `${g.where ? ' · ' : ''}<a href="${esc(g.url)}" rel="noopener">${esc(g.via || 'source')}</a>` : ''}</footer></blockquote>`).join('\n')}`);
    if (e.type === 'claim') {
      // the evidence filed on the claim, and its links to other claims (as on the claim page in the app)
      const rels = (near.get(e.id) || []).filter(x => x.kind === 'rel');
      const li = x => `<li>${link(x.other)}${x.note ? `: ${esc(x.note)}` : ''}</li>`;
      for (const [title, re] of [['Evidence for', /^evidence for$/], ['Evidence against', /^evidence against$/], ['Comment', /^comments (by|on claim)$/]]) {
        const xs = rels.filter(x => re.test(x.shown));
        if (xs.length) h.push(`<h2>${title}</h2><ul>${xs.map(li).join('')}</ul>`);
      }
      const related = rels.filter(x => byId.get(x.other)?.type === 'claim');
      if (related.length) h.push(`<h2>Related claims</h2><ul>${related.map(x => `<li>${esc(x.shown)}: ${link(x.other)} (${esc(CLAIM_LABEL[byId.get(x.other).status])})</li>`).join('')}</ul>`);
    }
    if (e.type === 'claim' && e.assertions?.length) {
      h.push(`<h2>Who has said it, in order</h2><ol class="ssr-facts">${e.assertions.map(a => `<li>${a.date ? `<strong>${esc(fmtDate(a.date))}</strong> ` : ''}${a.by ? link(a.by) : ''}${a.via ? ` (as reported by ${link(a.via)})` : ''} — <em>${esc([STANCE_LABEL[a.stance], a.basis].filter(Boolean).join(', '))}</em>: ${esc(a.text)}${a.source ? ` <span class="ssr-src">Source: ${sourceHtml(a.source)}</span>` : ''}</li>`).join('')}</ol>`);
    }
    if (e.facts.length) h.push(`<h2>Facts and claims</h2>${factsHtml(e.facts)}`);
    if (e.type === 'video' && e.moments?.length) {
      h.push(`<h2>Key moments</h2><ol class="ssr-moments">${e.moments.map(m => `<li><a href="${e.path}?t=${Math.floor(m.t)}">${hms(m.t)}</a> ${m.speaker ? `${link(m.speaker)}: ` : ''}${esc(m.text)}</li>`).join('')}</ol>`);
    }
    // a hearing, event or news page lists the moments of its recordings, linked into each video
    if (['hearing', 'event', 'news'].includes(e.type)) {
      const recs = (near.get(e.id) || []).filter(x => x.dir === 'in' && x.label === 'recording of' && byId.get(x.other)?.moments?.length).map(x => byId.get(x.other))
        .sort((a, b) => (a.part || 0) - (b.part || 0));
      // the moments tagged to the hearing or event itself are its highlights, listed first
      const hi = recs.flatMap(v => v.moments.filter(m => m.refs.includes(e.id)).map(m => [v, m]));
      if (hi.length) h.push(`<h2>Highlights</h2><ol class="ssr-moments">${hi.map(([v, m]) => `<li><a href="${v.path}?t=${Math.floor(m.t)}">${hms(m.t)}</a> ${m.speaker ? `${link(m.speaker)}: ` : ''}${esc(m.text)}</li>`).join('')}</ol>`);
      for (const v of recs) h.push(`<h2>Key moments: ${esc(v.name)}</h2><ol class="ssr-moments">${v.moments.map(m => `<li><a href="${v.path}?t=${Math.floor(m.t)}">${hms(m.t)}</a> ${m.speaker ? `${link(m.speaker)}: ` : ''}${esc(m.text)}</li>`).join('')}</ol>`);
    }
    // a hearing transcript lists the moments of the hearing's recordings; a written statement, those of its author
    if (e.type === 'document') {
      const out = (near.get(e.id) || []).filter(x => x.dir === 'out');
      const recsOf = id => byId.get(id)?.type === 'video' ? [byId.get(id)] : (near.get(id) || []).filter(x => x.dir === 'in' && x.label === 'recording of').map(x => byId.get(x.other)).filter(v => v?.type === 'video');
      const authors = new Set(out.filter(x => x.label === 'authored by').map(x => x.other));
      const groups = [
        ...out.filter(x => x.label === 'transcript of').flatMap(x => recsOf(x.other)).map(v => [v, v.moments || []]),
        ...(authors.size ? out.filter(x => x.label === 'submitted to').flatMap(x => recsOf(x.other)).map(v => [v, (v.moments || []).filter(m => authors.has(m.speaker))]) : []),
      ];
      for (const [v, ms] of groups) if (ms.length) h.push(`<h2>Key moments: ${esc(v.name)}</h2><ol class="ssr-moments">${ms.map(m => `<li><a href="${v.path}?t=${Math.floor(m.t)}">${hms(m.t)}</a> ${m.speaker ? `${link(m.speaker)}: ` : ''}${esc(m.text)}</li>`).join('')}</ol>`);
    }
    const t = transcripts.get(e.id);
    if (t && FULL_TRANSCRIPT(e)) {
      // paragraphs of roughly a minute, each with its timestamp
      const paras = [];
      let cur = null;
      for (const [time, s] of t.segments) {
        if (!cur || time - cur.t >= 60) { cur = { t: time, s: [] }; paras.push(cur); }
        cur.s.push(s);
      }
      const src = { 'youtube-auto': 'automatic captions', youtube: 'published captions', whisper: 'machine transcription (Whisper)', 'whisper-translated': 'machine translation to English (Whisper)', translation: 'English translation of the published subtitles' }[t.source] || 'transcript';
      h.push(`<h2>Transcript</h2><p class="ssr-note">From ${esc(src)}; names and terms may be misspelled. Check the original video before quoting.</p><div class="ssr-transcript">${paras.map(p => `<p><a href="${e.path}?t=${Math.floor(p.t)}">${hms(p.t)}</a> ${esc(p.s.join(' '))}</p>`).join('')}</div>`);
    }
    // related files, grouped by type
    const rel = (near.get(e.id) || []).filter(x => !['mention', 'text'].includes(x.kind) && byId.has(x.other));
    const groups = new Map();
    for (const x of rel) { const o = byId.get(x.other); if (!groups.has(o.type)) groups.set(o.type, new Map()); if (!groups.get(o.type).get(o.id)?.note) groups.get(o.type).set(o.id, x); }
    if (groups.size) {
      h.push(`<h2>Connected files</h2>${[...groups].map(([type, m]) => `<h3>${PLURAL[type]}</h3><ul>${[...m].map(([id, x]) => `<li>${link(id)} <span class="ssr-by">(${esc(x.shown)})</span>${x.note ? ` — ${esc(x.note)}` : ''}</li>`).join('')}</ul>`).join('')}`);
    }
    // names found in transcripts and in document text, both ways
    const mentions = (near.get(e.id) || []).filter(x => ['mention', 'text'].includes(x.kind) && byId.has(x.other));
    const uniq = xs => [...new Set(xs.map(x => x.other))];
    const inVideos = uniq(mentions.filter(x => x.dir === 'in' && byId.get(x.other).type === 'video'));
    const inText = uniq(mentions.filter(x => x.dir === 'in' && byId.get(x.other).type !== 'video'));
    const named = uniq(mentions.filter(x => x.dir === 'out'));
    if (named.length) h.push(`<h2>${e.type === 'video' ? 'Mentioned in this video' : 'Mentioned in this file'}</h2><ul>${named.map(id => `<li>${link(id)} <span class="ssr-by">(${esc(LABEL[byId.get(id).type])})</span></li>`).join('')}</ul>`);
    if (inVideos.length) h.push(`<h2>Mentioned in videos</h2><ul>${inVideos.map(id => `<li>${link(id)}</li>`).join('')}</ul>`);
    if (inText.length) h.push(`<h2>Mentioned in documents and records</h2><ul>${inText.map(id => `<li>${link(id)}</li>`).join('')}</ul>`);
    // a few sideways links: same type, ranked by shared tags and shared connections (same people, cases, channels)
    if (e.type !== 'record') {
      const tags = new Set(e.tags);
      const linkedIds = new Set((near.get(e.id) || []).map(x => x.other));
      const more = entities.filter(o => o.type === e.type && o.id !== e.id && !linkedIds.has(o.id))
        .map(o => [o, o.tags.filter(t => tags.has(t)).length * 3 + new Set((near.get(o.id) || []).map(x => x.other).filter(id => linkedIds.has(id))).size]).filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || String(b[0].date || '').localeCompare(String(a[0].date || ''))).slice(0, 6).map(([o]) => o.id);
      if (more.length) h.push(`<h2>More ${PLURAL[e.type].toLowerCase()}</h2><ul>${more.map(id => `<li>${link(id)}</li>`).join('')}</ul>`);
    }
    if (e.links.length) h.push(`<h2>Links</h2><ul>${e.links.map(l => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label || l.url)}</a></li>`).join('')}</ul>`);
    if (e.files.length) h.push(`<h2>Files</h2><ul>${e.files.map(f => `<li><a href="${esc(fileUrl(f))}">${esc(f.split('/').pop())}</a></li>`).join('')}</ul>`);

    const lead = leadSentences(text(e.bio) || text(e.body) || e.facts.map(f => f.text).join(' ') || (e.type === 'video' ? e.moments?.map(m => m.text).join(' ') || e.description || '' : '') || `${LABEL[e.type]} in the Where Are They UAP / NHI case archive.`);
    // the snippet says what the page holds: sourced claims and timestamped video moments
    const nMoments = e.type === 'video' ? (e.moments || []).length : (momentsAbout.get(e.id) || 0);
    const holds = [e.facts.length && `${e.facts.length} sourced claim${e.facts.length > 1 ? 's' : ''}`, nMoments && `${nMoments} timestamped video moment${nMoments > 1 ? 's' : ''}`].filter(Boolean);
    const withHolds = holds.length ? `${lead} ${holds.join(', ').replace(/^./, c => c.toUpperCase())}.` : lead;
    const description = e.seoDescription || (withHolds.length <= 160 ? withHolds : lead);
    const authors = e.type === 'book' ? (near.get(e.id) || []).filter(x => /^authored( by)?$/.test(x.label) && byId.get(x.other)?.type === 'person').map(x => byId.get(x.other).name) : [];
    const autoTitle = e.type === 'book' && authors.length && `${e.name} by ${authors.join(', ')}`.length <= 70 ? `${e.name} by ${authors.join(', ')}`
      : TITLE_SUFFIX[e.type] && e.name.length + TITLE_SUFFIX[e.type].length + 2 <= 62 ? `${e.name}: ${TITLE_SUFFIX[e.type]}`
      : e.name.length <= 55 ? `${e.name} · ${LABEL[e.type]}` : e.name;
    const title = e.seoTitle || autoTitle;
    let jsonld = null;
    if (e.type === 'person') jsonld = { '@type': 'Person', name: e.name, alternateName: e.aka?.length ? e.aka : undefined, jobTitle: e.credentials?.map(c => c.role).filter(Boolean).join('; ') || undefined, description, sameAs: e.links.map(l => l.url).filter(u => /wikipedia\.org/.test(u)) };
    const day = [e.date, e.uploaded].find(d => /^\d{4}-\d{2}-\d{2}$/.test(d || ''));
    if (e.type === 'video' && thumbOf(e) && day) {
      jsonld = { '@type': 'VideoObject', name: e.name, description, thumbnailUrl: thumbOf(e), uploadDate: day, duration: isoDur(e.duration), embedUrl: e.youtube ? `https://www.youtube.com/embed/${e.youtube}` : undefined, url: SITE_URL + e.path };
      if (t && FULL_TRANSCRIPT(e)) jsonld.transcript = clip(t.segments.map(s => s[1]).join(' '), 50000);
      // curated moments as Clips, so search can show them as "key moments" that open the page at ?t=
      const ms = [...(e.moments || [])].filter(m => m.t != null).sort((a, b) => a.t - b.t).filter((m, i, a) => i === 0 || Math.floor(m.t) > Math.floor(a[i - 1].t));
      const end = e.duration ? Math.floor(e.duration) : Infinity;
      const clips = ms.map((m, i) => {
        const start = Math.floor(m.t), stop = Math.min(i + 1 < ms.length ? Math.floor(ms[i + 1].t) : start + 90, start + 300, end);
        const who = m.speaker && byId.get(m.speaker)?.name;
        return stop > start && { '@type': 'Clip', name: clip(who && !m.text.startsWith(who.split(' ').pop()) ? `${who}: ${m.text}` : m.text, 110), startOffset: start, endOffset: stop, url: `${SITE_URL}${e.path}?t=${start}` };
      }).filter(Boolean);
      if (clips.length) jsonld.hasPart = clips;
    }
    if (e.type === 'book') jsonld = { '@type': 'Book', name: e.name, isbn: e.isbn, numberOfPages: e.pages ? +e.pages : undefined, publisher: e.publisher, datePublished: e.date, description };
    const faq = e.faq?.length && { '@type': 'FAQPage', mainEntity: e.faq.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: text(q.a) } })) };
    if (e.type === 'film') jsonld = { '@type': 'Movie', name: e.name, dateCreated: e.date, description, image: imageOf(e) || undefined };
    const crumbs = { '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], [PLURAL[e.type], `/a-z#${e.type}`], [e.name, e.path]].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + p })) };
    jsonld = [jsonld, faq, crumbs].filter(Boolean);
    // a share card for files without a picture of their own (scripts/cards.mjs)
    let image = imageOf(e);
    if (!image && e.type !== 'record') {
      const seen = new Set([e.id]);
      const neighbours = (near.get(e.id) || []).filter(x => x.kind !== 'mention' && byId.get(x.other) && !['record', 'news'].includes(byId.get(x.other).type) && !seen.has(x.other) && seen.add(x.other))
        .map(x => byId.get(x.other)).sort((a, b) => (a.type === 'video') - (b.type === 'video') || (near.get(b.id)?.length || 0) - (near.get(a.id)?.length || 0)).slice(0, 8).map(o => ({ name: o.name, type: o.type }));
      const when = [fmtDate(e.date) + (e.end ? ` – ${fmtDate(e.end)}` : ''), e.place?.name].filter(Boolean).join(' · ');
      const line = e.type === 'person' ? (e.credentials || []).map(c => c.role).filter(Boolean).slice(0, 2).join('; ') : e.type === 'claim' ? (CLAIM_LABEL[e.status] || '') : when || (lead.match(/^.*?[.!?](\s|$)/)?.[0] || lead).trim();
      const nLinks = new Set((near.get(e.id) || []).map(x => x.other)).size;
      const holdsCard = [...holds, nLinks && `${nLinks} connection${nLinks > 1 ? 's' : ''}`].filter(Boolean);
      const file = `cards${e.path}.png`;
      cardJobs.push({ file, card: { type: e.type, label: LABEL[e.type].replace(/ \(PURSUE\)$/, ''), name: e.name, line, holds: holdsCard, neighbours } });
      image = `${SITE_URL}/${file}`;
    }
    pages.push({ path: e.path, file: e.file, title, description, body: h.join('\n'), jsonld, image, noindex: e.type === 'record', type: e.type === 'video' ? 'video.other' : 'article', pre: e.type !== 'video',
      // a long title over a short text, with no picture: the title is the page's largest paint, so its face (600) must be there for the first paint too
      boldFirst: !e.portrait && !e.image && !e.cover && (e.name.length > 60 || text(e.body).length < 350) });
  }
  const cardsRendered = writeCards(site, cardJobs);

  // ── views ──
  const listOf = (items, extra = () => '') => `<ul>${items.map(e => `<li>${link(e.id)}${extra(e)}</li>`).join('')}</ul>`;
  const newest = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  const ofType = t => entities.filter(e => e.type === t);
  const intro = `An open, sourced archive of what officials, pilots, radar operators, intelligence officers and scientists have said on the record about unidentified anomalous phenomena (UAP) and non-human intelligence: ${stats.byType.person} people, ${stats.byType.incident} incidents, ${stats.byType.hearing} hearings, ${stats.videos} videos with ${stats.transcriptHours} hours of transcripts, and every claim with its status and source.`;
  const typeOrder = ['person', 'incident', 'hearing', 'program', 'organization', 'document', 'event', 'concept', 'place', 'film', 'book', 'video', 'source'];
  const today = new Date().toISOString().slice(0, 10);
  const { featured, recent, added } = latestSplit(entities, today);
  const kindOf = e => (e.type === 'news' ? `${e.kind[0].toUpperCase()}${e.kind.slice(1)}` : LABEL[e.type]);
  const summaryOf = e => clip(text(e.bio) || text(e.body) || e.facts[0]?.text || (e.moments || []).map(m => m.text).join(' ') || '', 220);
  const latestLi = (e, when) => `<li><span class="ssr-by">${esc(when)} · ${esc(kindOf(e))}</span> ${link(e.id)}${summaryOf(e) ? `<br><span class="ssr-note">${esc(summaryOf(e))}</span>` : ''}</li>`;
  const latestBody = `<h1>Latest</h1><p>What has happened recently in the UAP / NHI record (hearings, interviews, statements, official releases, new incidents), sorted by when it happened, followed by older material newly added to the archive. Subscribe with the <a href="/feed.xml">RSS feed</a>.</p>`
    + (featured.length ? `<h2>Featured</h2><ul>${featured.map(e => latestLi(e, fmtDate(e.date))).join('')}</ul>` : '')
    + `<h2>Latest</h2>${recent.length ? `<ul>${recent.map(e => latestLi(e, fmtDate(e.date) + (e.date > today ? ' (upcoming)' : ''))).join('')}</ul>` : '<p>Nothing in the last 90 days yet.</p>'}`
    + `<h2>Recently added to the archive</h2><ul>${added.slice(0, 60).map(e => latestLi(e, `${fmtDate(e.date) || 'undated'} · added ${fmtDate(e.added)}`)).join('')}</ul>`;
  const views = {
    latest: ['Latest', 'The latest UAP / NHI hearings, interviews, statements, official releases and incidents, and the newest additions to the archive.', latestBody],
    home: ['Where Are They — UAP / NHI case archive', intro, `<h1>Where are they?</h1><p>${esc(intro)}</p><h2>Start here</h2><ul><li><a href="/videos">Videos: hearings, interviews and archival footage with transcripts</a></li><li><a href="/claims">Claims ledger: every claim and its status</a></li><li><a href="/a-z">A–Z index of every file</a></li><li><a href="/documentaries">Documentaries</a></li><li><a href="/books">Books</a></li></ul><h2>Hearings &amp; briefings</h2>${listOf(ofType('hearing').sort(newest), e => e.date ? ` (${esc(fmtDate(e.date))})` : '')}<h2>Programs</h2>${listOf(ofType('program'))}`],
    graph: ['Explore the network', 'An interactive map of the people, programs, incidents, hearings and documents in the UAP / NHI record, and how they connect.', `<h1>Explore the network</h1><p>An interactive map of the people, programs, incidents, hearings and documents in the record, and how they connect. Every file is also listed in the <a href="/a-z">A–Z index</a>.</p>`],
    timeline: ['Timeline', 'UAP / NHI incidents, hearings, programs and events in chronological order.', `<h1>Timeline</h1>${listOf(entities.filter(e => e.date && ['incident', 'hearing', 'event', 'program'].includes(e.type)).sort((a, b) => String(a.date).localeCompare(String(b.date))), e => ` (${esc(fmtDate(e.date))})`)}`],
    map: ['World map', 'Where UAP incidents and related events took place, on a world map.', `<h1>World map</h1>${listOf(entities.filter(e => e.place && e.type !== 'record'), e => ` (${esc(e.place.name)})`)}`],
    videos: ['Videos', `Congressional hearings, interviews and archival footage about UAP, with synced transcripts and curated moments: ${stats.videos} videos, ${stats.transcriptHours} hours transcribed.`, `<h1>Videos</h1>${listOf(ofType('video').sort(newest), e => ` (${[e.channel, fmtDate(e.date)].filter(Boolean).map(esc).join(', ')})`)}`],
    shelf: ['Documentaries', 'Documentaries about UAP featuring people on the record, with trailers and where to watch them.', `<h1>Documentaries</h1>${listOf(ofType('film').sort(newest).sort((a, b) => !!b.shelfFeatured - !!a.shelfFeatured))}`],
    books: ['Books', 'Books about UAP written by or about people on the record, with where to find them.', `<h1>Books</h1>${listOf(ofType('book').sort(newest).sort((a, b) => !!b.shelfFeatured - !!a.shelfFeatured))}`],
    index: ['UAP archive A–Z: people, incidents, hearings, documents', 'Every file in the UAP / NHI archive, A to Z: officials and witnesses, incidents, congressional hearings, Pentagon programs, documents and official records.', `<h1>A–Z index</h1>${[...typeOrder, 'record'].map(t => `<h2 id="${t}">${PLURAL[t]}</h2>${listOf(ofType(t).sort((a, b) => a.name.localeCompare(b.name)))}`).join('')}`],
    claims: ['UAP claims: who said it, in order, and the evidence', 'Key UAP claims, from crash retrievals to hidden programs: open, disputed or supported, who said it first, how they know, and the evidence for and against.', `<h1>Claims</h1><p>The key claims in the UAP / NHI debate, each with everyone on file who has said it, in order, how they know, and the evidence for and against.</p>${listOf(ofType('claim').sort(claimOrder), e => ` (${esc(CLAIM_LABEL[e.status])}, ${e.assertions.length} statements)`)}`],
  };
  for (const [view, [title, description, body]] of Object.entries(views)) pages.push({ path: VIEW_PATH[view], title, description, body, view });

  // ── write ──
  for (const dir of [...new Set(Object.values(SEG))]) fs.rmSync(path.join(site, dir), { recursive: true, force: true });
  // the landing page's first screen (the hero) is static apart from the file count: copy it from app.js's renderHome
  // so it paints before the archive has loaded; the app then draws the same markup over it
  const appSrc = fs.readFileSync(path.join(site, 'assets', 'app.js'), 'utf8');
  const heroA = appSrc.indexOf('      <div class="hero">'), heroB = appSrc.indexOf('      <div class="home-wrap">');
  let heroHtml = heroA > 0 && heroB > heroA ? appSrc.slice(heroA, heroB).trim() : '';
  heroHtml = heroHtml.replace('${ents.length}', String(entities.length));
  if (/\$\{/.test(heroHtml)) throw new Error('pages.mjs: the hero markup in renderHome has a new ${…}: render it here too');
  // The home page's first screen also holds the day's file (app.js: onThisDay, clipFor, keyMoments, and the
  // .home-day block of renderHome: keep the four in step). The app draws it only once the archive has loaded, far too
  // late for the largest paint, so it is written here for today and the next three weeks; a line of script in the
  // page picks the visitor's date, and the app leaves the block as it finds it.
  const homeDays = (() => {
    const color = Object.fromEntries([...appSrc.matchAll(/^\s+(\w+): \{ label: '[^']*', plural: '[^']*', color: '(#\w+)'/gm)].map(m => [m[1], m[2]]));
    const OUT = { disputed: 'Partly explained', explained: 'Explained', hoax: 'Hoax' };
    const adjOf = id => near.get(id) || [];
    const resolved = e => e.outcome === 'explained' || e.outcome === 'hoax';
    const recordingOf = v => adjOf(v.id).find(x => x.dir === 'out' && x.label === 'recording of' && ['hearing', 'event', 'news'].includes(byId.get(x.other)?.type))?.other;
    const recordedDate = v => { const of = recordingOf(v); return (of && byId.get(of)?.date) || v.date; };
    const momentsFor = new Map();
    for (const v of entities) {
      if (v.type !== 'video') continue;
      const of = adjOf(v.id).filter(x => x.dir === 'out' && x.label === 'recording of' && ['hearing', 'event', 'news'].includes(byId.get(x.other)?.type)).map(x => x.other);
      for (const m of v.moments || []) for (const id of new Set([...(m.refs || []), m.speaker, ...of].filter(Boolean))) (momentsFor.get(id) || momentsFor.set(id, []).get(id)).push({ video: v.id, ...m });
    }
    const keyMoments = (e, ms) => {
      if (['video', 'claim', 'hearing', 'event', 'news', 'document'].includes(e.type) || ms.length < 5) return [];
      const sworn = m => (byId.get(recordingOf(byId.get(m.video)))?.type === 'hearing' ? 1 : 0);
      const pool = (e.type === 'person' ? ms.filter(m => m.speaker === e.id) : ms.filter(m => m.speaker && byId.get(m.speaker)?.cred === 'credible'))
        .sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || sworn(b) - sworn(a) || String(recordedDate(byId.get(a.video))).localeCompare(String(recordedDate(byId.get(b.video)))) * (e.type === 'person' ? -1 : 1) || a.t - b.t);
      const out = [], seen = new Set();
      for (const m of pool) { const k = e.type === 'person' ? m.video : m.speaker; if (seen.has(k)) continue; seen.add(k); out.push(m); if (out.length === 3) break; }
      return out.length >= 2 ? out : [];
    };
    const clipFor = e => {
      const ms = momentsFor.get(e.id) || [];
      const m = keyMoments(e, ms)[0] || ms.find(x => x.speaker && byId.get(x.speaker)?.cred === 'credible') || ms[0];
      if (m) return { video: m.video, t: m.t, text: m.text, speaker: m.speaker };
      const v = adjOf(e.id).map(x => byId.get(x.other)).find(o => o?.type === 'video');
      return v ? { video: v.id, t: 0 } : null;
    };
    const onThisDay = today => {
      const y = today.slice(0, 4), ms = Date.parse(today);
      const gap = e => Math.round(Math.min(...[+y - 1, +y, +y + 1].map(k => Math.abs(Date.parse(k + e.date.slice(4)) - ms) / 864e5))); // as annivGap in app.js
      const c = entities.filter(e => ['incident', 'hearing', 'event'].includes(e.type) && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && e.date.slice(0, 4) < y && e.cred !== 'outside' && !resolved(e) && gap(e) <= 3)
        .sort((a, b) => gap(a) - gap(b) || adjOf(b.id).length - adjOf(a.id).length)[0];
      if (c) return { e: c, label: gap(c) ? `This week in ${c.date.slice(0, 4)}` : `On this day in ${c.date.slice(0, 4)}` };
      const f = latestSplit(entities, today).featured[0];
      return f ? { e: f, label: 'Featured' } : null;
    };
    const cut = (t, n) => (t.length > n ? t.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : t);
    const sum = e => cut(cut(text(e.bio || e.body) || e.facts?.[0]?.text || (e.moments || []).slice(0, 2).map(m => m.text).join(' ') || '', 260), 190);
    const range = e => (e.end && e.end !== e.date ? `${fmtDate(String(e.date))} – ${fmtDate(String(e.end))}` : fmtDate(String(e.date || '')));
    const vthumb = v => (v.youtube ? `https://i.ytimg.com/vi/${v.youtube}/mqdefault.jpg` : v.thumb ? fileUrl(v.thumb) : v.dvids?.poster || '');
    const block = today => {
      const day = onThisDay(today); if (!day) return '';
      const e = day.e, clip = clipFor(e), v = clip && byId.get(clip.video);
      if (clip && !vthumb(v)) return ''; // no picture to show yet: the app draws its placeholder
      const kicker = `${day.label} · ${range(e)}`;
      return `<div class="home-car dv-car" tabindex="-1"><div class="hc-head"><div class="home-kicker hc-kicker">${esc(kicker)}</div><div class="dv-nav hc-nav"></div></div><div class="dv-track hc-track"><section class="home-day hc-slide" data-pre="${today}" data-kicker="${esc(kicker)}" style="--c:${color[e.type] || '#888'}">
            ${clip ? `<button class="hd-clip" data-play="${esc(clip.video)}@${clip.t}" title="Play"><img src="${esc(vthumb(v))}" alt="" fetchpriority="high"><span class="wplay">▶</span>${clip.text ? `<span class="hd-quote">${esc(clip.speaker && byId.get(clip.speaker) ? byId.get(clip.speaker).name + ': ' : '')}${esc(clip.text.length > 150 ? clip.text.slice(0, 147).replace(/\s+\S*$/, '') + '…' : clip.text)}</span>` : ''}</button>`
              : e.image ? `<a class="hd-clip" href="${e.path}" data-home-file="${esc(e.id)}"><img src="${esc(e.image)}" alt="${esc(e.imageCaption || e.name)}" fetchpriority="high"></a>` : ''}
            <h2><a href="${e.path}" data-home-file="${esc(e.id)}">${esc(e.name)}</a></h2>
            <p>${esc(sum(e))}</p>
            <div class="hd-meta">${e.outcome && e.outcome !== 'open' ? `<span class="badge outcome-${e.outcome}">${OUT[e.outcome]}</span>` : e.type === 'incident' ? '<span class="badge outcome-open">Open</span>' : ''}<a class="btn small" href="${e.path}" data-home-file="${esc(e.id)}">Open the file →</a></div>
          </section></div></div>`;
    };
    const html = [], dates = {};
    for (let i = -1; i <= 21; i++) {
      const d = dayOffset(today, i), h = block(d).replace(/ data-pre="[^"]*"/, ' data-pre="1"');
      if (!h) continue;
      if (!html.includes(h)) html.push(h);
      dates[d] = html.indexOf(h);
    }
    return { html, dates };
  })();
  const homePre = `<div class="home-wrap"><div class="home-top"></div></div><script type="application/json" id="home-days">${JSON.stringify(homeDays).replace(/</g, '\\u003c')}</script><script>(function(){try{var d=JSON.parse(document.getElementById('home-days').textContent),n=new Date(),i=d.dates[n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')];if(i!=null)document.querySelector('#view-home .home-top').innerHTML=d.html[i]}catch(e){}})()</script>`;
  const render = p => {
    const url = SITE_URL + (p.path === '/' ? '/' : p.path);
    const fullTitle = p.view === 'home' || p.title.length > 50 ? p.title : `${p.title} — Where Are They`; // long titles keep their words, not the brand
    const head = [
      `<title>${esc(fullTitle)}</title>`,
      `<meta name="description" content="${esc(p.description)}">`,
      `<link rel="canonical" href="${esc(url)}">`,
      p.noindex ? '<meta name="robots" content="noindex, follow">' : '',
      `<meta property="og:site_name" content="Where Are They"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:type" content="${p.type || 'website'}">`,
      // pages without a picture of their own share the site card, so link previews never show a blank square
      `<meta property="og:image" content="${esc(p.image || SITE_URL + DEFAULT_IMAGE)}"><meta name="twitter:card" content="summary_large_image">`,
      p.jsonld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [].concat(p.jsonld) }).replace(/</g, '\\u003c')}</script>` : '',
    ].filter(Boolean).join('\n  ');
    return template
      .replace(/<title>[\s\S]*?<\/title>\s*/, '')
      .replace(/<meta name="description"[^>]*>\s*/, '')
      .replace('<!--HEAD-->', head)
      // the landing page starts as the app leaves it (body.is-home hides the filters button, body.hero-q the header
      // search behind the hero's own), so neither shows and then vanishes while the app loads
      .replace(/^<body>$/m, p.view === 'home' && heroHtml ? '<body class="is-home hero-q">' : '<body>') // the tag's own line (a comment above also says <body>)
      .replace('<section class="view home" id="view-home"></section>', p.view === 'home' && heroHtml ? `<section class="view home" id="view-home">${heroHtml}${homePre}</section>` : '<section class="view home" id="view-home"></section>')
      .replace('font-weight: 600; font-style: normal; font-display: swap;', p.boldFirst ? 'font-weight: 600; font-style: normal; font-display: block;' : 'font-weight: 600; font-style: normal; font-display: swap;')
      .replace('<link rel="preload" href="/assets/fonts/plex-sans-400.woff" as="font" type="font/woff" crossorigin>', m => m + (p.boldFirst ? '\n  <link rel="preload" href="/assets/fonts/plex-sans-600.woff" as="font" type="font/woff" crossorigin>' : ''))
      .replace('<!--SSR-->', `<main id="ssr" class="ssr"${p.pre ? ' data-pre="1"' : ''}${p.view === 'home' && heroHtml ? ' data-hero="1"' : ''}>${nav}<article>${p.body}</article></main>`); // data-pre: shown at once while the app loads (templates/app.html)
  };
  for (const p of pages) {
    const file = p.path === '/' ? 'index.html' : `${p.path.slice(1)}.html`;
    fs.mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
    fs.writeFileSync(path.join(site, file), render(p));
  }
  fs.writeFileSync(path.join(site, '404.html'), render({ path: '/404', title: 'Not found', description: 'This page does not exist.', body: '<h1>Not found</h1><p>This page does not exist. Try the <a href="/a-z">A–Z index</a>.</p>', noindex: true }));
  const indexed = pages.filter(p => !p.noindex);
  // RSS: everything on Latest, newest addition first; the title carries the event date
  const rfc = d => new Date(`${d}T12:00:00Z`).toUTCString();
  const feedItems = [...featured, ...recent, ...added].filter(e => e.added).sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, 60);
  fs.writeFileSync(path.join(site, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Where Are They — Latest</title><link>${SITE_URL}/latest</link><atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>New hearings, interviews, statements, official releases and incidents in the UAP / NHI record, and new additions to the archive.</description><language>en</language>
${feedItems.map(e => `<item><title>${esc(`${kindOf(e)}: ${e.name}${e.date ? ` (${fmtDate(e.date)})` : ''}`)}</title><link>${SITE_URL}${e.path}</link><guid isPermaLink="true">${SITE_URL}${e.path}</guid><pubDate>${rfc(e.added)}</pubDate><description>${esc(summaryOf(e))}</description></item>`).join('\n')}
</channel></rss>
`);
  // <lastmod>: when each page's visible content last changed (frozen in content/lastmod.json), not the build date
  const statics = ['about', 'privacy'].map(n => ({ path: `/${n}`, file: `site/${n}.html`, title: n, description: '', body: fs.readFileSync(path.join(site, `${n}.html`), 'utf8') }));
  const lastmod = pageDates([...indexed, ...statics]);
  fs.writeFileSync(path.join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...indexed, ...statics].map(p => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${lastmod.get(p.path) || today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(site, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  return { pages: pages.length, indexed: indexed.length + 2, cards: cardJobs.length, cardsRendered };
}
