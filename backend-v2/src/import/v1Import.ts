import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { cronTimerSchema, type CronTimer } from "@flydeck/shared/cron";
import { createTreeNodeLocalId } from "@flydeck/shared/v2";
import { z } from "zod";
import type { Database } from "../db/database.js";

const uuidSchema = z.uuid();
const dataMarker = "--data--";
const maximumContentLength = 1_000_000;

export type V1ImportOptions = {
  workspaceId: string;
  userId: string;
  dataDirectory?: string;
  cronFile?: string;
};

export type V1ImportSummary = {
  data: { found: number; imported: number; skipped: number };
  cron: { found: number; imported: number; skipped: number };
};

type LegacyDataFile = {
  sourceKey: string;
  title: string;
  entries: string[];
  modifiedAt: string;
  sha256: string;
};

type LegacyCronTimer = {
  sourceKey: string;
  timer: CronTimer;
  sourceModifiedAt: string;
  sha256: string;
};

export async function importV1(
  database: Database,
  options: V1ImportOptions,
): Promise<V1ImportSummary> {
  const workspaceId = uuidSchema.parse(options.workspaceId);
  const userId = uuidSchema.parse(options.userId);

  // Parse every source before writing anything, so malformed V1 data does not
  // result in a surprising half-import.
  const [dataFiles, cronTimers] = await Promise.all([
    options.dataDirectory ? readLegacyDataDirectory(options.dataDirectory) : [],
    options.cronFile ? readLegacyCronFile(options.cronFile) : [],
  ]);

  await assertImportContext(database, workspaceId, userId);
  const treeId = dataFiles.length > 0
    ? await ensureDataTree(database, workspaceId)
    : null;

  let importedData = 0;
  for (const file of dataFiles) {
    if (await importDataFile(database, workspaceId, treeId!, file)) {
      importedData += 1;
    }
  }

  let importedCron = 0;
  for (const timer of cronTimers) {
    if (await importCronTimer(database, workspaceId, userId, timer)) {
      importedCron += 1;
    }
  }

  return {
    data: {
      found: dataFiles.length,
      imported: importedData,
      skipped: dataFiles.length - importedData,
    },
    cron: {
      found: cronTimers.length,
      imported: importedCron,
      skipped: cronTimers.length - importedCron,
    },
  };
}

export async function readLegacyDataDirectory(
  directory: string,
): Promise<LegacyDataFile[]> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name, "de"));

  return Promise.all(entries.map(async ({ name }) => {
    const filePath = path.join(directory, name);
    const [content, fileStat] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
    ]);
    return {
      sourceKey: name,
      title: parseLegacyDataTitle(content, name),
      entries: parseLegacyDataEntries(content, name)
        .map((entry) => entry.trim())
        .filter(Boolean),
      modifiedAt: fileStat.mtime.toISOString(),
      sha256: sha256(content),
    };
  }));
}

export async function readLegacyCronFile(
  filePath: string,
): Promise<LegacyCronTimer[]> {
  const fileStat = await lstat(filePath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`V1 CRON source is not a regular file: ${filePath}`);
  }
  const content = await readFile(filePath, "utf8");
  const lines = parseLegacyDataEntries(content, filePath);
  return lines.map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSON in ${filePath} on data line ${index + 1}`);
    }
    const timer = cronTimerSchema.parse(value);
    return {
      sourceKey: timer.id,
      timer,
      sourceModifiedAt: fileStat.mtime.toISOString(),
      sha256: sha256(line),
    };
  });
}

export function parseLegacyDataTitle(content: string, source = "DATA file") {
  if (content.length > maximumContentLength) {
    throw new Error(`${source} exceeds the V2 content limit of ${maximumContentLength} characters`);
  }
  const { preamble } = splitLegacyData(content, source);
  const title = preamble.find((line) => line.startsWith("# "))?.slice(2).trim();
  if (!title) throw new Error(`Markdown title is missing in ${source}`);
  if (title.length > 200) throw new Error(`Markdown title is too long in ${source}`);
  return title;
}

function parseLegacyDataEntries(content: string, source: string) {
  const { entries } = splitLegacyData(content, source);
  while (entries.at(-1) === "") entries.pop();
  return entries;
}

function splitLegacyData(content: string, source: string) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const markerIndexes = lines.flatMap((line, index) => (
    line.trim() === dataMarker ? [index] : []
  ));
  if (markerIndexes.length !== 1) {
    throw new Error(
      markerIndexes.length === 0
        ? `Marker ${dataMarker} is missing in ${source}`
        : `Marker ${dataMarker} occurs more than once in ${source}`,
    );
  }
  const markerIndex = markerIndexes[0];
  return {
    preamble: lines.slice(0, markerIndex),
    entries: lines.slice(markerIndex + 1),
  };
}

async function assertImportContext(
  database: Database,
  workspaceId: string,
  userId: string,
) {
  const result = await database.query<{ allowed: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM workspace_memberships
      WHERE workspace_id = $1
        AND user_id = $2
        AND role IN ('owner', 'editor')
    ) AS allowed
  `, [workspaceId, userId]);
  if (!result.rows[0]?.allowed) {
    throw new Error("Import user must be an owner or editor of the target workspace");
  }
}

async function ensureDataTree(database: Database, workspaceId: string) {
  const result = await database.query<{ id: string }>(`
    INSERT INTO trees (id, workspace_id, kind)
    VALUES ($1, $2, 'data')
    ON CONFLICT (workspace_id, kind)
    DO UPDATE SET updated_at = trees.updated_at
    RETURNING id
  `, [randomUUID(), workspaceId]);
  return result.rows[0].id;
}

