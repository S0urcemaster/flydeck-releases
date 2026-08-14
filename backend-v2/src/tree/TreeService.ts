import {
  createTreeNodeResponseSchema,
  createTreeNodeLocalId,
  setTreeNodeEnabledResponseSchema,
  treeLoadDtoSchema,
  treeNodeDtoSchema,
  treeNodeContentDtoSchema,
  type CreateTreeNodeRequest,
  type SetTreeSelectionRequest,
  type TreeLoadDto,
} from "@flydeck/shared/v2";
import { randomUUID } from "node:crypto";
import type { Database, Queryable } from "../db/database.js";
import { HttpError } from "../http/HttpError.js";

type TreeRow = { id: string; workspace_id: string; kind: "data" | "config"; revision: string | number };
type NodeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  label: string;
  local_id: string;
  position: number;
  revision: string | number;
  content_editable: boolean;
  list_editable: boolean;
  list_item_limit: number | null;
  enabled: boolean;
  enabled_revision: string | number;
};
type MutableNodeRow = Omit<NodeRow, "enabled" | "enabled_revision">;
type SelectionRow = { selected_path: string[]; revision: string | number };
type ContentRow = { node_id: string; format: "text" | "markdown" | "json"; content: string; revision: string | number };

export class TreeService {
  constructor(private readonly database: Database) {}

  async executeIdempotent<TResult>(
    workspaceId: string,
    userId: string,
    requestId: string,
    operation: string,
    schema: { parse(value: unknown): TResult },
    action: (transactionTrees: TreeService) => Promise<TResult>,
    responseStatus = 200,
  ) {
    return this.database.transaction(async (client) => {
      await lockIdempotencyKey(client, userId, workspaceId, requestId);
      const previous = await client.query<{
        operation: string;
        response_body: unknown;
      }>(`
        SELECT operation, response_body FROM idempotency_keys
        WHERE user_id = $1 AND workspace_id = $2 AND request_id = $3
      `, [userId, workspaceId, requestId]);
      if (previous.rows[0]) {
        if (previous.rows[0].operation !== operation) {
          throw new HttpError(
            400,
            "INVALID_REQUEST",
            "The request ID was already used for another operation",
          );
        }
        return schema.parse(previous.rows[0].response_body);
      }

      const response = schema.parse(await action(
        new TreeService(databaseForTransaction(client)),
      ));
      await rememberIdempotentResponse(
        client,
        userId,
        workspaceId,
        requestId,
        operation,
        responseStatus,
        response,
      );
      return response;
    });
  }

  async load(workspaceId: string, userId: string, kind: "data" | "config") {
    if (kind === "data") await this.ensureDataTree(workspaceId);
    const tree = await this.findTree(workspaceId, kind);
    const [nodes, selection] = await Promise.all([
      this.database.query<NodeRow>(`
        SELECT
          tree_nodes.id, tree_nodes.parent_id, tree_nodes.kind,
          tree_nodes.label, tree_nodes.local_id, tree_nodes.position,
          tree_nodes.revision,
          tree_nodes.content_editable, tree_nodes.list_editable,
          tree_nodes.list_item_limit,
          COALESCE(node_user_states.enabled, false) AS enabled,
          COALESCE(node_user_states.revision, 0) AS enabled_revision
        FROM tree_nodes
        LEFT JOIN node_user_states
          ON node_user_states.node_id = tree_nodes.id
         AND node_user_states.user_id = $2
        WHERE tree_nodes.tree_id = $1
        ORDER BY tree_nodes.parent_id NULLS FIRST, tree_nodes.position, tree_nodes.id
      `, [tree.id, userId]),
      this.database.query<SelectionRow>(`
        SELECT selected_path, revision
        FROM tree_user_states
        WHERE tree_id = $1 AND user_id = $2
      `, [tree.id, userId]),
    ]);
    const state = selection.rows[0];
    return treeLoadDtoSchema.parse({
      document: {
        id: tree.id,
        workspaceId: tree.workspace_id,
        kind: tree.kind,
        revision: Number(tree.revision),
        nodes: nodes.rows.map((node) => ({
          id: node.id,
          parentId: node.parent_id,
          kind: node.kind,
          label: node.label,
          localId: node.local_id,
          position: node.position,
          revision: Number(node.revision),
          capabilities: {
            contentEditable: node.content_editable,
            listEditable: node.list_editable,
            listItemLimit: node.list_item_limit,
          },
        })),
      },
      semanticState: {
        revision: maximumRevision(nodes.rows.map((node) => node.enabled_revision)),
        enabledNodeIds: nodes.rows.filter((node) => node.enabled).map((node) => node.id),
        nodeRevisions: Object.fromEntries(nodes.rows.map((node) => [
          node.id,
          Number(node.enabled_revision),
        ])),
      },
      selection: {
        revision: Number(state?.revision ?? 0),
        selectedPath: state?.selected_path ?? [],
      },
    } satisfies TreeLoadDto);
  }

