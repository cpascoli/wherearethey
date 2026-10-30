#!/usr/bin/env node
// Poster frames and video files of the videos on DVIDS: the PURSUE records' `pursue.dvids` (the "Official footage"
// carousel) and video entries whose `url:` is a DVIDS page (played in our own player, synced with the transcript).
// Fetches each DVIDS embed page and keeps its poster and MP4 URLs in content/dvids.json
// (commit it; the build reads it and never fetches). Only ids not yet complete in the file are fetched.
//   node scripts/dvids-thumbs.mjs [--all]
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'content/dvids.json');
const map = !process.argv.includes('--all') && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const ids = new Set();
for (const [sub, get] of [['record', fm => fm?.pursue?.dvids], ['video', fm => fm?.url]]) {
  const dir = path.join(ROOT, 'content', sub);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const fm = YAML.parse(fs.readFileSync(path.join(dir, f), 'utf8').split(/^---$/m)[1]);
    const m = String(get(fm) || '').match(/dvidshub\.net\/video\/(\d+)/);
    if (m) ids.add(m[1]);
  }
}
let added = 0, failed = 0;
for (const id of [...ids].sort()) {
  if (map[id]?.mp4) continue;
  try {
    const html = await (await fetch(`https://www.dvidshub.net/video/embed/${id}`)).text();
    const poster = html.match(/poster="([^"]+)"/)?.[1], mp4 = html.match(/<source src="(https:[^"]+\.mp4)"/)?.[1];
    if (poster || mp4) { map[id] = { ...(poster && { poster }), ...(mp4 && { mp4 }) }; added++; } else failed++;
  } catch { failed++; }
  await new Promise(r => setTimeout(r, 300));
}
fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(map).sort()), null, 1) + '\n');
console.log(`DVIDS: ${ids.size} videos, ${added} fetched, ${failed} without a poster or file`);
