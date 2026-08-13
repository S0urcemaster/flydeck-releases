import { Router, type Request } from "express";
import {
  createTreeNodeRequestSchema,
  createTreeNodeResponseSchema,
  deleteTreeNodeRequestSchema,
  moveTreeNodeRequestSchema,
  mutationRevisionDtoSchema,
  reparentTreeNodeRequestSchema,
  renameTreeNodeRequestSchema,
  setTreeNodeEnabledRequestSchema,
  setTreeNodeEnabledResponseSchema,
  setTreeSelectionRequestSchema,
  treeSelectionDtoSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  updateTreeNodeContentRequestSchema,
  updateTreeNodeLocalIdRequestSchema,
} from "@flydeck/shared/v2";
import { z } from "zod";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import type { TreeService } from "./TreeService.js";

const uuidSchema = z.uuid();

export function createTreeRouter(sessions: SessionService, trees: TreeService) {
  const router = Router({ mergeParams: true });

  router.get("/", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), false,
    );
    response.json(treeLoadDtoSchema.parse(await trees.load(workspaceId, userId, "data")));
  });

  router.get("/nodes/:nodeId/content", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), false,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    response.json(treeNodeContentDtoSchema.parse(
      await trees.getContent(workspaceId, nodeId),
    ));
  });

  router.post("/nodes", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const input = createTreeNodeRequestSchema.parse(request.body);
    response.status(201).json(createTreeNodeResponseSchema.parse(
      await trees.createNode(workspaceId, userId, input),
    ));
  });

  router.patch("/nodes/:nodeId", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = renameTreeNodeRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.rename",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.renameNode(
          workspaceId, nodeId, input.label, input.expectedRevision,
        ),
      ),
    ));
  });

  router.post("/nodes/:nodeId/move", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = moveTreeNodeRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.move",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.moveNode(
          workspaceId, nodeId, input.afterNodeId, input.expectedTreeRevision,
        ),
      ),
    ));
  });

  router.put("/nodes/:nodeId/local-id", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = updateTreeNodeLocalIdRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.local-id",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.updateLocalId(
          workspaceId, nodeId, input.localId, input.expectedRevision,
        ),
      ),
    ));
  });

  router.put("/nodes/:nodeId/parent", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = reparentTreeNodeRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.reparent",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.reparentNode(
          workspaceId, nodeId, input.parentId, input.expectedTreeRevision,
        ),
      ),
    ));
  });

  router.delete("/nodes/:nodeId", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = deleteTreeNodeRequestSchema.parse(request.body);
    response.json(mutationRevisionDtoSchema.parse(await trees.executeIdempotent(
      workspaceId, userId, input.requestId, "tree.delete",
      mutationRevisionDtoSchema,
      (transactionTrees) => transactionTrees.deleteNode(
        workspaceId, nodeId, input.expectedTreeRevision,
      ),
    )));
  });

  router.put("/nodes/:nodeId/enabled", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = setTreeNodeEnabledRequestSchema.parse(request.body);
    response.json(setTreeNodeEnabledResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.enabled",
        setTreeNodeEnabledResponseSchema,
        (transactionTrees) => transactionTrees.setEnabled(
          workspaceId, userId, nodeId, input.enabled, input.expectedRevision,
        ),
      ),
    ));
  });

  router.put("/selection", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const input = setTreeSelectionRequestSchema.parse(request.body);
    response.json(treeSelectionDtoSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.selection",
        treeSelectionDtoSchema,
        (transactionTrees) => transactionTrees.setSelection(
          workspaceId, userId, input,
        ),
      ),
    ));
  });

  router.put("/nodes/:nodeId/content", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = updateTreeNodeContentRequestSchema.parse(request.body);
    response.json(treeNodeContentDtoSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.content",
        treeNodeContentDtoSchema,
        (transactionTrees) => transactionTrees.updateContent(
          workspaceId, nodeId, input.content, input.expectedRevision,
        ),
      ),
    ));
  });

  return router;
}

function workspaceIdParameter(request: Request) {
  return (request.params as Record<string, string | undefined>).workspaceId;
}
