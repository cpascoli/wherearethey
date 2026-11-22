// Postgres inside the Node process (PGlite), for the dev server and the tests. Never imported by the deployed function.
import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { migrate } from './db.mjs';

// dir: a folder to keep the data in between runs (the dev server); none = in memory (the tests)
export async function devDb(dir) {
  const db = new Kysely({ dialect: new PGliteDialect(new PGlite(dir)) });
  await migrate(db);
  return db;
}
