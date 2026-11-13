// Netlify Edge Function, on every HTML page:
// 1. Tell the page which country the visitor is in, so the cookie banner is only shown where consent is legally
//    required (EEA, UK, Switzerland). Replaces the <!--GEO--> marker in the served HTML with a tiny script. If
//    geolocation is unavailable the country is left empty, and the page then falls back to showing the banner.
// 2. Count the page load without cookies (Google Analytics misses visitors who decline it or block it): see
//    ./lib/traffic.js. The count runs after the response is sent and never delays or breaks the page.
import { countVisit } from './lib/traffic.js';

export default async (request, context) => {
  const res = await context.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  const country = (context.geo && context.geo.country && context.geo.country.code) || '';
  try { context.waitUntil(countVisit(request, context, res.status, country).catch(() => {})); } catch {}
  const html = (await res.text()).replace('<!--GEO-->', `<script>window.VISITOR_COUNTRY=${JSON.stringify(country)};</script>`);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'private, no-store'); // the page now varies by visitor country
  return new Response(html, { status: res.status, headers });
};

// every page (each view and file has its own HTML page); static data and assets skip the function
export const config = { path: '/*', excludedPath: ['/assets/*', '/data/*', '/sitemap.xml', '/robots.txt'] };
