import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BackupApp, formatBackupStatus } from "./BackupApp";

describe("BackupApp", () => {
  it("renders its server action and status line", () => {
    const markup = renderToStaticMarkup(<BackupApp workspaceId="workspace" />);

    expect(markup).toContain('data-component-name="BackupApp"');
    expect(markup).toContain('aria-label="Create PostgreSQL backup"');
    expect(markup).toContain(">BACKUP</button>");
    expect(markup).toContain("Ready : no backup yet");
  });

  it("formats a completed backup compactly", () => {
    expect(formatBackupStatus({
      state: "succeeded",
      startedAt: "2026-08-15T10:00:00.000Z",
      completedAt: "2026-08-15T10:00:02.000Z",
      fileName: "flydeck.dump",
      sizeBytes: 1_572_864,
      sha256: null,
      message: "Backup saved",
    })).toBe("Saved : 2026-08-15 12:00:02 CEST : 1.5 MB");
  });
});
