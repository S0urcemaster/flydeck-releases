import { useSyncExternalStore } from "react";

import type { WorkspaceSyncStatus } from "./WorkspaceReplica";

export class WorkspaceSyncStatusStore {
  private status: WorkspaceSyncStatus = initialStatus();
  private forcedOffline = false;
  private readonly pendingByScope = new Map<string, number>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly listensToBrowser = true) {
    if (listensToBrowser && typeof window !== "undefined") {
      window.addEventListener("offline", this.onOffline);
    }
  }

  getSnapshot = () => this.status;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  markOnline() {
    if (this.forcedOffline) {
      this.setStatus({ state: "offline", reason: "Offline test mode is enabled." });
      return;
    }
    this.setStatus({ state: "idle" });
  }

  markOffline(reason = "The server is not reachable.") {
    this.setStatus({ state: "offline", reason });
  }

  markError(reason: string, pending = 0) {
    this.setStatus({ state: "error", reason, pending });
  }

  isForcedOffline() {
    return this.forcedOffline;
  }

  setForcedOffline(forced: boolean) {
    if (this.forcedOffline === forced) return;
    this.forcedOffline = forced;
    if (forced) this.markOffline("Offline test mode is enabled.");
    else this.markOnline();
  }

  getPendingCount() {
    let total = 0;
    for (const pending of this.pendingByScope.values()) total += pending;
    return total;
  }

  setPendingCount(scope: string, pending: number) {
    const normalized = Math.max(0, Math.trunc(pending));
    if ((this.pendingByScope.get(scope) ?? 0) === normalized) return;
    if (normalized === 0) this.pendingByScope.delete(scope);
    else this.pendingByScope.set(scope, normalized);
    this.emit();
  }

  setStatus(status: WorkspaceSyncStatus) {
    if (sameStatus(this.status, status)) return;
    this.status = status;
    this.emit();
  }

  dispose() {
    if (!this.listensToBrowser || typeof window === "undefined") return;
    window.removeEventListener("offline", this.onOffline);
  }

  private readonly onOffline = () => this.markOffline("The browser is offline.");

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

export const workspaceSyncStatusStore = new WorkspaceSyncStatusStore();

export function useWorkspaceSyncStatus(
  store = workspaceSyncStatusStore,
) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useForcedOfflineMode(
  store = workspaceSyncStatusStore,
) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.isForcedOffline(),
    () => false,
  );
}

export function usePendingWorkspaceTransactions(
  store = workspaceSyncStatusStore,
) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getPendingCount(),
    () => 0,
  );
}

export function reportWorkspaceReplicaError(error: unknown) {
  workspaceSyncStatusStore.markError(
    error instanceof Error ? error.message : "The local DATA cache is unavailable.",
  );
}

export function persistWorkspaceReplica(operation: Promise<unknown>) {
  void operation.catch(reportWorkspaceReplicaError);
}

function initialStatus(): WorkspaceSyncStatus {
  return typeof navigator !== "undefined" && navigator.onLine === false
    ? { state: "offline", reason: "The browser is offline." }
    : { state: "idle" };
}

function sameStatus(first: WorkspaceSyncStatus, second: WorkspaceSyncStatus) {
  return JSON.stringify(first) === JSON.stringify(second);
}
