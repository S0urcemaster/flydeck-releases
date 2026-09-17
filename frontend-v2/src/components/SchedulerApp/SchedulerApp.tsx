import { useEffect, useState } from "react";
import type { SchedulePlan } from "@flydeck/shared/v2";
import { AppView, type AppViewProps } from "../AppView";
import { ScheduleEditor } from "../ScheduleEditor";
import { schedulerApi } from "../../api/scheduler";

export type SchedulerAppProps = Omit<AppViewProps, "children" | "componentName"> & { workspaceId?: string };

export function SchedulerApp({ workspaceId, ...props }: SchedulerAppProps) {
  const [saved, setSaved] = useState<SchedulePlan>(defaultPlan);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!workspaceId) return;
    void schedulerApi.read(workspaceId).then((snapshot) => {
      if (snapshot.plan) {
        setSaved(snapshot.plan);
        setRevision(snapshot.plan.revision);
      }
      setStatus(snapshot.lastFiredAt
        ? `Fired ${snapshot.firedCount} times · last ${new Date(snapshot.lastFiredAt).toLocaleString()}`
        : "No scheduler event yet.");
    }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Load failed"));
  }, [workspaceId]);
  return <AppView {...props} componentName="SchedulerApp" accessMode="read-write">
    <ScheduleEditor key={`${revision}:${saved.startAt}`} value={saved} disabled={!workspaceId} onSave={async (plan) => {
      if (!workspaceId) return false;
      try {
        const next = await schedulerApi.update(workspaceId, plan, revision);
        setSaved(next);
        setRevision(next.revision);
        setStatus(next.enabled ? "Schedule saved and armed." : "Schedule saved.");
        return true;
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Save failed");
        return false;
      }
    }} />
    <output aria-live="polite">{status}</output>
  </AppView>;
}

function defaultPlan(): SchedulePlan {
  const start = Date.now() + 60 * 60_000;
  return {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 60 * 60_000).toISOString(),
    stops: [], repetitions: 0,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    enabled: false,
  };
}
