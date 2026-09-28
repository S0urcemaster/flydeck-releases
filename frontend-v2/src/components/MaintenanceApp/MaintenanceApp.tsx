import { useRef, useState } from "react";

import { AppStatusLine, type AppStatusLineProps } from "../AppStatusLine";
import { DeleteButton, type DeleteButtonProps } from "../DeleteButton";
import { InlineAppView, type InlineAppViewProps } from "../InlineAppView";

export type MaintenanceAppProps = Omit<
  InlineAppViewProps,
  "children" | "componentName"
> & {
  buttonProps?: Omit<
    DeleteButtonProps,
    "children" | "disabled" | "label" | "onDelete"
  >;
  onResetClientToServer?: () => Promise<void>;
  statusLineProps?: Omit<
    AppStatusLineProps,
    "activity" | "error" | "message" | "offline"
  >;
};

type ResetStatus = "ready" | "running" | "succeeded" | "failed";

export function MaintenanceApp({
  buttonProps,
  onResetClientToServer,
  statusLineProps,
  ...inlineAppViewProps
}: MaintenanceAppProps) {
  const [status, setStatus] = useState<ResetStatus>("ready");
  const [error, setError] = useState("");
  const requestPending = useRef(false);

  async function resetClient() {
    if (!onResetClientToServer || requestPending.current) return;
    requestPending.current = true;
    setStatus("running");
    setError("");
    try {
      await onResetClientToServer();
      setStatus("succeeded");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Reset failed");
      setStatus("failed");
    } finally {
      requestPending.current = false;
    }
  }

  return (
    <InlineAppView {...inlineAppViewProps} componentName="MaintenanceApp">
      <DeleteButton
        {...buttonProps}
        action="reset"
        disabled={!onResetClientToServer || status === "running"}
        label="client cache to server state"
        width="100%"
        onDelete={resetClient}
      >
        Reset Client to Server
      </DeleteButton>
      <AppStatusLine
        {...statusLineProps}
        activity={status === "running"}
        error={status === "failed"}
        message={formatMaintenanceStatus(status, error)}
      />
    </InlineAppView>
  );
}

export function formatMaintenanceStatus(status: ResetStatus, error = "") {
  if (status === "running") return "Running : loading server state";
  if (status === "succeeded") return "Ready : client reset to server";
  if (status === "failed") return `Failed : ${error || "Reset failed"}`;
  return "Ready : local changes will be discarded";
}
