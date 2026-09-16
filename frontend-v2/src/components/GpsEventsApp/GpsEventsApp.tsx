import { useCallback, useEffect, useMemo, useState } from "react";
import { createTreeNodeLocalId, type TreeNodeDto } from "@flydeck/shared/v2";

import { Button, type ButtonProps } from "../Button";
import { DataTree, type DataTreeProps } from "../DataTree";
import { AppView, type AppViewProps } from "../AppView";
import { resolveFlatTreePath } from "../DataBrowser/DataBrowser";
import {
  workspaceReplica,
  workspaceSyncEngine,
  useWorkspaceReplica,
  type WorkspaceReplicaScope,
} from "../../replica";
import { useClientStateScope } from "../../state";
import styles from "./GpsEventsApp.module.css";

const locationsPath = "_system/user/locations";
const eventsPath = "_system/user/events";
const ranges = [null, 50, 200, 1_000, 10_000] as const;
const emptyNodes: readonly TreeNodeDto[] = [];
type RangeMeters = typeof ranges[number];

type Position = { latitude: number; longitude: number; accuracy: number };
type LocationContent = {
  gpsName: string;
  name?: string;
  latitude: number;
  longitude: number;
  notes?: string;
};
type LocatedNode = { node: TreeNodeDto; location: LocationContent; distance: number };

export type GpsEventsAppProps = Omit<AppViewProps, "accessMode" | "children" | "title"> & {
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  treeProps?: DataTreeProps;
  workspaceId?: string;
};

