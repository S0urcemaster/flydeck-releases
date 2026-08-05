import { z } from "zod";

export const revisionSchema = z.number().int().nonnegative();
export const requestIdSchema = z.uuid();

export const apiErrorCodeSchema = z.enum([
  "AUTH_REQUIRED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "INVALID_REQUEST",
  "NOT_FOUND",
  "REVISION_CONFLICT",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
]);

export const apiErrorDtoSchema = z.object({
  error: apiErrorCodeSchema,
  message: z.string(),
  requestId: z.string().min(1),
  field: z.string().optional(),
  currentRevision: revisionSchema.optional(),
});

export const mutationRevisionDtoSchema = z.object({
  id: z.uuid(),
  revision: revisionSchema,
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDto = z.infer<typeof apiErrorDtoSchema>;
export type MutationRevisionDto = z.infer<typeof mutationRevisionDtoSchema>;
