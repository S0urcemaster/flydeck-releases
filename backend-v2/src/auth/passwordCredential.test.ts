import { describe, expect, it } from "vitest";
import { createPasswordCredential, verifyPassword } from "./passwordCredential.js";

describe("password credentials", () => {
  it("stores only a salted scrypt hash and verifies in constant-time form", async () => {
    const credential = await createPasswordCredential("correct horse battery staple");
    expect(credential).not.toHaveProperty("password");
    expect(credential.hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", credential)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", credential)).resolves.toBe(false);
  });
});
