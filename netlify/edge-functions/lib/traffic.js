// Cookieless traffic counter (called from geo.js). Every HTML page load is filed under one anonymous visitor
// record per month in the Netlify Blobs store "traffic":
//   v/<YYYY-MM>/<hash>  →  { k: kind, b: bot name, c: country, d: { day: loads }, p: { path: loads }, e: { path: 404s } }
// The hash is SHA-256 of a random salt for the month + IP + user agent. The salt (salt/<YYYY-MM>) is created on the
// first visit of a month and the previous month's is deleted then, so a past month's records cannot be linked to an
// IP any more: what is left is anonymous. Nothing is set in the browser. `npm run traffic` reads the store.
// Note the site is a single-page app: a page load is a landing (or a reload), not every page viewed in it.
import { getStore } from '@netlify/blobs';

const SEARCH = [['Googlebot', /googlebot|google-inspectiontool|storebot-google|googleother/i], ['Bingbot', /bingbot|bingpreview|msnbot/i],
  ['DuckDuckBot', /duckduck/i], ['Applebot', /applebot/i], ['YandexBot', /yandex/i], ['Baiduspider', /baiduspider/i],
  ['Yahoo Slurp', /slurp/i], ['Seznam', /seznambot/i], ['Naver', /yeti\//i], ['Qwant', /qwant/i], ['Mojeek', /mojeek/i],
  ['Brave', /bravebot/i], ['Ecosia', /ecosia/i]];
const AI = [['GPTBot', /gptbot/i], ['ChatGPT', /chatgpt-user|oai-searchbot/i], ['ClaudeBot', /claudebot|claude-user|claude-searchbot|anthropic/i],
  ['PerplexityBot', /perplexity/i], ['CCBot', /ccbot/i], ['Bytespider', /bytespider/i], ['Google-Extended', /google-extended|google-cloudvertexbot/i],
  ['Meta AI', /meta-externalagent|meta-externalfetcher|facebookbot/i], ['Amazonbot', /amazonbot/i], ['Applebot-Extended', /applebot-extended/i],
  ['cohere', /cohere-ai/i], ['DuckAssistBot', /duckassistbot/i], ['MistralAI', /mistralai-user/i], ['PetalBot', /petalbot/i],
  ['Diffbot', /diffbot/i], ['YouBot', /youbot/i], ['Timpibot', /timpibot/i], ['ImagesiftBot', /imagesift/i]];
const PREVIEW = [['X', /twitterbot/i], ['Facebook', /facebookexternalhit|facebookcatalog/i], ['WhatsApp', /whatsapp/i], ['Slack', /slackbot|slack-imgproxy/i],
  ['Discord', /discordbot/i], ['Telegram', /telegrambot/i], ['LinkedIn', /linkedinbot/i], ['Reddit', /redditbot/i], ['Skype', /skypeuripreview/i],
  ['Mastodon', /mastodon/i], ['Bluesky', /bluesky|cardyb/i], ['Pinterest', /pinterest/i], ['Embedly', /embedly/i]];
const OTHER = /bot\b|bot\/|crawl|spider|scrap|fetch|curl|wget|python|httpx|aiohttp|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|perl|ruby|php|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|statuscake|ahrefs|semrush|mj12|dotbot|blexbot|serpstat|dataforseo|barkrowler|archive\.org|ia_archiver|heritrix|feed|rss|zgrab|masscan|nmap|nuclei|censys|expanse|scan/i;

// kind: 'human' | 'search' | 'ai' | 'preview' | 'bot', with a name for the non-human ones
export function classify(request) {
  const ua = request.headers.get('user-agent') || '';
  for (const [kind, list] of [['ai', AI], ['search', SEARCH], ['preview', PREVIEW]])
    for (const [name, re] of list) if (re.test(ua)) return { kind, name };
  if (!ua) return { kind: 'bot', name: '(no user agent)' };
  if (OTHER.test(ua)) return { kind: 'bot', name: (ua.match(/([A-Za-z][\w.-]*(?:bot|crawler|spider|scraper|fetcher)[\w.-]*)/i) || ua.match(/^[\w.-]+/) || ['other'])[0].slice(0, 40) };
  // real browsers send these on a page navigation; plain scripts posing as Chrome usually don't
  if (!/mozilla\//i.test(ua) || !request.headers.get('accept-language')) return { kind: 'bot', name: 'browser-like script' };
  return { kind: 'human' };
}

const store = () => getStore({ name: 'traffic', consistency: 'strong' });
const salts = new Map(); // month → salt, per edge isolate

async function saltFor(month) {
  if (salts.has(month)) return salts.get(month);
  const s = store();
  let salt = await s.get(`salt/${month}`);
  if (!salt) {
    const fresh = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await s.set(`salt/${month}`, fresh, { onlyIfNew: true });
    salt = r && r.modified === false ? await s.get(`salt/${month}`) : fresh;
    // a new month: forget the previous month's salt, so its visitors can no longer be linked to anyone
    const [y, m] = month.split('-').map(Number), prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    await s.delete(`salt/${prev}`).catch(() => {});
  }
  salts.set(month, salt);
  return salt;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

const bump = (o, k, max) => { if (k in o || Object.keys(o).length < max) o[k] = (o[k] || 0) + 1; };

export async function countVisit(request, context, status, country) {
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!/(^|\.)wherearethey\.info$/.test(url.hostname)) return; // not deploy previews or the dev server
  const purpose = request.headers.get('sec-purpose') || request.headers.get('purpose') || '';
  if (/prefetch|prerender/i.test(purpose)) return;
  const { kind, name } = classify(request);
  const now = new Date(), month = now.toISOString().slice(0, 7), day = now.toISOString().slice(8, 10);
  const ip = context.ip || request.headers.get('x-nf-client-connection-ip') || '';
  const id = await sha256(`${await saltFor(month)}|${ip}|${request.headers.get('user-agent') || ''}`);
  const s = store(), key = `v/${month}/${id}`;
  const rec = (await s.get(key, { type: 'json' })) || { k: kind, c: country, d: {}, p: {}, e: {} };
  if (name) rec.b = name;
  bump(rec.d, day, 31);
  const path = decodeURIComponent(url.pathname).slice(0, 200);
  if (status === 404) bump(rec.e, path, 20); else if (status < 400) bump(rec.p, path, kind === 'human' ? 100 : 30);
  await s.setJSON(key, rec);
}
