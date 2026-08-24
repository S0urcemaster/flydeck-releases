import type { TreeLoadDto, TreeNodeContentDto } from "@flydeck/shared/v2";
import { describe, expect, it } from "vitest";

import {
  cronEventsFromDataSources,
  normalizeDataPath,
  parseCronDateInterval,
  parseStoredCronEventContent,
  resolveCronDataSourceNodes,
} from "./CronDataSources";

describe("CronDataSources", () => {
  it("normalizes DATA paths without introducing ambiguous slash spaces", () => {
    expect(normalizeDataPath(" / DATA / journal / 2026 ")).toBe("journal/2026");
  });

  it("parses a German time range and defaults a single timestamp to one hour", () => {
    const range = parseCronDateInterval("23.08.2026 09:15 bis 11:30");
    expect(range?.start).toEqual(new Date(2026, 7, 23, 9, 15));
    expect(range?.end).toEqual(new Date(2026, 7, 23, 11, 30));

    const single = parseCronDateInterval("23.08.2026 09:15");
    expect(single?.end.getTime()).toBe(single!.start.getTime() + 3_600_000);
  });

  it("uses the node creation day for bare clock times", () => {
    const range = parseCronDateInterval(
      "Arbeit 22:30–00:15",
      "2026-08-23T08:00:00.000Z",
    );
    expect(range?.start.getHours()).toBe(22);
    expect(range?.end.getDate()).toBe(range!.start.getDate() + 1);
  });

  it("recognizes the editable Flydeck event document without losing its text", () => {
    expect(parseStoredCronEventContent([
      "start: 2026-08-23T08:00:00.000Z",
      "end: 2026-08-23T09:30:00.000Z",
      "subtitle: Journal",
      "",
      "First line",
      "Second line",
    ].join("\n"))).toMatchObject({
      start: new Date("2026-08-23T08:00:00.000Z"),
      end: new Date("2026-08-23T09:30:00.000Z"),
      subtitle: "Journal",
      text: "First line\nSecond line",
    });
    expect(parseStoredCronEventContent("Meeting at 10:00")).toBeNull();
  });

  it("includes the complete child subtree and creates timeline events", () => {
    const tree = fixtureTree();
    const source = [{ id: "source-1", path: "journal" }];
    const resolved = resolveCronDataSourceNodes(tree, source);
    expect(resolved.map(({ node }) => node.localId)).toEqual(["journal", "entry"]);

    const contents: Record<string, TreeNodeContentDto> = {
      "00000000-0000-4000-8000-000000000012": {
        nodeId: "00000000-0000-4000-8000-000000000012",
        revision: 1,
        format: "text",
        content: "23.08.2026 10:00",
        updatedAt: "2026-08-23T08:00:00.000Z",
      },
    };
    const events = cronEventsFromDataSources(tree, contents, source);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Entry",
      subtitle: "journal",
    });
    expect(new Date(events[0].endTime).getTime()
      - new Date(events[0].startTime).getTime()).toBe(3_600_000);
  });

  it("marks structured DATA events as editable and retains source revisions", () => {
    const tree = fixtureTree();
    const nodeId = "00000000-0000-4000-8000-000000000012";
    const events = cronEventsFromDataSources(tree, {
      [nodeId]: {
        nodeId,
        revision: 7,
        format: "text",
        content: [
          "start: 2026-08-23T08:00:00.000Z",
          "end: 2026-08-23T10:00:00.000Z",
          "subtitle: Work",
          "",
          "Notes",
        ].join("\n"),
      },
    }, [{ id: "source-1", path: "journal" }]);

    expect(events[0]).toMatchObject({
      editable: true,
      sourceContentRevision: 7,
      sourceNodeId: nodeId,
      sourceNodeRevision: 1,
      subtitle: "Work",
      text: "Notes",
    });
  });
});

function fixtureTree(): TreeLoadDto {
  const capabilities = {
    contentEditable: true,
    listEditable: true,
    listItemLimit: null,
  };
  return {
    document: {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "00000000-0000-4000-8000-000000000002",
      kind: "data",
      revision: 1,
      nodes: [{
        id: "00000000-0000-4000-8000-000000000011",
        parentId: null,
        kind: "data",
        label: "Journal",
        localId: "journal",
        position: 0,
        revision: 1,
        createdAt: "2026-08-22T08:00:00.000Z",
        updatedAt: "2026-08-22T08:00:00.000Z",
        capabilities,
      }, {
        id: "00000000-0000-4000-8000-000000000012",
        parentId: "00000000-0000-4000-8000-000000000011",
        kind: "data",
        label: "Entry",
        localId: "entry",
        position: 0,
        revision: 1,
        createdAt: "2026-08-23T08:00:00.000Z",
        updatedAt: "2026-08-23T08:00:00.000Z",
        capabilities,
      }],
    },
    semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: {} },
    selection: { revision: 0, selectedPath: [], pageSizes: {} },
  };
}
