import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EncryptedJson } from "./EncryptedJson.js";

describe("EncryptedJson", () => {
  it("round-trips JSON without storing plaintext", () => {
    const codec = new EncryptedJson(randomBytes(32).toString("base64url"));
    const encrypted = codec.encrypt({ refreshToken: "very-secret", count: 2 });
    expect(encrypted.toString()).not.toContain("very-secret");
    expect(codec.decrypt(encrypted)).toEqual({ refreshToken: "very-secret", count: 2 });
  });

  it("rejects an invalid key size", () => {
    expect(() => new EncryptedJson("short")).toThrow("32-byte");
  });
});
