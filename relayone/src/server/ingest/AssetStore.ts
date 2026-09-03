import { createHash } from "node:crypto";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const hashPattern = /^[0-9a-f]{64}$/;

export class AssetStore {
  constructor(private readonly directory: string) {}

  pathFor(sha256: string) {
    assertHash(sha256);
    return path.join(this.directory, sha256.slice(0, 2), sha256.slice(2, 4), sha256);
  }

  async has(sha256: string, byteSize?: number) {
    try {
      const metadata = await stat(this.pathFor(sha256));
      return metadata.isFile() && (byteSize === undefined || metadata.size === byteSize);
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  }

  async put(sha256: string, content: Buffer) {
    assertHash(sha256);
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== sha256) throw new AssetDigestMismatchError(sha256, actual);

    const destination = this.pathFor(sha256);
    if (await this.has(sha256, content.length)) return destination;
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, content, { flag: "wx", mode: 0o640 });
    try {
      await rename(temporary, destination);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      if (!await this.has(sha256, content.length)) throw error;
    }
    return destination;
  }
}

export class AssetDigestMismatchError extends Error {
  constructor(readonly expected: string, readonly actual: string) {
    super(`Asset digest mismatch: expected ${expected}, received ${actual}`);
  }
}

function assertHash(value: string) {
  if (!hashPattern.test(value)) throw new Error("Invalid SHA-256 digest");
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
