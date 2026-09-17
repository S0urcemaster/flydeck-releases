import { z } from "zod";

export const schedulePlanSchema = z.object({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  stops: z.array(z.iso.datetime()).max(64),
  repetitions: z.number().int().min(0).max(10_000),
  timeZone: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
}).superRefine((plan, context) => {
  const start = Date.parse(plan.startAt);
  const end = Date.parse(plan.endAt);
  if (end <= start) {
    context.addIssue({ code: "custom", path: ["endAt"], message: "End must be after start" });
  }
  let previous = start;
  for (let index = 0; index < plan.stops.length; index += 1) {
    const stop = Date.parse(plan.stops[index]);
    if (stop <= start || stop >= end || stop <= previous) {
      context.addIssue({
        code: "custom", path: ["stops", index],
        message: "Stops must be ordered and lie strictly between start and end",
      });
    }
    previous = stop;
  }
});

export type SchedulePlan = z.infer<typeof schedulePlanSchema>;

export function scheduleOccurrences(plan: SchedulePlan) {
  const start = Date.parse(plan.startAt);
  const period = Date.parse(plan.endAt) - start;
  const offsets = [0, ...plan.stops.map((stop) => Date.parse(stop) - start)];
  return Array.from({ length: plan.repetitions + 1 }, (_, repetition) => (
    offsets.map((offset) => new Date(start + repetition * period + offset).toISOString())
  )).flat();
}
