// The accounts API: every /api/* request (docs/accounts.md, section 7). All of it is in api/, so the dev server and
// the tests run the same code. Off (404) outside the production deploy and unless ACCOUNTS_ENABLED is "true".
import { netlifyHandler } from '../../api/serve.mjs';

export default netlifyHandler();

// 60 requests a minute from one IP, by Netlify, before our own limits (api/limits.mjs) are even asked
export const config = {
  path: '/api/*',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 60 },
};
