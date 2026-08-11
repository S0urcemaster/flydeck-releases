import { describe, expect, it, vi } from "vitest";
import { V2ApiClient, V2ApiError } from "./V2ApiClient";
import { WorkspaceSyncStatusStore } from "../replica";

describe("V2ApiClient", () => {
  it("reads the compact server readiness status", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ready",
    }), { status: 200 }));
    const client = new V2ApiClient("/flydeck/api/v2", fetcher);

    await expect(client.readiness()).resolves.toEqual({ status: "ready" });
    expect(fetcher).toHaveBeenCalledWith(
      "/flydeck/api/v2/health/ready",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("loads the compact tree with the session cookie", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      document: {
        id: "00000000-0000-4000-8000-000000000001",
        workspaceId: "00000000-0000-4000-8000-000000000002",
        kind: "data",
        revision: 1,
        nodes: [],
      },
      semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: {} },
      selection: { revision: 0, selectedPath: [] },
    }), { status: 200 }));
    const client = new V2ApiClient("/flydeck/api/v2", fetcher);

    const tree = await client.loadDataTree("00000000-0000-4000-8000-000000000002");

    expect(tree.document.revision).toBe(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/flydeck/api/v2/workspaces/00000000-0000-4000-8000-000000000002/trees/data",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("exposes the stable server error envelope", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "REVISION_CONFLICT",
      message: "changed",
      requestId: "request-1",
      currentRevision: 3,
    }), { status: 409 }));
    const client = new V2ApiClient("/flydeck/api/v2", fetcher);

    const result = client.listCron("00000000-0000-4000-8000-000000000002");

    await expect(result).rejects.toBeInstanceOf(V2ApiError);
    await expect(result).rejects.toMatchObject({
      response: { error: "REVISION_CONFLICT", currentRevision: 3 },
    });
  });

  it("marks the whole workspace offline when transport fails", async () => {
    const syncStatus = new WorkspaceSyncStatusStore(false);
    const client = new V2ApiClient(
      "/flydeck/api/v2",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      syncStatus,
    );

    await expect(client.readiness()).rejects.toThrow("Failed to fetch");
    expect(syncStatus.getSnapshot()).toEqual({
      state: "offline",
      reason: "Failed to fetch",
    });
  });

  it("blocks transport completely while offline test mode is enabled", async () => {
    const syncStatus = new WorkspaceSyncStatusStore(false);
    const fetcher = vi.fn();
    const client = new V2ApiClient("/flydeck/api/v2", fetcher, syncStatus);
    syncStatus.setForcedOffline(true);

    await expect(client.readiness()).rejects.toThrow("Offline test mode");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
