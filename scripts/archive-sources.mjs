#!/usr/bin/env node
// Make sure every web page the archive cites has a copy on the Internet Archive's Wayback Machine, so the
// “archived” link beside each source works even if the page moves, vanishes or goes behind a paywall.
//   node scripts/archive-sources.mjs [--dry]   (reads site/data/kb.js: run after a build)
// Checks each URL with the availability API and asks Save Page Now only for pages with no snapshot yet,
// slowly (the anonymous limit is a few saves a minute). Results are remembered in .cache/archived.json.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const dry = process.argv.includes('--dry');
const kb = fs.readFileSync(path.join(ROOT, 'site/data/kb.js'), 'utf8');
const K = JSON.parse(kb.slice(kb.indexOf('{'), kb.lastIndexOf('}') + 1));
const urls = new Set();
for (const e of K.entities) {
  for (const f of e.facts || []) if (f.source?.url) urls.add(f.source.url);
  if (e.type === 'news' && e.url) urls.add(e.url);
}
const todo = [...urls].filter(u => /^https?:\/\//.test(u) && !/(^|\.)archive\.org\//.test(u.replace(/^https?:\/\//, '')));
const cacheFile = path.join(ROOT, '.cache/archived.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'wherearethey.info source archiver (+https://wherearethey.info)' };
let have = 0, saved = 0, failed = 0;
console.log(`${todo.length} cited web pages`);
for (const u of todo) {
  if (cache[u]?.snapshot) { have++; continue; }
  let snap = null;
  try {
    const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(u)}`, { headers: UA });
    snap = (await r.json())?.archived_snapshots?.closest?.url || null;
  } catch { /* try saving */ }
  if (snap) { cache[u] = { snapshot: snap, checked: new Date().toISOString().slice(0, 10) }; have++; save(); continue; }
  if (dry) { console.log(`  no snapshot: ${u}`); continue; }
  try {
    const r = await fetch(`https://web.archive.org/save/${u}`, { headers: UA, redirect: 'follow' });
    if (r.ok) { cache[u] = { snapshot: r.url, saved: new Date().toISOString().slice(0, 10) }; saved++; console.log(`  saved: ${u}`); }
    else { failed++; console.log(`  ✗ ${r.status}: ${u}`); }
  } catch (err) { failed++; console.log(`  ✗ ${err.message}: ${u}`); }
  save();
  await sleep(20000); // stay well under Save Page Now's anonymous rate limit
}
console.log(`${have} already archived · ${saved} newly saved · ${failed} failed${dry ? ' (dry run)' : ''}`);
