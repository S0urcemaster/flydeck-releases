import { createHash, createPublicKey, randomUUID, verify } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RelayNodeDescriptor } from "../../shared/contracts.js";
import type { RelayConfig } from "../config.js";
import type { RelayDatabase } from "../database.js";
import type { NodeIdentity } from "../NodeIdentity.js";
import { exchangePayload, type ExchangeAcceptance, type ExchangeRequest } from "./contracts.js";
import type { RelayReader } from "../RelayStore.js";
import type { RelayNodePage, RelaySite } from "../../shared/contracts.js";

type PeerSnapshot = { revision: string; site: RelaySite; pages: RelayNodePage[] };

export class FederationService {
  constructor(
    private readonly database: RelayDatabase,
    private readonly config: RelayConfig,
    private readonly identity: NodeIdentity,
    private readonly relay: RelayReader,
  ) {}

  async send(originValue: string) {
    const origin = normalizedOrigin(originValue);
    if (origin === this.config.publicOrigin) throw new Error("A relay cannot connect to itself");
    const response = await fetch(`${origin}/api/node`);
    if (!response.ok) throw new Error(`Peer descriptor returned ${response.status}`);
    const descriptor = await response.json() as RelayNodeDescriptor;
    if (!descriptor.identity || !descriptor.origin || !descriptor.capabilities.federation) {
      throw new Error("Peer does not advertise federation");
    }
    if (normalizedOrigin(descriptor.origin) !== origin) throw new Error("Peer origin mismatch");
    const unsigned = {
      protocolVersion: 1 as const,
      id: randomUUID(),
      sentAt: new Date().toISOString(),
      node: {
        nodeId: this.config.nodeId,
        origin: requiredOrigin(this.config),
        title: this.config.title,
        publicKey: this.identity.publicKey,
        fingerprint: this.identity.fingerprint,
      },
    };
    const request: ExchangeRequest = { ...unsigned, signature: this.identity.sign(exchangePayload(unsigned)) };
    await this.database.query(`INSERT INTO relay_exchange_requests
      (id,peer_node_id,peer_origin,peer_title,peer_public_key,peer_fingerprint)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (peer_fingerprint) DO UPDATE SET
      id=EXCLUDED.id,status='pending',received_at=now(),decided_at=NULL`,
    [request.id, descriptor.nodeId, origin, descriptor.title, descriptor.identity.publicKey,
      descriptor.identity.fingerprint]);
    const delivered = await fetch(`${origin}/federation/v1/exchange-requests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!delivered.ok) throw new Error(`Peer exchange endpoint returned ${delivered.status}`);
    return request;
  }

  async receive(request: ExchangeRequest) {
    validateExchangeRequest(request);
    const { signature, ...unsigned } = request;
    const publicDer = Buffer.from(request.node.publicKey, "base64url");
    const fingerprint = createHash("sha256").update(publicDer).digest("base64url");
    if (fingerprint !== request.node.fingerprint) throw new Error("Peer fingerprint mismatch");
    const publicKey = createPublicKey({ key: publicDer, type: "spki", format: "der" });
    if (!verify(null, Buffer.from(exchangePayload(unsigned)), publicKey, Buffer.from(signature, "base64url"))) {
      throw new Error("Exchange request signature is invalid");
    }
    await this.database.query(`
      INSERT INTO relay_exchange_requests (
        id, peer_node_id, peer_origin, peer_title, peer_public_key, peer_fingerprint
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (peer_fingerprint) DO UPDATE SET
        id = EXCLUDED.id, peer_node_id = EXCLUDED.peer_node_id,
        peer_origin = EXCLUDED.peer_origin, peer_title = EXCLUDED.peer_title,
        peer_public_key = EXCLUDED.peer_public_key, status = 'pending',
        received_at = now(), decided_at = NULL
    `, [request.id, request.node.nodeId, normalizedOrigin(request.node.origin), request.node.title,
      request.node.publicKey, request.node.fingerprint]);
  }

  async inbox() {
    return (await this.database.query(`
      SELECT id, peer_node_id AS "peerNodeId", peer_origin AS "peerOrigin",
        peer_title AS "peerTitle", peer_fingerprint AS "peerFingerprint",
        status, received_at AS "receivedAt", decided_at AS "decidedAt"
      FROM relay_exchange_requests ORDER BY received_at DESC
    `)).rows;
  }

  async decide(id: string, accepted: boolean) {
    const decision = await this.database.transaction(async (client) => {
      const result = await client.query<{
        peer_node_id: string; peer_origin: string; peer_title: string;
        peer_public_key: string; peer_fingerprint: string;
      }>(`UPDATE relay_exchange_requests SET status=$2, decided_at=now()
          WHERE id=$1 AND status='pending' RETURNING *`, [id, accepted ? "accepted" : "rejected"]);
      const peer = result.rows[0];
      if (!peer) throw new Error("Pending exchange request was not found");
      if (accepted) await client.query(`
        INSERT INTO relay_connections
          (id, peer_node_id, peer_origin, peer_title, peer_public_key, peer_fingerprint)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        ON CONFLICT (peer_fingerprint) DO UPDATE SET state='active',
          peer_origin=EXCLUDED.peer_origin, peer_title=EXCLUDED.peer_title,
          peer_public_key=EXCLUDED.peer_public_key
      `, [peer.peer_node_id, peer.peer_origin, peer.peer_title,
        peer.peer_public_key, peer.peer_fingerprint]);
      return { accepted, fingerprint: peer.peer_fingerprint };
    });
    if (accepted) {
      await this.syncByFingerprint(decision.fingerprint);
      const unsigned = {
        protocolVersion: 1 as const, requestId: id, sentAt: new Date().toISOString(),
        node: { nodeId: this.config.nodeId, origin: requiredOrigin(this.config), title: this.config.title,
          publicKey: this.identity.publicKey, fingerprint: this.identity.fingerprint },
      };
      const acceptance: ExchangeAcceptance = {
        ...unsigned, signature: this.identity.sign(exchangePayload(unsigned)),
      };
      const peer = (await this.database.query<{ peer_origin: string }>(
        "SELECT peer_origin FROM relay_exchange_requests WHERE id=$1", [id],
      )).rows[0];
      const response = await fetch(`${peer.peer_origin}/federation/v1/exchange-acceptances`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(acceptance),
      });
      if (!response.ok) throw new Error(`Peer acceptance endpoint returned ${response.status}`);
    }
    return { accepted };
  }

  async receiveAcceptance(value: ExchangeAcceptance) {
    const stored = (await this.database.query<{ peer_public_key: string; peer_fingerprint: string }>(
      "SELECT peer_public_key,peer_fingerprint FROM relay_exchange_requests WHERE id=$1 AND status='pending'",
      [value.requestId],
    )).rows[0];
    if (!stored || stored.peer_fingerprint !== value.node.fingerprint
      || stored.peer_public_key !== value.node.publicKey) throw new Error("Unknown exchange acceptance");
    const { signature, ...unsigned } = value;
    const publicKey = createPublicKey({ key: Buffer.from(value.node.publicKey, "base64url"), type: "spki", format: "der" });
    if (!verify(null, Buffer.from(exchangePayload(unsigned)), publicKey, Buffer.from(signature, "base64url"))) {
      throw new Error("Exchange acceptance signature is invalid");
    }
    await this.database.query("UPDATE relay_exchange_requests SET status='accepted',decided_at=now() WHERE id=$1", [value.requestId]);
    await this.database.query(`INSERT INTO relay_connections
      (id,peer_node_id,peer_origin,peer_title,peer_public_key,peer_fingerprint)
      VALUES (gen_random_uuid(),$1,$2,$3,$4,$5) ON CONFLICT(peer_fingerprint) DO UPDATE SET
      state='active',peer_origin=EXCLUDED.peer_origin,peer_title=EXCLUDED.peer_title`,
    [value.node.nodeId, normalizedOrigin(value.node.origin), value.node.title,
      value.node.publicKey, value.node.fingerprint]);
    await this.syncByFingerprint(value.node.fingerprint);
  }

  async removeRequest(id: string) {
    await this.database.query("DELETE FROM relay_exchange_requests WHERE id=$1", [id]);
  }

  async connections() {
    return (await this.database.query(`SELECT id, peer_node_id AS "peerNodeId",
      peer_origin AS "peerOrigin", peer_title AS "peerTitle", state,
      connected_at AS "connectedAt", last_sync_at AS "lastSyncAt",
      last_sync_error AS "lastSyncError" FROM relay_connections
      WHERE state='active' ORDER BY peer_title`)).rows;
  }

  async disconnect(id: string) {
    await this.database.query("UPDATE relay_connections SET state='disconnected' WHERE id=$1", [id]);
  }

  async exportSnapshot(): Promise<PeerSnapshot> {
    const site = await this.relay.loadSite();
    if (!site) throw new Error("Relay publication is unavailable");
    const pages: RelayNodePage[] = [];
    const queue = [...site.roots.map(({ id }) => id)];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const page = await this.relay.loadNode(id);
      if (!page) continue;
      pages.push(page);
      queue.push(...page.post.children.map(({ id: childId }) => childId));
    }
    const revision = createHash("sha256").update(JSON.stringify({ site, pages })).digest("hex");
    return { revision, site, pages };
  }

  async publicPeers() {
    return (await this.database.query(`SELECT id, peer_node_id AS "nodeId",
      peer_title AS title FROM relay_connections WHERE state='active'
      AND last_sync_at IS NOT NULL ORDER BY peer_title`)).rows;
  }

  async peerSnapshot(connectionId: string) {
    return (await this.database.query<{ site: RelaySite; nodes: RelayNodePage[] }>(
      "SELECT site, nodes FROM relay_peer_snapshots WHERE connection_id=$1", [connectionId],
    )).rows[0] ?? null;
  }

  async syncIndex(connectionId: string) {
    const connection = (await this.database.query<{ peer_origin: string }>(
      "SELECT peer_origin FROM relay_connections WHERE id=$1 AND state='active'", [connectionId],
    )).rows[0];
    if (!connection) throw new Error("Relay connection was not found");
    const response = await fetch(`${connection.peer_origin}/api/site`);
    if (!response.ok) throw new Error(`Peer site returned ${response.status}`);
    const site = await response.json() as RelaySite;
    const revision = createHash("sha256").update(JSON.stringify(site)).digest("hex");
    await this.database.query(`INSERT INTO relay_peer_snapshots
      (connection_id, source_revision, site, nodes) VALUES ($1,$2,$3,'[]'::jsonb)
      ON CONFLICT (connection_id) DO UPDATE SET source_revision=EXCLUDED.source_revision,
      site=EXCLUDED.site, activated_at=now()`, [connectionId, revision, site]);
    await this.database.query("UPDATE relay_connections SET last_sync_at=now(), last_sync_error=NULL WHERE id=$1", [connectionId]);
  }

  async loadPeerPath(connectionId: string, parts: readonly string[]) {
    const snapshot = await this.peerSnapshot(connectionId);
    const cached = findPageByPath(snapshot, parts);
    if (cached) return cached;
    const connection = (await this.database.query<{ peer_origin: string }>(
      "SELECT peer_origin FROM relay_connections WHERE id=$1 AND state='active'", [connectionId],
    )).rows[0];
    if (!connection) return null;
    const response = await fetch(`${connection.peer_origin}/api/path?value=${encodeURIComponent(parts.join("/"))}`);
    if (!response.ok) return null;
    const page = await response.json() as RelayNodePage;
    const rewritten = await this.cachePageAssets(connectionId, connection.peer_origin, page);
    const pages = [...(snapshot?.nodes ?? []).filter(({ post }) => post.id !== rewritten.post.id), rewritten];
    await this.database.query("UPDATE relay_peer_snapshots SET nodes=$2,activated_at=now() WHERE connection_id=$1",
      [connectionId, JSON.stringify(pages)]);
    return rewritten;
  }

  async mirror(connectionId: string) {
    const connection = (await this.database.query<{ peer_origin: string }>(
      "SELECT peer_origin FROM relay_connections WHERE id=$1 AND state='active'", [connectionId],
    )).rows[0];
    if (!connection) throw new Error("Relay connection was not found");
    const response = await fetch(`${connection.peer_origin}/federation/v1/snapshot`);
    if (!response.ok) throw new Error(`Peer snapshot returned ${response.status}`);
    const snapshot = await response.json() as PeerSnapshot;
    const imageUrls = new Set<string>();
    for (const root of snapshot.site.roots) if (root.imageUrl) imageUrls.add(root.imageUrl);
    for (const page of snapshot.pages) {
      if (page.post.imageUrl) imageUrls.add(page.post.imageUrl);
      for (const child of page.post.children) if (child.imageUrl) imageUrls.add(child.imageUrl);
    }
    const replacements = new Map<string, string>();
    const directory = path.join(this.config.assetDirectory, "peers", connectionId);
    await mkdir(directory, { recursive: true });
    for (const url of imageUrls) {
      const assetResponse = await fetch(new URL(url, connection.peer_origin));
      if (!assetResponse.ok) throw new Error(`Peer asset returned ${assetResponse.status}`);
      const bytes = Buffer.from(await assetResponse.arrayBuffer());
      if (bytes.length > this.config.maxAssetBytes) throw new Error("Peer asset is too large");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const storedPath = path.join(directory, sha256);
      await writeFile(storedPath, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      await this.database.query(`INSERT INTO relay_peer_assets
        (connection_id, sha256, mime_type, byte_size, stored_path)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [connectionId, sha256,
        assetResponse.headers.get("content-type") ?? "application/octet-stream", bytes.length, storedPath]);
      replacements.set(url, `/api/peers/${connectionId}/assets/${sha256}`);
    }
    const rewritten = JSON.parse(JSON.stringify(snapshot, (_key, value) =>
      typeof value === "string" && replacements.has(value) ? replacements.get(value) : value,
    )) as PeerSnapshot;
    await this.database.query(`INSERT INTO relay_peer_snapshots
      (connection_id, source_revision, site, nodes) VALUES ($1,$2,$3,$4)
      ON CONFLICT (connection_id) DO UPDATE SET source_revision=EXCLUDED.source_revision,
      site=EXCLUDED.site, nodes=EXCLUDED.nodes, activated_at=now()`,
    [connectionId, rewritten.revision, rewritten.site, JSON.stringify(rewritten.pages)]);
    await this.database.query("UPDATE relay_connections SET last_sync_at=now(), last_sync_error=NULL WHERE id=$1", [connectionId]);
  }

