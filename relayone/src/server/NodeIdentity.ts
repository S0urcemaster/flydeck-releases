import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type PublicNodeIdentity = {
  algorithm: "Ed25519";
  publicKey: string;
  fingerprint: string;
};

export type NodeIdentity = PublicNodeIdentity & {
  sign(payload: string): string;
};

type StoredNodeIdentity = {
  schemaVersion: 1;
  nodeId: string;
  privateKeyPem: string;
};

export async function loadOrCreateNodeIdentity(
  directory: string,
  nodeId: string,
): Promise<NodeIdentity> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const identityPath = path.join(directory, "identity.json");
  let stored: StoredNodeIdentity;
  try {
    stored = parseStoredIdentity(await readFile(identityPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    stored = createStoredIdentity(nodeId);
    const temporaryPath = path.join(directory, `.identity-${process.pid}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify(stored)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporaryPath, identityPath);
  }
  if (stored.nodeId !== nodeId) {
    throw new Error(
      `Relay identity belongs to ${stored.nodeId}, not configured node ${nodeId}`,
    );
  }
  const visible = publicIdentity(stored.privateKeyPem);
  return {
    ...visible,
    sign: (payload) => cryptoSign(
      null,
      Buffer.from(payload),
      createPrivateKey(stored.privateKeyPem),
    ).toString("base64url"),
  };
}

function createStoredIdentity(nodeId: string): StoredNodeIdentity {
  const { privateKey } = generateKeyPairSync("ed25519");
  return {
    schemaVersion: 1,
    nodeId,
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

function parseStoredIdentity(value: string): StoredNodeIdentity {
  const parsed = JSON.parse(value) as Partial<StoredNodeIdentity>;
  if (parsed.schemaVersion !== 1
    || typeof parsed.nodeId !== "string"
    || typeof parsed.privateKeyPem !== "string") {
    throw new Error("Relay node identity is invalid");
  }
  createPrivateKey(parsed.privateKeyPem);
  return parsed as StoredNodeIdentity;
}

function publicIdentity(privateKeyPem: string): PublicNodeIdentity {
  const publicDer = createPublicKey(createPrivateKey(privateKeyPem)).export({
    type: "spki",
    format: "der",
  });
  return {
    algorithm: "Ed25519",
    publicKey: publicDer.toString("base64url"),
    fingerprint: createHash("sha256").update(publicDer).digest("base64url"),
  };
}
