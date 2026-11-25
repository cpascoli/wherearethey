// The API for the dev server and the UI tests: Postgres in the process (PGlite) and a stand-in for Resend that prints
// the codes. Kept out of api/serve.mjs so that the deployed function never bundles PGlite.
import { createApp } from './app.mjs';
import { devDb } from './db-dev.mjs';
import { fakeMail } from './mail.mjs';
export { nodeListener } from './serve.mjs';

// dir: where to keep the data between runs (none: in memory)
// admin: the address that gets the admin page here (any address signs in: the code is printed)
export const DEV_ADMIN = 'owner@wherearethey.test';
export async function development({ origin, dir, print = true, admin = process.env.ADMIN_EMAIL || DEV_ADMIN }) {
  const db = await devDb(dir), mail = fakeMail({ print });
  const app = createApp({ db, mail, env: { origin, secure: false, secret: 'dev-only-secret-not-used-anywhere-else-0123456789', limitKey: 'dev-only-limit-key', webhookSecret: 'whsec_' + Buffer.from('dev').toString('base64'), topics: { pursue: 'dev-topic-pursue', digest: 'dev-topic-digest' }, admin } });
  return { app, db, mail };
}
