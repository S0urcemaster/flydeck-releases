import {
  createTreeNodeRequestSchema,
  createTreeNodeLocalId,
  deleteTreeNodeRequestSchema,
  moveTreeNodeRequestSchema,
  renameTreeNodeRequestSchema,
  reparentTreeNodeRequestSchema,
  setTreeNodeEnabledRequestSchema,
  setTreeNodePastelHueRequestSchema,
  setTreeNodeSharingRequestSchema,
  setTreeSelectionRequestSchema,
  treeLoadDtoSchema,
  treeNodeContentDtoSchema,
  updateTreeNodeContentRequestSchema,
  updateTreeNodeLocalIdRequestSchema,
  type CreateTreeNodeRequest,
  type CreateTreeNodeResponse,
  type DeleteTreeNodeRequest,
  type MutationRevisionDto,
  type MoveTreeNodeRequest,
  type RenameTreeNodeRequest,
  type ReparentTreeNodeRequest,
  type SetTreeNodeEnabledRequest,
  type SetTreeNodeEnabledResponse,
  type SetTreeNodePastelHueRequest,
  type SetTreeNodeSharingRequest,
  type SetTreeSelectionRequest,
  type TreeLoadDto,
  type TreeNodeContentDto,
  type TreeNodeImageDto,
  type TreeSelectionDto,
  type UpdateTreeNodeContentRequest,
  type UpdateTreeNodeLocalIdRequest,
} from "@flydeck/shared/v2";

export const workspaceReplicaSchemaVersion = 6;

export type WorkspaceReplicaScope = {
  userId: string;
  workspaceId: string;
};

export type WorkspaceDataCommand =
  | { type: "create-node"; input: CreateTreeNodeRequest }
  | { type: "rename-node"; nodeId: string; input: RenameTreeNodeRequest }
  | { type: "update-local-id"; nodeId: string; input: UpdateTreeNodeLocalIdRequest }
  | { type: "move-node"; nodeId: string; input: MoveTreeNodeRequest }
  | { type: "reparent-node"; nodeId: string; input: ReparentTreeNodeRequest }
  | { type: "delete-node"; nodeId: string; input: DeleteTreeNodeRequest }
  | { type: "set-node-enabled"; nodeId: string; input: SetTreeNodeEnabledRequest }
  | { type: "set-node-sharing"; nodeId: string; input: SetTreeNodeSharingRequest }
  | { type: "set-node-pastel-hue"; nodeId: string; input: SetTreeNodePastelHueRequest }
  | { type: "set-selection"; input: SetTreeSelectionRequest }
  | {
      type: "upload-image";
      nodeId: string;
      input: { requestId: string; fileName: string; mimeType: string };
    }
  | { type: "update-content"; nodeId: string; input: UpdateTreeNodeContentRequest };

export type WorkspaceOutboxEntry = {
  id: string;
  createdAt: string;
  attempts: number;
  userCommandId?: string;
  command: WorkspaceDataCommand;
  blocked?: {
    code: string;
    message: string;
    at: string;
  };
};

export type WorkspaceDataCommandResult =
  | CreateTreeNodeResponse
  | MutationRevisionDto
  | SetTreeNodeEnabledResponse
  | TreeSelectionDto
  | TreeNodeContentDto
  | TreeNodeImageDto;

