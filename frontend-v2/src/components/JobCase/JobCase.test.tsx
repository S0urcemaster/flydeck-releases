import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TreeNodeDto } from "@flydeck/shared/v2";
import {
  JobCase,
  dataSourcePath,
  dataSourceSubtreeIds,
  resolveDataSource,
  serializeDataSources,
  formatTreeImportPreview,
  parseTreeImport,
} from "./JobCase";

describe("JobCase", () => {
  it("keeps details collapsed and exposes start plus the four job tabs", () => {
    const markup = renderToStaticMarkup(
      <JobCase
        localId="daily"
        localIdAvailable={() => true}
        name="Daily"
        nodeId="00000000-0000-4000-8000-000000000001"
        scope={{
          userId: "00000000-0000-4000-8000-000000000002",
          workspaceId: "00000000-0000-4000-8000-000000000003",
        }}
        tree={{
          document: {
            id: "00000000-0000-4000-8000-000000000004",
            workspaceId: "00000000-0000-4000-8000-000000000003",
            kind: "data",
            revision: 0,
            nodes: [],
          },
          semanticState: { revision: 0, enabledNodeIds: [], nodeRevisions: {} },
          selection: { revision: 0, selectedPath: [], pageSizes: {} },
        }}
        memoSelectionIds={["00000000-0000-4000-8000-000000000005"]}
        workspaceId="00000000-0000-4000-8000-000000000003"
        onNameChange={async () => true}
      />,
    );

    expect(markup).toContain(">Details</button>");
    expect(markup).not.toContain('aria-label="Job name"');
    expect(markup).toContain(">Start</button>");
    for (const tab of ["MEMO", "DATA", "PRMPT", "IMPRT"]) {
      expect(markup).toContain(`>${tab}</button>`);
    }
    expect(markup).not.toContain(">FUNC</button>");
    expect(markup).toContain(">Set Memory</button>");
    expect(markup).toMatch(/<button(?![^>]*disabled)[^>]*>Set Memory<\/button>/);
    expect(markup).toContain('aria-label="Job memory"');
    expect(markup).toContain('height:26rem');
    expect(markup).not.toContain('data-component-name="MemoryBrowser"');
    expect(markup.indexOf('role="tabpanel"')).toBeLessThan(
      markup.indexOf(">Start</button>"),
    );
    expect(markup).not.toContain('aria-label="Tree browser menu"');
  });
});

describe("tree import", () => {
  it("parses nested items and assigns following plain lines as content", () => {
    const parsed = parseTreeImport([
      "|- Parent",
      "Parent content",
      "|-|- Child",
      "First line",
      "Second line",
      "|- Sibling",
    ].join("\n"));
    expect(parsed).toEqual([
      { depth: 1, label: "Parent", content: "Parent content" },
      { depth: 2, label: "Child", content: "First line\nSecond line" },
      { depth: 1, label: "Sibling", content: "" },
    ]);
    expect(formatTreeImportPreview(parsed)).toBe([
      "Parent",
      "  Parent content",
      "  Child",
      "    First line",
      "    Second line",
      "Sibling",
    ].join("\n"));
  });

  it("rejects orphan content and skipped levels", () => {
    expect(() => parseTreeImport("orphan\n|- Item")).toThrow(/tree item first/);
    expect(() => parseTreeImport("|- Parent\n|-|-|- Child")).toThrow(/cannot skip/);
  });
});

describe("resolveDataSource", () => {
  const nodes = [
    { id: "root", parentId: null, localId: "datasources", label: "Datasources", kind: "data-file" },
    { id: "group", parentId: "root", localId: "localnews", label: "Local News", kind: "data-file" },
    { id: "source", parentId: "group", localId: "sudwestpress", label: "Südwestpresse", kind: "data-file" },
    { id: "system", parentId: null, localId: "_system", label: "_system", kind: "system-directory" },
    { id: "system-source", parentId: "system", localId: "internal", label: "Internal", kind: "data-file" },
  ] as TreeNodeDto[];

  it("finds a nested DATA source by its globally unique local ID", () => {
    expect(resolveDataSource(nodes, "sudwestpress")?.id).toBe("source");
  });

  it("also accepts the visible label and a path", () => {
    expect(resolveDataSource(nodes, "Südwestpresse")?.id).toBe("source");
    expect(resolveDataSource(nodes, "datasources/localnews/sudwestpress")?.id).toBe("source");
  });

  it("allows DATA sources below editable system directories", () => {
    expect(resolveDataSource(nodes, "internal")?.id).toBe("system-source");
  });

  it("uses the DATA local-ID path as the visible reference label", () => {
    expect(dataSourcePath(nodes, "source")).toBe(
      "datasources/localnews/sudwestpress",
    );
  });

  it("serializes selected datasource trees with visible indentation", () => {
    expect(dataSourceSubtreeIds(nodes, ["group"])).toEqual(["group", "source"]);
    expect(serializeDataSources(nodes, {
      group: { content: "Regional sources" },
      source: { content: "Headline\nBody" },
    }, ["group"])).toBe([
      "|- Local News",
      "|-|- Regional sources",
      "|-|- Südwestpresse",
      "|-|-|- Headline",
      "|-|-|- Body",
    ].join("\n"));
  });
});
