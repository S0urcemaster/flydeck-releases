import { useEffect, useRef, useState } from "react";
import type { BackupStatusDto } from "@flydeck/shared/v2";
import { v2Api, V2ApiError } from "../../api/V2ApiClient";
import { AppStatusLine, type AppStatusLineProps } from "../AppStatusLine";
import { Button, type ButtonProps } from "../Button";
import {
  InlineAppView,
  type InlineAppViewProps,
} from "../InlineAppView";

export type BackupAppProps = Omit<
  InlineAppViewProps,
  "children" | "componentName"
> & {
  buttonProps?: Omit<
    ButtonProps,
    "aria-label" | "children" | "disabled" | "onClick"
  >;
  statusLineProps?: Omit<
    AppStatusLineProps,
    "activity" | "error" | "message" | "offline"
  >;
  workspaceId?: string;
};

export function BackupApp({
  buttonProps,
  statusLineProps,
  workspaceId,
  ...inlineAppViewProps
}: BackupAppProps) {
  const [status, setStatus] = useState<BackupStatusDto>(emptyBackupStatus);
  const requestPending = useRef(false);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void v2Api.backupStatus(workspaceId).then((nextStatus) => {
      if (active) setStatus(nextStatus);
    }).catch((error) => {
      if (active) setStatus(failedStatus(error));
    });
    return () => { active = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || status.state !== "running") return;
    const interval = window.setInterval(() => {
      void v2Api.backupStatus(workspaceId).then(setStatus).catch((error) => {
        setStatus(failedStatus(error));
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [status.state, workspaceId]);

  async function startBackup() {
    if (!workspaceId || requestPending.current || status.state === "running") return;
    requestPending.current = true;
    try {
      setStatus(await v2Api.startBackup(workspaceId));
    } catch (error) {
      setStatus(failedStatus(error));
    } finally {
      requestPending.current = false;
    }
  }

  return (
    <InlineAppView {...inlineAppViewProps} componentName="BackupApp">
      <Button
        {...buttonProps}
        aria-label="Create PostgreSQL backup"
        disabled={!workspaceId || status.state === "running"}
        width="100%"
        onClick={() => void startBackup()}
      >
        BACKUP
      </Button>
      <AppStatusLine
        {...statusLineProps}
        activity={status.state === "running"}
        error={status.state === "failed"}
        message={formatBackupStatus(status)}
      />
    </InlineAppView>
  );
}

export function formatBackupStatus(status: BackupStatusDto) {
  if (status.state === "running") return "Running : creating PostgreSQL backup";
  if (status.state === "failed") return `Failed : ${status.message ?? "Backup failed"}`;
  if (status.state === "succeeded") {
    const completed = status.completedAt
      ? formatBerlinTime(status.completedAt)
      : "unknown time";
    const size = status.sizeBytes === null
      ? "unknown size"
      : formatBytes(status.sizeBytes);
    return `Saved : ${completed} : ${size}`;
  }
  return "Ready : no backup yet";
}

function formatBerlinTime(value: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.timeZoneName}`;
}

const emptyBackupStatus: BackupStatusDto = {
  state: "idle",
  startedAt: null,
  completedAt: null,
  fileName: null,
  sizeBytes: null,
  sha256: null,
  message: "No backup yet",
};

function failedStatus(error: unknown): BackupStatusDto {
  return {
    ...emptyBackupStatus,
    state: "failed",
    completedAt: new Date().toISOString(),
    message: error instanceof V2ApiError
      ? error.response.message
      : error instanceof Error ? error.message : "Backup failed",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}
