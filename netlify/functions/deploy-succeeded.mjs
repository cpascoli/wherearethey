// IndexNow: after every successful production deploy, tell Bing (and through it DuckDuckGo, Yandex, Seznam, Naver and
// ChatGPT's search, which share IndexNow) which pages are new or changed, so they are recrawled within hours instead of
// waiting for the sitemap to be re-read. Google does not use IndexNow; it reads the sitemap.
// Netlify runs a function named deploy-succeeded on that event. "Changed" = the page's sitemap <lastmod> differs from
// the one last submitted, remembered in the Netlify Blobs store `indexnow`; the first run submits every page.
// The key is public by design: IndexNow checks that https://wherearethey.info/<key>.txt contains it.
import { getStore } from '@netlify/blobs';

const SITE = 'https://wherearethey.info';
const KEY = 'b733a2697c66cf132664191097f0c63c';

export default async (req) => {
  let deploy = {};
  try { deploy = (await req.json()).payload || {}; } catch {}
  if (deploy.context && deploy.context !== 'production') return new Response('not production');

  const xml = await (await fetch(`${SITE}/sitemap.xml`, { headers: { 'cache-control': 'no-cache' } })).text();
  const now = Object.fromEntries([...xml.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));
  const store = getStore({ name: 'indexnow', consistency: 'strong' });
  const sent = (await store.get('sent', { type: 'json' })) || {};
  const changed = Object.keys(now).filter(u => sent[u] !== now[u]);
  if (!changed.length) return new Response('nothing changed');

  let ok = 0;
  for (let i = 0; i < changed.length; i += 10000) { // the protocol accepts up to 10,000 URLs per request
    const urlList = changed.slice(i, i + 10000);
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    });
    console.log(`IndexNow: ${urlList.length} URLs → HTTP ${r.status}`);
    if (r.ok) { ok += urlList.length; for (const u of urlList) sent[u] = now[u]; }
  }
  for (const u of Object.keys(sent)) if (!(u in now)) delete sent[u]; // pages that left the sitemap
  await store.setJSON('sent', sent);
  return new Response(`submitted ${ok} of ${changed.length}`);
};
