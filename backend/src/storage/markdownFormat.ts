import { HttpError } from "../errors.js";

export const dataMarker = "--data--";

export type ParsedMarkdownData = {
  preamble: string[];
  title: string;
  metadata: Record<string, string>;
  entries: string[];
};

export function parseMarkdownData(content: string): ParsedMarkdownData {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const markerIndexes = lines.flatMap((line, index) => line.trim() === dataMarker ? [index] : []);
  const markerIndex = markerIndexes[0] ?? -1;
  if (markerIndex < 0) throw new HttpError(422, "INVALID_DATA_FILE", `Marker ${dataMarker} is missing`);
  if (markerIndexes.length > 1) throw new HttpError(422, "INVALID_DATA_FILE", `Marker ${dataMarker} occurs more than once`);

  const preamble = lines.slice(0, markerIndex);
  const title = preamble.find((line) => line.startsWith("# "))?.slice(2).trim() ?? "";
  if (!title) throw new HttpError(422, "INVALID_DATA_FILE", "Markdown title is missing");
  const metadata = Object.fromEntries(
    preamble.flatMap((line) => {
      const match = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/.exec(line);
      return match ? [[match[1], match[2]]] : [];
    }),
  );
  const entries = lines.slice(markerIndex + 1);
  while (entries.at(-1) === "") entries.pop();
  return { preamble, title, metadata, entries };
}

export function serializeMarkdownData(data: Pick<ParsedMarkdownData, "preamble" | "entries">) {
  return `${[...data.preamble, dataMarker, ...data.entries].join("\n")}\n`;
}

export function createMarkdownData(title: string, now = new Date()) {
  const timestamp = now.toISOString();
  return serializeMarkdownData({
    preamble: [`# ${title}`, "", `created: ${timestamp}`, `updated: ${timestamp}`, ""],
    entries: [],
  });
}

export function touchUpdatedMetadata(preamble: string[], now = new Date()) {
  const updatedLine = `updated: ${now.toISOString()}`;
  const index = preamble.findIndex((line) => line.startsWith("updated:"));
  if (index >= 0) return preamble.map((line, lineIndex) => lineIndex === index ? updatedLine : line);
  return [...preamble, updatedLine];
}
