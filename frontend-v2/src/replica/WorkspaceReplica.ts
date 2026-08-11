import {
  createTreeNodeRequestSchema,
  deleteTreeNodeRequestSchema,
  moveTreeNodeRequestSchema,
  renameTreeNodeRequestSchema,
  reparentTreeNodeRequestSchema,
  setTreeNodeEnabledRequestSchema,
  setTreeSelectionRequestSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  updateTreeNodeContentRequestSchema,
  type CreateTreeNodeRequest,
  type DeleteTreeNodeRequest,
  type MoveTreeNodeRequest,
  type RenameTreeNodeRequest,
  type ReparentTreeNodeRequest,
  type SetTreeNodeEnabledRequest,
  type SetTreeSelectionRequest,
  type TreeLoadDto,
  type TreeNodeContentDto,
  type TreeNodeDto,
  type UpdateTreeNodeContentRequest,
} from "@flydeck/shared/v2";

export const workspaceReplicaSchemaVersion = 1;

export type WorkspaceReplicaScope = {
  userId: string;
  workspaceId: string;
};

export type WorkspaceDataCommand =
  | { type: "create-node"; input: CreateTreeNodeRequest }
  | { type: "rename-node"; nodeId: string; input: RenameTreeNodeRequest }
  | { type: "move-node"; nodeId: string; input: MoveTreeNodeRequest }
  | { type: "reparent-node"; nodeId: string; input: ReparentTreeNodeRequest }
  | { type: "delete-node"; nodeId: string; input: DeleteTreeNodeRequest }
  | { type: "set-node-enabled"; nodeId: string; input: SetTreeNodeEnabledRequest }
  | { type: "set-selection"; input: SetTreeSelectionRequest }
  | { type: "update-content"; nodeId: string; input: UpdateTreeNodeContentRequest };

export type WorkspaceOutboxEntry = {
  id: string;
  createdAt: string;
  attempts: number;
  command: WorkspaceDataCommand;
};

export type WorkspaceReplicaRecord = {
  schemaVersion: typeof workspaceReplicaSchemaVersion;
  tree: TreeLoadDto | null;
  contents: Readonly<Record<string, TreeNodeContentDto>>;
  outbox: readonly WorkspaceOutboxEntry[];
  lastServerSyncAt: string | null;
};

export type WorkspaceSyncStatus =
  | { state: "idle" }
  | { state: "offline"; reason: string }
  | { state: "syncing"; pending: number }
  | { state: "error"; reason: string; pending: number };

export interface WorkspaceReplicaStorage {
  read(scope: WorkspaceReplicaScope): Promise<WorkspaceReplicaRecord | null>;
  transact(
    scope: WorkspaceReplicaScope,
    update: (current: WorkspaceReplicaRecord) => WorkspaceReplicaRecord,
  ): Promise<WorkspaceReplicaRecord>;
}

export function emptyWorkspaceReplicaRecord(): WorkspaceReplicaRecord {
  return {
    schemaVersion: workspaceReplicaSchemaVersion,
    tree: null,
    contents: {},
    outbox: [],
    lastServerSyncAt: null,
  };
}

export class MemoryWorkspaceReplicaStorage implements WorkspaceReplicaStorage {
  private readonly records = new Map<string, WorkspaceReplicaRecord>();
  private readonly transactionTails = new Map<string, Promise<void>>();

  async read(scope: WorkspaceReplicaScope) {
    const record = this.records.get(replicaKey(scope));
    return record ? clone(record) : null;
  }

  async transact(
    scope: WorkspaceReplicaScope,
    update: (current: WorkspaceReplicaRecord) => WorkspaceReplicaRecord,
  ) {
    const key = replicaKey(scope);
    const preceding = this.transactionTails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const currentTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = preceding.then(() => currentTail);
    this.transactionTails.set(key, tail);

    await preceding;
    try {
      const current = clone(this.records.get(key) ?? emptyWorkspaceReplicaRecord());
      const next = update(current);
      assertReplicaRecord(next);
      const persisted = clone(next);
      this.records.set(key, persisted);
      return clone(persisted);
    } finally {
      release();
      if (this.transactionTails.get(key) === tail) {
        this.transactionTails.delete(key);
      }
    }
  }
}

type IndexedDbReplicaEnvelope = {
  key: string;
  value: WorkspaceReplicaRecord;
};

export class IndexedDbWorkspaceReplicaStorage implements WorkspaceReplicaStorage {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(
    private readonly options: {
      databaseName?: string;
      indexedDb?: IDBFactory;
    } = {},
  ) {}

