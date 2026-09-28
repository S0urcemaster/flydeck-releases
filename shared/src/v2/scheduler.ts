import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";
import { schedulePlanSchema } from "./schedules.js";

export const schedulerPlanDtoSchema = schedulePlanSchema.extend({
  id: z.uuid(), nodeId: z.uuid(), label: z.string().min(1).max(200), revision: revisionSchema,
});
export const schedulerSnapshotDtoSchema = z.object({
  plan: schedulerPlanDtoSchema,
  lastFiredAt: z.iso.datetime().nullable(),
  firedCount: z.number().int().min(0),
});
export const schedulerSnapshotListDtoSchema = z.array(schedulerSnapshotDtoSchema);
export const updateSchedulerPlanRequestSchema = schedulePlanSchema.extend({
  label: z.string().min(1).max(200),
  requestId: requestIdSchema,
  expectedRevision: revisionSchema,
}).strict();

export type SchedulerPlanDto = z.infer<typeof schedulerPlanDtoSchema>;
export type SchedulerSnapshotDto = z.infer<typeof schedulerSnapshotDtoSchema>;
export type UpdateSchedulerPlanRequest = z.infer<typeof updateSchedulerPlanRequestSchema>;
