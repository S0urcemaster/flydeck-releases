import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class EncryptedJson {
  private readonly key: Buffer;

  constructor(encodedKey: string) {
    this.key = Buffer.from(encodedKey, "base64url");
    if (this.key.length !== 32) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be a 32-byte base64url value");
    }
  }

  encrypt(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  }

  decrypt<T>(value: Buffer): T {
    const iv = value.subarray(0, 12);
    const tag = value.subarray(12, 28);
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([
      decipher.update(value.subarray(28)),
      decipher.final(),
    ]).toString("utf8")) as T;
  }
}
