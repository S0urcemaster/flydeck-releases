import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

export type ClientStateScope = {
  userId: string;
  workspaceId: string;
  deviceId: string;
};

export type ClientStateSlice<T> = {
  name: string;
  version: number;
  defaultValue: T;
  validate: (value: unknown) => value is T;
  legacyKeys?: readonly string[];
  migrateLegacy?: (value: unknown) => T | null;
};

export type ClientStorage = Pick<Storage, "getItem" | "setItem">;

type StoredSlice = {
  version: number;
  value: unknown;
};

export const defaultClientStateScope: ClientStateScope = {
  userId: "anonymous",
  workspaceId: "default",
  deviceId: "local",
};

const clientStateScopeContext = createContext(defaultClientStateScope);
const clientDeviceIdKey = "flydeck:v2:client-device-id";
const lastClientIdentityKey = "flydeck:v2:last-client-identity";

export type ClientIdentity = Pick<ClientStateScope, "userId" | "workspaceId">;

export function ClientStateScopeProvider({
  children,
  scope,
}: {
  children: ReactNode;
  scope: ClientStateScope;
}) {
  return createElement(clientStateScopeContext.Provider, { value: scope }, children);
}

export function getClientDeviceId(
  storage: ClientStorage | null = browserStorage(),
  createId: () => string = createDeviceId,
) {
  if (!storage) return "ephemeral";
  try {
    const stored = storage.getItem(clientDeviceIdKey)?.trim();
    if (stored) return stored;
    const created = createId();
    storage.setItem(clientDeviceIdKey, created);
    return created;
  } catch {
    return "ephemeral";
  }
}

export function getLastClientIdentity(
  storage: ClientStorage | null = browserStorage(),
): ClientIdentity | null {
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(lastClientIdentityKey) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const identity = parsed as Partial<ClientIdentity>;
    return typeof identity.userId === "string" && identity.userId.length > 0
      && typeof identity.workspaceId === "string" && identity.workspaceId.length > 0
      ? { userId: identity.userId, workspaceId: identity.workspaceId }
      : null;
  } catch {
    return null;
  }
}

export function setLastClientIdentity(
  identity: ClientIdentity,
  storage: ClientStorage | null = browserStorage(),
) {
  if (!storage) return false;
  try {
    storage.setItem(lastClientIdentityKey, JSON.stringify(identity));
    return true;
  } catch {
    return false;
  }
}

