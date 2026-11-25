// The database: Postgres through Kysely (which Better Auth uses too). Production is Neon over `pg`; the dev server
// and the tests use PGlite, Postgres inside the Node process (api/db-dev.mjs), on the same SQL.
import fs from 'node:fs';
import path from 'node:path';
import { Kysely, PostgresDialect, sql } from 'kysely';

export async function pgDb(connectionString) {
  const { default: pg } = await import('pg');
  // one connection per function instance; Neon's pooled address does the pooling
  return new Kysely({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 1, idleTimeoutMillis: 10000 }) }) });
}

// q`select … ${value}` → rows
export const query = db => async (strings, ...values) => (await sql(strings, ...values).execute(db)).rows;

// Apply api/migrations/*.sql in name order, each once and in a transaction. Run by the owner's role in production
// (scripts/accounts-migrate.mjs): the runtime role cannot change the schema.
export async function migrate(db, dir = path.join(import.meta.dirname, 'migrations')) {
  const q = query(db);
  await q`create table if not exists schema_migration (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await q`select name from schema_migration`).map(r => r.name));
  const applied = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    const statements = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\s*--.*$/gm, '').split(/;\s*$/m).map(s => s.trim()).filter(Boolean);
    await db.transaction().execute(async tx => {
      for (const s of statements) await sql.raw(s).execute(tx);
      await sql`insert into schema_migration (name) values (${f})`.execute(tx);
    });
    applied.push(f);
  }
  return applied;
}

// What the deployed function's database role may do: read and write rows, never change the schema. Consent events
// can only be added and read (they still go with the account: a cascade runs as the table's owner).
export async function grantRuntime(db, role) {
  if (!/^[a-z_][a-z0-9_]*$/.test(role)) throw new Error('role name');
  const r = sql.raw(`"${role}"`);
  for (const s of [
    sql`revoke all on all tables in schema public from ${r}`,
    sql`revoke create on schema public from ${r}`,
    sql`grant usage on schema public to ${r}`,
    sql`grant select, insert, update, delete on "user", "session", "account", "verification", subscription, mail_contact, contact_deletion, limit_counter, webhook_event, broadcast_draft to ${r}`,
    sql`grant select, insert on consent_event to ${r}`,
  ]) await s.execute(db);
}
