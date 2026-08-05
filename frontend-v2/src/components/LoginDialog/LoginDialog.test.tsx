import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginDialog } from "./LoginDialog";

describe("LoginDialog", () => {
  it("blocks without offering a close action", () => {
    const markup = renderToStaticMarkup(
      <LoginDialog open onLogin={() => undefined} error="Not signed in" />,
    );
    expect(markup).toContain("Flydeck Login");
    expect(markup).toContain('type="password"');
    expect(markup).toContain("Not signed in");
    expect(markup).not.toContain("Close dialog");
  });
});
