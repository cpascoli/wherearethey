#!/usr/bin/env node
// Search index for the MoD UFO files (prototype): one Pagefind record per PDF page of the
// release documents (content/document/doc-mod-ufo-files-*.md), written to site/pagefind-mod/.
// The browser fetches only the index chunks a query needs, so ~40,000 OCR'd pages stay searchable on phones.
//   node scripts/mod-index.mjs        (FILES_BASE sets where the PDF links point, as in the build)
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

const { index } = await pagefind.createIndex({ forceLanguage: 'en' });
let pages = 0, skipped = 0;
for (const x of files) {
  const txt = path.join(ROOT, x.file.replace(/\.pdf$/i, '.txt'));
  if (!fs.existsSync(txt)) { skipped++; continue; }
  const parts = fs.readFileSync(txt, 'utf8').split('\f');
  for (let i = 0; i < parts.length; i++) {
    const content = parts[i].replace(/\s+/g, ' ').trim();
    // blank pages, file covers and the mirror's banner page carry nothing worth finding
    if (content.length < 60 || /BLACK VAULT IS THE LARGEST/i.test(content)) continue;
    await index.addCustomRecord({
      url: `${base}/${x.file}#page=${i + 1}`,
      content,
      language: 'en',
      meta: { title: `${x.ref}, p. ${i + 1}`, ref: x.ref, desc: x.desc, dates: x.dates, release: x.release, doc: '/' + (slugs[x.doc] || ''), page: String(i + 1) },
      filters: { release: [x.release], series: [x.ref.split('/')[0]] },
    });
    pages++;
  }
}
fs.rmSync(OUT, { recursive: true, force: true });
await index.writeFiles({ outputPath: OUT });
await pagefind.close();
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`MoD index: ${pages.toLocaleString('en-US')} pages from ${files.length - skipped} files (${skipped} not OCR'd yet), ${(size(OUT) / 1e6).toFixed(1)} MB in site/pagefind-mod — ${Date.now() - t0} ms`);
