import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./database.js";

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations", import.meta.url),
);

export async function runMigrations(database: Database) {
  await database.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [1_906_202_608]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = new Set((await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations",
    )).rows.map(({ name }) => name));
    const files = (await readdir(migrationsDirectory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();
    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = await readFile(path.join(migrationsDirectory, name), "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [name],
      );
    }
  });
}
