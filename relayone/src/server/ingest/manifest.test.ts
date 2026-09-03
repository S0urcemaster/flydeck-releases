import { describe, expect, it } from "vitest";

import { parsePublicationManifest } from "./manifest.js";

const publicationId = "00000000-0000-4000-8000-000000000001";
const nodeId = "00000000-0000-4000-8000-000000000002";
const hash = "a".repeat(64);

function manifest() {
  return {
    schemaVersion: 1,
    publicationId,
    version: 1,
    title: "Posts",
    info: "",
    createdAt: "2026-09-03T10:00:00.000Z",
    assets: [{
      sha256: hash,
      mimeType: "image/jpeg",
      byteSize: 12,
      originalName: "photo.jpg",
    }],
    nodes: [{
      id: nodeId,
      parentId: null,
      localId: "posts",
      position: 0,
      label: "Posts",
      createdAt: "2026-09-03T10:00:00.000Z",
      updatedAt: "2026-09-03T10:00:00.000Z",
      format: "markdown",
      content: "Hello",
      assets: [{ sha256: hash, role: "hero", position: 0, alt: "Photo" }],
    }],
  };
}

describe("publication manifest", () => {
  it("accepts one complete publication snapshot", () => {
    expect(parsePublicationManifest(manifest()).publicationId).toBe(publicationId);
  });

  it("rejects a node referencing an undeclared asset", () => {
    const value = manifest();
    value.nodes[0].assets[0].sha256 = "b".repeat(64);
    expect(() => parsePublicationManifest(value)).toThrow(/absent from the manifest/);
  });

  it("rejects a parent outside the publication snapshot", () => {
    const value = manifest();
    value.nodes[0].parentId = "00000000-0000-4000-8000-000000000099";
    expect(() => parsePublicationManifest(value)).toThrow(/absent from the snapshot/);
  });
});
