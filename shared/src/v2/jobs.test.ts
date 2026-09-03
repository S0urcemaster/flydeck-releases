import { describe, expect, it } from "vitest";
import {
  jobConfigDtoSchema,
  jobSnapshotDtoSchema,
  updateJobConfigRequestSchema,
} from "./jobs.js";

const jobId = "00000000-0000-4000-8000-000000000001";

describe("V2 job contracts", () => {
  it("parses an ordered reusable job configuration", () => {
    expect(jobConfigDtoSchema.parse({
      jobId,
      revision: 2,
      memoryNodeIds: ["00000000-0000-4000-8000-000000000002"],
      memory: "# Rules\n\nBe concise.",
      dataSourceNodeIds: ["00000000-0000-4000-8000-000000000003"],
      dataSources: "|- Sources\n|-|- Current facts",
      prompt: "Summarize the source",
      modelTier: "MEDI",
      effort: "DEEP",
      schedule: {
        dueAt: "2026-08-31T08:00:00.000Z",
        timeZone: "Europe/Berlin",
        enabled: true,
      },
    })).toMatchObject({
      jobId, memory: "# Rules\n\nBe concise.",
      dataSources: "|- Sources\n|-|- Current facts",
      modelTier: "MEDI", effort: "DEEP",
    });
  });

  it("keeps config writes strict and revisioned", () => {
    const parsed = updateJobConfigRequestSchema.safeParse({
      requestId: "00000000-0000-4000-8000-000000000004",
      expectedRevision: 1,
      memoryNodeIds: [], memory: "Remember this.", dataSourceNodeIds: [],
      dataSources: "", prompt: "Run",
      modelTier: "ECON", effort: "FAST", schedule: null,
      hiddenSystemPrompt: "not allowed",
    });
    expect(parsed.success).toBe(false);
  });

  it("exposes only one active run in a snapshot", () => {
    const parsed = jobSnapshotDtoSchema.safeParse({
      config: {
        jobId, revision: 0, memoryNodeIds: [], memory: "", dataSourceNodeIds: [],
        prompt: "Run", modelTier: "ECON", effort: "FAST", schedule: null,
      },
      activeRun: null,
      latestRun: null,
    });
    expect(parsed.success).toBe(true);
  });
});
