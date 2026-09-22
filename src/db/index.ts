import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { MIGRATIONS } from "./migrations";
import * as schema from "./schema";

// Both drivers expose the same drizzle query builder, so the rest of the app
// is typed against the postgres-js flavour and never sees which one is live.
export type DB = PostgresJsDatabase<typeof schema>;

type Migrator = {
  exec: (sql: string) => Promise<unknown>;
  appliedNames: () => Promise<string[]>;
  record: (name: string) => Promise<unknown>;
};

const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS _migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

async function runMigrations(m: Migrator) {
  await m.exec(MIGRATIONS_TABLE);
  const applied = new Set(await m.appliedNames());
  for (const { name, sql } of MIGRATIONS) {
    if (applied.has(name)) continue;
    await m.exec(sql);
    await m.record(name);
  }
}

async function connectPostgres(url: string): Promise<DB> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // prepare: false keeps us compatible with transaction-mode poolers
  // (Supabase / Neon pooled URLs).
  const client = postgres(url, { prepare: false, max: 5 });

  await client.begin(async (tx) => {
    // Serialise concurrent cold starts so only one of them migrates.
    await tx`SELECT pg_advisory_xact_lock(727274)`;
    await runMigrations({
      exec: (sql) => tx.unsafe(sql),
      appliedNames: async () => (await tx<{ name: string }[]>`SELECT name FROM _migrations`).map((r) => r.name),
      record: (name) => tx`INSERT INTO _migrations (name) VALUES (${name})`,
    });
  });

  return drizzle(client, { schema });
}

async function connectPglite(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { mkdir } = await import("node:fs/promises");
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  // PGlite creates its own directory but not missing parents.
  await mkdir(dir, { recursive: true });
  const client = new PGlite(dir);

  await runMigrations({
    exec: (sql) => client.exec(sql),
    appliedNames: async () => (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map((r) => r.name),
    record: (name) => client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]),
  });

  return drizzle({ client, schema }) as unknown as DB;
}

// Cached on globalThis so dev-server hot reloads reuse one connection
// (PGlite in particular locks its data directory).
const g = globalThis as unknown as { __nyotaDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__nyotaDb) {
    const url = process.env.DATABASE_URL;
    g.__nyotaDb = (url ? connectPostgres(url) : connectPglite()).catch((err) => {
      g.__nyotaDb = undefined;
      throw err;
    });
  }
  return g.__nyotaDb;
}

export { schema };
