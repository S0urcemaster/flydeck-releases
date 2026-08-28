import { useRef, useState } from "react";

import { AppStatusLine, type AppStatusLineProps } from "../AppStatusLine";
import { Button, type ButtonProps } from "../Button";
import { InlineAppView, type InlineAppViewProps } from "../InlineAppView";

export type MaintenanceAppProps = Omit<
  InlineAppViewProps,
  "children" | "componentName"
> & {
  buttonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "disabled" | "onClick"
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
      <Button
        {...buttonProps}
        aria-label="Reset client cache to server state"
        disabled={!onResetClientToServer || status === "running"}
        width="100%"
        onClick={() => void resetClient()}
      >
        Reset Client to Server
      </Button>
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
