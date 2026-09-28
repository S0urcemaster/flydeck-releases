import {
  schedulerPlanDtoSchema, schedulerSnapshotDtoSchema, schedulerSnapshotListDtoSchema,
  type SchedulePlan, type SchedulerSnapshotDto,
} from "@flydeck/shared/v2";

const path = (workspaceId: string) => `/flydeck/api/v2/workspaces/${encodeURIComponent(workspaceId)}/scheduler`;

export const schedulerApi = {
  list: async (workspaceId: string): Promise<SchedulerSnapshotDto[]> => {
    const response = await fetch(path(workspaceId), { credentials: "include" });
    if (!response.ok) throw new Error("Schedule could not be loaded");
    return schedulerSnapshotListDtoSchema.parse(await response.json());
  },
  read: async (workspaceId: string, nodeId: string): Promise<SchedulerSnapshotDto> => {
    const response = await fetch(`${path(workspaceId)}/${encodeURIComponent(nodeId)}`, { credentials: "include" });
    if (!response.ok) throw new Error("Schedule could not be loaded");
    return schedulerSnapshotDtoSchema.parse(await response.json());
  },
  update: async (workspaceId: string, nodeId: string, label: string, value: SchedulePlan, expectedRevision: number) => {
    const response = await fetch(`${path(workspaceId)}/${encodeURIComponent(nodeId)}`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, label, expectedRevision, requestId: crypto.randomUUID() }),
    });
    if (!response.ok) throw new Error("Schedule could not be saved");
    return schedulerPlanDtoSchema.parse(await response.json());
  },
};