export class ClientStateStore {
  private readonly cache = new Map<string, unknown>();
  private readonly definitions = new Map<string, ClientStateSlice<unknown>>();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly options: {
      namespace?: string;
      storage?: () => ClientStorage | null;
    } = {},
  ) {}

  get<T>(
    slice: ClientStateSlice<T>,
    scope: ClientStateScope = defaultClientStateScope,
  ): T {
    const key = this.key(slice.name, scope);
    this.definitions.set(key, slice as ClientStateSlice<unknown>);
    if (this.cache.has(key)) return this.cache.get(key) as T;

    const value = this.read(slice, key);
    this.cache.set(key, value);
    return value;
  }

  set<T>(
    slice: ClientStateSlice<T>,
    value: T,
    scope: ClientStateScope = defaultClientStateScope,
  ) {
    if (!slice.validate(value)) {
      throw new Error(`Invalid client state for ${slice.name}`);
    }
    const key = this.key(slice.name, scope);
    this.definitions.set(key, slice as ClientStateSlice<unknown>);
    this.cache.set(key, value);
    try {
      this.storage()?.setItem(key, JSON.stringify({
        version: slice.version,
        value,
      } satisfies StoredSlice));
    } catch {
      // A blocked or full localStorage must not lose the in-memory state.
    }
    this.emit(key);
  }

  subscribe<T>(
    slice: ClientStateSlice<T>,
    listener: () => void,
    scope: ClientStateScope = defaultClientStateScope,
  ) {
    const key = this.key(slice.name, scope);
    this.definitions.set(key, slice as ClientStateSlice<unknown>);
    const current = this.listeners.get(key) ?? new Set();
    current.add(listener);
    this.listeners.set(key, current);
    this.attachStorageListener();
    return () => {
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(key);
    };
  }

  getKey(
    sliceName: string,
    scope: ClientStateScope = defaultClientStateScope,
  ) {
    return this.key(sliceName, scope);
  }

  private read<T>(slice: ClientStateSlice<T>, key: string): T {
    const storage = this.storage();
    if (!storage) return slice.defaultValue;
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        const stored: unknown = JSON.parse(raw);
        if (isStoredSlice(stored)
          && stored.version === slice.version
          && slice.validate(stored.value)) {
          return stored.value;
        }
      }

      for (const legacyKey of slice.legacyKeys ?? []) {
        const legacyRaw = storage.getItem(legacyKey);
        if (legacyRaw === null) continue;
        const parsed: unknown = JSON.parse(legacyRaw);
        const migrated = slice.migrateLegacy?.(parsed)
          ?? (slice.validate(parsed) ? parsed : null);
        if (migrated === null) continue;
        storage.setItem(key, JSON.stringify({
          version: slice.version,
          value: migrated,
        } satisfies StoredSlice));
        return migrated;
      }
    } catch {
      return slice.defaultValue;
    }
    return slice.defaultValue;
  }

  private key(name: string, scope: ClientStateScope) {
    return [
      this.options.namespace ?? "flydeck:v2",
      encodeKeyPart(scope.userId),
      encodeKeyPart(scope.workspaceId),
      encodeKeyPart(scope.deviceId),
      encodeKeyPart(name),
    ].join(":");
  }

  private storage() {
    if (this.options.storage) return this.options.storage();
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  }

  private emit(key: string) {
    for (const listener of this.listeners.get(key) ?? []) listener();
  }

  private attachStorageListener() {
    if (typeof window === "undefined" || attachedStores.has(this)) return;
    attachedStores.add(this);
    window.addEventListener("storage", (event) => {
      const key = event.key;
      if (!key || !this.definitions.has(key)) return;
      const definition = this.definitions.get(key)!;
      try {
        const parsed: unknown = JSON.parse(event.newValue ?? "null");
        if (!isStoredSlice(parsed)
          || parsed.version !== definition.version
          || !definition.validate(parsed.value)) return;
        this.cache.set(key, parsed.value);
        this.emit(key);
      } catch {
        // Ignore malformed writes from another tab.
      }
    });
  }
}

const attachedStores = new WeakSet<ClientStateStore>();

export const clientStateStore = new ClientStateStore();

export const selectedLabComponentSlice: ClientStateSlice<string> = {
  name: "lab.selectedAppComponent",
  version: 1,
  defaultValue: "AppTitle",
  validate: (value): value is string => typeof value === "string",
  legacyKeys: ["flydeck.lab.selectedAppComponent"],
};

export function useClientStateSlice<T>(
  slice: ClientStateSlice<T>,
  scope?: ClientStateScope,
  store = clientStateStore,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const inheritedScope = useContext(clientStateScopeContext);
  const resolvedScope = scope ?? inheritedScope;
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(slice, listener, resolvedScope),
    [resolvedScope, slice, store],
  );
  const getSnapshot = useCallback(
    () => store.get(slice, resolvedScope),
    [resolvedScope, slice, store],
  );
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setValue: Dispatch<SetStateAction<T>> = useCallback((next) => {
    const current = store.get(slice, resolvedScope);
    store.set(slice, typeof next === "function"
      ? (next as (value: T) => T)(current)
      : next, resolvedScope);
  }, [resolvedScope, slice, store]);
  return [value, setValue] as const;
}

export function useClientStateScope() {
  return useContext(clientStateScopeContext);
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
    && Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === "string",
    );
}

function encodeKeyPart(value: string) {
  return encodeURIComponent(value.trim() || "default");
}

function isStoredSlice(value: unknown): value is StoredSlice {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredSlice>;
  return Number.isInteger(candidate.version) && "value" in candidate;
}

function browserStorage(): ClientStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
