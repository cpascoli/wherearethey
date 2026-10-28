#!/usr/bin/env node
// Search index for the MoD UFO files (prototype): one Pagefind record per PDF page of the
// release documents (content/document/doc-mod-ufo-files-*.md), written to site/pagefind-mod/.
// The browser fetches only the index chunks a query needs, so ~40,000 OCR'd pages stay searchable on phones.
//   node scripts/mod-index.mjs [--stats]   (FILES_BASE sets where the PDF links point, as in the build; --stats only reports)
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import * as pagefind from 'pagefind';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'site', 'pagefind-mod');
const base = (process.env.FILES_BASE || '').replace(/\/$/, '');
const t0 = Date.now();
const slugs = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/slugs.json'), 'utf8'));

// file → reference and description, from each release document's file list and body
// (files that back a case have their own document, doc-mod-defe-24-*: the release lists them as “filed separately”)
const read = d => { const [, front, body] = fs.readFileSync(path.join(ROOT, 'content/document', d), 'utf8').split(/^---$/m); return { fm: YAML.parse(front), body }; };
const refOf = f => { const m = path.basename(f).match(/^(defe|air|prem)-?(\d+)-(\d+)/i); return m ? `${m[1].toUpperCase()} ${m[2]}/${m[3]}` : path.basename(f); };
const docNames = fs.readdirSync(path.join(ROOT, 'content/document'));
const byRef = new Map();
for (const d of docNames.filter(f => /^doc-mod-ufo-files-.*\.md$/.test(f)).sort()) {
  const { fm, body } = read(d);
  const release = new Date(fm.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  for (const m of body.matchAll(/^- \*\*([A-Z]+ \d+\/\d+)\*\*: (.+?) — (.+?)(?: \(filed separately.*)?$/gm)) byRef.set(m[1], { release, doc: d.replace(/\.md$/, ''), desc: m[2], dates: m[3] });
  for (const f of fm.files) byRef.get(refOf(f)) && (byRef.get(refOf(f)).file = f);
}
for (const d of docNames.filter(f => /^doc-mod-defe-24-.*\.md$/.test(f))) {
  for (const f of read(d).fm.files || []) { const x = byRef.get(refOf(f)); if (x) Object.assign(x, { file: f, doc: d.replace(/\.md$/, '') }); }
}
const files = [...byRef].filter(([, x]) => x.file).map(([ref, x]) => ({ ref, ...x }));

// ── 1. every page, as lines ──
const all = [];
let skipped = 0;
for (const x of files) {
  const txt = path.join(ROOT, x.file.replace(/\.pdf$/i, '.txt'));
  if (!fs.existsSync(txt)) { skipped++; continue; }
  fs.readFileSync(txt, 'utf8').split('\f').forEach((t, i) => all.push({ x, page: i + 1, lines: t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean) }));
}
// ── 2. boilerplate: lines printed on hundreds of pages (the questions of the UFO report form, letterheads, file
// covers, the mirror's banner); they are left out of what is indexed, so a printed “Radar” no longer counts as a match ──
const key = l => l.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const seen = new Map();
for (const pg of all) for (const k of new Set(pg.lines.map(key))) if (k.length >= 8) seen.set(k, (seen.get(k) || 0) + 1);
const BOILER = 120;
const boiler = new Set([...seen].filter(([, n]) => n >= BOILER).map(([k]) => k));
for (const pg of all) {
  pg.text = pg.lines.filter(l => !boiler.has(key(l))).join(' ');
  pg.words = pg.text.toLowerCase().match(/[a-z]{3,}/g) || [];
}
// blank forms, covers and routing slips: almost nothing left once the boilerplate is gone
const MIN_WORDS = 15;
const kept = all.filter(pg => pg.words.length >= MIN_WORDS && !/BLACK VAULT IS THE LARGEST/i.test(pg.text));
const blank = all.length - kept.length;
// ── 3. near-duplicates: the same paper copied to several branches (DEFE 31 duplicates DEFE 24's sighting reports),
// each copy OCR'd differently. MinHash of word 3-grams, banded; pairs above 60% similarity are one page ──
const NH = 48, BANDS = 12, R = NH / BANDS;
const seeds = Array.from({ length: NH }, (_, i) => (i + 1) * 0x9e3779b1 >>> 0);
const h32 = (s, seed) => { let h = seed ^ 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
for (const pg of kept) {
  const sh = new Set(); for (let i = 0; i + 2 < pg.words.length; i++) sh.add(pg.words[i] + ' ' + pg.words[i + 1] + ' ' + pg.words[i + 2]);
  pg.sh = sh;
  pg.mh = seeds.map(sd => { let m = 0xffffffff; for (const g of sh) { const v = h32(g, sd); if (v < m) m = v; } return m; });
}
const jac = (a, b) => { let n = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; for (const g of s) if (l.has(g)) n++; return n / (a.size + b.size - n || 1); };
// keep the DEFE 24 copy (the UFO desk's own file) over DEFE 31, then the earlier file and page
const rank = pg => (pg.x.ref.startsWith('DEFE 24') ? 0 : 1);
kept.sort((a, b) => rank(a) - rank(b) || a.x.ref.localeCompare(b.x.ref, 'en', { numeric: true }) || a.page - b.page);
const buckets = new Map();
let dups = 0;
const out = [];
for (const pg of kept) {
  let orig = null;
  if (pg.sh.size >= 8) {
    const cands = new Set();
    for (let b = 0; b < BANDS; b++) for (const c of buckets.get(b + ':' + pg.mh.slice(b * R, b * R + R).join(',')) || []) cands.add(c);
    for (const c of cands) if (jac(pg.sh, c.sh) >= 0.6) { orig = c; break; }
  }
  if (orig) { (orig.also ||= []).push(`${pg.x.ref}, p. ${pg.page}`); dups++; continue; }
  out.push(pg);
  if (pg.sh.size >= 8) for (let b = 0; b < BANDS; b++) { const k = b + ':' + pg.mh.slice(b * R, b * R + R).join(','); (buckets.get(k) || buckets.set(k, []).get(k)).push(pg); }
}
if (process.argv.includes('--stats')) {
  console.log(`boilerplate lines (on ≥${BOILER} pages): ${boiler.size}`);
  console.log(`pages ${all.length}, blank/boilerplate-only ${blank}, duplicates ${dups}, indexed ${out.length}`);
  for (const pg of out.filter(p => p.also).slice(0, 8)) console.log(`  ${pg.x.ref} p.${pg.page} = ${pg.also.join('; ')}`);
  process.exit(0);
}
// ── 4. the index ──
const { index } = await pagefind.createIndex({ forceLanguage: 'en' });
let pages = 0;
out.sort((a, b) => a.x.ref.localeCompare(b.x.ref, 'en', { numeric: true }) || a.page - b.page);
for (const pg of out) {
  const x = pg.x;
  await index.addCustomRecord({
    url: `${base}/${x.file}#page=${pg.page}`,
    content: pg.text,
    language: 'en',
    meta: { title: `${x.ref}, p. ${pg.page}`, ref: x.ref, desc: x.desc, dates: x.dates, release: x.release, doc: '/' + (slugs[x.doc] || ''), page: String(pg.page), ...(pg.also && { also: pg.also.slice(0, 4).join('; ') + (pg.also.length > 4 ? ` and ${pg.also.length - 4} more` : '') }) },
    filters: { release: [x.release], series: [x.ref.split('/')[0]] },
  });
  pages++;
}
fs.rmSync(OUT, { recursive: true, force: true });
await index.writeFiles({ outputPath: OUT });
await pagefind.close();
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`MoD index: ${pages.toLocaleString('en-US')} pages from ${files.length - skipped} files (${blank.toLocaleString('en-US')} blank or boilerplate-only and ${dups.toLocaleString('en-US')} duplicate pages left out; ${skipped} files not OCR'd), ${(size(OUT) / 1e6).toFixed(1)} MB in site/pagefind-mod — ${Date.now() - t0} ms`);