export type WorkspaceReplicaRecord = {
  schemaVersion: typeof workspaceReplicaSchemaVersion;
  confirmedTree: TreeLoadDto | null;
  tree: TreeLoadDto | null;
  confirmedContents: Readonly<Record<string, TreeNodeContentDto>>;
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
    confirmedTree: null,
    tree: null,
    confirmedContents: {},
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
    const value = upgradeWorkspaceReplicaRecord(envelope.value);
    assertReplicaRecord(value);
    return clone(value);
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
      const current = envelope
        ? upgradeWorkspaceReplicaRecord(clone(envelope.value))
        : emptyWorkspaceReplicaRecord();
      assertReplicaRecord(current);
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
  private readonly snapshots = new Map<string, WorkspaceReplicaRecord | null>();
  private readonly hydration = new Map<string, Promise<WorkspaceReplicaRecord | null>>();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly storage: WorkspaceReplicaStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  load(scope: WorkspaceReplicaScope) {
    const key = replicaKey(scope);
    if (this.snapshots.has(key)) {
      return Promise.resolve(clone(this.snapshots.get(key) ?? null));
    }
    const running = this.hydration.get(key);
    if (running) return running.then((record) => clone(record));
    const operation = this.storage.read(scope).then((record) => {
      this.publish(scope, record);
      return record;
    }).finally(() => {
      this.hydration.delete(key);
    });
    this.hydration.set(key, operation);
    return operation.then((record) => clone(record));
  }

  getSnapshot(scope: WorkspaceReplicaScope) {
    return this.snapshots.get(replicaKey(scope)) ?? null;
  }

  subscribe(scope: WorkspaceReplicaScope, listener: () => void) {
    const key = replicaKey(scope);
    const current = this.listeners.get(key) ?? new Set();
    current.add(listener);
    this.listeners.set(key, current);
    void this.load(scope).catch(() => undefined);
    return () => {
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(key);
    };
  }

  replaceTree(scope: WorkspaceReplicaScope, tree: TreeLoadDto) {
    if (tree.document.workspaceId !== scope.workspaceId) {
      throw new Error("Workspace replica received a tree from another workspace");
    }
    return this.transact(scope, (current) => reprojectRecord({
      ...current,
      confirmedTree: tree,
      tree,
      contents: current.confirmedContents,
      lastServerSyncAt: this.now().toISOString(),
    }), { preserveEquivalentTree: true });
  }

  resetToServer(scope: WorkspaceReplicaScope, tree: TreeLoadDto) {
    if (tree.document.workspaceId !== scope.workspaceId) {
      throw new Error("Workspace replica received a tree from another workspace");
    }
    return this.transact(scope, () => ({
      ...emptyWorkspaceReplicaRecord(),
      confirmedTree: tree,
      tree,
      lastServerSyncAt: this.now().toISOString(),
    }));
  }

  rebaseFromServer(
    scope: WorkspaceReplicaScope,
    tree: TreeLoadDto,
    contents: readonly TreeNodeContentDto[] = [],
  ) {
    if (tree.document.workspaceId !== scope.workspaceId) {
      throw new Error("Workspace replica received a tree from another workspace");
    }
    return this.transact(scope, (current) => {
      const confirmedContents = contents.reduce<Record<string, TreeNodeContentDto>>(
        (next, content) => {
          next[content.nodeId] = content;
          return next;
        },
        { ...current.confirmedContents },
      );
      return reprojectRecord({
        ...current,
        confirmedTree: tree,
        tree,
        confirmedContents,
        contents: confirmedContents,
        lastServerSyncAt: this.now().toISOString(),
      });
    }, { preserveEquivalentTree: true });
  }

  putContent(scope: WorkspaceReplicaScope, content: TreeNodeContentDto) {
    return this.putContents(scope, [content]);
  }

  putContents(
    scope: WorkspaceReplicaScope,
    contents: readonly TreeNodeContentDto[],
  ) {
    return this.transact(scope, (current) => {
      const confirmedContents = contents.reduce<Record<string, TreeNodeContentDto>>(
        (next, content) => {
          next[content.nodeId] = content;
          return next;
        },
        { ...current.confirmedContents },
      );
      return reprojectRecord({
        ...current,
        confirmedContents,
        contents: confirmedContents,
        lastServerSyncAt: this.now().toISOString(),
      });
    }, { preserveTree: true });
  }

  enqueue(
    scope: WorkspaceReplicaScope,
    command: WorkspaceDataCommand,
    createdAt = this.now().toISOString(),
    userCommandId = command.input.requestId,
  ) {
    const id = command.input.requestId;
    return this.transact(scope, (current) => {
      if (current.outbox.some((entry) => entry.id === id)) return current;
      const rebasedCommand = rebaseCommand(current, command);
      const optimistic = applyOptimisticCommand(current, rebasedCommand);
      return {
        ...optimistic,
        outbox: [...current.outbox, {
          id,
          createdAt,
          attempts: 0,
          userCommandId,
          command: rebasedCommand,
        }],
      };
    });
  }

  recordAttempt(scope: WorkspaceReplicaScope, id: string) {
    return this.transact(scope, (current) => ({
      ...current,
      outbox: current.outbox.map((entry) => entry.id === id
        ? { ...entry, attempts: entry.attempts + 1 }
        : entry),
    }), { preserveTree: true, preserveContents: true });
  }

  markBlocked(scope: WorkspaceReplicaScope, id: string, code: string, message: string) {
    return this.transact(scope, (current) => ({
      ...current,
      outbox: current.outbox.map((entry) => entry.id === id
        ? {
            ...entry,
            blocked: { code, message, at: this.now().toISOString() },
          }
        : entry),
    }), { preserveTree: true, preserveContents: true });
  }

  retryBlocked(scope: WorkspaceReplicaScope, id: string) {
    return this.transact(scope, (current) => ({
      ...current,
      outbox: current.outbox.map((entry) => entry.id === id
        ? { ...entry, blocked: undefined }
        : entry),
    }), { preserveTree: true, preserveContents: true });
  }

  async exportRecord(scope: WorkspaceReplicaScope) {
    const record = await this.load(scope);
    return JSON.stringify({
      exportedAt: this.now().toISOString(),
      scope,
      record,
    }, null, 2);
  }

  confirm(
    scope: WorkspaceReplicaScope,
    id: string,
    result: WorkspaceDataCommandResult,
  ) {
    return this.transact(scope, (current) => {
      const entry = current.outbox.find((candidate) => candidate.id === id);
      if (!entry) return current;
      const confirmedBase: WorkspaceReplicaRecord = {
        ...current,
        tree: current.confirmedTree,
        contents: current.confirmedContents,
        outbox: [],
      };
      const command = rebaseCommand(confirmedBase, entry.command);
      const optimisticConfirmation = applyOptimisticCommand(confirmedBase, command);
      const confirmed = mergeServerResult(
        optimisticConfirmation,
        command,
        result,
      );
      return reprojectRecord({
        ...current,
        confirmedTree: confirmed.tree,
        tree: confirmed.tree,
        confirmedContents: confirmed.contents,
        contents: confirmed.contents,
        outbox: current.outbox.filter((candidate) => candidate.id !== id),
        lastServerSyncAt: this.now().toISOString(),
      });
    }, { preserveEquivalentTree: true });
  }

  private async transact(
    scope: WorkspaceReplicaScope,
    update: (current: WorkspaceReplicaRecord) => WorkspaceReplicaRecord,
    preserve: {
      preserveTree?: boolean;
      preserveEquivalentTree?: boolean;
      preserveContents?: boolean;
    } = {},
  ) {
    await this.load(scope);
    const record = await this.storage.transact(scope, update);
    this.publish(scope, record, preserve);
    return clone(this.getSnapshot(scope) ?? record);
  }

  private publish(
    scope: WorkspaceReplicaScope,
    record: WorkspaceReplicaRecord | null,
    preserve: {
      preserveTree?: boolean;
      preserveEquivalentTree?: boolean;
      preserveContents?: boolean;
    } = {},
  ) {
    const key = replicaKey(scope);
    const previous = this.snapshots.get(key) ?? null;
    const preserveTree = preserve.preserveTree
      || Boolean(
        preserve.preserveEquivalentTree
        && previous?.tree
        && record?.tree
        && equivalentTreeState(previous.tree, record.tree),
      );
    const snapshot = previous && record ? {
      ...record,
      tree: preserveTree ? previous.tree : record.tree,
      contents: preserve.preserveContents ? previous.contents : record.contents,
    } : record;
    this.snapshots.set(key, snapshot);
    for (const listener of this.listeners.get(key) ?? []) listener();
  }
}

