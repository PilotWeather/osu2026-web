import { createHash } from "node:crypto";

export function cleanCell(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizePersonName(value: string | null | undefined): string {
  return cleanCell(value).toLocaleUpperCase("tr-TR");
}

export function normalizeAircraftRegistration(value: string | null | undefined): string | null {
  const compact = cleanCell(value).toLocaleUpperCase("tr-TR").replace(/\s+/g, "-").replace(/-+/g, "-");
  const match = compact.match(/^TC-?([A-Z0-9]{2,6})$/);
  return match ? `TC-${match[1]}` : null;
}

export function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function flightSignature(fields: {
  flightDate: string;
  sourceSortieNo: string | null;
  aircraftRegistration: string;
  takeoffTime: string | null;
  landingTime: string | null;
  instructorName: string | null;
}): string {
  return sha256([
    fields.flightDate,
    fields.sourceSortieNo ?? "",
    fields.aircraftRegistration,
    fields.takeoffTime ?? "",
    fields.landingTime ?? "",
    normalizePersonName(fields.instructorName),
  ].join("|"));
}
