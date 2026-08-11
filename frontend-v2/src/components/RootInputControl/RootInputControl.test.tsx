import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveRootTarget, RootInputControl } from "./RootInputControl";

const current = { id: null, label: "", path: "", eligible: true } as const;
const targets = [
  current,
  { id: "archive", label: "Archive", path: "Projects/Archive", eligible: true },
  { id: "locked", label: "Locked", path: "Projects/Locked", eligible: false },
];

describe("RootInputControl", () => {
  it("shows the current root as valid without enabling an unchanged send", () => {
    const markup = renderToStaticMarkup(
      <RootInputControl
        background="transparent"
        border="0"
        current={current}
        targets={targets}
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Root node"');
    expect(markup).toContain('value=""');
    expect(markup).toContain('placeholder="Set parent path (empty for root)"');
    expect(markup).toContain("background:transparent;border:0");
    expect(markup).toContain("color:var(--color-success)");
    expect(markup).not.toContain('aria-label="Send root"');
  });

  it("shows the configured action button when updates are supported", () => {
    const markup = renderToStaticMarkup(
      <RootInputControl
        current={current}
        targets={targets}
        value="Projects/Archive"
        onChange={() => undefined}
        actionLabel="Set Parent"
        buttonProps={{ width: "91px" }}
        onAction={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Set Parent"');
    expect(markup).toContain(">Set Parent</button>");
    expect(markup).toContain("width:91px");
  });

  it("resolves only one exact and eligible changed root", () => {
    expect(resolveRootTarget(current, targets, "Projects/Archive")?.id).toBe("archive");
    expect(resolveRootTarget(current, targets, "Archive")).toBeNull();
    expect(resolveRootTarget(current, targets, "Projects/Locked")).toBeNull();
    expect(resolveRootTarget(current, [
      ...targets,
      { id: "second-archive", label: "Archive", path: "Projects/Archive", eligible: true },
    ], "Projects/Archive")).toBeNull();
  });

  it("uses an empty value to move a nested item to the top level", () => {
    expect(resolveRootTarget(
      { id: "archive", label: "Archive", path: "Projects/Archive", eligible: true },
      targets,
      "",
    )).toEqual(current);
  });
});
