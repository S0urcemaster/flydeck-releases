import { z } from "zod";

export const backupStateSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "failed",
]);

export const backupStatusDtoSchema = z.object({
  state: backupStateSchema,
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  fileName: z.string().min(1).nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  message: z.string().min(1).nullable(),
});

export type BackupState = z.infer<typeof backupStateSchema>;
export type BackupStatusDto = z.infer<typeof backupStatusDtoSchema>;
