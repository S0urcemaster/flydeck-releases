import "../environment.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db/database.js";
import { runMigrations } from "../db/migrations.js";

const labelSchema = z.string().trim().min(1).max(100);

const options = readOptions(process.argv.slice(2));
const database = createDatabase(loadConfig());

try {
  await runMigrations(database);
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const result = await database.query<{
    user_id: string;
    workspace_id: string;
    created: boolean;
  }>(`
    WITH existing AS (
      SELECT
        users.id AS user_id,
        workspaces.id AS workspace_id,
        false AS created
      FROM users
      JOIN workspace_memberships
        ON workspace_memberships.user_id = users.id
       AND workspace_memberships.role = 'owner'
      JOIN workspaces
        ON workspaces.id = workspace_memberships.workspace_id
      WHERE users.display_name = $1
        AND workspaces.name = $2
        AND workspaces.filesystem_root = $3
      ORDER BY users.created_at, workspaces.created_at
      LIMIT 1
    ), new_user AS (
      INSERT INTO users (id, display_name)
      SELECT $4, $1
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id
    ), new_workspace AS (
      INSERT INTO workspaces (id, name, filesystem_root)
      SELECT $5, $2, $3
      WHERE EXISTS (SELECT 1 FROM new_user)
      RETURNING id
    ), new_membership AS (
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      SELECT new_workspace.id, new_user.id, 'owner'
      FROM new_workspace CROSS JOIN new_user
    )
    SELECT user_id, workspace_id, created FROM existing
    UNION ALL
    SELECT new_user.id, new_workspace.id, true
    FROM new_user CROSS JOIN new_workspace
  `, [
    options.userName,
    options.workspaceName,
    options.filesystemRoot,
    userId,
    workspaceId,
  ]);

  const row = result.rows[0];
  if (!row) throw new Error("Bootstrap did not create or find its records");
  console.info(JSON.stringify({
    created: row.created,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  }, null, 2));
} finally {
  await database.end();
}

function readOptions(arguments_: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) {
      throw usageError();
    }
    values.set(name.slice(2), value);
  }

  const userName = labelSchema.parse(values.get("user-name"));
  const workspaceName = labelSchema.parse(values.get("workspace-name"));
  const filesystemRoot = values.get("filesystem-root")?.trim();
  if (!filesystemRoot?.startsWith("/")) throw usageError();
  return { userName, workspaceName, filesystemRoot };
}

function usageError() {
  return new Error(
    "Usage: npm run bootstrap --workspace flydeck-backend-v2 -- "
      + "--user-name <name> --workspace-name <name> "
      + "--filesystem-root </absolute/path>",
  );
}
