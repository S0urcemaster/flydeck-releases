import { useMemo, useRef, useState } from "react";

import { useClientStateScope } from "../../state";
import { workspaceReplica, workspaceSyncEngine, useWorkspaceReplica, type WorkspaceReplicaScope } from "../../replica";
import { AppStatusLine, type AppStatusLineProps } from "../AppStatusLine";
import { DeleteButton, type DeleteButtonProps } from "../DeleteButton";
import { InlineAppView, type InlineAppViewProps } from "../InlineAppView";

export type EmptyTrashAppProps = Omit<InlineAppViewProps, "children" | "componentName"> & {
  buttonProps?: Omit<DeleteButtonProps, "children" | "disabled" | "label" | "onDelete">;
  statusLineProps?: Omit<AppStatusLineProps, "activity" | "error" | "message" | "offline">;
  workspaceId?: string;
};

type EmptyTrashStatus = "ready" | "running" | "succeeded" | "failed";

export function EmptyTrashApp({ buttonProps, statusLineProps, workspaceId, ...inlineAppViewProps }: EmptyTrashAppProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId ? { userId, workspaceId } : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const trash = record?.tree?.document.nodes.find((node) => node.kind === "trash-directory");
  const trashItems = trash ? record?.tree?.document.nodes.filter((node) => node.parentId === trash.id) ?? [] : [];
  const [status, setStatus] = useState<EmptyTrashStatus>("ready");
  const [error, setError] = useState("");
  const requestPending = useRef(false);

  async function emptyTrash() {
    if (!scope || requestPending.current || trashItems.length === 0) return;
    requestPending.current = true;
    setStatus("running");
    setError("");
    try {
      for (const item of trashItems) {
        const revision = workspaceReplica.getSnapshot(scope)?.tree?.document.revision;
        if (revision === undefined) throw new Error("The DATA tree is unavailable.");
        await workspaceSyncEngine.submit(scope, {
          type: "delete-node",
          nodeId: item.id,
          input: { requestId: crypto.randomUUID(), expectedTreeRevision: revision },
        });
      }
      if (!await workspaceSyncEngine.flush(scope)) throw new Error("Could not synchronize the empty trash operation.");
      setStatus("succeeded");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not empty trash");
      setStatus("failed");
    } finally {
      requestPending.current = false;
    }
  }

  return <InlineAppView {...inlineAppViewProps} componentName="EmptyTrashApp">
    <DeleteButton {...buttonProps} disabled={!scope || trashItems.length === 0 || status === "running"} label="all trash items" width="100%" onDelete={emptyTrash}>
      EMPTY TRASH
    </DeleteButton>
    <AppStatusLine {...statusLineProps} activity={status === "running"} error={status === "failed"} message={formatEmptyTrashStatus(status, trashItems.length, error)} />
  </InlineAppView>;
}

export function formatEmptyTrashStatus(status: EmptyTrashStatus, count: number, error = "") {
  if (status === "running") return `Running : deleting ${count} trash item${count === 1 ? "" : "s"}`;
  if (status === "succeeded") return "Ready : trash emptied";
  if (status === "failed") return `Failed : ${error || "Could not empty trash"}`;
  return count === 0 ? "Ready : trash is empty" : `Ready : ${count} trash item${count === 1 ? "" : "s"}`;
}
