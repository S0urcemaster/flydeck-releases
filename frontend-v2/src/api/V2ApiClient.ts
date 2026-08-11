import {
  apiErrorDtoSchema,
  createTreeNodeResponseSchema,
  cronTimerDtoSchema,
  cronTimerListDtoSchema,
  mutationRevisionDtoSchema,
  logoutResponseSchema,
  sessionDtoSchema,
  setTreeNodeEnabledResponseSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  treeSelectionDtoSchema,
  type ApiErrorDto,
  type CreateCronTimerRequest,
  type CreateTreeNodeRequest,
  type DeleteCronTimerRequest,
  type DeleteTreeNodeRequest,
  type MoveTreeNodeRequest,
  type ReparentTreeNodeRequest,
  type LoginRequest,
  type RenameTreeNodeRequest,
  type SetTreeNodeEnabledRequest,
  type SetTreeSelectionRequest,
  type UpdateCronTimerRequest,
  type UpdateTreeNodeContentRequest,
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

  setDataNodeEnabled(
    workspaceId: string,
    nodeId: string,
    input: SetTreeNodeEnabledRequest,
  ) {
    return this.request(`${this.dataNodePath(workspaceId, nodeId)}/enabled`, setTreeNodeEnabledResponseSchema, {
      method: "PUT", body: input,
    });
  }

  setDataSelection(workspaceId: string, input: SetTreeSelectionRequest) {
    return this.request(`${this.dataTreePath(workspaceId)}/selection`, treeSelectionDtoSchema, {
      method: "PUT", body: input,
    });
  }

  listCron(workspaceId: string) {
    return this.request(this.cronPath(workspaceId), cronTimerListDtoSchema);
  }

  createCron(workspaceId: string, input: CreateCronTimerRequest) {
    return this.request(this.cronPath(workspaceId), cronTimerDtoSchema, {
      method: "POST", body: input,
    });
  }

  updateCron(workspaceId: string, timerId: string, input: UpdateCronTimerRequest) {
    return this.request(`${this.cronPath(workspaceId)}/${encodeURIComponent(timerId)}`, cronTimerDtoSchema, {
      method: "PUT", body: input,
    });
  }

  async deleteCron(workspaceId: string, timerId: string, input: DeleteCronTimerRequest) {
    const result = await this.request(
      `${this.cronPath(workspaceId)}/${encodeURIComponent(timerId)}`,
      { parse: parseDeletedResource },
      { method: "DELETE", body: input },
    );
    return result;
  }

  private dataTreePath(workspaceId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/trees/data`;
  }

  private dataNodePath(workspaceId: string, nodeId: string) {
    return `${this.dataTreePath(workspaceId)}/nodes/${encodeURIComponent(nodeId)}`;
  }

  private cronPath(workspaceId: string) {
    return `/workspaces/${encodeURIComponent(workspaceId)}/cron`;
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
    try {
      response = await this.fetcher(`${this.basePath}${path}`, {
        method: options.method ?? "GET",
        credentials: "include",
        headers: options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      this.syncStatus.markOnline();
    } catch (error) {
      this.syncStatus.markOffline(
        error instanceof Error ? error.message : "The server is not reachable.",
      );
      throw error;
    }
    const value: unknown = await response.json();
    if (!response.ok) throw new V2ApiError(apiErrorDtoSchema.parse(value));
    return schema.parse(value);
  }
}

function parseDeletedResource(value: unknown) {
  if (!value || typeof value !== "object" || typeof (value as { id?: unknown }).id !== "string") {
    throw new Error("Invalid delete response");
  }
  return { id: (value as { id: string }).id };
}

function parseReadiness(value: unknown) {
  if (!value || typeof value !== "object" || (value as { status?: unknown }).status !== "ready") {
    throw new Error("Invalid server readiness response");
  }
  return { status: "ready" as const };
}

export const v2Api = new V2ApiClient();
