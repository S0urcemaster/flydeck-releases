export const cronMinHours = 12;
export const cronMaxHours = 8760;

export function formatDuration(totalHours: number) {
  if (totalHours < 48) return `${Math.max(1, Math.round(totalHours))} h`;
  const totalDays = Math.round(totalHours / 24);
  if (totalDays < 60) return `${totalDays} d`;
  if (totalDays < 330) return `${Math.round(totalDays / 30)} mo`;
  return `${Math.round(totalDays / 365)} y`;
}

export function formatExactDuration(totalHours: number) {
  const totalSeconds = Math.max(0, Math.round(totalHours * 3600));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export function getDurationParts(totalHours: number) {
  const totalSeconds = Math.max(0, Math.round(totalHours * 3600));
  const years = Math.floor(totalSeconds / 31536000);
  const afterYears = totalSeconds % 31536000;
  const months = Math.floor(afterYears / 2592000);
  const afterMonths = afterYears % 2592000;
  return {
    years,
    months,
    days: Math.floor(afterMonths / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
  };
}

export function toSegmentDigits(value: number, length = 2) {
  return String(Math.max(0, value))
    .padStart(length, "0")
    .slice(-length)
    .replace(/\d/g, (digit) => String.fromCodePoint(0x1fbf0 + Number(digit)));
}

export function rangeSliderToHours(value: number, maxHours = cronMaxHours) {
  const fraction = value / 100;
  return cronMinHours * (maxHours / cronMinHours) ** fraction;
}

export function hoursToRangeSliderValue(hours: number, maxHours = cronMaxHours) {
  const boundedHours = Math.max(cronMinHours, Math.min(maxHours, hours));
  return (Math.log(boundedHours / cronMinHours) / Math.log(maxHours / cronMinHours)) * 100;
}

export function getCronSnapStepHours(rangeHours: number) {
  if (rangeHours <= 24) return 5 / 60;
  if (rangeHours <= 48) return 15 / 60;
  if (rangeHours < 192) return 1;
  if (rangeHours <= 480) return 3;
  return 24;
}

export function formatCronSnapStep(stepHours: number) {
  if (stepHours < 1) return `${Math.round(stepHours * 60)}n`;
  if (stepHours < 24) return `${Math.round(stepHours)}h`;
  return `${Math.round(stepHours / 24)}d`;
}

export function snapDateToLocalStep(rawTarget: Date, stepHours: number) {
  const stepMinutes = Math.round(stepHours * 60);
  const localMinutes = rawTarget.getHours() * 60 + rawTarget.getMinutes() + rawTarget.getSeconds() / 60;
  const snappedMinutes = Math.round(localMinutes / stepMinutes) * stepMinutes;
  const snappedTarget = new Date(rawTarget);
  snappedTarget.setHours(0, 0, 0, 0);
  snappedTarget.setMinutes(snappedMinutes);
  return snappedTarget;
}
