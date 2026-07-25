import { z } from "zod";

export const dataFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9äöüÄÖÜß][a-zA-Z0-9äöüÄÖÜß _-]*\.md$/, "Invalid Markdown filename");

export const dataFileSummarySchema = z.object({
  name: dataFileNameSchema,
  title: z.string(),
  entryCount: z.number().int().nonnegative(),
  modifiedAt: z.string(),
  valid: z.boolean(),
  error: z.string().nullable(),
});

export const dataFileSchema = z.object({
  name: dataFileNameSchema,
  title: z.string(),
  metadata: z.record(z.string(), z.string()),
  entries: z.array(z.string()),
  modifiedAt: z.string(),
});

export const createDataFileRequestSchema = z.object({
  name: dataFileNameSchema,
  title: z.string().trim().min(1).max(200),
});

export const writeDataEntryRequestSchema = z.object({
  text: z.string().trim().min(1).max(100_000),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export type DataFileName = z.infer<typeof dataFileNameSchema>;
export type DataFileSummary = z.infer<typeof dataFileSummarySchema>;
export type DataFile = z.infer<typeof dataFileSchema>;
export type CreateDataFileRequest = z.infer<typeof createDataFileRequestSchema>;
export type WriteDataEntryRequest = z.infer<typeof writeDataEntryRequestSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
