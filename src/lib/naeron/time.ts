export function parseNaeronDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function naeronMinutesFromMidnight(dateValue: string | null | undefined, minutes: number | null | undefined): Date | null {
  const date = parseNaeronDate(dateValue);
  if (!date || minutes === null || minutes === undefined || !Number.isInteger(minutes) || minutes < 0) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minutes));
}