  async read(scope: WorkspaceReplicaScope) {
    const database = await this.open();
    const transaction = database.transaction("replicas", "readonly");
    const envelope = await requestResult<IndexedDbReplicaEnvelope | undefined>(
      transaction.objectStore("replicas").get(replicaKey(scope)),
    );
    await transactionComplete(transaction);
    if (!envelope) return null;
    assertReplicaRecord(envelope.value);
    return clone(envelope.value);
  }

  async transact(
    scope: WorkspaceReplicaScope,
    update: (current: WorkspaceReplicaRecord) => WorkspaceReplicaRecord,
  ) {
    const database = await this.open();
    const transaction = database.transaction("replicas", "readwrite");
    const store = transaction.objectStore("replicas");
    const key = replicaKey(scope);

    try {
      const envelope = await requestResult<IndexedDbReplicaEnvelope | undefined>(
        store.get(key),
      );
      const current = clone(envelope?.value ?? emptyWorkspaceReplicaRecord());
      if (envelope) assertReplicaRecord(current);
      const next = update(current);
      assertReplicaRecord(next);
      await requestResult(store.put({ key, value: clone(next) }));
      await transactionComplete(transaction);
      return clone(next);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // A failed request may already have aborted the transaction.
      }
      throw error;
    }
  }

  close() {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = undefined;
  }

  private open() {
    if (this.databasePromise) return this.databasePromise;
    const indexedDb = this.options.indexedDb
      ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
    if (!indexedDb) {
      return Promise.reject(new Error("IndexedDB is not available"));
    }
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open(
        this.options.databaseName ?? "flydeck-v2-workspace-replica",
        1,
      );
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("replicas")) {
          database.createObjectStore("replicas", { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked"));
    });
    return this.databasePromise;
  }
}

export class WorkspaceReplica {
  constructor(
    private readonly storage: WorkspaceReplicaStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  load(scope: WorkspaceReplicaScope) {
    return this.storage.read(scope);
  }

  replaceTree(scope: WorkspaceReplicaScope, tree: TreeLoadDto) {
    if (tree.document.workspaceId !== scope.workspaceId) {
      throw new Error("Workspace replica received a tree from another workspace");
    }
    return this.storage.transact(scope, (current) => ({
      ...current,
      tree,
      lastServerSyncAt: this.now().toISOString(),
    }));
  }

  putContent(scope: WorkspaceReplicaScope, content: TreeNodeContentDto) {
    return this.putContents(scope, [content]);
  }

  putContents(
    scope: WorkspaceReplicaScope,
    contents: readonly TreeNodeContentDto[],
  ) {
    return this.storage.transact(scope, (current) => ({
      ...current,
      contents: contents.reduce<Record<string, TreeNodeContentDto>>(
        (next, content) => {
          next[content.nodeId] = content;
          return next;
        },
        { ...current.contents },
      ),
      lastServerSyncAt: this.now().toISOString(),
    }));
  }

  putNode(
    scope: WorkspaceReplicaScope,
    node: TreeNodeDto,
    treeRevision: number,
  ) {
    return this.storage.transact(scope, (current) => {
      if (!current.tree) return current;
      const existing = current.tree.document.nodes.some(({ id }) => id === node.id);
      return {
        ...current,
        tree: {
          ...current.tree,
          document: {
            ...current.tree.document,
            revision: treeRevision,
            nodes: existing
              ? current.tree.document.nodes.map((candidate) => (
                candidate.id === node.id ? node : candidate
              ))
              : [...current.tree.document.nodes, node],
          },
        },
      };
    });
  }

  enqueue(
    scope: WorkspaceReplicaScope,
    command: WorkspaceDataCommand,
    createdAt = this.now().toISOString(),
  ) {
    const id = command.input.requestId;
    return this.storage.transact(scope, (current) => {
      if (current.outbox.some((entry) => entry.id === id)) return current;
      const optimistic = applyOptimisticCommand(current, command);
      return {
        ...optimistic,
        outbox: [...current.outbox, {
          id,
          createdAt,
          attempts: 0,
          command,
        }],
      };
    });
  }

  recordAttempt(scope: WorkspaceReplicaScope, id: string) {
    return this.storage.transact(scope, (current) => ({
      ...current,
      outbox: current.outbox.map((entry) => entry.id === id
        ? { ...entry, attempts: entry.attempts + 1 }
        : entry),
    }));
  }

  acknowledge(scope: WorkspaceReplicaScope, id: string) {
    return this.storage.transact(scope, (current) => ({
      ...current,
      outbox: current.outbox.filter((entry) => entry.id !== id),
    }));
  }
}

export const workspaceReplica = new WorkspaceReplica(
  new IndexedDbWorkspaceReplicaStorage(),
);

function replicaKey(scope: WorkspaceReplicaScope) {
  return `${encodeURIComponent(scope.userId)}:${encodeURIComponent(scope.workspaceId)}`;
}

function assertReplicaRecord(record: unknown): asserts record is WorkspaceReplicaRecord {
  if (!record || typeof record !== "object") invalidReplica();
  const candidate = record as Partial<WorkspaceReplicaRecord>;
  if (candidate.schemaVersion !== workspaceReplicaSchemaVersion) invalidReplica();
  if (candidate.tree !== null && !treeLoadDtoSchema.safeParse(candidate.tree).success) {
    invalidReplica();
  }
  if (!candidate.contents || typeof candidate.contents !== "object"
    || Array.isArray(candidate.contents)
    || !Object.values(candidate.contents).every(
      (content) => treeNodeContentDtoSchema.safeParse(content).success,
    )) {
    invalidReplica();
  }
  if (!Array.isArray(candidate.outbox)
    || !candidate.outbox.every(isOutboxEntry)) {
    invalidReplica();
  }
  if (candidate.lastServerSyncAt !== null
    && typeof candidate.lastServerSyncAt !== "string") {
    invalidReplica();
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(
      transaction.error ?? new Error("IndexedDB transaction failed"),
    );
    transaction.onabort = () => reject(
      transaction.error ?? new Error("IndexedDB transaction was aborted"),
    );
  });
}

