#!/usr/bin/env node
// Import the Department of War PURSUE catalog (https://www.war.gov/UFO/) into content/record/.
//
//   node scripts/import-pursue.mjs                       refresh catalog + entries
//   node scripts/import-pursue.mjs --download "AAWSAP"   also download matching PDFs to library/pursue/ (+ text)
//   node scripts/import-pursue.mjs --offline             re-generate entries from the saved CSV snapshot
//
// war.gov blocks non-browser clients, so this drives the locally installed Chrome via puppeteer-core.
// Importer-owned fields are refreshed on every run; your own rel/tags/facts/body notes are preserved.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { parse } from 'csv-parse/sync';
import { ROOT, splitFrontmatter, slugify } from './lib.mjs';

const args = process.argv.slice(2);
const offline = args.includes('--offline');
const dlIdx = args.indexOf('--download');
const dlPattern = dlIdx >= 0 ? new RegExp(args[dlIdx + 1] || '.', 'i') : null;
const SRC = path.join(ROOT, 'sources', 'pursue');
const OUT = path.join(ROOT, 'content', 'record');
const LIB = path.join(ROOT, 'library', 'pursue');
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

let browser, page;
async function openBrowser() {
  if (page) return page;
  const { default: puppeteer } = await import('puppeteer-core');
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.goto('https://www.war.gov/UFO/', { waitUntil: 'networkidle2', timeout: 90000 });
  return page;
}

// ── 1. catalog CSV ──
const csvPath = path.join(SRC, 'uap-data.csv');
if (!offline) {
  const p = await openBrowser();
  const csvUrl = await p.evaluate(() => {
    const m = [...document.scripts].map(s => s.textContent).join('\n').match(/csvUrl\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  });
  if (!csvUrl) throw new Error('Could not find the catalog CSV URL on war.gov/UFO — the page layout may have changed.');
  const csv = await p.evaluate(async u => (await fetch(u)).text(), csvUrl);
  fs.writeFileSync(csvPath, csv);
  fs.writeFileSync(path.join(SRC, 'snapshot.json'), JSON.stringify({ fetched: new Date().toISOString(), csvUrl }, null, 2));
  console.log(`catalog: ${csvUrl}`);
}
const rows = parse(fs.readFileSync(csvPath), { columns: true, relax_column_count: true, skip_empty_lines: true, trim: true })
  .filter(r => r.Title);
console.log(`${rows.length} records in catalog`);

// ── helpers ──
const RELEASE_DATES = [...new Set(rows.map(r => r['Release Date']))].map(toIso).sort();
function toIso(d) {
  const m = String(d || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let y = +m[3];
  if (y < 100) y += y <= 30 ? 2000 : 1900;
  return `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
}
function looseDate(s) {
  s = String(s || '').trim();
  const iso = toIso(s);
  if (iso) return iso;
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const m = s.toLowerCase().match(/([a-z]+)[ ,]+(\d{4})/);
  if (m && months.includes(m[1])) return `${m[2]}-${String(months.indexOf(m[1]) + 1).padStart(2, '0')}`;
  const y = s.match(/\b(19|20)\d{2}\b/);
  return y ? y[0] : null;
}
const AGENCY = {
  'Department of War': 'department-of-war', CIA: 'cia', FBI: 'fbi', NASA: 'nasa', 'Department of State': 'department-of-state',
  'Department of Energy': 'department-of-energy', 'Office of the Director of National Intelligence': 'odni',
  'Executive Office of the President': 'white-house', 'Local Law Enforcement': 'local-law-enforcement',
  'Intelligence Community Agency': 'odni', 'U.S. Government': 'department-of-war',
};
// The official catalog occasionally reuses a code for two different records; disambiguate those by title.
const codeCounts = new Map();
for (const r of rows) { const c = r.Title.split(',')[0].trim(); codeCounts.set(c, (codeCounts.get(c) || 0) + 1); }
const recId = title => {
  const code = title.split(',')[0].trim();
  return codeCounts.get(code) > 1 ? slugify(`${code} ${title.slice(code.length)}`).slice(0, 70).replace(/-+$/, '') : slugify(code);
};

// ── 2. geocode incident locations (cached; OpenStreetMap Nominatim, 1 req/s) ──
const geoPath = path.join(SRC, 'geocode.json');
const geo = fs.existsSync(geoPath) ? JSON.parse(fs.readFileSync(geoPath, 'utf8')) : {};
const skipGeo = /^(n\/a|various|unknown|multiple|low earth orbit|space|lunar|moon|mars|undisclosed|redacted|classified)/i;
for (const loc of new Set(rows.map(r => r['Incident Location']).filter(Boolean))) {
  if (loc in geo || skipGeo.test(loc)) continue;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(loc)}`, {
      headers: { 'User-Agent': 'wherearethey-knowledge-base/0.1 (personal research archive)' },
    });
    const j = await res.json();
    geo[loc] = j[0] ? { lat: +(+j[0].lat).toFixed(4), lng: +(+j[0].lon).toFixed(4), resolved: j[0].display_name } : null;
    console.log(`  geocoded ${loc} → ${geo[loc]?.resolved ?? '—'}`);
  } catch (e) { console.warn(`  geocode failed for ${loc}: ${e.message}`); }
  fs.writeFileSync(geoPath, JSON.stringify(geo, null, 1));
  await new Promise(r => setTimeout(r, 1100));
}

