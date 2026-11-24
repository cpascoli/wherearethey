// Traffic report from the cookieless counter (netlify/edge-functions/lib/traffic.js).
//   npm run traffic                 this month
//   npm run traffic -- 2026-11      a given month
//   npm run traffic -- 2026-11 --json
// Reads the Netlify Blobs store "traffic" with the Netlify CLI's login token (or NETLIFY_AUTH_TOKEN).
import { getStore } from '@netlify/blobs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SITE_ID = 'f37aabda-1dfe-487a-9651-4bfbe175436f'; // wherearethey.info
const args = process.argv.slice(2), json = args.includes('--json');
const month = args.find(a => /^\d{4}-\d{2}$/.test(a)) || new Date().toISOString().slice(0, 7);

function token() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  for (const f of [path.join(os.homedir(), 'Library/Preferences/netlify/config.json'), path.join(os.homedir(), '.config/netlify/config.json')]) {
    try { const c = JSON.parse(fs.readFileSync(f, 'utf8')); const u = c.users?.[c.userId] || Object.values(c.users || {})[0]; if (u?.auth?.token) return u.auth.token; } catch {}
  }
  throw new Error('No Netlify token: run `netlify login` or set NETLIFY_AUTH_TOKEN');
}

const store = getStore({ name: 'traffic', siteID: SITE_ID, token: token() });
const keys = [];
for await (const page of store.list({ prefix: `v/${month}/`, paginate: true })) keys.push(...page.blobs.map(b => b.key));
// one record per request: a few thousand of them, so retry a failed one (a dropped DNS lookup used to end the run)
const get = async (k, n = 0) => { try { return await store.get(k, { type: 'json' }); } catch (e) { if (n >= 4) throw e; await new Promise(r => setTimeout(r, 500 * 2 ** n)); return get(k, n + 1); } };
const recs = [];
for (let i = 0; i < keys.length; i += 25) {
  recs.push(...(await Promise.all(keys.slice(i, i + 25).map(k => get(k)))).filter(Boolean));
  if (!json && process.stderr.isTTY) process.stderr.write(`\r${recs.length} / ${keys.length} records`);
}
if (!json && process.stderr.isTTY) process.stderr.write('\n');

// a 'human' record (browser-like, by its headers) counts as a person only once the page has sent its "seen" signal
// (`s`, see netlify/edge-functions/lib/traffic.js); until then it is unconfirmed, which is mostly scripts posing as
// browsers. The signal exists since 2026-11-19: earlier days have no confirmed people.
const KINDS = ['person', 'unconfirmed', 'search', 'ai', 'preview', 'bot'];
const LABEL = { person: 'People', unconfirmed: 'Unconfirmed', search: 'Search engines', ai: 'AI crawlers', preview: 'Link previews', bot: 'Other bots' };
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const add = (o, k, n) => { o[k] = (o[k] || 0) + n; };
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const browserLike = r => r.k === 'human' || (r.k === 'bot' && r.b === 'browser-like script');
const kindOf = (r, seen) => browserLike(r) ? (seen ? 'person' : r.k === 'human' ? 'unconfirmed' : 'bot') : KINDS.includes(r.k) ? r.k : 'bot';

const out = { month, signalSince: null, kinds: {}, days: {}, pages: {}, notFound: {}, countries: {}, unconfirmedPages: {}, bots: {}, referrers: {}, referrersByDay: {} };
for (const k of KINDS) out.kinds[k] = { visitors: 0, loads: 0 };
for (const r of recs) {
  const k = kindOf(r, r.s && Object.keys(r.s).length), loads = sum(r.d);
  out.kinds[k].visitors++; out.kinds[k].loads += loads;
  for (const d of Object.keys(r.s || {})) if (!out.signalSince || d < out.signalSince) out.signalSince = d;
  for (const [d, n] of Object.entries(r.d || {})) {
    const day = (out.days[d] ||= Object.fromEntries(KINDS.map(x => [x, { visitors: 0, loads: 0 }]))), dk = kindOf(r, r.s?.[d]);
    day[dk].visitors++; day[dk].loads += n;
  }
  if (k === 'person') {
    for (const [p, n] of Object.entries(r.p || {})) add(out.pages, p, n);
    for (const [p, n] of Object.entries(r.e || {})) add(out.notFound, p, n);
    add(out.countries, r.c || '??', 1);
    for (const [key, n] of Object.entries(r.r || {})) { const [d, host] = key.split(' '); add(out.referrers, host, n); add(out.referrersByDay[d] ||= {}, host, n); }
  } else if (k === 'unconfirmed') for (const [p, n] of Object.entries(r.p || {})) add(out.unconfirmedPages, p, n);
  else add(out.bots, `${LABEL[k]}: ${r.b || '?'}`, loads);
}

if (json) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
const pad = (s, n) => String(s).padEnd(n), num = (n, w = 8) => String(n).padStart(w);
console.log(`\nTraffic ${month}: ${recs.length} visitor records (cookieless count; page loads, not in-app navigation)`);
console.log(out.signalSince ? `People are confirmed by the page's "seen" signal, first received on ${month}-${out.signalSince}; earlier days have none.\n` : 'No "seen" signal yet this month: every browser-like visitor is unconfirmed.\n');
console.log(pad('', 16) + num('unique') + num('loads'));
for (const k of KINDS) console.log(pad(LABEL[k], 16) + num(out.kinds[k].visitors) + num(out.kinds[k].loads));
console.log('\nBy day (unique / loads: people · unconfirmed · bots of all kinds: loads)');
for (const d of Object.keys(out.days).sort()) {
  const x = out.days[d], botLoads = KINDS.slice(2).reduce((a, k) => a + x[k].loads, 0);
  console.log(`  ${month}-${d}  ${num(x.person.visitors, 6)} / ${num(x.person.loads, 5)}  ·  ${num(x.unconfirmed.visitors, 6)} / ${num(x.unconfirmed.loads, 5)}  ·  ${num(botLoads, 6)}`);
}
const list = (title, o, n) => { const t = top(o, n); if (!t.length) return; console.log(`\n${title}`); for (const [k, v] of t) console.log(`  ${num(v, 6)}  ${k}`); };
list('Top landing pages (people)', out.pages, 25);
list('Countries (people, unique)', out.countries, 15);
list('Sites that sent people (loads; the domain only, and many apps send none)', out.referrers, 20);
for (const d of Object.keys(out.referrersByDay).sort().slice(-3)) list(`  on ${month}-${d}`, out.referrersByDay[d], 8);
list('Top pages, unconfirmed visitors', out.unconfirmedPages, 10);
list('Bots by name (loads)', out.bots, 25);
list('Not found (people)', out.notFound, 15);
console.log('');