function isOutboxEntry(value: unknown): value is WorkspaceOutboxEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<WorkspaceOutboxEntry>;
  return typeof entry.id === "string"
    && typeof entry.createdAt === "string"
    && Number.isInteger(entry.attempts)
    && (entry.attempts ?? -1) >= 0
    && isWorkspaceDataCommand(entry.command);
}

function isWorkspaceDataCommand(value: unknown): value is WorkspaceDataCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Partial<WorkspaceDataCommand> & {
    nodeId?: unknown;
    input?: unknown;
  };
  const hasNodeId = typeof command.nodeId === "string" && command.nodeId.length > 0;
  switch (command.type) {
    case "create-node": return createTreeNodeRequestSchema.safeParse(command.input).success;
    case "rename-node": return hasNodeId
      && renameTreeNodeRequestSchema.safeParse(command.input).success;
    case "move-node": return hasNodeId
      && moveTreeNodeRequestSchema.safeParse(command.input).success;
    case "reparent-node": return hasNodeId
      && reparentTreeNodeRequestSchema.safeParse(command.input).success;
    case "delete-node": return hasNodeId
      && deleteTreeNodeRequestSchema.safeParse(command.input).success;
    case "set-node-enabled": return hasNodeId
      && setTreeNodeEnabledRequestSchema.safeParse(command.input).success;
    case "set-selection": return setTreeSelectionRequestSchema.safeParse(command.input).success;
    case "update-content": return hasNodeId
      && updateTreeNodeContentRequestSchema.safeParse(command.input).success;
    default: return false;
  }
}

function invalidReplica(): never {
  throw new Error("Invalid workspace replica record");
}

function applyOptimisticCommand(
  current: WorkspaceReplicaRecord,
  command: WorkspaceDataCommand,
): WorkspaceReplicaRecord {
  switch (command.type) {
    case "create-node": return optimisticCreate(current, command.input);
    case "rename-node": return updateDocument(current, (tree) => ({
      ...tree,
      document: {
        ...tree.document,
        revision: tree.document.revision + 1,
        nodes: tree.document.nodes.map((node) => node.id === command.nodeId
          ? {
            ...node,
            label: command.input.label,
            revision: command.input.expectedRevision + 1,
          }
          : node),
      },
    }));
    case "reparent-node": return updateDocument(current, (tree) => {
      const position = tree.document.nodes.filter(
        ({ parentId }) => parentId === command.input.parentId,
      ).length;
      return {
        ...tree,
        document: {
          ...tree.document,
          revision: command.input.expectedTreeRevision + 1,
          nodes: tree.document.nodes.map((node) => node.id === command.nodeId
            ? {
              ...node,
              parentId: command.input.parentId,
              position,
              revision: node.revision + 1,
            }
            : node),
        },
      };
    });
    case "update-content": {
      const previous = current.contents[command.nodeId];
      return {
        ...current,
        contents: {
          ...current.contents,
          [command.nodeId]: {
            nodeId: command.nodeId,
            format: previous?.format ?? "markdown",
            content: command.input.content,
            revision: command.input.expectedRevision + 1,
          },
        },
      };
    }
    case "set-selection": return updateDocument(current, (tree) => ({
      ...tree,
      selection: {
        selectedPath: command.input.selectedPath,
        revision: command.input.expectedRevision + 1,
      },
    }));
    case "set-node-enabled": return updateDocument(current, (tree) => {
      const enabled = new Set(tree.semanticState.enabledNodeIds);
      if (command.input.enabled) enabled.add(command.nodeId);
      else enabled.delete(command.nodeId);
      const revision = command.input.expectedRevision + 1;
      return {
        ...tree,
        semanticState: {
          revision: Math.max(tree.semanticState.revision, revision),
          enabledNodeIds: [...enabled],
          nodeRevisions: {
            ...tree.semanticState.nodeRevisions,
            [command.nodeId]: revision,
          },
        },
      };
    });
    case "move-node": return updateDocument(current, (tree) => {
      const source = tree.document.nodes.find(({ id }) => id === command.nodeId);
      if (!source) return tree;
      const siblings = tree.document.nodes
        .filter((node) => node.parentId === source.parentId && node.id !== source.id)
        .sort((left, right) => left.position - right.position);
      const afterIndex = command.input.afterNodeId
        ? siblings.findIndex(({ id }) => id === command.input.afterNodeId)
        : -1;
      siblings.splice(afterIndex + 1, 0, source);
      const positions = new Map(siblings.map((node, position) => [node.id, position]));
      return {
        ...tree,
        document: {
          ...tree.document,
          revision: command.input.expectedTreeRevision + 1,
          nodes: tree.document.nodes.map((node) => positions.has(node.id)
            ? {
              ...node,
              position: positions.get(node.id)!,
              revision: node.id === source.id ? node.revision + 1 : node.revision,
            }
            : node),
        },
      };
    });
    case "delete-node": return optimisticDelete(current, command.nodeId, command.input);
  }
}