  async getContent(workspaceId: string, nodeId: string) {
    const result = await this.database.query<ContentRow>(`
      SELECT node_contents.*
      FROM node_contents
      JOIN tree_nodes ON tree_nodes.id = node_contents.node_id
      JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE node_contents.node_id = $1 AND trees.workspace_id = $2
    `, [nodeId, workspaceId]);
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "NOT_FOUND", "Node content was not found");
    return toContentDto(row);
  }

  async createNode(
    workspaceId: string,
    userId: string,
    input: CreateTreeNodeRequest,
  ) {
    return this.database.transaction(async (client) => {
      await lockIdempotencyKey(client, userId, workspaceId, input.requestId);
      const previous = await client.query<{ response_body: unknown }>(`
        SELECT response_body FROM idempotency_keys
        WHERE user_id = $1 AND workspace_id = $2 AND request_id = $3
      `, [userId, workspaceId, input.requestId]);
      if (previous.rows[0]) {
        return createTreeNodeResponseSchema.parse(previous.rows[0].response_body);
      }
      const tree = await findTreeForUpdate(client, workspaceId, "data");
      assertRevision(tree.revision, input.expectedTreeRevision, "Tree");
      await assertWritableParent(client, tree.id, input.parentId);
      await assertLocalIdAvailable(
        client, tree.id, input.parentId, input.localId,
      );
      const position = await insertionPosition(
        client, tree.id, input.parentId, input.afterNodeId,
      );
      await client.query(`
        UPDATE tree_nodes SET position = position + 1, updated_at = now()
        WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2
          AND position >= $3
      `, [tree.id, input.parentId, position]);
      const nodeId = input.nodeId;
      const inserted = await client.query<MutableNodeRow>(`
        INSERT INTO tree_nodes (
          id, tree_id, parent_id, kind, label, local_id, position
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *, false AS enabled, 0 AS enabled_revision
      `, [
        nodeId,
        tree.id,
        input.parentId,
        input.kind,
        input.label,
        input.localId,
        position,
      ]);
      await client.query(`
        INSERT INTO node_contents (node_id, format, content)
        VALUES ($1, 'markdown', '')
      `, [nodeId]);
      await client.query(`
        INSERT INTO node_user_states (node_id, user_id, enabled, revision)
        VALUES ($1, $2, true, 1)
      `, [nodeId, userId]);
      const updatedTree = await bumpTree(client, tree.id);
      const response = createTreeNodeResponseSchema.parse({
        node: toNodeDto(inserted.rows[0]),
        treeRevision: updatedTree,
      });
      await client.query(`
        INSERT INTO idempotency_keys (
          user_id, workspace_id, request_id, operation,
          response_status, response_body, expires_at
        ) VALUES (
          $1, $2, $3, 'tree.create', 201, $4, now() + interval '24 hours'
        )
      `, [userId, workspaceId, input.requestId, response]);
      return response;
    });
  }

  async renameNode(
    workspaceId: string,
    nodeId: string,
    label: string,
    expectedRevision: number,
  ) {
    return this.database.transaction(async (client) => {
      const tree = await findNodeTreeForUpdate(client, workspaceId, nodeId);
      await assertMutableDataNode(client, tree.id, nodeId);
      const result = await client.query<MutableNodeRow>(`
        UPDATE tree_nodes
        SET label = $1, revision = revision + 1, updated_at = now()
        WHERE id = $2 AND tree_id = $3 AND revision = $4
        RETURNING *, false AS enabled, 0 AS enabled_revision
      `, [label, nodeId, tree.id, expectedRevision]);
      if (!result.rows[0]) {
        const current = await nodeRevision(client, tree.id, nodeId);
        throwRevisionConflict("Node", current);
      }
      const treeRevision = await bumpTree(client, tree.id);
      return createTreeNodeResponseSchema.parse({
        node: toNodeDto(result.rows[0]),
        treeRevision,
      });
    });
  }

  async updateLocalId(
    workspaceId: string,
    nodeId: string,
    localId: string,
    expectedRevision: number,
  ) {
    return this.database.transaction(async (client) => {
      const tree = await findNodeTreeForUpdate(client, workspaceId, nodeId);
      await assertMutableDataNode(client, tree.id, nodeId);
      const source = await client.query<{
        parent_id: string | null;
        revision: string | number;
      }>(`
        SELECT parent_id, revision FROM tree_nodes
        WHERE tree_id = $1 AND id = $2
      `, [tree.id, nodeId]);
      if (!source.rows[0]) {
        throw new HttpError(404, "NOT_FOUND", "Node was not found");
      }
      assertRevision(source.rows[0].revision, expectedRevision, "Node");
      await assertLocalIdAvailable(
        client,
        tree.id,
        source.rows[0].parent_id,
        localId,
        nodeId,
      );
      const result = await client.query<MutableNodeRow>(`
        UPDATE tree_nodes
        SET local_id = $1, revision = revision + 1, updated_at = now()
        WHERE id = $2 AND tree_id = $3 AND revision = $4
        RETURNING *, false AS enabled, 0 AS enabled_revision
      `, [localId, nodeId, tree.id, expectedRevision]);
      const treeRevision = await bumpTree(client, tree.id);
      return createTreeNodeResponseSchema.parse({
        node: toNodeDto(result.rows[0]),
        treeRevision,
      });
    });
  }

  async moveNode(
    workspaceId: string,
    nodeId: string,
    afterNodeId: string | null,
    expectedTreeRevision: number,
  ) {
    return this.database.transaction(async (client) => {
      const tree = await findNodeTreeForUpdate(client, workspaceId, nodeId);
      assertRevision(tree.revision, expectedTreeRevision, "Tree");
      await assertMutableDataNode(client, tree.id, nodeId);
      const sourceResult = await client.query<MutableNodeRow>(`
        SELECT *, false AS enabled, 0 AS enabled_revision
        FROM tree_nodes WHERE tree_id = $1 AND id = $2
      `, [tree.id, nodeId]);
      const source = sourceResult.rows[0];
      if (!source) throw new HttpError(404, "NOT_FOUND", "Node was not found");

      let targetPosition = 0;
      if (afterNodeId) {
        if (afterNodeId === nodeId) {
          return createTreeNodeResponseSchema.parse({
            node: toNodeDto(source), treeRevision: Number(tree.revision),
          });
        }
        const after = await client.query<{ position: number; kind: string }>(`
          SELECT position, kind FROM tree_nodes
          WHERE tree_id = $1 AND id = $2
            AND parent_id IS NOT DISTINCT FROM $3
        `, [tree.id, afterNodeId, source.parent_id]);
        if (!after.rows[0]) {
          throw new HttpError(400, "INVALID_REQUEST", "afterNodeId is not a sibling");
        }
        if (
          after.rows[0].kind === "system-directory"
          || after.rows[0].kind === "trash-directory"
        ) {
          throw new HttpError(403, "FORBIDDEN", "System directories cannot be moved past");
        }
        targetPosition = after.rows[0].position + (source.position > after.rows[0].position ? 1 : 0);
      }
      if (targetPosition === source.position) {
        return createTreeNodeResponseSchema.parse({
          node: toNodeDto(source), treeRevision: Number(tree.revision),
        });
      }
      await client.query(`
        UPDATE tree_nodes
        SET position = CASE
          WHEN id = $3 THEN $4::integer
          WHEN $2::integer < $4::integer
            AND position > $2::integer AND position <= $4::integer THEN position - 1
          WHEN $4::integer < $2::integer
            AND position >= $4::integer AND position < $2::integer THEN position + 1
          ELSE position
        END,
        revision = CASE WHEN id = $3 THEN revision + 1 ELSE revision END,
        updated_at = now()
        WHERE tree_id = $1
          AND parent_id IS NOT DISTINCT FROM $5
          AND (
            id = $3
            OR ($2::integer < $4::integer
              AND position > $2::integer AND position <= $4::integer)
            OR ($4::integer < $2::integer
              AND position >= $4::integer AND position < $2::integer)
          )
      `, [tree.id, source.position, nodeId, targetPosition, source.parent_id]);
      const moved = await client.query<MutableNodeRow>(`
        SELECT *, false AS enabled, 0 AS enabled_revision
        FROM tree_nodes WHERE id = $1
      `, [nodeId]);
      const treeRevision = await bumpTree(client, tree.id);
      return createTreeNodeResponseSchema.parse({
        node: toNodeDto(moved.rows[0]), treeRevision,
      });
    });
  }

  async reparentNode(
    workspaceId: string,
    nodeId: string,
    parentId: string | null,
    expectedTreeRevision: number,
  ) {
    return this.database.transaction(async (client) => {
      const tree = await findNodeTreeForUpdate(client, workspaceId, nodeId);
      assertRevision(tree.revision, expectedTreeRevision, "Tree");
      await assertMutableDataNode(client, tree.id, nodeId);
      const sourceResult = await client.query<MutableNodeRow>(`
        SELECT *, false AS enabled, 0 AS enabled_revision
        FROM tree_nodes WHERE tree_id = $1 AND id = $2
      `, [tree.id, nodeId]);
      const source = sourceResult.rows[0];
      if (!source) throw new HttpError(404, "NOT_FOUND", "Node was not found");
      if (source.parent_id === parentId) {
        return createTreeNodeResponseSchema.parse({
          node: toNodeDto(source), treeRevision: Number(tree.revision),
        });
      }
      if (parentId === nodeId) {
        throw new HttpError(400, "INVALID_REQUEST", "A node cannot be its own parent");
      }
      await assertWritableParent(client, tree.id, parentId);
      await assertLocalIdAvailable(
        client, tree.id, parentId, source.local_id, nodeId,
      );
      if (parentId) {
        const cycle = await client.query<{ found: boolean }>(`
          WITH RECURSIVE descendants AS (
            SELECT id FROM tree_nodes WHERE tree_id = $1 AND parent_id = $2
            UNION ALL
            SELECT child.id
            FROM tree_nodes child
            JOIN descendants parent ON child.parent_id = parent.id
            WHERE child.tree_id = $1
          )
          SELECT EXISTS (
            SELECT 1 FROM descendants WHERE id = $3
          ) AS found
        `, [tree.id, nodeId, parentId]);
        if (cycle.rows[0].found) {
          throw new HttpError(
            400,
            "INVALID_REQUEST",
            "A node cannot be moved below its descendant",
          );
        }
      }

      const targetPosition = await insertionPosition(
        client,
        tree.id,
        parentId,
        null,
      );
      await client.query(`
        UPDATE tree_nodes SET position = position - 1, updated_at = now()
        WHERE tree_id = $1
          AND parent_id IS NOT DISTINCT FROM $2
          AND position > $3
      `, [tree.id, source.parent_id, source.position]);
      const moved = await client.query<MutableNodeRow>(`
        UPDATE tree_nodes
        SET parent_id = $1, position = $2,
            revision = revision + 1, updated_at = now()
        WHERE id = $3 AND tree_id = $4
        RETURNING *, false AS enabled, 0 AS enabled_revision
      `, [parentId, targetPosition, nodeId, tree.id]);
      const treeRevision = await bumpTree(client, tree.id);
      return createTreeNodeResponseSchema.parse({
        node: toNodeDto(moved.rows[0]), treeRevision,
      });
    });
  }

  async deleteNode(
    workspaceId: string,
    nodeId: string,
    expectedTreeRevision: number,
  ) {
    return this.database.transaction(async (client) => {
      const tree = await findNodeTreeForUpdate(client, workspaceId, nodeId);
      assertRevision(tree.revision, expectedTreeRevision, "Tree");
      await assertMutableDataNode(client, tree.id, nodeId);
      const source = await client.query<{
        local_id: string;
        parent_id: string | null;
        position: number;
      }>(`
        SELECT local_id, parent_id, position
        FROM tree_nodes WHERE id = $1 AND tree_id = $2
      `, [nodeId, tree.id]);
      const trash = await client.query<{ id: string }>(`
        SELECT id FROM tree_nodes
        WHERE tree_id = $1 AND kind = 'trash-directory'
      `, [tree.id]);
      if (!source.rows[0] || !trash.rows[0]) {
        throw new HttpError(404, "NOT_FOUND", "Data node or trash directory was not found");
      }
      if (source.rows[0].parent_id === trash.rows[0].id) {
        const removed = await client.query<{ parent_id: string | null; position: number }>(`
          DELETE FROM tree_nodes
          WHERE id = $1 AND tree_id = $2
          RETURNING parent_id, position
        `, [nodeId, tree.id]);
        await client.query(`
          UPDATE tree_nodes SET position = position - 1, updated_at = now()
          WHERE tree_id = $1
            AND parent_id IS NOT DISTINCT FROM $2
            AND position > $3
        `, [tree.id, removed.rows[0].parent_id, removed.rows[0].position]);
        return { id: nodeId, revision: await bumpTree(client, tree.id) };
      }
      const position = await insertionPosition(client, tree.id, trash.rows[0].id, null);
      const trashIds = await client.query<{ local_id: string }>(`
        SELECT local_id FROM tree_nodes
        WHERE tree_id = $1 AND parent_id = $2
      `, [tree.id, trash.rows[0].id]);
      const trashLocalId = createTreeNodeLocalId(
        source.rows[0].local_id,
        trashIds.rows.map(({ local_id }) => local_id),
      );
      await client.query(`
        UPDATE tree_nodes SET position = position - 1, updated_at = now()
        WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND position > $3
      `, [tree.id, source.rows[0].parent_id, source.rows[0].position]);
      await client.query(`
        UPDATE tree_nodes
        SET parent_id = $1, position = $2, local_id = $5,
            revision = revision + 1, updated_at = now()
        WHERE id = $3 AND tree_id = $4
      `, [trash.rows[0].id, position, nodeId, tree.id, trashLocalId]);
      return { id: nodeId, revision: await bumpTree(client, tree.id) };
    });
  }

  async setEnabled(
    workspaceId: string,
    userId: string,
    nodeId: string,
    enabled: boolean,
    expectedRevision: number,
  ) {
    const result = await this.database.query<{ revision: string | number }>(`
      INSERT INTO node_user_states (node_id, user_id, enabled, revision)
      SELECT tree_nodes.id, $2, $3, 1
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $4
        AND (
          $5 = 0 OR EXISTS (
            SELECT 1 FROM node_user_states existing
            WHERE existing.node_id = tree_nodes.id
              AND existing.user_id = $2
          )
        )
      ON CONFLICT (node_id, user_id) DO UPDATE
      SET enabled = EXCLUDED.enabled,
          revision = node_user_states.revision + 1,
          updated_at = now()
      WHERE node_user_states.revision = $5
      RETURNING revision
    `, [nodeId, userId, enabled, workspaceId, expectedRevision]);
    if (result.rows[0]) {
      return setTreeNodeEnabledResponseSchema.parse({
        nodeId, enabled, revision: Number(result.rows[0].revision),
      });
    }
    const current = await this.database.query<{ revision: string | number }>(`
      SELECT node_user_states.revision
      FROM tree_nodes JOIN trees ON trees.id = tree_nodes.tree_id
      LEFT JOIN node_user_states
        ON node_user_states.node_id = tree_nodes.id
       AND node_user_states.user_id = $2
      WHERE tree_nodes.id = $1 AND trees.workspace_id = $3
    `, [nodeId, userId, workspaceId]);
    if (!current.rows[0]) throw new HttpError(404, "NOT_FOUND", "Node was not found");
    throwRevisionConflict("Enabled state", current.rows[0].revision ?? 0);
  }

  async setSelection(
    workspaceId: string,
    userId: string,
    input: SetTreeSelectionRequest,
  ) {
    const tree = await this.findTree(workspaceId, "data");
    await assertValidPath(this.database, tree.id, input.selectedPath);
    const result = await this.database.query<SelectionRow>(`
      INSERT INTO tree_user_states (tree_id, user_id, selected_path, revision)
      SELECT $1, $2, $3, 1
      WHERE $4 = 0 OR EXISTS (
        SELECT 1 FROM tree_user_states existing
        WHERE existing.tree_id = $1 AND existing.user_id = $2
      )
      ON CONFLICT (tree_id, user_id) DO UPDATE
      SET selected_path = EXCLUDED.selected_path,
          revision = tree_user_states.revision + 1,
          updated_at = now()
      WHERE tree_user_states.revision = $4
      RETURNING selected_path, revision
    `, [tree.id, userId, input.selectedPath, input.expectedRevision]);
    if (result.rows[0]) {
      return {
        selectedPath: result.rows[0].selected_path,
        revision: Number(result.rows[0].revision),
      };
    }
    const current = await this.database.query<{ revision: string | number }>(`
      SELECT revision FROM tree_user_states WHERE tree_id = $1 AND user_id = $2
    `, [tree.id, userId]);
    throwRevisionConflict("Selection", current.rows[0]?.revision ?? 0);
  }

  async updateContent(
    workspaceId: string,
    nodeId: string,
    content: string,
    expectedRevision: number,
  ) {
    const result = await this.database.query<ContentRow>(`
      UPDATE node_contents
      SET content = $1, revision = revision + 1, updated_at = now()
      WHERE node_id = $2 AND revision = $3
        AND EXISTS (
          SELECT 1 FROM tree_nodes
          JOIN trees ON trees.id = tree_nodes.tree_id
          WHERE tree_nodes.id = node_contents.node_id
            AND trees.workspace_id = $4
            AND tree_nodes.content_editable = true
        )
      RETURNING *
    `, [content, nodeId, expectedRevision, workspaceId]);
    if (result.rows[0]) return toContentDto(result.rows[0]);

    const current = await this.database.query<{ revision: string | number; content_editable: boolean }>(`
      SELECT node_contents.revision, tree_nodes.content_editable
      FROM node_contents
      JOIN tree_nodes ON tree_nodes.id = node_contents.node_id
      JOIN trees ON trees.id = tree_nodes.tree_id
      WHERE node_contents.node_id = $1 AND trees.workspace_id = $2
    `, [nodeId, workspaceId]);
    if (!current.rows[0]) throw new HttpError(404, "NOT_FOUND", "Node content was not found");
    if (!current.rows[0].content_editable) {
      throw new HttpError(403, "FORBIDDEN", "Node content is read-only");
    }
    throw new HttpError(409, "REVISION_CONFLICT", "Content was changed by another request", {
      currentRevision: Number(current.rows[0].revision),
    });
  }

  private async findTree(workspaceId: string, kind: "data" | "config") {
    const result = await this.database.query<TreeRow>(`
      SELECT id, workspace_id, kind, revision
      FROM trees WHERE workspace_id = $1 AND kind = $2
    `, [workspaceId, kind]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", `${kind.toUpperCase()} tree was not found`);
    return result.rows[0];
  }

  private async ensureDataTree(workspaceId: string) {
    await this.database.transaction(async (client) => {
      await client.query(`
        INSERT INTO trees (id, workspace_id, kind)
        VALUES ($1, $2, 'data')
        ON CONFLICT (workspace_id, kind) DO NOTHING
      `, [randomUUID(), workspaceId]);
      const tree = await client.query<{ id: string }>(`
        SELECT id FROM trees
        WHERE workspace_id = $1 AND kind = 'data'
        FOR UPDATE
      `, [workspaceId]);
      if (!tree.rows[0]) {
        throw new HttpError(404, "NOT_FOUND", "Workspace was not found");
      }
      let changed = false;
      const accidentalRoot = await client.query<{ id: string }>(`
        SELECT id FROM tree_nodes
        WHERE tree_id = $1 AND kind = 'data-root' AND parent_id IS NULL
      `, [tree.rows[0].id]);
      if (accidentalRoot.rows[0]) {
        await client.query(`
          UPDATE tree_nodes
          SET parent_id = NULL, updated_at = now()
          WHERE tree_id = $1 AND parent_id = $2
        `, [tree.rows[0].id, accidentalRoot.rows[0].id]);
        await client.query(`
          UPDATE tree_user_states
          SET selected_path = selected_path[2:], revision = revision + 1, updated_at = now()
          WHERE tree_id = $1 AND selected_path[1] = $2
        `, [tree.rows[0].id, accidentalRoot.rows[0].id]);
        await client.query(`
          DELETE FROM tree_nodes WHERE id = $1 AND tree_id = $2
        `, [accidentalRoot.rows[0].id, tree.rows[0].id]);
        changed = true;
      }
      const protectedDirectories = [
        { kind: "system-directory", label: "_system", listEditable: true },
        { kind: "trash-directory", label: "_trash", listEditable: false },
      ];
      for (const directory of protectedDirectories) {
        const directories = await client.query<{ id: string }>(`
          SELECT id FROM tree_nodes
          WHERE tree_id = $1 AND parent_id IS NULL AND kind = $2
          ORDER BY position, id
        `, [tree.rows[0].id, directory.kind]);
        const canonical = directories.rows[0];
        if (canonical && directories.rows.length > 1) {
          const duplicateIds = directories.rows.slice(1).map(({ id }) => id);
          await client.query(`
            UPDATE tree_nodes
            SET parent_id = $1, updated_at = now()
            WHERE tree_id = $2 AND parent_id = ANY($3::uuid[])
          `, [canonical.id, tree.rows[0].id, duplicateIds]);
          await client.query(`
            DELETE FROM tree_nodes
            WHERE tree_id = $1 AND id = ANY($2::uuid[])
          `, [tree.rows[0].id, duplicateIds]);
          changed = true;
        }
        const result = await client.query<{ id: string }>(`
          INSERT INTO tree_nodes (
            id, tree_id, parent_id, kind, label, local_id, position,
            content_editable, list_editable
          )
          SELECT $1, $2, $3, $4, $5, $7,
            COALESCE((
              SELECT MAX(position) + 1 FROM tree_nodes
              WHERE tree_id = $2 AND parent_id IS NOT DISTINCT FROM $3
            ), 0), false, $6
          WHERE NOT EXISTS (
              SELECT 1 FROM tree_nodes
              WHERE tree_id = $2 AND parent_id IS NOT DISTINCT FROM $3 AND kind = $4
            )
          RETURNING id
        `, [
          randomUUID(),
          tree.rows[0].id,
          null,
          directory.kind,
          directory.label,
          directory.listEditable,
          directory.kind === "system-directory" ? "_system" : "_trash",
        ]);
        if (result.rows[0]) {
          changed = true;
          await client.query(`
            INSERT INTO node_contents (node_id, format, content)
            VALUES ($1, 'markdown', '')
          `, [result.rows[0].id]);
        }
      }
      const normalized = await client.query<{ id: string }>(`
        WITH ordered AS (
          SELECT id, row_number() OVER (
            ORDER BY CASE kind
              WHEN 'system-directory' THEN 1
              WHEN 'trash-directory' THEN 2
              ELSE 0
            END, position, id
          ) - 1 AS next_position
          FROM tree_nodes
          WHERE tree_id = $1 AND parent_id = $2
        )
        UPDATE tree_nodes
        SET position = ordered.next_position, updated_at = now()
        FROM ordered
        WHERE tree_nodes.id = ordered.id AND tree_nodes.position <> ordered.next_position
        RETURNING tree_nodes.id
      `, [tree.rows[0].id, null]);
      if (changed || normalized.rows.length > 0) await bumpTree(client, tree.rows[0].id);
    });
  }
}