export function GpsEventsApp({ buttonProps, treeProps, workspaceId, ...viewProps }: GpsEventsAppProps) {
  const { userId } = useClientStateScope();
  const scope = useMemo<WorkspaceReplicaScope | null>(() => workspaceId
    ? { userId, workspaceId }
    : null, [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const nodes = record?.tree?.document.nodes ?? emptyNodes;
  const locationsRoot = resolveFlatTreePath(nodes, locationsPath);
  const eventsRoot = resolveFlatTreePath(nodes, eventsPath);
  const locationNodes = useMemo(() => locationsRoot
    ? nodes.filter(({ parentId }) => parentId === locationsRoot.id)
    : [], [locationsRoot, nodes]);
  const [position, setPosition] = useState<Position | null>(null);
  const [range, setRange] = useState<RangeMeters>(200);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!scope || locationNodes.length === 0) return;
    void workspaceSyncEngine.ensureContents(scope, locationNodes.map(({ id }) => id));
  }, [locationNodes, scope]);

  const locations = useMemo(() => {
    const next = new Map<string, LocationContent>();
    for (const node of locationNodes) {
      const parsed = parseLocation(record?.contents[node.id]?.content);
      if (parsed) next.set(node.id, parsed);
    }
    return next;
  }, [locationNodes, record?.contents]);

  const located = useMemo(() => locationNodes.flatMap((node): LocatedNode[] => {
    const location = locations.get(node.id);
    if (!location) return [];
    return [{
      node,
      location,
      distance: position ? distanceMeters(position, location) : Number.POSITIVE_INFINITY,
    }];
  }).sort((left, right) => left.distance - right.distance || left.node.position - right.node.position),
  [locationNodes, locations, position]);
  const visibleNodes = useMemo(() => {
    if (!position) return [...locationNodes].sort((left, right) => left.position - right.position);
    const locatedById = new Map(located.map((entry) => [entry.node.id, entry]));
    if (range !== null) {
      return located
        .filter(({ distance }) => distance <= range + position.accuracy)
        .map(({ node }) => node);
    }
    return [
      ...located.map(({ node }) => node),
      ...locationNodes
        .filter(({ id }) => !locatedById.has(id))
        .sort((left, right) => left.position - right.position),
    ];
  }, [located, locationNodes, position, range]);
  const rootChildIds = useMemo(() => visibleNodes.map(({ id }) => id), [visibleNodes]);
  const linkedRoots = useMemo(() => visibleNodes.flatMap((node) => {
    const source = nodes.find((candidate) => candidate.parentId === node.id
      && candidate.localId === "_datasources");
    if (!source) return [];
    return nodes.filter(({ parentId }) => parentId === source.id).flatMap((link) => {
      const target = resolveFlatTreePath(nodes, link.label.trim());
      return target ? [{ locationId: node.id, locationLabel: node.label, target }] : [];
    });
  }), [nodes, visibleNodes]);

  const updatePosition = useCallback(async () => {
    setBusy(true); setMessage("Locating…");
    try {
      const next = await currentPosition();
      setPosition(next);
      setMessage(`±${Math.round(next.accuracy)} m`);
      return next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Location could not be read");
      return null;
    } finally { setBusy(false); }
  }, []);

  const setLocation = useCallback(async () => {
    if (!scope || !locationsRoot || !eventsRoot) {
      setMessage(`Create ${locationsPath} and ${eventsPath} first.`);
      return;
    }
    setBusy(true);
    try {
      const current = await currentPosition();
      setPosition(current);
      const threshold = range ?? 200;
      let match = located
        .map((entry) => ({ ...entry, distance: distanceMeters(current, entry.location) }))
        .filter(({ distance }) => distance <= threshold + current.accuracy)[0];
      if (!match) {
        const gpsName = await reverseLookup(current);
        const node = await createNode(scope, locationsRoot.id, gpsName);
        await workspaceSyncEngine.submit(scope, {
          type: "update-content",
          nodeId: node.id,
          input: {
            requestId: crypto.randomUUID(),
            content: JSON.stringify({
              gpsName, latitude: current.latitude, longitude: current.longitude, notes: "",
            }, null, 2),
            expectedRevision: 0,
          },
        });
        match = { node, location: { gpsName, ...current }, distance: 0 };
      }
      await createEvent(scope, eventsRoot.id, match, current);
      setMessage(`Event: ${displayName(match.location)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Event could not be created");
    } finally { setBusy(false); }
  }, [eventsRoot, located, locationsRoot, range, scope]);

  return (
    <AppView {...viewProps} accessMode="read-write" componentName="GpsEventsApp">
      <div className={styles.controls}>
        <Button {...buttonProps} disabled={busy} onClick={() => void setLocation()}>Set Location</Button>
        <Button {...buttonProps} disabled={busy} onClick={() => void updatePosition()}>Update Position</Button>
        <Button {...buttonProps} onClick={() => setRange((current) => ranges[(ranges.indexOf(current) + 1) % ranges.length])}>
          {rangeLabel(range)}
        </Button>
      </div>
      {message ? <div className={styles.status} role="status">{message}</div> : null}
      {locationsRoot ? <DataTree {...treeProps} navigationSlot="gps-locations" rootChildIds={rootChildIds} rootNodeId={locationsRoot.id} workspaceId={workspaceId} /> : null}
      {linkedRoots.map(({ locationId, locationLabel, target }) => (
        <section key={`${locationId}-${target.id}`} className={styles.linked}>
          <div className={styles.caption}>{locationLabel} · {target.label}</div>
          <DataTree {...treeProps} navigationSlot={`gps-linked-${locationId}-${target.id}`} rootNodeId={target.id} workspaceId={workspaceId} />
        </section>
      ))}
      {eventsRoot ? <DataTree {...treeProps} navigationSlot="gps-events" rootNodeId={eventsRoot.id} workspaceId={workspaceId} /> : null}
    </AppView>
  );
}

export function parseLocation(content: string | undefined): LocationContent | null {
  if (!content) return null;
  try {
    const value = JSON.parse(content) as Partial<LocationContent>;
    if (typeof value.gpsName !== "string" || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null;
    return value as LocationContent;
  } catch { return null; }
}

function displayName(location: LocationContent) { return location.name?.trim() || location.gpsName; }
function rangeLabel(range: RangeMeters) { return range === null ? "OFF" : range >= 1_000 ? `${range / 1_000} km` : `${range} m`; }
function distanceMeters(left: Pick<Position, "latitude" | "longitude">, right: Pick<LocationContent, "latitude" | "longitude">) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(right.latitude - left.latitude);
  const dLon = radians(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function currentPosition() {
  if (!navigator.geolocation) return Promise.reject(new Error("Geolocation is unavailable"));
  return new Promise<Position>((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
    ({ message }) => reject(new Error(message)),
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
  ));
}

async function reverseLookup(position: Position) {
  const query = new URLSearchParams({ format: "jsonv2", addressdetails: "1", layer: "address,poi", zoom: "18", lat: String(position.latitude), lon: String(position.longitude) });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, { headers: { "accept-language": navigator.language || "de" } });
  if (!response.ok) throw new Error(`GPS lookup returned ${response.status}`);
  const result = await response.json() as { name?: string; display_name?: string };
  return result.name?.trim() || result.display_name?.split(",")[0]?.trim() || `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
}

async function createNode(scope: WorkspaceReplicaScope, parentId: string, label: string) {
  const snapshot = workspaceReplica.getSnapshot(scope);
  if (!snapshot?.tree) throw new Error("DATA tree is unavailable");
  const siblings = snapshot.tree.document.nodes.filter((node) => node.parentId === parentId);
  const id = crypto.randomUUID();
  await workspaceSyncEngine.submit(scope, { type: "create-node", input: {
    requestId: crypto.randomUUID(), nodeId: id, parentId, afterNodeId: siblings.at(-1)?.id ?? null,
    kind: "data-file", label, localId: createTreeNodeLocalId(label, siblings.map(({ localId }) => localId)),
    expectedTreeRevision: snapshot.tree.document.revision,
  }});
  return workspaceReplica.getSnapshot(scope)!.tree!.document.nodes.find((node) => node.id === id)!;
}

async function ensureChild(scope: WorkspaceReplicaScope, parentId: string, localId: string, label: string) {
  const existing = workspaceReplica.getSnapshot(scope)?.tree?.document.nodes.find((node) => node.parentId === parentId && node.localId === localId);
  return existing ?? createNode(scope, parentId, label);
}

async function createEvent(scope: WorkspaceReplicaScope, eventsRootId: string, match: LocatedNode, position: Position) {
  const now = new Date();
  const year = String(now.getFullYear() % 1_000).padStart(3, "0");
  const month = now.toLocaleDateString("en", { month: "long" });
  const day = `${now.getDate()} ${now.toLocaleDateString("en", { weekday: "long" })}`;
  const yearNode = await ensureChild(scope, eventsRootId, createTreeNodeLocalId(year), year);
  const monthNode = await ensureChild(scope, yearNode.id, createTreeNodeLocalId(month), month);
  const dayNode = await ensureChild(scope, monthNode.id, createTreeNodeLocalId(day), day);
  const label = displayName(match.location);
  const event = await createNode(scope, dayNode.id, label);
  await workspaceSyncEngine.submit(scope, { type: "update-content", nodeId: event.id, input: {
    requestId: crypto.randomUUID(), expectedRevision: 0,
    content: JSON.stringify({ name: label, location: match.node.id, date: now.toISOString(), description: "", linkedEvent: null, position }, null, 2),
  }});
}
