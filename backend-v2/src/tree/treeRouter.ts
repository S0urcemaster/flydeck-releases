import express, { Router, type Request } from "express";
import {
  createTreeNodeRequestSchema,
  createTreeNodeResponseSchema,
  createTreeNodeWithContentRequestSchema,
  deleteTreeNodeImageResponseSchema,
  deleteTreeNodeRequestSchema,
  editTreeNodeRequestSchema,
  moveTreeNodeRequestSchema,
  mutationRevisionDtoSchema,
  reparentTreeNodeRequestSchema,
  renameTreeNodeRequestSchema,
  setTreeNodeEnabledRequestSchema,
  setTreeNodeEnabledResponseSchema,
  setTreeNodePastelHueRequestSchema,
  setTreeNodeSharingRequestSchema,
  setTreeSelectionRequestSchema,
  treeSelectionDtoSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  treeNodeImageDtoSchema,
  updateTreeNodeContentRequestSchema,
  updateTreeNodeLocalIdRequestSchema,
} from "@flydeck/shared/v2";
import { z } from "zod";
import type { SessionService } from "../auth/SessionService.js";
import { requireWorkspaceAccess } from "../auth/workspaceAuthorization.js";
import { HttpError } from "../http/HttpError.js";
import type { NodeImageService } from "./NodeImageService.js";
import type { TreeService } from "./TreeService.js";

const uuidSchema = z.uuid();

export function createTreeRouter(
  sessions: SessionService,
  trees: TreeService,
  images: NodeImageService,
) {
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

  router.get("/nodes/:nodeId/image", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), false,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const image = await images.read(workspaceId, nodeId);
    response.set({
      "Cache-Control": "no-store",
      "Content-Type": image.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.originalName)}`,
    });
    response.sendFile(image.absolutePath);
  });

  router.put(
    "/nodes/:nodeId/image",
    express.raw({ type: "image/*", limit: "20mb" }),
    async (request, response) => {
      const { workspaceId } = await requireWorkspaceAccess(
        sessions, request, workspaceIdParameter(request), true,
      );
      const nodeId = uuidSchema.parse(request.params.nodeId);
      if (!Buffer.isBuffer(request.body)) {
        throw new HttpError(400, "INVALID_REQUEST", "Image body is required");
      }
      const mimeType = request.get("Content-Type")?.split(";", 1)[0] ?? "";
      const originalName = decodeURIComponent(
        request.get("X-File-Name") ?? "image",
      );
      response.json(treeNodeImageDtoSchema.parse(await images.save(
        workspaceId,
        nodeId,
        mimeType,
        originalName,
        request.body,
      )));
    },
  );

  router.delete("/nodes/:nodeId/image", async (request, response) => {
    const { workspaceId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    response.json(deleteTreeNodeImageResponseSchema.parse({
      nodeId,
      deleted: await images.delete(workspaceId, nodeId),
    }));
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

  router.post("/nodes/with-content", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const input = createTreeNodeWithContentRequestSchema.parse(request.body);
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

  router.put("/nodes/:nodeId/edit", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = editTreeNodeRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.edit",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.editNode(
          workspaceId, nodeId, input,
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

  router.put("/nodes/:nodeId/sharing", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = setTreeNodeSharingRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.sharing",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.setSharing(
          workspaceId, nodeId, input,
        ),
      ),
    ));
  });

  router.put("/nodes/:nodeId/pastel-hue", async (request, response) => {
    const { workspaceId, userId } = await requireWorkspaceAccess(
      sessions, request, workspaceIdParameter(request), true,
    );
    const nodeId = uuidSchema.parse(request.params.nodeId);
    const input = setTreeNodePastelHueRequestSchema.parse(request.body);
    response.json(createTreeNodeResponseSchema.parse(
      await trees.executeIdempotent(
        workspaceId, userId, input.requestId, "tree.pastel-hue",
        createTreeNodeResponseSchema,
        (transactionTrees) => transactionTrees.setPastelHue(
          workspaceId, nodeId, input,
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