async function findTreeForUpdate(
  client: Queryable,
  workspaceId: string,
  kind: "data" | "config",
) {
  const result = await client.query<TreeRow>(`
    SELECT id, workspace_id, kind, revision FROM trees
    WHERE workspace_id = $1 AND kind = $2 FOR UPDATE
  `, [workspaceId, kind]);
  if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", `${kind.toUpperCase()} tree was not found`);
  return result.rows[0];
}

async function findNodeTreeForUpdate(client: Queryable, workspaceId: string, nodeId: string) {
  const result = await client.query<TreeRow>(`
    SELECT trees.id, trees.workspace_id, trees.kind, trees.revision
    FROM trees JOIN tree_nodes ON tree_nodes.tree_id = trees.id
    WHERE trees.workspace_id = $1 AND tree_nodes.id = $2
    FOR UPDATE OF trees
  `, [workspaceId, nodeId]);
  if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Node was not found");
  return result.rows[0];
}

async function assertWritableParent(client: Queryable, treeId: string, parentId: string | null) {
  if (!parentId) {
    const result = await client.query<{ count: string }>(`
      SELECT count(*) FROM tree_nodes
      WHERE tree_id = $1 AND parent_id IS NULL
    `, [treeId]);
    if (Number(result.rows[0].count) >= 99) {
      throw new HttpError(400, "INVALID_REQUEST", "Parent list item limit was reached");
    }
    return;
  }
  const result = await client.query<{ list_editable: boolean; list_item_limit: number | null; count: string }>(`
    SELECT tree_nodes.list_editable, tree_nodes.list_item_limit,
      (SELECT count(*) FROM tree_nodes children WHERE children.parent_id = tree_nodes.id) AS count
    FROM tree_nodes WHERE tree_nodes.tree_id = $1 AND tree_nodes.id = $2
  `, [treeId, parentId]);
  const parent = result.rows[0];
  if (!parent) throw new HttpError(400, "INVALID_REQUEST", "Parent node was not found");
  if (!parent.list_editable) throw new HttpError(403, "FORBIDDEN", "Parent list is read-only");
  const limit = Math.min(parent.list_item_limit ?? 99, 99);
  if (Number(parent.count) >= limit) {
    throw new HttpError(400, "INVALID_REQUEST", "Parent list item limit was reached");
  }
}

