export function parseHHMM(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().replace(".", ":");
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToHHMM(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes < 0) return "-";
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

export const formatDuration = minutesToHHMM;

export function operationalDateTime(date: string, time: string | null): Date | null {
  const minutes = parseHHMM(time);
  if (minutes === null) return null;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60));
}

export function formatOperationalTime(value: Date | string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(new Date(value));
}
