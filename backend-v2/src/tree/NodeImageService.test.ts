import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "../db/database.js";
import { NodeImageService } from "./NodeImageService.js";

const nodeId = "00000000-0000-4000-8000-000000000003";
const workspaceId = "00000000-0000-4000-8000-000000000002";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

describe("NodeImageService", () => {
  it("stores an image in its UTC month and records its node binding", async () => {
    const imageDirectory = await mkdtemp(path.join(os.tmpdir(), "flydeck-images-"));
    temporaryDirectories.push(imageDirectory);
    const now = new Date("2026-08-24T10:00:00.000Z");
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: nodeId }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{
          node_id: nodeId,
          relative_path: `2026-08/${nodeId}.jpg`,
          mime_type: "image/jpeg",
          original_name: "camera.jpg",
          byte_size: 3,
          updated_at: now,
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ relative_path: `2026-08/${nodeId}.jpg` }],
        rowCount: 1,
      });
    const service = new NodeImageService({ query } as unknown as Database, imageDirectory);

    await expect(service.save(
      workspaceId,
      nodeId,
      "image/jpeg",
      "camera.jpg",
      Buffer.from([1, 2, 3]),
      now,
    )).resolves.toMatchObject({
      nodeId,
      mimeType: "image/jpeg",
      byteSize: 3,
    });
    await expect(readFile(path.join(
      imageDirectory,
      "2026-08",
      `${nodeId}.jpg`,
    ))).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO node_images"),
      expect.arrayContaining([nodeId, `2026-08/${nodeId}.jpg`]),
    );
    await expect(service.delete(workspaceId, nodeId)).resolves.toBe(true);
    await expect(access(path.join(
      imageDirectory,
      "2026-08",
      `${nodeId}.jpg`,
    ))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