function reprojectRecord(current: WorkspaceReplicaRecord): WorkspaceReplicaRecord {
  let projection: WorkspaceReplicaRecord = {
    ...current,
    tree: current.confirmedTree,
    contents: current.confirmedContents,
    outbox: [],
  };
  const outbox: WorkspaceOutboxEntry[] = [];
  for (const entry of current.outbox) {
    const command = rebaseCommand(projection, entry.command);
    projection = applyOptimisticCommand(projection, command);
    outbox.push({ ...entry, command });
  }
  return {
    ...projection,
    confirmedTree: current.confirmedTree,
    confirmedContents: current.confirmedContents,
    outbox,
    lastServerSyncAt: current.lastServerSyncAt,
  };
}

function mergeServerResult(
  current: WorkspaceReplicaRecord,
  command: WorkspaceDataCommand,
  result: WorkspaceDataCommandResult,
): WorkspaceReplicaRecord {
  switch (command.type) {
    case "create-node":
    case "rename-node":
    case "update-local-id":
    case "move-node":
    case "reparent-node": {
      const confirmed = result as CreateTreeNodeResponse;
      return updateDocument(current, (tree) => ({
        ...tree,
        document: {
          ...tree.document,
          revision: confirmed.treeRevision,
          nodes: tree.document.nodes.map((node) => (
            node.id === confirmed.node.id ? confirmed.node : node
          )),
        },
      }));
    }
    case "set-node-sharing":
    case "set-node-pastel-hue": {
      const confirmed = result as CreateTreeNodeResponse;
      return updateDocument(current, (tree) => ({
        ...tree,
        document: {
          ...tree.document,
          revision: confirmed.treeRevision,
          nodes: tree.document.nodes.map((node) => (
            node.id === confirmed.node.id ? confirmed.node : node
          )),
        },
      }));
    }
    case "delete-node": {
      const confirmed = result as MutationRevisionDto;
      return updateDocument(current, (tree) => ({
        ...tree,
        document: { ...tree.document, revision: confirmed.revision },
      }));
    }
    case "set-node-enabled": {
      const confirmed = result as SetTreeNodeEnabledResponse;
      return updateDocument(current, (tree) => {
        const enabled = new Set(tree.semanticState.enabledNodeIds);
        if (confirmed.enabled) enabled.add(confirmed.nodeId);
        else enabled.delete(confirmed.nodeId);
        return {
          ...tree,
          semanticState: {
            revision: Math.max(tree.semanticState.revision, confirmed.revision),
            enabledNodeIds: [...enabled],
            nodeRevisions: {
              ...tree.semanticState.nodeRevisions,
              [confirmed.nodeId]: confirmed.revision,
            },
          },
        };
      });
    }
    case "set-selection": return updateDocument(current, (tree) => ({
      ...tree,
      selection: result as TreeSelectionDto,
    }));
    case "update-content": {
      const confirmed = result as TreeNodeContentDto;
      return {
        ...current,
        contents: { ...current.contents, [confirmed.nodeId]: confirmed },
      };
    }
    case "upload-image": return current;
  }
}