function optimisticCreate(
  current: WorkspaceReplicaRecord,
  input: CreateTreeNodeRequest,
) {
  const updated = updateDocument(current, (tree) => {
    const siblings = tree.document.nodes
      .filter(({ parentId }) => parentId === input.parentId)
      .sort((left, right) => left.position - right.position);
    const afterIndex = input.afterNodeId
      ? siblings.findIndex(({ id }) => id === input.afterNodeId)
      : siblings.length - 1;
    const position = afterIndex + 1;
    const nodes = tree.document.nodes.map((node) => (
      node.parentId === input.parentId && node.position >= position
        ? { ...node, position: node.position + 1 }
        : node
    ));
    nodes.push({
      id: input.nodeId,
      parentId: input.parentId,
      kind: input.kind,
      label: input.label,
      position,
      revision: 0,
      capabilities: {
        contentEditable: true,
        listEditable: true,
        listItemLimit: null,
      },
    });
    return {
      ...tree,
      document: {
        ...tree.document,
        revision: input.expectedTreeRevision + 1,
        nodes,
      },
      semanticState: {
        ...tree.semanticState,
        revision: Math.max(tree.semanticState.revision, 1),
        enabledNodeIds: [...new Set([
          ...tree.semanticState.enabledNodeIds,
          input.nodeId,
        ])],
        nodeRevisions: {
          ...tree.semanticState.nodeRevisions,
          [input.nodeId]: 1,
        },
      },
    };
  });
  return {
    ...updated,
    contents: {
      ...updated.contents,
      [input.nodeId]: {
        nodeId: input.nodeId,
        format: "markdown" as const,
        content: "",
        revision: 0,
      },
    },
  };
}

function updateDocument(
  current: WorkspaceReplicaRecord,
  update: (tree: TreeLoadDto) => TreeLoadDto,
) {
  return current.tree ? { ...current, tree: update(current.tree) } : current;
}

function optimisticDelete(
  current: WorkspaceReplicaRecord,
  nodeId: string,
  input: DeleteTreeNodeRequest,
) {
  const tree = current.tree;
  if (!tree) return current;
  const source = tree.document.nodes.find(({ id }) => id === nodeId);
  const trash = tree.document.nodes.find(({ kind }) => kind === "trash-directory");
  if (!source || !trash) return current;
  if (source.parentId === trash.id) {
    const removed = new Set<string>([source.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of tree.document.nodes) {
        if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
          removed.add(node.id);
          changed = true;
        }
      }
    }
    return {
      ...current,
      tree: {
        ...tree,
        document: {
          ...tree.document,
          revision: input.expectedTreeRevision + 1,
          nodes: tree.document.nodes.filter(({ id }) => !removed.has(id)),
        },
      },
      contents: Object.fromEntries(
        Object.entries(current.contents).filter(([id]) => !removed.has(id)),
      ),
    };
  }
  const position = tree.document.nodes.filter(({ parentId }) => parentId === trash.id).length;
  return {
    ...current,
    tree: {
      ...tree,
      document: {
        ...tree.document,
        revision: input.expectedTreeRevision + 1,
        nodes: tree.document.nodes.map((node) => node.id === source.id
          ? {
            ...node,
            parentId: trash.id,
            position,
            revision: node.revision + 1,
          }
          : node),
      },
    },
  };
}
