import { useSyncExternalStore } from "react";

import type { WorkspaceSyncStatus } from "./WorkspaceReplica";

export type WorkspaceSyncActivity = {
  message: "cached..." | "saved" | "in queue" | "queue saved";
};

type CommandProgress = {
  cachedAt: number;
  pending: number;
  queued: boolean;
  timer?: ReturnType<typeof setTimeout>;
};

const minimumCachedDuration = 500;

export class WorkspaceSyncStatusStore {
  private status: WorkspaceSyncStatus = initialStatus();
  private activity: WorkspaceSyncActivity | null = null;
  private forcedOffline = false;
  private readonly pendingByScope = new Map<string, number>();
  private readonly commandProgress = new Map<string, CommandProgress>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly listensToBrowser = true) {
    if (listensToBrowser && typeof window !== "undefined") {
      window.addEventListener("offline", this.onOffline);
    }
  }

  getSnapshot = () => this.status;
  getActivitySnapshot = () => this.activity;

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
    if (this.commandProgress.size === 0) this.setActivity(null);
    for (const [commandId, progress] of this.commandProgress) {
      progress.queued = true;
      this.scheduleCommandTransition(commandId, progress);
    }
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

  markCommandCached(commandId: string) {
    const current = this.commandProgress.get(commandId);
    if (current) {
      current.pending += 1;
      return;
    }
    const progress: CommandProgress = {
      cachedAt: Date.now(),
      pending: 1,
      queued: this.status.state === "offline",
    };
    this.commandProgress.set(commandId, progress);
    this.setActivity({ message: "cached..." });
    this.scheduleCommandTransition(commandId, progress);
  }

  markCommandSaved(commandId: string, announce = true) {
    const progress = this.commandProgress.get(commandId);
    if (!progress) return;
    progress.pending = Math.max(0, progress.pending - 1);
    if (progress.pending > 0) return;
    if (!announce) {
      if (progress.timer) clearTimeout(progress.timer);
      this.commandProgress.delete(commandId);
      return;
    }
    this.scheduleCommandTransition(commandId, progress);
  }

  markQueueSaved() {
    for (const progress of this.commandProgress.values()) {
      if (progress.timer) clearTimeout(progress.timer);
    }
    this.commandProgress.clear();
    this.setActivity({ message: "queue saved" });
  }

  setStatus(status: WorkspaceSyncStatus) {
    if (sameStatus(this.status, status)) return;
    this.status = status;
    this.emit();
  }

  dispose() {
    for (const progress of this.commandProgress.values()) {
      if (progress.timer) clearTimeout(progress.timer);
    }
    this.commandProgress.clear();
    if (this.listensToBrowser && typeof window !== "undefined") {
      window.removeEventListener("offline", this.onOffline);
    }
  }

  private scheduleCommandTransition(
    commandId: string,
    progress: CommandProgress,
  ) {
    if (progress.timer) clearTimeout(progress.timer);
    const delay = Math.max(
      0,
      progress.cachedAt + minimumCachedDuration - Date.now(),
    );
    progress.timer = setTimeout(() => {
      const current = this.commandProgress.get(commandId);
      if (!current) return;
      current.timer = undefined;
      if (current.pending === 0) {
        this.commandProgress.delete(commandId);
        this.setActivity({ message: "saved" });
      } else if (current.queued || this.status.state === "offline") {
        this.setActivity({ message: "in queue" });
      }
    }, delay);
  }

  private setActivity(activity: WorkspaceSyncActivity | null) {
    if (this.activity?.message === activity?.message) return;
    this.activity = activity;
    this.emit();
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

export function useWorkspaceSyncActivity(
  store = workspaceSyncStatusStore,
) {
  return useSyncExternalStore(
    store.subscribe,
    store.getActivitySnapshot,
    store.getActivitySnapshot,
  );
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
