import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockingDialog } from "./BlockingDialog";

describe("BlockingDialog", () => {
  it("owns the modal accessibility boundary", () => {
    const markup = renderToStaticMarkup(
      <BlockingDialog open title="Synchronization">Please wait</BlockingDialog>,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Please wait");
  });

  it("renders nothing while closed", () => {
    expect(renderToStaticMarkup(
      <BlockingDialog open={false} title="Hidden" />,
    )).toBe("");
  });
});
