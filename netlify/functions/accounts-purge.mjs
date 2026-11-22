// Once a day: delete expired codes, sessions, limit counters and webhook ids, and retry what Resend didn't take
// (api/purge.mjs; docs/accounts.md, section 9). Netlify runs scheduled functions on the production deploy only.
import { production } from '../../api/serve.mjs';
import { purge } from '../../api/purge.mjs';

export default async () => {
  if (process.env.ACCOUNTS_ENABLED !== 'true') return new Response('off');
  try {
    const { app, db } = await production(process.env);
    console.log('accounts purge', JSON.stringify(await purge({ db, app }))); // counts only
  } catch (e) { console.error('accounts purge failed', String(e?.message || '').startsWith('missing ') ? e.message : ''); }
  return new Response('ok');
};

export const config = { schedule: '@daily' };
