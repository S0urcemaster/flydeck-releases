import {
  apiErrorDtoSchema,
  blueskyConnectionDtoSchema,
  connectBlueskyResponseSchema,
  disconnectBlueskyResponseSchema,
  publishBlueskyThreadResponseSchema,
  backupStatusDtoSchema,
  deleteTreeNodeImageResponseSchema,
  createTreeNodeResponseSchema,
  mutationRevisionDtoSchema,
  logoutResponseSchema,
  sessionDtoSchema,
  setTreeNodeEnabledResponseSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  treeNodeImageDtoSchema,
  treeSelectionDtoSchema,
  type ApiErrorDto,
  type CreateTreeNodeRequest,
  type DeleteTreeNodeRequest,
  type MoveTreeNodeRequest,
  type ReparentTreeNodeRequest,
  type LoginRequest,
  type RenameTreeNodeRequest,
  type SetTreeNodeEnabledRequest,
  type SetTreeNodeSharingRequest,
  type SetTreeNodePastelHueRequest,
  type SetTreeSelectionRequest,
  type UpdateTreeNodeContentRequest,
  type UpdateTreeNodeLocalIdRequest,
} from "@flydeck/shared/v2";
import {
  workspaceSyncStatusStore,
  type WorkspaceSyncStatusStore,
} from "../replica/WorkspaceSyncStatusStore";

type ResponseSchema<TResult> = { parse(value: unknown): TResult };

export class V2ApiError extends Error {
  constructor(readonly response: ApiErrorDto) {
    super(response.message);
  }
}

export class V2ApiClient {
  constructor(
    private readonly basePath = "/flydeck/api/v2",
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    private readonly syncStatus: WorkspaceSyncStatusStore = workspaceSyncStatusStore,
  ) {}

  session() {
    return this.request("/auth/session", sessionDtoSchema);
  }

  login(input: LoginRequest) {
    return this.request("/auth/login", sessionDtoSchema, {
      method: "POST", body: input,
    });
  }

  logout() {
    return this.request("/auth/logout", logoutResponseSchema, { method: "POST" });
  }

  readiness() {
    return this.request("/health/ready", { parse: parseReadiness });
  }

  backupStatus(workspaceId: string) {
    return this.request(this.backupPath(workspaceId), backupStatusDtoSchema);
  }

  startBackup(workspaceId: string) {
    return this.request(this.backupPath(workspaceId), backupStatusDtoSchema, {
      method: "POST",
    });
  }

  loadDataTree(workspaceId: string) {
    return this.request(this.dataTreePath(workspaceId), treeLoadDtoSchema);
  }

  createDataNode(workspaceId: string, input: CreateTreeNodeRequest) {
    return this.request(`${this.dataTreePath(workspaceId)}/nodes`, createTreeNodeResponseSchema, {
      method: "POST", body: input,
    });
  }

