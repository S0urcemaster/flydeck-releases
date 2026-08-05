import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { AppConfig } from "../config.js";

export type Queryable = {
  query<TResult extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: TResult[]; rowCount: number | null }>;
};

export type Database = Queryable & {
  transaction<TResult>(
    operation: (client: Queryable) => Promise<TResult>,
  ): Promise<TResult>;
  end(): Promise<void>;
};

export function createDatabase(config: AppConfig): Database {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return {
    query: <TResult extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) => pool.query<TResult>(text, values ? [...values] : undefined),
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
