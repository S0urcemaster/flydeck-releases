import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MaintenanceApp, formatMaintenanceStatus } from "./MaintenanceApp";

describe("MaintenanceApp", () => {
  it("renders the reset action inside the shared inline app surface", () => {
    const markup = renderToStaticMarkup(
      <MaintenanceApp onResetClientToServer={async () => undefined} />,
    );

    expect(markup).toContain('data-component-name="MaintenanceApp"');
    expect(markup).toContain("Reset Client to Server");
  });

  it("describes a failed reset", () => {
    expect(formatMaintenanceStatus("failed", "Server offline"))
      .toBe("Failed : Server offline");
  });
});
