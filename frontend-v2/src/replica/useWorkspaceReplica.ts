import { useCallback, useSyncExternalStore } from "react";

import {
  workspaceReplica,
  type WorkspaceReplicaRecord,
  type WorkspaceReplicaScope,
} from "./WorkspaceReplica";

const emptySubscribe = () => () => undefined;
const emptySnapshot = () => null;

export function useWorkspaceReplica(
  scope: WorkspaceReplicaScope | null,
): WorkspaceReplicaRecord | null {
  const subscribe = useCallback((listener: () => void) => (
    scope ? workspaceReplica.subscribe(scope, listener) : emptySubscribe()
  ), [scope]);
  const getSnapshot = useCallback(() => (
    scope ? workspaceReplica.getSnapshot(scope) : emptySnapshot()
  ), [scope]);

  return useSyncExternalStore(subscribe, getSnapshot, emptySnapshot);
}