async function importDataFile(
  database: Database,
  workspaceId: string,
  treeId: string,
  file: LegacyDataFile,
) {
  return database.transaction(async (client) => {
    const previous = await client.query<{ target_id: string; kind: string | null }>(`
      SELECT legacy_imports.target_id, tree_nodes.kind
      FROM legacy_imports
      LEFT JOIN tree_nodes ON tree_nodes.id = legacy_imports.target_id
      WHERE legacy_imports.workspace_id = $1
        AND legacy_imports.source_kind = 'v1-data-file'
        AND legacy_imports.source_key = $2
      FOR UPDATE OF legacy_imports
    `, [workspaceId, file.sourceKey]);
    if (previous.rows[0]?.kind === "data-list") return false;

    const listNodeId = previous.rows[0]?.target_id ?? randomUUID();
    const rootIds = await client.query<{ local_id: string }>(`
      SELECT local_id FROM tree_nodes
      WHERE tree_id = $1 AND parent_id IS NULL AND id <> $2
    `, [treeId, listNodeId]);
    const listLocalId = createTreeNodeLocalId(
      file.title,
      rootIds.rows.map(({ local_id }) => local_id),
    );
    if (previous.rows[0]) {
      await client.query(`
        DELETE FROM tree_nodes WHERE parent_id = $1 AND tree_id = $2
      `, [listNodeId, treeId]);
      await client.query(`
        UPDATE tree_nodes
        SET kind = 'data-list', label = $1, local_id = $4,
            content_editable = true, list_editable = true,
            revision = revision + 1, updated_at = now()
        WHERE id = $2 AND tree_id = $3
      `, [file.title, listNodeId, treeId, listLocalId]);
    } else {
      await client.query(`
        INSERT INTO tree_nodes (
          id, tree_id, parent_id, kind, label, local_id, position,
          content_editable, list_editable
        ) VALUES (
          $1, $2, NULL, 'data-list', $3, $4,
          COALESCE((
            SELECT MAX(position) + 1 FROM tree_nodes
            WHERE tree_id = $2 AND parent_id IS NULL
          ), 0), true, true
        )
      `, [listNodeId, treeId, file.title, listLocalId]);
    }
    await client.query(`
      INSERT INTO node_contents (node_id, format, content)
      VALUES ($1, 'text', $2)
      ON CONFLICT (node_id) DO UPDATE
      SET format = 'text', content = EXCLUDED.content,
          revision = node_contents.revision + 1, updated_at = now()
    `, [listNodeId, file.title]);

    if (file.entries.length > 99) {
      throw new Error(`DATA list exceeds 99 items in ${file.sourceKey}`);
    }
    const entryLocalIds = new Set<string>();
    for (const [position, entry] of file.entries.entries()) {
      if (entry.length > 200) {
        throw new Error(`DATA entry is too long for a title in ${file.sourceKey}`);
      }
      const entryNodeId = randomUUID();
      const entryLocalId = createTreeNodeLocalId(entry, entryLocalIds);
      entryLocalIds.add(entryLocalId);
      await client.query(`
        INSERT INTO tree_nodes (
          id, tree_id, parent_id, kind, label, local_id, position,
          content_editable, list_editable
        ) VALUES ($1, $2, $3, 'data-item', $4, $5, $6, true, true)
      `, [entryNodeId, treeId, listNodeId, entry, entryLocalId, position]);
      await client.query(`
        INSERT INTO node_contents (node_id, format, content)
        VALUES ($1, 'text', $2)
      `, [entryNodeId, entry]);
    }

    await client.query(`
      INSERT INTO legacy_imports (
        workspace_id, source_kind, source_key, source_sha256,
        source_modified_at, target_kind, target_id
      ) VALUES ($1, 'v1-data-file', $2, $3, $4, 'tree-node', $5)
      ON CONFLICT (workspace_id, source_kind, source_key) DO UPDATE
      SET source_sha256 = EXCLUDED.source_sha256,
          source_modified_at = EXCLUDED.source_modified_at,
          target_id = EXCLUDED.target_id,
          imported_at = now()
    `, [workspaceId, file.sourceKey, file.sha256, file.modifiedAt, listNodeId]);
    await client.query(`
      UPDATE trees SET revision = revision + 1, updated_at = now()
      WHERE id = $1
    `, [treeId]);
    return true;
  });
}

async function importCronTimer(
  database: Database,
  workspaceId: string,
  userId: string,
  source: LegacyCronTimer,
) {
  const timerId = randomUUID();
  const expiredAt = source.timer.status === "expired" ? source.timer.dueAt : null;
  const result = await database.query<{ target_id: string }>(`
    WITH new_timer AS (
      INSERT INTO cron_timers (
        id, workspace_id, created_by_user_id, title, due_at,
        status, created_at, updated_at, expired_at
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $7, $8
      WHERE NOT EXISTS (
        SELECT 1 FROM legacy_imports
        WHERE workspace_id = $2
          AND source_kind = 'v1-cron-timer'
          AND source_key = $9
      )
      RETURNING id
    ), recorded AS (
      INSERT INTO legacy_imports (
        workspace_id, source_kind, source_key, source_sha256,
        source_modified_at, target_kind, target_id
      )
      SELECT $2, 'v1-cron-timer', $9, $10, $11, 'cron-timer', id
      FROM new_timer
      RETURNING target_id
    )
    SELECT target_id FROM recorded
  `, [
    timerId,
    workspaceId,
    userId,
    source.timer.title,
    source.timer.dueAt,
    source.timer.status,
    source.timer.createdAt,
    expiredAt,
    source.sourceKey,
    source.sha256,
    source.sourceModifiedAt,
  ]);
  return result.rows.length === 1;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
