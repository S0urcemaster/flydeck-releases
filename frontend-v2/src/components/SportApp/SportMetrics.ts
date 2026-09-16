export type SportMetricValues = {
  bodyHeight: number;
  shoulderWidth: number;
  hipWidth: number;
  upperLeg: number;
  lowerLeg: number;
  upperArm: number;
  lowerArm: number;
  hipShoulder: number;
};

export type SportMetrics = { schema: "flydeck.sport.metrics/v1"; unit: "cm"; values: SportMetricValues };

export const defaultSportMetrics: SportMetricValues = {
  bodyHeight: 180,
  shoulderWidth: 44,
  hipWidth: 32,
  upperLeg: 44,
  lowerLeg: 42,
  upperArm: 30,
  lowerArm: 27,
  hipShoulder: 55,
};

export function parseSportMetrics(content: string | undefined): SportMetricValues | null {
  if (!content) return null;
  try {
    const value: unknown = JSON.parse(content);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const metrics = value as Partial<SportMetrics>;
    if (metrics.schema !== "flydeck.sport.metrics/v1" || metrics.unit !== "cm" || !metrics.values || typeof metrics.values !== "object") return null;
    if (!Object.keys(defaultSportMetrics).every((key) => {
      const dimension = metrics.values?.[key as keyof SportMetricValues];
      return ((key === "shoulderWidth" || key === "hipWidth") && dimension === undefined) || (Number.isFinite(dimension) && (dimension ?? 0) > 0);
    })) return null;
    return { ...defaultSportMetrics, ...metrics.values };
  } catch { return null; }
}

export function sportMetricsContent(values: SportMetricValues): string {
  return JSON.stringify({ schema: "flydeck.sport.metrics/v1", unit: "cm", values } satisfies SportMetrics, null, 2);
}
