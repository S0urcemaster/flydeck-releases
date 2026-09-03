import { Pool, type PoolClient, type QueryResultRow } from "pg";

import type { RelayConfig } from "./config.js";

export type Queryable = {
  query<TResult extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: TResult[]; rowCount: number | null }>;
};

export type RelayDatabase = Queryable & {
  transaction<TResult>(operation: (client: Queryable) => Promise<TResult>): Promise<TResult>;
  end(): Promise<void>;
};

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
    transaction: (operation) => runTransaction(pool, operation),
    end: () => pool.end(),
  };
}

async function runTransaction<TResult>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<TResult>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