function equivalentTreeState(left: TreeLoadDto, right: TreeLoadDto) {
  if (
    left.document.id !== right.document.id
    || left.document.workspaceId !== right.document.workspaceId
    || left.document.kind !== right.document.kind
    || left.document.revision !== right.document.revision
    || left.document.nodes.length !== right.document.nodes.length
    || left.semanticState.revision !== right.semanticState.revision
    || left.selection.revision !== right.selection.revision
  ) return false;

  const rightNodes = new Map(right.document.nodes.map((node) => [node.id, node]));
  if (!left.document.nodes.every((node) => {
    const confirmed = rightNodes.get(node.id);
    return confirmed
      && node.parentId === confirmed.parentId
      && node.kind === confirmed.kind
      && node.label === confirmed.label
      && node.localId === confirmed.localId
      && node.position === confirmed.position
      && node.revision === confirmed.revision
      && node.shared === confirmed.shared
      && node.shareName === confirmed.shareName
      && node.pastelHue === confirmed.pastelHue
      && node.capabilities.contentEditable === confirmed.capabilities.contentEditable
      && node.capabilities.listEditable === confirmed.capabilities.listEditable
      && node.capabilities.listItemLimit === confirmed.capabilities.listItemLimit;
  })) return false;

  return unorderedEqual(
    left.semanticState.enabledNodeIds,
    right.semanticState.enabledNodeIds,
  )
    && recordEqual(
      left.semanticState.nodeRevisions,
      right.semanticState.nodeRevisions,
    )
    && orderedEqual(
      left.selection.selectedPath,
      right.selection.selectedPath,
    )
    && recordEqual(left.selection.pageSizes, right.selection.pageSizes);
}

