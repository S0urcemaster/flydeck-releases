import { z } from "zod";
import { requestIdSchema, revisionSchema } from "./common.js";

export const cronTimerStatusSchema = z.enum(["active", "expired"]);

export const cronTimerDtoSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  createdByUserId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime(),
  status: cronTimerStatusSchema,
  revision: revisionSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  expiredAt: z.iso.datetime().nullable(),
});

export const cronTimerListDtoSchema = z.array(cronTimerDtoSchema);

export const createCronTimerRequestSchema = z.object({
  requestId: requestIdSchema,
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime(),
}).strict();

export const updateCronTimerRequestSchema = z.object({
  dueAt: z.iso.datetime(),
  expectedRevision: revisionSchema,
}).strict();

export const deleteCronTimerRequestSchema = z.object({
  expectedRevision: revisionSchema,
}).strict();

export type CronTimerDto = z.infer<typeof cronTimerDtoSchema>;
export type CreateCronTimerRequest = z.infer<typeof createCronTimerRequestSchema>;
export type UpdateCronTimerRequest = z.infer<typeof updateCronTimerRequestSchema>;
export type DeleteCronTimerRequest = z.infer<typeof deleteCronTimerRequestSchema>;