  private async cachePageAssets(connectionId: string, peerOrigin: string, page: RelayNodePage) {
    const imageUrls = new Set<string>();
    if (page.post.imageUrl) imageUrls.add(page.post.imageUrl);
    for (const child of page.post.children) if (child.imageUrl) imageUrls.add(child.imageUrl);
    const replacements = new Map<string, string>();
    const directory = path.join(this.config.assetDirectory, "peers", connectionId);
    await mkdir(directory, { recursive: true });
    for (const url of imageUrls) {
      const response = await fetch(new URL(url, peerOrigin));
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > this.config.maxAssetBytes) continue;
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const storedPath = path.join(directory, sha256);
      await writeFile(storedPath, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      await this.database.query(`INSERT INTO relay_peer_assets
        (connection_id,sha256,mime_type,byte_size,stored_path) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING`, [connectionId, sha256,
        response.headers.get("content-type") ?? "application/octet-stream", bytes.length, storedPath]);
      replacements.set(url, `/api/peers/${connectionId}/assets/${sha256}`);
    }
    return JSON.parse(JSON.stringify(page, (_key, value) =>
      typeof value === "string" && replacements.has(value) ? replacements.get(value) : value,
    )) as RelayNodePage;
  }

  async peerAsset(connectionId: string, sha256: string) {
    return (await this.database.query<{ stored_path: string; mime_type: string; byte_size: number }>(
      "SELECT stored_path,mime_type,byte_size FROM relay_peer_assets WHERE connection_id=$1 AND sha256=$2",
      [connectionId, sha256],
    )).rows[0] ?? null;
  }

