#!/usr/bin/env node
// What the Latest bot may anchor a news item to: every graph entry with its names and how connected it is
// (links in + out), most connected first. A news item must `rel` to at least one of these ids.
//
//   node scripts/watchlist.mjs              id, type, links, name, aka (tab-separated)
//   node scripts/watchlist.mjs --queries    Google News RSS URLs for the most connected people, programs and orgs
//   node scripts/watchlist.mjs --top 40     limit either list
import { readEntries } from './lib.mjs';

const OFF = new Set(['record', 'news', 'video', 'source']); // not anchors: records/news are off-graph, videos are evidence
const CREDIBLE = new Set(['congress', 'government', 'intelligence', 'military', 'aviator', 'sensor-operator', 'academia', 'astronaut', 'aerospace', 'law-enforcement']);
const args = process.argv.slice(2);
const top = Number(args[args.indexOf('--top') + 1]) || Infinity;

const entries = readEntries();
const ids = new Set(entries.map(e => e.id));
const degree = new Map();
for (const e of entries) for (const [, target] of e.data.rel || []) {
  if (!ids.has(target)) continue;
  degree.set(e.id, (degree.get(e.id) || 0) + 1);
  degree.set(target, (degree.get(target) || 0) + 1);
}
const list = entries.filter(e => !OFF.has(e.type))
  .map(e => ({ id: e.id, type: e.type, links: degree.get(e.id) || 0, name: String(e.data.name || e.id), aka: (e.data.aka || []).map(String),
    tier: e.type === 'person' ? ((e.data.credentials || []).some(c => CREDIBLE.has(c.category)) ? 'credible' : (e.data.credentials || [])[0]?.category || 'unknown') : '' }))
  .sort((a, b) => b.links - a.links || a.id.localeCompare(b.id));

if (args.includes('--queries')) {
  // one Google News search per name, last 3 days (hearings are past events, left out); people need credible credentials, so the bot starts from witnesses and officials
  const picks = list.filter(e => (e.type === 'person' && e.tier === 'credible') || ['program', 'organization', 'concept'].includes(e.type)).slice(0, top === Infinity ? 60 : top);
  for (const e of picks) {
    const name = e.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const term = e.type !== 'person' && e.aka[0] && e.aka[0].length < name.length ? e.aka[0] : name; // programs by their short name (AAWSAP)
    const q = `"${term}" (UAP OR UFO OR UAPs OR UFOs) when:3d`;
    console.log(`${e.id}\thttps://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`);
  }
} else {
  console.log('id\ttype\tlinks\ttier\tname\taka');
  for (const e of list.slice(0, top)) console.log([e.id, e.type, e.links, e.tier, e.name, e.aka.join('; ')].join('\t'));
}
