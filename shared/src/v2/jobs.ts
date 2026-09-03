import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";

export const jobModelTierSchema = z.enum(["ECON", "MEDI", "HIGH"]);
export const jobEffortSchema = z.enum(["FAST", "MEDI", "DEEP"]);
export const jobRunStatusSchema = z.enum([
  "queued", "running", "completed", "failed", "cancelled", "interrupted",
]);
export const jobTriggerSchema = z.enum(["manual", "scheduled"]);

export const jobScheduleSchema = z.object({
  dueAt: z.iso.datetime(),
  timeZone: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
});

export const jobConfigDtoSchema = z.object({
  jobId: z.uuid(),
  revision: revisionSchema,
  memoryNodeIds: z.array(z.uuid()).max(64),
  memory: z.string().max(100_000).default(""),
  dataSourceNodeIds: z.array(z.uuid()).max(64),
  dataSources: z.string().max(100_000).default(""),
  prompt: z.string().max(100_000),
  modelTier: jobModelTierSchema,
  effort: jobEffortSchema,
  schedule: jobScheduleSchema.nullable(),
});

export const updateJobConfigRequestSchema = jobConfigDtoSchema.omit({
  jobId: true,
  revision: true,
}).extend({
  requestId: requestIdSchema,
  expectedRevision: revisionSchema,
}).strict();

export const jobRunDtoSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  nodeId: z.uuid(),
  dateNodeId: z.uuid(),
  status: jobRunStatusSchema,
  trigger: jobTriggerSchema,
  output: z.string(),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const jobSnapshotDtoSchema = z.object({
  configured: z.boolean().default(false),
  config: jobConfigDtoSchema,
  activeRun: jobRunDtoSchema.nullable(),
  latestRun: jobRunDtoSchema.nullable(),
});

export const startJobRunRequestSchema = z.object({
  requestId: requestIdSchema,
  timeZone: z.string().trim().min(1).max(100),
}).strict();

export const cancelJobRunResponseSchema = z.object({
  id: z.uuid(),
  status: z.literal("cancelled"),
});

export type JobModelTier = z.infer<typeof jobModelTierSchema>;
export type JobEffort = z.infer<typeof jobEffortSchema>;
export type JobRunStatus = z.infer<typeof jobRunStatusSchema>;
export type JobTrigger = z.infer<typeof jobTriggerSchema>;
export type JobSchedule = z.infer<typeof jobScheduleSchema>;
export type JobConfigDto = z.infer<typeof jobConfigDtoSchema>;
export type UpdateJobConfigRequest = z.infer<typeof updateJobConfigRequestSchema>;
export type JobRunDto = z.infer<typeof jobRunDtoSchema>;
export type JobSnapshotDto = z.infer<typeof jobSnapshotDtoSchema>;
export type StartJobRunRequest = z.infer<typeof startJobRunRequestSchema>;