  renameDataNode(workspaceId: string, nodeId: string, input: RenameTreeNodeRequest) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}`, createTreeNodeResponseSchema, {
      method: "PATCH", body: input,
    });
  }

  moveDataNode(workspaceId: string, nodeId: string, input: MoveTreeNodeRequest) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/move`, createTreeNodeResponseSchema, {
      method: "POST", body: input,
    });
  }

  updateDataNodeLocalId(
    workspaceId: string,
    nodeId: string,
    input: UpdateTreeNodeLocalIdRequest,
  ) {
    return this.request(
      `${this.dataNodePath(workspaceId, nodeId)}/local-id`,
      createTreeNodeResponseSchema,
      { method: "PUT", body: input },
    );
  }

  reparentDataNode(workspaceId: string, nodeId: string, input: ReparentTreeNodeRequest) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/parent`, createTreeNodeResponseSchema, {
      method: "PUT", body: input,
    });
  }

  deleteDataNode(workspaceId: string, nodeId: string, input: DeleteTreeNodeRequest) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}`, mutationRevisionDtoSchema, {
      method: "DELETE", body: input,
    });
  }

  readDataContent(workspaceId: string, nodeId: string) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/content`, treeNodeContentDtoSchema);
  }

  updateDataContent(
    workspaceId: string,
    nodeId: string,
    input: UpdateTreeNodeContentRequest,
  ) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/content`, treeNodeContentDtoSchema, {
      method: "PUT", body: input,
    });
  }

  dataImageUrl(workspaceId: string, nodeId: string) {
    return `${this.basePath}${this.dataNodePath(workspaceId, nodeId)}/image`;
  }

  async uploadDataImage(
    workspaceId: string,
    nodeId: string,
    image: Blob,
    fileName: string,
  ) {
    if (this.syncStatus.isForcedOffline()) {
      throw new TypeError("Offline test mode is enabled.");
    }
    let response: Response;
    let responseBody: string;
    try {
      response = await this.fetcher(this.dataImageUrl(workspaceId, nodeId), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": image.type,
          "X-File-Name": encodeURIComponent(fileName),
        },
        body: image,
      });
      responseBody = await response.text();
      this.syncStatus.markOnline();
    } catch (error) {
      this.syncStatus.markOffline(
        error instanceof Error ? error.message : "The server is not reachable.",
      );
      throw error;
    }
    const value = parseJsonResponse(response, responseBody);
    if (!response.ok) {
      const errorResponse = apiErrorDtoSchema.safeParse(value);
      if (!errorResponse.success) throw invalidJsonResponse(response, responseBody);
      throw new V2ApiError(errorResponse.data);
    }
    return treeNodeImageDtoSchema.parse(value);
  }

  deleteDataImage(workspaceId: string, nodeId: string) {
    return this.request(
      `${this.dataNodePath(workspaceId, nodeId)}/image`,
      deleteTreeNodeImageResponseSchema,
      { method: "DELETE" },
    );
  }

  setDataNodeEnabled(
    workspaceId: string,
    nodeId: string,
    input: SetTreeNodeEnabledRequest,
  ) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/enabled`, setTreeNodeEnabledResponseSchema, {
      method: "PUT", body: input,
    });
  }

  setDataNodeSharing(
    workspaceId: string,
    nodeId: string,
    input: SetTreeNodeSharingRequest,
  ) {
    return this.request(
      `${this.dataNodePath(workspaceId, nodeId)}/sharing`,
      createTreeNodeResponseSchema,
      { method: "PUT", body: input },
    );
  }

  setDataNodePastelHue(
    workspaceId: string,
    nodeId: string,
    input: SetTreeNodePastelHueRequest,
  ) {
    return this.request(
      `${this.dataNodePath(workspaceId, nodeId)}/pastel-hue`,
      createTreeNodeResponseSchema,
      { method: "PUT", body: input },
    );
  }

  setDataSelection(workspaceId: string, input: SetTreeSelectionRequest) {
    return this.request(`${this.dataTreePath(workspaceId)}/selection`, treeSelectionDtoSchema, {
      method: "PUT", body: input,
    });
  }

  blueskyConnection(workspaceId: string) {
    return this.request(this.integrationPath(workspaceId), blueskyConnectionDtoSchema);
  }

  connectBluesky(workspaceId: string, handle: string) {
    return this.request(this.integrationPath(workspaceId), connectBlueskyResponseSchema, {
      method: "POST", body: { handle },
    });
  }

  disconnectBluesky(workspaceId: string) {
    return this.request(this.integrationPath(workspaceId), disconnectBlueskyResponseSchema, {
      method: "DELETE",
    });
  }

  publishBlueskyThread(workspaceId: string, posts: readonly string[], imageNodeId?: string) {
    return this.request(
      `${this.integrationPath(workspaceId)}/posts`,
      publishBlueskyThreadResponseSchema,
      { method: "POST", body: { posts, ...(imageNodeId ? { imageNodeId } : {}) } },
    );
  }

  private dataTreePath(workspaceId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/trees/data`;
  }

  private dataNodePath(workspaceId: string, nodeId: string) {
    return `${this.dataTreePath(workspaceId)}/nodes/${encodeURIComponent(nodeId)}`;
  }

  private backupPath(workspaceId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/backup`;
  }

  private integrationPath(workspaceId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/integrations/bluesky`;
  }

  private async request<TResult>(
    path: string,
    schema: ResponseSchema<TResult>,
    options: { method?: string; body?: unknown } = {},
  ): Promise<TResult> {
    if (this.syncStatus.isForcedOffline()) {
      const error = new TypeError("Offline test mode is enabled.");
      this.syncStatus.markOffline(error.message);
      throw error;
    }
    let response: Response;
    let responseBody: string;
    try {
      response = await this.fetcher(`${this.basePath}${path}`, {
        method: options.method ?? "GET",
        credentials: "include",
        headers: options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      responseBody = await response.text();
      this.syncStatus.markOnline();
    } catch (error) {
      this.syncStatus.markOffline(
        error instanceof Error ? error.message : "The server is not reachable.",
      );
      throw error;
    }
    const value = parseJsonResponse(response, responseBody);
    if (!response.ok) {
      const errorResponse = apiErrorDtoSchema.safeParse(value);
      if (!errorResponse.success) {
        throw invalidJsonResponse(response, responseBody);
      }
      throw new V2ApiError(errorResponse.data);
    }
    return schema.parse(value);
  }
}

function parseJsonResponse(response: Response, body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw invalidJsonResponse(response, body);
  }
}

function invalidJsonResponse(response: Response, body: string) {
  const responseKind = body.trim() === "" ? "an empty" : "an invalid";
  return new V2ApiError({
    error: "SERVICE_UNAVAILABLE",
    message: `The server returned ${responseKind} response (HTTP ${response.status}) : please retry`,
    requestId: response.headers.get("X-Request-ID") ?? "unknown",
  });
}

function parseReadiness(value: unknown) {
  if (!value || typeof value !== "object" || (value as { status?: unknown }).status !== "ready") {
    throw new Error("Invalid server readiness response");
  }
  return { status: "ready" as const };
}

export const v2Api = new V2ApiClient();
