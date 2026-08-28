import { Pool, type QueryResultRow } from "pg";

import type { RelayConfig } from "./config.js";

export type Queryable = {
  query<TResult extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: TResult[]; rowCount: number | null }>;
};

export type RelayDatabase = Queryable & { end(): Promise<void> };

export function createDatabase(config: RelayConfig): RelayDatabase {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return {
    query: (text, values) => pool.query(text, values ? [...values] : undefined),
    end: () => pool.end(),
  };
}
