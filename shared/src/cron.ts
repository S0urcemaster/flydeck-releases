import { z } from "zod";

export const cronTimerStatusSchema = z.enum(["active", "expired"]);

export const cronTimerSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  status: cronTimerStatusSchema,
});

export const createCronTimerRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime(),
});

export const updateCronTimerRequestSchema = z.object({
  dueAt: z.iso.datetime(),
});

export type CronTimerStatus = z.infer<typeof cronTimerStatusSchema>;
export type CronTimer = z.infer<typeof cronTimerSchema>;
export type CreateCronTimerRequest = z.infer<typeof createCronTimerRequestSchema>;
export type UpdateCronTimerRequest = z.infer<typeof updateCronTimerRequestSchema>;
