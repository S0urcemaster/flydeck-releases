import type {
  TreeLoadDto,
  TreeNodeContentDto,
  TreeNodeDto,
} from "@flydeck/shared/v2";

import type { CronStoredEvent } from "./CronDialer";

const oneHourMs = 60 * 60 * 1_000;

export type CronDataSource = {
  id: string;
  path: string;
};

export function resolveCronDataSourceNodes(
  tree: TreeLoadDto | null,
  sources: readonly CronDataSource[],
) {
  if (!tree) return [];
  const childrenByParent = groupChildren(tree.document.nodes);
  const resolved = new Map<string, { node: TreeNodeDto; source: CronDataSource }>();
  for (const source of sources) {
    const root = resolveDataPath(tree.document.nodes, source.path);
    if (!root) continue;
    for (const node of collectSubtree(root, childrenByParent)) {
      if (!resolved.has(node.id)) resolved.set(node.id, { node, source });
    }
  }
  return [...resolved.values()];
}

export function cronEventsFromDataSources(
  tree: TreeLoadDto | null,
  contents: Readonly<Record<string, TreeNodeContentDto>>,
  sources: readonly CronDataSource[],
): CronStoredEvent[] {
  return resolveCronDataSourceNodes(tree, sources).flatMap(({ node, source }) => {
    const content = contents[node.id]?.content ?? "";
    const storedEvent = parseStoredCronEventContent(content);
    const interval = storedEvent ?? parseCronDateInterval(
      `${node.label}\n${content}`,
      node.createdAt,
    );
    if (!interval) return [];
    return [{
      id: `datasource:${source.id}:${node.id}`,
      createdAt: node.createdAt ?? interval.start.toISOString(),
      startTime: interval.start.toISOString(),
      endTime: interval.end.toISOString(),
      title: node.label,
      subtitle: storedEvent?.subtitle ?? normalizeDataPath(source.path),
      text: storedEvent?.text ?? content,
      editable: Boolean(storedEvent),
      sourceContentRevision: contents[node.id]?.revision,
      sourceNodeId: node.id,
      sourceNodeRevision: node.revision,
    }];
  });
}

export function parseStoredCronEventContent(content: string) {
  const lines = content.split(/\r?\n/);
  if (!lines[0]?.startsWith("start:") || !lines[1]?.startsWith("end:")) {
    return null;
  }
  const start = new Date(lines[0].slice("start:".length).trim());
  const end = new Date(lines[1].slice("end:".length).trim());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    || end.getTime() <= start.getTime()) return null;
  let cursor = 2;
  const subtitle = lines[cursor]?.startsWith("subtitle:")
    ? lines[cursor++].slice("subtitle:".length).trimStart()
    : "";
  while (lines[cursor] === "") cursor += 1;
  return {
    start,
    end,
    subtitle,
    text: lines.slice(cursor).join("\n"),
  };
}

export function parseCronDateInterval(text: string, createdAt?: string) {
  const dated = parseDatedValues(text);
  if (dated.length > 0) {
    const start = dated[0];
    const second = dated[1];
    const trailingTime = second ? null : parseTrailingTime(text, start.endIndex);
    let end = second?.date ?? (trailingTime
      ? withLocalTime(start.date, trailingTime.hour, trailingTime.minute)
      : new Date(start.date.getTime() + oneHourMs));
    if (end.getTime() <= start.date.getTime() && trailingTime) {
      end = new Date(end.getTime() + 24 * oneHourMs);
    }
    if (end.getTime() <= start.date.getTime()) {
      end = new Date(start.date.getTime() + oneHourMs);
    }
    return { start: start.date, end };
  }

  const times = [...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)];
  const created = createdAt ? new Date(createdAt) : null;
  if (times.length === 0 || !created || Number.isNaN(created.getTime())) return null;
  const start = withLocalTime(created, Number(times[0][1]), Number(times[0][2]));
  let end = times[1]
    ? withLocalTime(created, Number(times[1][1]), Number(times[1][2]))
    : new Date(start.getTime() + oneHourMs);
  if (end.getTime() <= start.getTime() && times[1]) {
    end = new Date(end.getTime() + 24 * oneHourMs);
  }
  return { start, end };
}

export function normalizeDataPath(path: string) {
  const segments = path.trim().split("/").map((part) => part.trim()).filter(Boolean);
  if (segments[0]?.toLocaleLowerCase() === "data") segments.shift();
  return segments.join("/");
}

function resolveDataPath(nodes: readonly TreeNodeDto[], path: string) {
  const segments = normalizeDataPath(path).split("/").filter(Boolean);
  if (segments.length === 0) return undefined;
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of segments) {
    current = nodes.find((node) => node.parentId === parentId && (
      node.localId === segment || node.label === segment
    ));
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

function groupChildren(nodes: readonly TreeNodeDto[]) {
  const grouped = new Map<string, TreeNodeDto[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = grouped.get(node.parentId) ?? [];
    children.push(node);
    grouped.set(node.parentId, children);
  }
  return grouped;
}

function collectSubtree(
  root: TreeNodeDto,
  childrenByParent: ReadonlyMap<string, readonly TreeNodeDto[]>,
) {
  const nodes: TreeNodeDto[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.shift()!;
    nodes.push(node);
    pending.unshift(...(childrenByParent.get(node.id) ?? []));
  }
  return nodes;
}

function parseDatedValues(text: string) {
  const values: { date: Date; endIndex: number; index: number }[] = [];
  const patterns = [
    /\b(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?/g,
    /\b(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(?:um\s+)?(\d{1,2}):([0-5]\d))?/gi,
  ];
  for (const [patternIndex, pattern] of patterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const year = Number(patternIndex === 0 ? match[1] : match[3]);
      const month = Number(match[2]);
      const day = Number(patternIndex === 0 ? match[3] : match[1]);
      const hour = Number(match[4] ?? 0);
      const minute = Number(match[5] ?? 0);
      const hasZone = patternIndex === 0 && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(match[0]);
      const date = hasZone
        ? new Date(match[0])
        : new Date(year, month - 1, day, hour, minute);
      if (Number.isNaN(date.getTime()) || (!hasZone && (
        date.getFullYear() !== year || date.getMonth() !== month - 1
        || date.getDate() !== day || date.getHours() !== hour
        || date.getMinutes() !== minute
      ))) continue;
      values.push({
        date,
        index: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  return values.sort((left, right) => left.index - right.index);
}

function parseTrailingTime(text: string, afterIndex: number) {
  const match = text.slice(afterIndex).match(
    /(?:\s|,|;|–|-)*(?:bis\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i,
  );
  if (!match || (match.index ?? 0) > 16) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function withLocalTime(date: Date, hour: number, minute: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  );
}