// ── 3. supporting entities: program, release events, agencies ──
function ensure(file, data, body = '') {
  const full = path.join(ROOT, 'content', file);
  if (fs.existsSync(full)) return;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n${body ? '\n' + body + '\n' : ''}`);
}
ensure('program/pursue.md', {
  name: 'PURSUE — Presidential Unsealing and Reporting System for UAP Encounters', aka: ['PURSUE'], date: '2026-02-19',
  tags: ['disclosure', 'foia'], rel: [['run by', 'department-of-war'], ['supported by', 'odni']],
  links: [{ label: 'war.gov/UFO', url: 'https://www.war.gov/UFO/' }],
  facts: [
    { text: 'On February 19, 2026, President Trump directed the Secretary of War and other agencies to identify and release government files on UAP, UFOs and extraterrestrial life.', status: 'documented', source: 'https://www.war.gov/UFO/' },
    { text: 'The Department of War, supported by ODNI, releases declassified unresolved-case records in tranches every few weeks. The first tranche was released on May 8, 2026.', status: 'documented', source: 'https://www.war.gov/UFO/' },
    { text: 'Records in the archive are unresolved cases: the government could not make a definitive determination about the nature of the observed phenomena.', status: 'documented', source: 'https://www.war.gov/UFO/' },
  ],
});
for (const [name, id] of Object.entries(AGENCY)) {
  if (['cia', 'nasa'].includes(id)) continue;
  ensure(`organization/${id}.md`, { name: { 'department-of-war': 'Department of War (Department of Defense)', odni: 'Office of the Director of National Intelligence', 'white-house': 'Executive Office of the President', fbi: 'Federal Bureau of Investigation', 'local-law-enforcement': 'Local law enforcement' }[id] || name,
    aka: { 'department-of-war': ['Department of Defense', 'DoD', 'DoW', 'Pentagon'], odni: ['ODNI'], fbi: ['FBI'] }[id] || [], tags: ['government'] });
}
RELEASE_DATES.forEach((d, i) => {
  const n = String(i + 1).padStart(2, '0');
  ensure(`event/ev-pursue-release-${n}.md`, {
    name: `PURSUE Release ${n}`, date: d, tags: ['disclosure', 'foia'], rel: [['part of', 'pursue']],
    links: [{ label: `war.gov/UFO — release ${n}`, url: `https://www.war.gov/UFO/?release=${n}` }],
  });
});