function orderedEqual<T>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function unorderedEqual<T>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length
    && new Set(left).size === new Set(right).size
    && left.every((value) => right.includes(value));
}

function recordEqual<T>(
  left: Readonly<Record<string, T>>,
  right: Readonly<Record<string, T>>,
) {
  const leftEntries = Object.entries(left);
  return leftEntries.length === Object.keys(right).length
    && leftEntries.every(([key, value]) => right[key] === value);
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
  if (candidate.confirmedTree !== null
    && !treeLoadDtoSchema.safeParse(candidate.confirmedTree).success) {
    invalidReplica();
  }
  if (candidate.tree !== null && !treeLoadDtoSchema.safeParse(candidate.tree).success) {
    invalidReplica();
  }
  if (!candidate.confirmedContents || typeof candidate.confirmedContents !== "object"
    || Array.isArray(candidate.confirmedContents)
    || !Object.values(candidate.confirmedContents).every(
      (content) => treeNodeContentDtoSchema.safeParse(content).success,
    )) {
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

export function upgradeWorkspaceReplicaRecord(record: unknown): unknown {
  if (!record || typeof record !== "object") return record;
  const candidate = clone(record) as Record<string, unknown>;
  const sourceVersion = candidate.schemaVersion;
  if (sourceVersion !== 1 && sourceVersion !== 2 && sourceVersion !== 3
    && sourceVersion !== 4 && sourceVersion !== 5) {
    return candidate;
  }
  let localIdByNodeId = new Map<string, string>();
  addMissingSharingFields(candidate.tree);
  addMissingSharingFields(candidate.confirmedTree);
  const tree = candidate.tree;
  if (tree && typeof tree === "object") {
    const document = (tree as Record<string, unknown>).document;
    if (sourceVersion === 1 && document && typeof document === "object") {
      const nodes = (document as Record<string, unknown>).nodes;
      if (Array.isArray(nodes)) localIdByNodeId = assignMissingLocalIds(nodes);
    }
    const selection = (tree as Record<string, unknown>).selection;
    if (selection && typeof selection === "object") {
      const selectionRecord = selection as Record<string, unknown>;
      if (!selectionRecord.pageSizes || typeof selectionRecord.pageSizes !== "object") {
        selectionRecord.pageSizes = {};
      }
    }
  }
  const outbox = candidate.outbox;
  if (Array.isArray(outbox)) {
    for (const value of outbox) {
      if (!value || typeof value !== "object") continue;
      const command = (value as Record<string, unknown>).command;
      if (!command || typeof command !== "object") continue;
      const commandRecord = command as Record<string, unknown>;
      const input = commandRecord.input;
      if (!input || typeof input !== "object") continue;
      const inputRecord = input as Record<string, unknown>;
      if (sourceVersion === 1
        && commandRecord.type === "create-node"
        && typeof inputRecord.localId !== "string"
        && typeof inputRecord.label === "string") {
        inputRecord.localId = typeof inputRecord.nodeId === "string"
          ? localIdByNodeId.get(inputRecord.nodeId)
            ?? createTreeNodeLocalId(inputRecord.label)
          : createTreeNodeLocalId(inputRecord.label);
      }
      if (commandRecord.type === "set-selection"
        && (!inputRecord.pageSizes || typeof inputRecord.pageSizes !== "object")) {
        inputRecord.pageSizes = {};
      }
      if (commandRecord.type === "set-selection") {
        inputRecord.selectedPath = [];
        delete (value as Record<string, unknown>).blocked;
      }
    }
  }
  const hasPendingCommands = Array.isArray(candidate.outbox)
    && candidate.outbox.length > 0;
  candidate.confirmedTree = hasPendingCommands ? null : clone(candidate.tree ?? null);
  candidate.confirmedContents = hasPendingCommands ? {} : clone(candidate.contents ?? {});
  candidate.schemaVersion = workspaceReplicaSchemaVersion;
  return candidate;
}

function assignMissingLocalIds(nodes: unknown[]) {
  const records = nodes.filter((node): node is Record<string, unknown> => (
    Boolean(node && typeof node === "object")
  ));
  const usedByParent = new Map<string, Set<string>>();
  const localIdByNodeId = new Map<string, string>();
  records.sort((left, right) => (
    Number(left.position ?? 0) - Number(right.position ?? 0)
  ));
  for (const node of records) {
    const parentKey = typeof node.parentId === "string" ? node.parentId : "";
    const used = usedByParent.get(parentKey) ?? new Set<string>();
    if (typeof node.localId !== "string" && typeof node.label === "string") {
      node.localId = createTreeNodeLocalId(node.label, used);
    }
    if (typeof node.localId === "string") used.add(node.localId);
    if (typeof node.id === "string" && typeof node.localId === "string") {
      localIdByNodeId.set(node.id, node.localId);
    }
    usedByParent.set(parentKey, used);
  }
  return localIdByNodeId;
}

function addMissingSharingFields(tree: unknown) {
  if (!tree || typeof tree !== "object") return;
  const document = (tree as Record<string, unknown>).document;
  if (!document || typeof document !== "object") return;
  const nodes = (document as Record<string, unknown>).nodes;
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    if (typeof record.shared !== "boolean") record.shared = false;
    if (typeof record.shareName !== "string") record.shareName = null;
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
    && (entry.userCommandId === undefined
      || typeof entry.userCommandId === "string")
    && (entry.blocked === undefined || (
      typeof entry.blocked === "object"
      && entry.blocked !== null
      && typeof entry.blocked.code === "string"
      && typeof entry.blocked.message === "string"
      && typeof entry.blocked.at === "string"
    ))
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
    case "update-local-id": return hasNodeId
      && updateTreeNodeLocalIdRequestSchema.safeParse(command.input).success;
    case "move-node": return hasNodeId
      && moveTreeNodeRequestSchema.safeParse(command.input).success;
    case "reparent-node": return hasNodeId
      && reparentTreeNodeRequestSchema.safeParse(command.input).success;
    case "delete-node": return hasNodeId
      && deleteTreeNodeRequestSchema.safeParse(command.input).success;
    case "set-node-enabled": return hasNodeId
      && setTreeNodeEnabledRequestSchema.safeParse(command.input).success;
    case "set-node-sharing": return hasNodeId
      && setTreeNodeSharingRequestSchema.safeParse(command.input).success;
    case "set-node-pastel-hue": return hasNodeId
      && setTreeNodePastelHueRequestSchema.safeParse(command.input).success;
    case "set-selection": return setTreeSelectionRequestSchema.safeParse(command.input).success;
    case "upload-image": return hasNodeId && isUploadImageInput(command.input);
    case "update-content": return hasNodeId
      && updateTreeNodeContentRequestSchema.safeParse(command.input).success;
    default: return false;
  }
}

function invalidReplica(): never {
  throw new Error("Invalid workspace replica record");
}

function isUploadImageInput(value: unknown): value is {
  requestId: string;
  fileName: string;
  mimeType: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.requestId === "string" && input.requestId.length > 0
    && typeof input.fileName === "string" && input.fileName.length > 0
    && typeof input.mimeType === "string" && input.mimeType.startsWith("image/");
}

function rebaseCommand(
  current: WorkspaceReplicaRecord,
  command: WorkspaceDataCommand,
): WorkspaceDataCommand {
  const tree = current.tree;
  switch (command.type) {
    case "create-node":
    case "move-node":
    case "reparent-node":
    case "delete-node":
      return tree ? {
        ...command,
        input: {
          ...command.input,
          expectedTreeRevision: tree.document.revision,
        },
      } as WorkspaceDataCommand : command;
    case "rename-node":
    case "update-local-id":
    case "set-node-sharing":
    case "set-node-pastel-hue": {
      const revision = tree?.document.nodes.find(
        ({ id }) => id === command.nodeId,
      )?.revision;
      return revision === undefined ? command : {
        ...command,
        input: { ...command.input, expectedRevision: revision },
      } as WorkspaceDataCommand;
    }
    case "set-node-enabled": {
      const revision = tree?.semanticState.nodeRevisions[command.nodeId];
      return revision === undefined ? command : {
        ...command,
        input: { ...command.input, expectedRevision: revision },
      };
    }
    case "set-selection":
      return tree ? {
        ...command,
        input: {
          ...command.input,
          selectedPath: [],
          expectedRevision: tree.selection.revision,
        },
      } : command;
    case "update-content": {
      const revision = current.contents[command.nodeId]?.revision;
      return revision === undefined ? command : {
        ...command,
        input: { ...command.input, expectedRevision: revision },
      };
    }
    case "upload-image": return command;
  }
}

function applyOptimisticCommand(
  current: WorkspaceReplicaRecord,
  command: WorkspaceDataCommand,
): WorkspaceReplicaRecord {
  switch (command.type) {
    case "create-node": return optimisticCreate(current, command.input);
    case "upload-image": return current;
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
    case "update-local-id": return updateDocument(current, (tree) => ({
      ...tree,
      document: {
        ...tree.document,
        revision: tree.document.revision + 1,
        nodes: tree.document.nodes.map((node) => node.id === command.nodeId
          ? {
            ...node,
            localId: command.input.localId,
            revision: command.input.expectedRevision + 1,
          }
          : node),
      },
    }));
    case "set-node-sharing": return updateDocument(current, (tree) => {
      const relatedNodeIds = command.input.shared
        ? sharingRelatives(tree.document.nodes, command.nodeId)
        : new Set<string>();
      return {
        ...tree,
        document: {
          ...tree.document,
          revision: tree.document.revision + 1,
          nodes: tree.document.nodes.map((node) => {
            if (node.id === command.nodeId) {
              return {
                ...node,
                shared: command.input.shared,
                shareName: command.input.shareName,
                revision: command.input.expectedRevision + 1,
              };
            }
            return relatedNodeIds.has(node.id) && node.shared
              ? { ...node, shared: false, revision: node.revision + 1 }
              : node;
          }),
        },
      };
    });
    case "set-node-pastel-hue": return updateDocument(current, (tree) => ({
      ...tree,
      document: {
        ...tree.document,
        revision: tree.document.revision + 1,
        nodes: tree.document.nodes.map((node) => node.id === command.nodeId
          ? {
            ...node,
            pastelHue: command.input.pastelHue,
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
        pageSizes: command.input.pageSizes,
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
      localId: input.localId,
      position,
      revision: 0,
      shared: false,
      shareName: null,
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

function sharingRelatives(
  nodes: TreeLoadDto["document"]["nodes"],
  nodeId: string,
) {
  const related = new Set<string>();
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let parentId = nodesById.get(nodeId)?.parentId ?? null;
  while (parentId) {
    if (related.has(parentId)) break;
    related.add(parentId);
    parentId = nodesById.get(parentId)?.parentId ?? null;
  }

  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.id === nodeId || descendants.has(node.id)) continue;
      if (node.parentId === nodeId || (node.parentId && descendants.has(node.parentId))) {
        descendants.add(node.id);
        changed = true;
      }
    }
  }
  for (const descendantId of descendants) related.add(descendantId);
  return related;
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
  const localId = createTreeNodeLocalId(
    source.localId,
    tree.document.nodes
      .filter(({ parentId }) => parentId === trash.id)
      .map((node) => node.localId),
  );
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
            localId,
            position,
            revision: node.revision + 1,
          }
          : node),
      },
    },
  };
}
