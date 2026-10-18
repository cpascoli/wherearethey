// Static pages for search engines and sharing: one real URL per view and per file (/person/david-fravor),
// each the app shell plus a server-rendered article (title, description, canonical, JSON-LD, the full content).
// The app hides the article on boot and shows the same file in its own UI; crawlers and no-JS readers get the article.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const SITE_URL = (process.env.SITE_URL || 'https://wherearethey.info').replace(/\/$/, '');

// URL segment per type (singular, readable); records get pages but stay out of search results
export const SEG = {
  person: 'person', incident: 'incident', hearing: 'hearing', program: 'program', organization: 'organization', document: 'document',
  film: 'documentary', book: 'book', record: 'record', video: 'video', event: 'event', concept: 'concept', place: 'place', source: 'source',
};
const LABEL = {
  person: 'Person', incident: 'Incident', hearing: 'Hearing / briefing', program: 'Program', organization: 'Organization', document: 'Document',
  film: 'Documentary', book: 'Book', record: 'Official record (PURSUE)', video: 'Video', event: 'Event', concept: 'Concept', place: 'Place', source: 'Channel / source',
};
const PLURAL = {
  person: 'People', incident: 'Incidents', hearing: 'Hearings & briefings', program: 'Programs', organization: 'Organizations', document: 'Documents',
  film: 'Documentaries', book: 'Books', record: 'Official records (PURSUE)', video: 'Videos', event: 'Events', concept: 'Concepts', place: 'Places', source: 'Channels & sources',
};
// app views → paths (keep in sync with VIEW_PATH in app.js)
export const VIEW_PATH = { home: '/', graph: '/explore', timeline: '/timeline', map: '/world', videos: '/videos', shelf: '/documentaries-and-books', index: '/a-z', claims: '/claims' };
// full transcripts on every video page (switch to a kind check to limit some videos to moments + excerpts)
const FULL_TRANSCRIPT = () => true;
// types whose ids are already clean word slugs; the rest are slugged from their name
const ID_SLUG = new Set(['person', 'organization', 'program', 'concept', 'place', 'source', 'record']);

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
      if (['incident', 'hearing', 'event'].includes(e.type) && year && !base.includes(year)) base += `-${year}`;
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
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = d => { if (!d) return ''; const [y, m, day] = d.split('-'); return [day && +day, m && MONTHS[+m - 1], y].filter(Boolean).join(' '); };
const hms = t => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`; };
const isoDur = s => s ? `PT${Math.floor(s / 3600) ? Math.floor(s / 3600) + 'H' : ''}${Math.floor(s / 60) % 60}M${Math.floor(s % 60)}S` : undefined;

export function writePages({ entities, edges, transcripts, stats, filesBase }) {
  const site = path.join(ROOT, 'site');
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'app.html'), 'utf8');
  const byId = new Map(entities.map(e => [e.id, e]));
  const fileUrl = f => (filesBase ? `${filesBase.replace(/\/$/, '')}/${f}` : `/${f}`);
  const link = id => { const e = byId.get(id); return e ? `<a href="${e.path}">${esc(e.name)}</a>` : esc(id); };
  const videoUrl = (v, t) => (v.youtube ? `https://www.youtube.com/watch?v=${v.youtube}${t ? `&t=${Math.floor(t)}s` : ''}` : v.url || null);
  const thumbOf = v => (v.youtube ? `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg` : v.thumb ? fileUrl(v.thumb) : null);
  const imageOf = e => (e.cover ? SITE_URL + e.cover : e.type === 'video' ? thumbOf(e) : null);
  const sourceHtml = s => {
    if (!s) return '';
    if (s.url) { let host = s.url; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch {} return `<a href="${esc(s.url)}" rel="noopener">${esc(host)}</a>`; }
    if (s.file) return `<a href="${esc(fileUrl(s.file))}">${esc(s.file.split('/').pop())}</a>`;
    const e = byId.get(s.id);
    if (!e) return esc(s.id);
    return s.t != null ? `<a href="${e.path}?t=${Math.floor(s.t)}">${esc(e.name)} at ${hms(s.t)}</a>` : link(s.id);
  };
  const factsHtml = facts => `<ul class="ssr-facts">${facts.map(f => `<li><span class="ssr-st ssr-${f.status}">${f.status}</span> ${esc(f.text)}${f.by ? ` <span class="ssr-by">— ${link(f.by)}</span>` : ''}${f.source ? ` <span class="ssr-src">Source: ${sourceHtml(f.source)}</span>` : ''}</li>`).join('')}</ul>`;

  // neighbours per entity (direct links; transcript/text mentions listed separately)
  const near = new Map();
  for (const x of edges) for (const [a, b, dir] of [[x.s, x.t, 'out'], [x.t, x.s, 'in']]) (near.get(a) || near.set(a, []).get(a)).push({ other: b, label: x.label, kind: x.kind, dir });

  const pages = []; // { path, title, description, body, jsonld, image, noindex, type }
  const nav = `<nav class="ssr-nav">${Object.entries({ Home: '/', Explore: '/explore', Timeline: '/timeline', World: '/world', Videos: '/videos', 'Documentaries & books': '/documentaries-and-books', 'A–Z index': '/a-z', Claims: '/claims', About: '/about' }).map(([l, h]) => `<a href="${h}">${l}</a>`).join(' · ')}</nav>`;

  for (const e of entities) {
    const h = [];
    const kicker = [LABEL[e.type], fmtDate(e.date) + (e.end ? ` – ${fmtDate(e.end)}` : ''), e.place?.name].filter(Boolean).join(' · ');
    h.push(`<p class="ssr-kicker">${esc(kicker)}</p><h1>${esc(e.name)}</h1>`);
    if (e.aka?.length) h.push(`<p class="ssr-aka">Also known as ${e.aka.map(esc).join(', ')}</p>`);
    if (e.credentials?.length) h.push(`<ul class="ssr-creds">${e.credentials.map(c => `<li>${esc(c.role || c.category)}</li>`).join('')}</ul>`);
    if (e.type === 'book') h.push(`<p>${[e.credits, e.publisher, e.pages && `${e.pages} pages`, e.isbn && `ISBN ${e.isbn}`].filter(Boolean).map(esc).join(' · ')}</p>`);
    if (e.type === 'film') h.push(`<p>${[e.credits, e.runtime && `${e.runtime} min`].filter(Boolean).map(esc).join(' · ')}</p>`);
    if (e.cover) h.push(`<img src="${esc(e.cover)}" alt="Cover of ${esc(e.name)}" width="200">`);
    if (e.type === 'video') {
      const url = videoUrl(e);
      h.push(`<p>${[e.channel, fmtDate(e.date), e.duration && `${Math.round(e.duration / 60)} min`].filter(Boolean).map(esc).join(' · ')}${url ? ` · <a href="${esc(url)}" rel="noopener">Watch the original</a>` : ''}</p>`);
    }
    if (e.body) h.push(`<div class="ssr-body">${e.body}</div>`);
    if (e.facts.length) h.push(`<h2>Facts and claims</h2>${factsHtml(e.facts)}`);
    if (e.type === 'video' && e.moments?.length) {
      h.push(`<h2>Key moments</h2><ol class="ssr-moments">${e.moments.map(m => `<li><a href="${e.path}?t=${Math.floor(m.t)}">${hms(m.t)}</a> ${m.speaker ? `${link(m.speaker)}: ` : ''}${esc(m.text)}</li>`).join('')}</ol>`);
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
      const src = { 'youtube-auto': 'automatic captions', youtube: 'published captions', whisper: 'machine transcription (Whisper)' }[t.source] || 'transcript';
      h.push(`<h2>Transcript</h2><p class="ssr-note">From ${esc(src)}; names and terms may be misspelled. Check the original video before quoting.</p><div class="ssr-transcript">${paras.map(p => `<p><a href="${e.path}?t=${Math.floor(p.t)}">${hms(p.t)}</a> ${esc(p.s.join(' '))}</p>`).join('')}</div>`);
    }
    // related files, grouped by type
    const rel = (near.get(e.id) || []).filter(x => !['mention', 'text'].includes(x.kind) && byId.has(x.other));
    const groups = new Map();
    for (const x of rel) { const o = byId.get(x.other); if (!groups.has(o.type)) groups.set(o.type, new Map()); groups.get(o.type).set(o.id, x.label); }
    if (groups.size) {
      h.push(`<h2>Connected files</h2>${[...groups].map(([type, m]) => `<h3>${PLURAL[type]}</h3><ul>${[...m].map(([id, label]) => `<li>${link(id)} <span class="ssr-by">(${esc(label)})</span></li>`).join('')}</ul>`).join('')}`);
    }
    const mentionedIn = (near.get(e.id) || []).filter(x => x.kind === 'mention' && byId.get(x.other)?.type === 'video');
    if (mentionedIn.length) h.push(`<h2>Mentioned in videos</h2><ul>${[...new Set(mentionedIn.map(x => x.other))].map(id => `<li>${link(id)}</li>`).join('')}</ul>`);
    if (e.links.length) h.push(`<h2>Links</h2><ul>${e.links.map(l => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label || l.url)}</a></li>`).join('')}</ul>`);
    if (e.files.length) h.push(`<h2>Files</h2><ul>${e.files.map(f => `<li><a href="${esc(fileUrl(f))}">${esc(f.split('/').pop())}</a></li>`).join('')}</ul>`);

    const description = clip(text(e.body) || e.facts.map(f => f.text).join(' ') || (e.type === 'video' ? e.moments?.map(m => m.text).join(' ') || e.description || '' : '') || `${LABEL[e.type]} in the Where Are They UAP / NHI case archive.`);
    let jsonld = null;
    if (e.type === 'person') jsonld = { '@type': 'Person', name: e.name, alternateName: e.aka?.length ? e.aka : undefined, jobTitle: e.credentials?.map(c => c.role).filter(Boolean).join('; ') || undefined, description, sameAs: e.links.map(l => l.url).filter(u => /wikipedia\.org/.test(u)) };
    if (e.type === 'video' && thumbOf(e) && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) {
      jsonld = { '@type': 'VideoObject', name: e.name, description, thumbnailUrl: thumbOf(e), uploadDate: e.date, duration: isoDur(e.duration), embedUrl: e.youtube ? `https://www.youtube.com/embed/${e.youtube}` : undefined, url: SITE_URL + e.path };
      if (t && FULL_TRANSCRIPT(e)) jsonld.transcript = clip(t.segments.map(s => s[1]).join(' '), 50000);
    }
    if (e.type === 'book') jsonld = { '@type': 'Book', name: e.name, isbn: e.isbn, numberOfPages: e.pages ? +e.pages : undefined, publisher: e.publisher, datePublished: e.date, description };
    if (e.type === 'film') jsonld = { '@type': 'Movie', name: e.name, dateCreated: e.date, description, image: imageOf(e) || undefined };
    pages.push({ path: e.path, title: `${e.name} · ${LABEL[e.type]}`, description, body: h.join('\n'), jsonld, image: imageOf(e), noindex: e.type === 'record', type: e.type === 'video' ? 'video.other' : 'article' });
  }

  // ── views ──
  const listOf = (items, extra = () => '') => `<ul>${items.map(e => `<li>${link(e.id)}${extra(e)}</li>`).join('')}</ul>`;
  const newest = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  const ofType = t => entities.filter(e => e.type === t);
  const intro = `An open, sourced archive of what officials, pilots, radar operators, intelligence officers and scientists have said on the record about unidentified anomalous phenomena (UAP) and non-human intelligence: ${stats.byType.person} people, ${stats.byType.incident} incidents, ${stats.byType.hearing} hearings, ${stats.videos} videos with ${stats.transcriptHours} hours of transcripts, and every claim with its status and source.`;
  const typeOrder = ['person', 'incident', 'hearing', 'program', 'organization', 'document', 'event', 'concept', 'place', 'film', 'book', 'video', 'source'];
  const views = {
    home: ['Where Are They — UAP / NHI case archive', intro, `<h1>Where are they?</h1><p>${esc(intro)}</p><h2>Start here</h2><ul><li><a href="/videos">Videos: hearings, interviews and archival footage with transcripts</a></li><li><a href="/claims">Claims ledger: every claim and its status</a></li><li><a href="/a-z">A–Z index of every file</a></li><li><a href="/documentaries-and-books">Documentaries &amp; books</a></li></ul><h2>Hearings &amp; briefings</h2>${listOf(ofType('hearing').sort(newest), e => e.date ? ` (${esc(fmtDate(e.date))})` : '')}<h2>Programs</h2>${listOf(ofType('program'))}`],
    graph: ['Explore the network', 'An interactive map of the people, programs, incidents, hearings and documents in the UAP / NHI record, and how they connect.', `<h1>Explore the network</h1><p>An interactive map of the people, programs, incidents, hearings and documents in the record, and how they connect. Every file is also listed in the <a href="/a-z">A–Z index</a>.</p>`],
    timeline: ['Timeline', 'UAP / NHI incidents, hearings, programs and events in chronological order.', `<h1>Timeline</h1>${listOf(entities.filter(e => e.date && ['incident', 'hearing', 'event', 'program', 'document'].includes(e.type)).sort((a, b) => String(a.date).localeCompare(String(b.date))), e => ` (${esc(fmtDate(e.date))})`)}`],
    map: ['World map', 'Where UAP incidents and related events took place, on a world map.', `<h1>World map</h1>${listOf(entities.filter(e => e.place && e.type !== 'record'), e => ` (${esc(e.place.name)})`)}`],
    videos: ['Videos', `Congressional hearings, interviews and archival footage about UAP, with synced transcripts and curated moments: ${stats.videos} videos, ${stats.transcriptHours} hours transcribed.`, `<h1>Videos</h1>${listOf(ofType('video').sort(newest), e => ` (${[e.channel, fmtDate(e.date)].filter(Boolean).map(esc).join(', ')})`)}`],
    shelf: ['Documentaries & books', 'Documentaries and books about UAP by people on the record, with trailers and where to find them.', `<h1>Documentaries &amp; books</h1><h2>Documentaries</h2>${listOf(ofType('film').sort(newest))}<h2>Books</h2>${listOf(ofType('book').sort(newest))}`],
    index: ['A–Z index', 'Every file in the archive, A to Z: people, incidents, hearings, programs, organizations, documents and official records.', `<h1>A–Z index</h1>${[...typeOrder, 'record'].map(t => `<h2>${PLURAL[t]}</h2>${listOf(ofType(t).sort((a, b) => a.name.localeCompare(b.name)))}`).join('')}`],
    claims: ['Claims ledger', 'Every claim in the archive with its status (documented, claimed or unverified), who made it and the source.', `<h1>Claims ledger</h1><p>Documented: backed by an official record or primary document. Claimed: on-record testimony not independently confirmed. Unverified: reported without a primary source.</p>${entities.filter(e => e.facts.length && e.type !== 'record').map(e => `<h2>${link(e.id)}</h2>${factsHtml(e.facts)}`).join('')}`],
  };
  for (const [view, [title, description, body]] of Object.entries(views)) pages.push({ path: VIEW_PATH[view], title, description, body, view });

  // ── write ──
  for (const dir of [...new Set(Object.values(SEG))]) fs.rmSync(path.join(site, dir), { recursive: true, force: true });
  const render = p => {
    const url = SITE_URL + (p.path === '/' ? '/' : p.path);
    const fullTitle = p.view === 'home' ? p.title : `${p.title} — Where Are They`;
    const head = [
      `<title>${esc(fullTitle)}</title>`,
      `<meta name="description" content="${esc(p.description)}">`,
      `<link rel="canonical" href="${esc(url)}">`,
      p.noindex ? '<meta name="robots" content="noindex, follow">' : '',
      `<meta property="og:site_name" content="Where Are They"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:type" content="${p.type || 'website'}">`,
      p.image ? `<meta property="og:image" content="${esc(p.image)}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">',
      p.jsonld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...p.jsonld }).replace(/</g, '\\u003c')}</script>` : '',
    ].filter(Boolean).join('\n  ');
    return template
      .replace(/<title>[\s\S]*?<\/title>\s*/, '')
      .replace(/<meta name="description"[^>]*>\s*/, '')
      .replace('<!--HEAD-->', head)
      .replace('<!--SSR-->', `<main id="ssr" class="ssr">${nav}<article>${p.body}</article></main>`);
  };
  for (const p of pages) {
    const file = p.path === '/' ? 'index.html' : `${p.path.slice(1)}.html`;
    fs.mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
    fs.writeFileSync(path.join(site, file), render(p));
  }
  fs.writeFileSync(path.join(site, '404.html'), render({ path: '/404', title: 'Not found', description: 'This page does not exist.', body: '<h1>Not found</h1><p>This page does not exist. Try the <a href="/a-z">A–Z index</a>.</p>', noindex: true }));
  const today = new Date().toISOString().slice(0, 10);
  const indexed = pages.filter(p => !p.noindex);
  fs.writeFileSync(path.join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...indexed.map(p => p.path), '/about', '/privacy'].map(p => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(site, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  return { pages: pages.length, indexed: indexed.length + 2 };
}
