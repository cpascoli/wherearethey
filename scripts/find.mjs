#!/usr/bin/env node
// Find a phrase in fetched transcripts and print timestamps — handy for writing `moments:`.
//   node scripts/find.mjs "non-human biologics" [youtubeId|video-entry-id …]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readEntries } from './lib.mjs';

const [phrase, ...only] = process.argv.slice(2);
if (!phrase) { console.log('usage: node scripts/find.mjs "phrase" [video ids…]'); process.exit(1); }
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ');
const needle = norm(phrase).trim();
const byYt = new Map(readEntries().filter(e => e.type === 'video').map(e => [String(e.data.youtube), e.id]));
const fmt = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
for (const yt of fs.readdirSync(path.join(ROOT, 'media'))) {
  const id = byYt.get(yt) || yt;
  if (only.length && !only.includes(yt) && !only.includes(id)) continue;
  const f = path.join(ROOT, 'media', yt, 'transcript.json');
  if (!fs.existsSync(f)) continue;
  const segs = JSON.parse(fs.readFileSync(f, 'utf8')).segments;
  let last = -99;
  segs.forEach(([t, s], i) => {
    const win = norm(s + ' ' + (segs[i + 1]?.[1] || ''));
    if (win.includes(needle) && t - last > 10) {
      last = t;
      console.log(`${id}@${fmt(t)}  (${Math.floor(t)}s)  …${[segs[i - 1]?.[1], s, segs[i + 1]?.[1], segs[i + 2]?.[1]].filter(Boolean).join(' ')}…`);
    }
  });
}