async function assertLocalIdAvailable(
  client: Queryable,
  treeId: string,
  parentId: string | null,
  localId: string,
  exceptNodeId?: string,
) {
  const result = await client.query<{ found: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM tree_nodes
      WHERE tree_id = $1
        AND parent_id IS NOT DISTINCT FROM $2
        AND local_id = $3
        AND ($4::uuid IS NULL OR id <> $4)
    ) AS found
  `, [treeId, parentId, localId, exceptNodeId ?? null]);
  if (result.rows[0].found) {
    throw new HttpError(
      400,
      "INVALID_REQUEST",
      "The ID is already used in this list",
      { field: "localId" },
    );
  }
}

async function assertMutableDataNode(client: Queryable, treeId: string, nodeId: string) {
  const result = await client.query<{ kind: string }>(`
    SELECT kind FROM tree_nodes WHERE tree_id = $1 AND id = $2
  `, [treeId, nodeId]);
  if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Node was not found");
  if (result.rows[0].kind === "system-directory" || result.rows[0].kind === "trash-directory") {
    throw new HttpError(403, "FORBIDDEN", "System directories cannot be changed");
  }
}

async function insertionPosition(
  client: Queryable,
  treeId: string,
  parentId: string | null,
  afterNodeId: string | null,
) {
  let position: number;
  if (!afterNodeId) {
    const result = await client.query<{ position: number }>(`
      SELECT COALESCE(MAX(position) + 1, 0)::integer AS position
      FROM tree_nodes WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2
    `, [treeId, parentId]);
    position = result.rows[0].position;
  } else {
    const result = await client.query<{ position: number }>(`
      SELECT position + 1 AS position FROM tree_nodes
      WHERE tree_id = $1 AND id = $2 AND parent_id IS NOT DISTINCT FROM $3
    `, [treeId, afterNodeId, parentId]);
    if (!result.rows[0]) throw new HttpError(400, "INVALID_REQUEST", "afterNodeId is not a sibling");
    position = result.rows[0].position;
  }
  const protectedPosition = await client.query<{ position: number }>(`
    SELECT MIN(position)::integer AS position
    FROM tree_nodes
    WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2
      AND kind IN ('system-directory', 'trash-directory')
  `, [treeId, parentId]);
  return Math.min(position, protectedPosition.rows[0].position ?? position);
}

async function bumpTree(client: Queryable, treeId: string) {
  const result = await client.query<{ revision: string | number }>(`
    UPDATE trees SET revision = revision + 1, updated_at = now()
    WHERE id = $1 RETURNING revision
  `, [treeId]);
  return Number(result.rows[0].revision);
}

async function nodeRevision(client: Queryable, treeId: string, nodeId: string) {
  const result = await client.query<{ revision: string | number }>(`
    SELECT revision FROM tree_nodes WHERE tree_id = $1 AND id = $2
  `, [treeId, nodeId]);
  if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Node was not found");
  return result.rows[0].revision;
}

async function assertValidPath(client: Queryable, treeId: string, selectedPath: string[]) {
  let parentId: string | null = null;
  for (const nodeId of selectedPath) {
    const result = await client.query<{ id: string }>(`
      SELECT id FROM tree_nodes
      WHERE tree_id = $1 AND id = $2 AND parent_id IS NOT DISTINCT FROM $3
    `, [treeId, nodeId, parentId]);
    if (!result.rows[0]) {
      throw new HttpError(400, "INVALID_REQUEST", "Selected path is not a valid tree path");
    }
    parentId = nodeId;
  }
}

function assertRevision(current: string | number, expected: number, resource: string) {
  if (Number(current) !== expected) throwRevisionConflict(resource, current);
}

function throwRevisionConflict(resource: string, current: string | number): never {
  const message = resource === "Tree"
    ? "The tree was changed in another browser : please reload"
    : `${resource} was changed by another request`;
  throw new HttpError(409, "REVISION_CONFLICT", message, {
    currentRevision: Number(current),
  });
}

function toNodeDto(node: MutableNodeRow) {
  return treeNodeDtoSchema.parse({
    id: node.id,
    parentId: node.parent_id,
    kind: node.kind,
    label: node.label,
    localId: node.local_id,
    position: node.position,
    revision: Number(node.revision),
    capabilities: {
      contentEditable: node.content_editable,
      listEditable: node.list_editable,
      listItemLimit: node.list_item_limit,
    },
  });
}

function toContentDto(row: ContentRow) {
  return treeNodeContentDtoSchema.parse({
    nodeId: row.node_id,
    format: row.format,
    content: row.content,
    revision: Number(row.revision),
  });
}

function maximumRevision(revisions: Array<string | number>) {
  return revisions.reduce<number>(
    (maximum, revision) => Math.max(maximum, Number(revision)),
    0,
  );
}

async function lockIdempotencyKey(
  client: Queryable,
  userId: string,
  workspaceId: string,
  requestId: string,
) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`${userId}:${workspaceId}:${requestId}`],
  );
}

async function rememberIdempotentResponse(
  client: Queryable,
  userId: string,
  workspaceId: string,
  requestId: string,
  operation: string,
  responseStatus: number,
  response: unknown,
) {
  await client.query(`
    INSERT INTO idempotency_keys (
      user_id, workspace_id, request_id, operation,
      response_status, response_body, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, now() + interval '24 hours')
  `, [userId, workspaceId, requestId, operation, responseStatus, response]);
}

function databaseForTransaction(client: Queryable): Database {
  return {
    query: <TResult extends Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ) => client.query<TResult>(text, values),
    transaction: (operation) => operation(client),
    end: async () => undefined,
  };
}