  async syncAll() {
    const connections = await this.connections() as Array<{ id: string }>;
    for (const connection of connections) {
      try {
        await this.syncIndex(connection.id);
      } catch (error) {
        await this.database.query(
          "UPDATE relay_connections SET last_sync_error=$2 WHERE id=$1",
          [connection.id, error instanceof Error ? error.message : String(error)],
        );
      }
    }
  }

  private async syncByFingerprint(fingerprint: string) {
    const row = (await this.database.query<{ id: string }>(
      "SELECT id FROM relay_connections WHERE peer_fingerprint=$1", [fingerprint],
    )).rows[0];
    if (row) await this.syncIndex(row.id);
  }
}

function findPageByPath(
  snapshot: { site: RelaySite; nodes: RelayNodePage[] } | null,
  parts: readonly string[],
) {
  if (!snapshot) return null;
  let candidates = snapshot.site.roots;
  let page: RelayNodePage | undefined;
  for (const part of parts) {
    const node = candidates.find(({ localId }) => localId === part);
    if (!node) return null;
    page = snapshot.nodes.find(({ post }) => post.id === node.id);
    if (!page) return null;
    candidates = page.post.children;
  }
  return page ?? null;
}

function requiredOrigin(config: RelayConfig) {
  if (!config.publicOrigin) throw new Error("RELAY_PUBLIC_ORIGIN is required for federation");
  return config.publicOrigin;
}

function normalizedOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("Peer origin must use HTTPS");
  return url.origin;
}

function validateExchangeRequest(value: ExchangeRequest) {
  if (value.protocolVersion !== 1 || !value.id || !value.signature || !value.node?.origin) {
    throw new Error("Invalid exchange request");
  }
  const age = Math.abs(Date.now() - Date.parse(value.sentAt));
  if (!Number.isFinite(age) || age > 10 * 60_000) throw new Error("Exchange request has expired");
}
