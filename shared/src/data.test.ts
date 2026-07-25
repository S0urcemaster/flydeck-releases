import { describe, expect, it } from "vitest";
import { createDataFileRequestSchema, dataFileNameSchema } from "./data";

describe("data API contract", () => {
  it("accepts simple markdown filenames", () => {
    expect(dataFileNameSchema.parse("meine ideen.md")).toBe("meine ideen.md");
  });

  it("rejects traversal and non-markdown files", () => {
    expect(dataFileNameSchema.safeParse("../secret.md").success).toBe(false);
    expect(dataFileNameSchema.safeParse("ideen.txt").success).toBe(false);
  });

  it("requires a title when creating a file", () => {
    expect(createDataFileRequestSchema.safeParse({ name: "ideen.md", title: "" }).success).toBe(false);
  });
});
