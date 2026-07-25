import { describe, expect, it } from "vitest";
import { createCronTimerRequestSchema, cronTimerSchema, updateCronTimerRequestSchema } from "./cron";

describe("cron API contract", () => {
  it("accepts an absolute ISO due date", () => {
    expect(createCronTimerRequestSchema.parse({ title: "Backup", dueAt: "2026-07-21T10:00:00.000Z" }).title).toBe("Backup");
  });

  it("rejects relative and malformed dates", () => {
    expect(createCronTimerRequestSchema.safeParse({ title: "Backup", dueAt: "3h" }).success).toBe(false);
  });

  it("accepts persisted timers", () => {
    expect(cronTimerSchema.safeParse({
      id: "2f1d8d53-1520-4ec8-8c09-0af7a280543f",
      title: "Backup",
      dueAt: "2026-07-21T10:00:00.000Z",
      createdAt: "2026-07-20T10:00:00.000Z",
      status: "active",
    }).success).toBe(true);
  });

  it("only permits changing the timer due date", () => {
    expect(updateCronTimerRequestSchema.parse({ title: "Neuer Name", dueAt: "2026-07-22T10:00:00.000Z" })).toEqual({
      dueAt: "2026-07-22T10:00:00.000Z",
    });
  });
});
