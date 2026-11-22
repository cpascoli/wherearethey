#!/usr/bin/env node
// Apply api/migrations/*.sql to the production accounts database, as the owner role, after a backup; then set what
// the function's role may do (docs/accounts.md, section 6).
//   npm run accounts:migrate -- [--no-backup] [--status]
// Needs in the Keychain "wherearethey-migrate" (the owner role's connection string; never the function's), and
// ACCOUNTS_RUNTIME_ROLE (the name of the role in the function's DATABASE_URL).
import { pgDb, migrate, grantRuntime, query } from '../api/db.mjs';
import { backup, keychain } from './accounts-backup.mjs';

const args = process.argv.slice(2);
try {
  const role = process.env.ACCOUNTS_RUNTIME_ROLE;
  if (!role && !args.includes('--status')) throw new Error('set ACCOUNTS_RUNTIME_ROLE');
  const db = await pgDb(keychain('wherearethey-migrate'));
  const q = query(db);
  if (args.includes('--status')) {
    console.log((await q`select name, applied_at from schema_migration order by name`.catch(() => [])).map(r => `${r.name}  ${r.applied_at.toISOString()}`).join('\n') || 'no migrations applied');
  } else {
    const first = !(await q`select 1 from information_schema.tables where table_name = 'schema_migration'`).length;
    if (!first && !args.includes('--no-backup')) console.log('backup:', backup().out);
    const applied = await migrate(db);
    await grantRuntime(db, role);
    console.log(applied.length ? `applied: ${applied.join(', ')}` : 'nothing to apply', `· grants set for ${role}`);
  }
  await db.destroy();
} catch (e) { console.error('migrate failed:', e.message); process.exit(1); }
