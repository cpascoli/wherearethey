#!/usr/bin/env node
// Backup of the accounts database (docs/accounts.md, section 9): an encrypted pg_dump on this Mac, outside the repo,
// kept 30 days. Run weekly by launchd and by accounts-migrate.mjs before it changes anything.
//   npm run accounts:backup
// Needs: pg_dump and openssl; ACCOUNTS_BACKUP_DIR (a folder outside the repo and outside any synced folder); and in
// the Keychain the items "wherearethey-migrate" (the owner role's connection string) and "wherearethey-backup"
// (the passphrase):  security add-generic-password -a "$USER" -s wherearethey-backup -w
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const keychain = name => {
  try { return execFileSync('security', ['find-generic-password', '-s', name, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { throw new Error(`no Keychain item "${name}"`); }
};

export function backup() {
  const dir = process.env.ACCOUNTS_BACKUP_DIR;
  if (!dir) throw new Error('set ACCOUNTS_BACKUP_DIR to a folder outside the repo');
  const full = path.resolve(dir);
  if (full === ROOT || full.startsWith(ROOT + path.sep)) throw new Error('ACCOUNTS_BACKUP_DIR must be outside the repo');
  fs.mkdirSync(full, { recursive: true, mode: 0o700 });
  const url = keychain('wherearethey-migrate'), pass = keychain('wherearethey-backup');
  const out = path.join(full, `accounts-${new Date().toISOString().replace(/[:.]/g, '-')}.dump.enc`);
  // the connection string and the passphrase travel in the environment, never on a command line
  const u = new URL(url), part = v => decodeURIComponent(v);
  const env = { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGUSER: part(u.username), PGPASSWORD: part(u.password), PGDATABASE: part(u.pathname.slice(1)), PGSSLMODE: u.searchParams.get('sslmode') || 'require' };
  // Homebrew's libpq is not on the PATH by default
  const bin = spawnSync('which', ['pg_dump']).status === 0 ? 'pg_dump' : ['/opt/homebrew/opt/libpq/bin/pg_dump', '/usr/local/opt/libpq/bin/pg_dump'].find(f => fs.existsSync(f)) || 'pg_dump';
  const dump = spawnSync(bin, ['--format=custom', '--no-owner'], { maxBuffer: 1 << 30, env });
  if (dump.error?.code === 'ENOENT') throw new Error('pg_dump not found (brew install libpq)');
  if (dump.status !== 0) {
    // say why only where the reason names nothing: never print pg_dump's own message (it can carry the host and role)
    const err = String(dump.stderr || '');
    const why = /server version mismatch|aborting because of server version/.test(err) ? `the server is newer than this pg_dump (${(err.match(/server version: ([\d.]+)/) || [])[1] || '?'} against ${(err.match(/pg_dump version: ([\d.]+)/) || [])[1] || '?'}): brew upgrade libpq`
      : /certificate|SSL/i.test(err) ? 'the TLS check failed' : /authentication|password/i.test(err) ? 'the database refused the sign-in' : /could not translate host|timeout|Connection refused/i.test(err) ? 'the database could not be reached' : dump.error?.code || 'unknown reason';
    throw new Error(`pg_dump failed: ${why}`);
  }
  const enc = spawnSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '600000', '-salt', '-pass', 'env:BACKUP_PASS', '-out', out], { input: dump.stdout, env: { ...process.env, BACKUP_PASS: pass } });
  if (enc.status !== 0) throw new Error('encryption failed');
  fs.chmodSync(out, 0o600);
  let removed = 0;
  for (const f of fs.readdirSync(full)) if (/^accounts-.*\.dump\.enc$/.test(f) && Date.now() - fs.statSync(path.join(full, f)).mtimeMs > 30 * 86400000) { fs.rmSync(path.join(full, f)); removed++; }
  return { out, bytes: fs.statSync(out).size, removed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { const r = backup(); console.log(`backup: ${r.out} (${r.bytes} bytes); ${r.removed} older than 30 days removed`); console.log('to restore: openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in <file> | pg_restore --dbname <url>; then apply again the deletions made since (section 9)'); }
  catch (e) { console.error('backup failed:', e.message); process.exit(1); }
}
