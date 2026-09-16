import { describe, expect, it } from "vitest";
import { defaultSportMetrics, parseSportMetrics, sportMetricsContent } from "./SportMetrics";

describe("sport metrics content", () => {
  it("round-trips complete centimeter dimensions", () => {
    expect(parseSportMetrics(sportMetricsContent(defaultSportMetrics))).toEqual(defaultSportMetrics);
  });

  it("rejects incomplete and invalid dimensions", () => {
    expect(parseSportMetrics("{}")).toBeNull();
    expect(parseSportMetrics(sportMetricsContent({ ...defaultSportMetrics, upperArm: 0 }))).toBeNull();
  });

  it("fills in neutral widths for previously saved metrics", () => {
    const oldValues = Object.fromEntries(Object.entries(defaultSportMetrics).filter(([key]) => key !== "shoulderWidth" && key !== "hipWidth"));
    const content = JSON.stringify({ schema: "flydeck.sport.metrics/v1", unit: "cm", values: oldValues });
    expect(parseSportMetrics(content)).toEqual(defaultSportMetrics);
  });
});
