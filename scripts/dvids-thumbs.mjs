#!/usr/bin/env node
// Poster frames of the PURSUE videos on DVIDS, for the "Official footage" section of a file's page:
// reads every record's `pursue.dvids`, fetches the DVIDS embed page and keeps its poster URL in content/dvids.json
// (commit it; the build reads it and never fetches). Only ids not yet in the file are fetched.
//   node scripts/dvids-thumbs.mjs [--all]
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'content/dvids.json');
const map = !process.argv.includes('--all') && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const dir = path.join(ROOT, 'content/record');
const ids = new Set();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
  const fm = YAML.parse(fs.readFileSync(path.join(dir, f), 'utf8').split(/^---$/m)[1]);
  const m = String(fm?.pursue?.dvids || '').match(/\/video\/(\d+)/);
  if (m) ids.add(m[1]);
}
let added = 0, failed = 0;
for (const id of [...ids].sort()) {
  if (map[id]) continue;
  try {
    const html = await (await fetch(`https://www.dvidshub.net/video/embed/${id}`)).text();
    const poster = html.match(/poster="([^"]+)"/)?.[1];
    if (poster) { map[id] = { poster }; added++; } else failed++;
  } catch { failed++; }
  await new Promise(r => setTimeout(r, 300));
}
fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(map).sort()), null, 1) + '\n');
console.log(`DVIDS posters: ${ids.size} videos, ${added} added, ${failed} without a poster`);
