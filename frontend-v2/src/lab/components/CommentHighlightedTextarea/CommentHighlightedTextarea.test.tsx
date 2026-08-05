import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommentHighlightedTextarea } from "./CommentHighlightedTextarea";

describe("CommentHighlightedTextarea", () => {
  it("marks comment lines in its passive background layer", () => {
    const markup = renderToStaticMarkup(
      <CommentHighlightedTextarea
        aria-label="Example"
        readOnly
        value={"# comment\nvalue = 1"}
      />,
    );

    expect(markup).toContain('data-comment="true"');
    expect(markup).toContain('data-comment="false"');
  });
});