// ── 4. records ──
const OWNED = ['name', 'date', 'place', 'pursue', 'links'];
const byTitleId = new Map(rows.map(r => [r.Title.split(',')[0].trim(), recId(r.Title)]));
let created = 0, updated = 0;
for (const r of rows) {
  const code = r.Title.split(',')[0].trim();
  const id = recId(r.Title);
  const title = r.Title.slice(code.length).replace(/^[,\s]+/, '').replace(/^"|"$/g, '').trim() || code;
  const type = (r.Type || '').trim().toLowerCase();
  const release = RELEASE_DATES.indexOf(toIso(r['Release Date'])) + 1;
  const loc = r['Incident Location'];
  const g = geo[loc];
  const fileUrl = r['PDF | Image Link'] || '';
  const pairs = [r['Video Pairing'], r['PDF Pairing']].join('|').split('|').map(s => s.trim()).filter(Boolean);
  const own = {
    name: `${code} — ${title}`,
    date: looseDate(r['Incident Date']) || undefined,
    place: g ? { name: loc, lat: g.lat, lng: g.lng } : undefined,
    pursue: {
      code, title, agency: r.Agency, release, released: toIso(r['Release Date']), format: type,
      incident_date: r['Incident Date'] || undefined, incident_location: loc || undefined,
      featured: /yes/i.test(r.Featured) || undefined, redaction: r.Redaction || undefined,
      file: fileUrl || undefined, thumbnail: r['Modal Image'] || undefined,
      dvids: r['DVIDS Video ID'] ? `https://www.dvidshub.net/video/${r['DVIDS Video ID']}` : undefined,
      paired: pairs.length ? pairs : undefined,
    },
    links: [
      fileUrl && { label: `Official file (${type.toUpperCase()}) — war.gov`, url: fileUrl },
      r['DVIDS Video ID'] && { label: 'Video on DVIDS', url: `https://www.dvidshub.net/video/${r['DVIDS Video ID']}` },
    ].filter(Boolean),
  };
  const autoRel = [['released in', `ev-pursue-release-${String(release).padStart(2, '0')}`], ['released by', AGENCY[r.Agency] || 'department-of-war']];
  for (const p of pairs) if (byTitleId.has(p)) autoRel.push(['paired with', byTitleId.get(p)]);
  if (/AAWSAP/i.test(r.Title)) autoRel.push(['about', 'aawsap']);
  if (/AAWSAP DIRD/i.test(r.Title)) autoRel.push(['part of', 'doc-dirds']);
  if (/Warp Drive, Dark Energy/i.test(r.Title)) autoRel.push(['same as', 'doc-dird-warp-drive']);
  if (/Blue Book/i.test(r.Title + r['Description Blurb'])) autoRel.push(['related to', 'project-blue-book']);

  const file = path.join(OUT, `${id}.md`);
  let data = {}, body = '';
  if (fs.existsSync(file)) ({ data, body } = splitFrontmatter(fs.readFileSync(file, 'utf8')));
  // labels only the importer writes are always regenerated (so stale ones disappear); anything else is the user's
  const IMPORTER_LABELS = ['released in', 'released by', 'paired with', 'same as'];
  const keepRel = (data.rel || []).filter(x => !IMPORTER_LABELS.includes(x[0]) && !autoRel.some(a => a[0] === x[0] && a[1] === x[1]));
  const next = { ...Object.fromEntries(Object.entries(data).filter(([k]) => !OWNED.includes(k))), ...own };
  next.rel = [...autoRel, ...keepRel];
  next.tags = [...new Set([...(data.tags || []), 'pursue', ...(/AAWSAP/i.test(r.Title) ? ['aawsap'] : [])])];
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  for (const k of Object.keys(next.pursue)) if (next.pursue[k] === undefined) delete next.pursue[k];
  // Body: official description (importer-owned section) + anything the user wrote below it.
  const MARK = '<!-- your notes below this line are kept on re-import -->';
  const userNotes = body.includes(MARK) ? body.split(MARK)[1].trim() : '';
  const official = (r['Description Blurb'] || '').trim().replace(/\r/g, '');
  const newBody = `**Official PURSUE description** (Department of War / AARO, release ${String(release).padStart(2, '0')}):\n\n${official.split(/\n\s*\n/).map(p => p.trim()).join('\n\n')}\n\n${MARK}\n${userNotes ? '\n' + userNotes + '\n' : ''}`;
  const doc = new YAML.Document(next);
  YAML.visit(doc, {
    Seq(_, node, p) { const pair = p[p.length - 2]; if (YAML.isPair(pair) && pair.key?.value === 'rel' && YAML.isSeq(p[p.length - 1])) node.flow = true; },
    Map(_, node, p) { const pair = p[p.length - 1]; if (YAML.isPair(pair) && pair.key?.value === 'place') node.flow = true; },
  });
  const out = `---\n${doc.toString({ lineWidth: 0 })}---\n\n${newBody}`;
  if (!fs.existsSync(file)) created++; else if (fs.readFileSync(file, 'utf8') !== out) updated++;
  fs.writeFileSync(file, out);
}
ensure('program/project-blue-book.md', {
  name: 'Project Blue Book', aka: ['Blue Book'], date: '1952', end: '1969', tags: ['air-force', 'foia'], rel: [['run by', 'department-of-war']],
  facts: [{ text: 'A 1952–1969 U.S. Air Force program to investigate the nature and origin of unidentified flying objects.', status: 'documented', source: 'https://www.war.gov/UFO/' }],
});
console.log(`records: ${created} created, ${updated} updated`);

