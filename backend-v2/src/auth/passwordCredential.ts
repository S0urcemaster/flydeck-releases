import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const credentialSchema = z.object({
  algorithm: z.literal("scrypt-v1"),
  salt: z.string().regex(/^[0-9a-f]{32}$/),
  hash: z.string().regex(/^[0-9a-f]{128}$/),
}).strict();

export async function createPasswordCredential(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return { algorithm: "scrypt-v1" as const, salt, hash: hash.toString("hex") };
}

export async function verifyPassword(password: string, value: unknown) {
  const parsed = credentialSchema.safeParse(value);
  if (!parsed.success) return false;
  const actual = await derive(password, parsed.data.salt);
  const expected = Buffer.from(parsed.data.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, value) => {
      if (error) reject(error);
      else resolve(Buffer.from(value));
    });
  });
}
