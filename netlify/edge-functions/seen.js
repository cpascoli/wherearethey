// Netlify Edge Function: the page's one-off "seen" signal for the cookieless counter (see ./lib/traffic.js). The app
// posts it once per page load when the visitor interacts or keeps the page in view; it marks today's visit as a
// person rather than a bot. No body, no cookie, nothing returned.
import { markSeen } from './lib/traffic.js';

export default async (request, context) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  const country = (context.geo && context.geo.country && context.geo.country.code) || '';
  try { context.waitUntil(markSeen(request, context, country).catch(() => {})); } catch {}
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/__seen' };