// ── 5. optional downloads (+ text extraction for search) ──
if (dlPattern) {
  fs.mkdirSync(LIB, { recursive: true });
  const p = await openBrowser();
  const want = rows.filter(r => dlPattern.test(r.Title) && /\.pdf($|\?)/i.test(r['PDF | Image Link'] || ''));
  console.log(`downloading ${want.length} PDFs matching ${dlPattern}`);
  for (const r of want) {
    const url = r['PDF | Image Link'];
    const id = recId(r.Title);
    const dest = path.join(LIB, `${id}.pdf`);
    if (!fs.existsSync(dest)) {
      // Let Chrome stream the file to disk itself (large PDFs are too big to pass through page JS).
      const tmp = path.join(LIB, '.incoming');
      fs.mkdirSync(tmp, { recursive: true });
      for (const f of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, f));
      const cdp = await p.createCDPSession();
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: tmp });
      await p.evaluate(u => { const a = document.createElement('a'); a.href = u; a.download = ''; document.body.append(a); a.click(); a.remove(); }, url);
      const t0 = Date.now();
      let got = null;
      while (Date.now() - t0 < 10 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 1000));
        const files = fs.readdirSync(tmp);
        if (files.length && !files.some(f => f.endsWith('.crdownload'))) { got = files[0]; break; }
      }
      if (!got) { console.warn(`  ! timed out: ${url}`); continue; }
      fs.renameSync(path.join(tmp, got), dest);
      if (!fs.readFileSync(dest).subarray(0, 5).toString().startsWith('%PDF')) { console.warn(`  ! not a PDF (blocked?): ${url}`); fs.unlinkSync(dest); continue; }
      console.log(`  ✓ ${id}.pdf (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
    }
    const txt = dest.replace(/\.pdf$/, '.txt');
    if (!fs.existsSync(txt)) { try { execFileSync('pdftotext', ['-layout', dest, txt]); } catch { /* scanned image PDFs have no text layer */ } }
    // reference the local copy from the entry
    const file = path.join(OUT, `${id}.md`);
    const { data, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
    const rel = `library/pursue/${id}.pdf`;
    if (!(data.files || []).includes(rel)) {
      const src = fs.readFileSync(file, 'utf8').replace(/^---\n/, `---\nfiles:\n  - ${rel}\n`);
      fs.writeFileSync(file, src);
    }
    void body;
  }
}
await browser?.close();
