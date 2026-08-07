import { PDFParse } from "pdf-parse";
import { cleanCell, normalizeAircraftRegistration, normalizePersonName } from "@/src/lib/flights/normalize";
import { parseHHMM } from "@/src/lib/flights/time";

export interface ParsedFlightRow {
  rowNumber: number;
  flightDate: string;
  sourceSortieNo: string | null;
  sourceFlightType: string | null;
  aircraftType: string | null;
  aircraftRegistration: string | null;
  departureAirport: string | null;
  takeoffTime: string | null;
  flightRules: string | null;
  instructorName: string | null;
  studentName: string | null;
  arrivalAirport: string | null;
  landingTime: string | null;
  frequency: string | null;
  runway: string | null;
  remarks: string | null;
  airborneDurationMinutes: number | null;
  groundDurationMinutes: number | null;
  sortieDurationMinutes: number | null;
  warnings: string[];
  valid: boolean;
}

export interface FlightParseResult {
  pages: number;
  flightDate: string | null;
  rows: ParsedFlightRow[];
  warnings: string[];
}

const datePattern = /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/;
const timePattern = /^\d{1,2}[:.]\d{2}$/;

function isoDate(day: string, month: string, year: string): string | null {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function splitCells(line: string): string[] {
  const cells = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/);
  return cells.map(cleanCell).filter(Boolean);
}

function durationFromCell(value: string | undefined): number | null {
  return parseHHMM(value);
}

function parseHeuristicRow(cells: string[], rowNumber: number, flightDate: string): ParsedFlightRow | null {
  const registrationIndex = cells.findIndex((cell) => normalizeAircraftRegistration(cell));
  const timeIndexes = cells.map((cell, index) => timePattern.test(cell) ? index : -1).filter((index) => index >= 0);
  if (registrationIndex < 0 || timeIndexes.length < 2) return null;

  const aircraftRegistration = normalizeAircraftRegistration(cells[registrationIndex]);
  const takeoffIndex = timeIndexes[0];
  const landingIndex = timeIndexes[1];
  const durationCells = timeIndexes.slice(2).map((index) => cells[index]);
  const sortieDurationMinutes = durationFromCell(durationCells.at(-1));
  const warnings: string[] = [];
  if (!sortieDurationMinutes) warnings.push("Sorti süresi bulunamadı veya sıfır.");

  const sourceSortieNo = /^\d+$/.test(cells[0] ?? "") ? cells[0] : null;
  const instructorName = cells[takeoffIndex + 2] ?? cells[takeoffIndex + 1] ?? null;
  const studentName = cells[takeoffIndex + 3] ?? null;
  return {
    rowNumber,
    flightDate,
    sourceSortieNo,
    sourceFlightType: registrationIndex > 1 ? cells.slice(1, registrationIndex - 1).join(" / ") || null : null,
    aircraftType: registrationIndex > 0 ? cells[registrationIndex - 1] : null,
    aircraftRegistration,
    departureAirport: cells[takeoffIndex - 1] ?? null,
    takeoffTime: cells[takeoffIndex],
    flightRules: cells[takeoffIndex + 1] ?? null,
    instructorName,
    studentName,
    arrivalAirport: cells[landingIndex - 1] ?? null,
    landingTime: cells[landingIndex],
    frequency: cells[landingIndex + 1] ?? null,
    runway: cells[landingIndex + 2] ?? null,
    remarks: cells.slice(landingIndex + 3, Math.max(landingIndex + 3, timeIndexes.at(-1) ?? cells.length)).join(" ") || null,
    airborneDurationMinutes: durationFromCell(durationCells[0]),
    groundDurationMinutes: durationFromCell(durationCells[1]),
    sortieDurationMinutes,
    warnings,
    valid: Boolean(aircraftRegistration && sortieDurationMinutes),
  };
}

export async function parseCompletedFlightsPdf(data: Uint8Array): Promise<FlightParseResult> {
  const parser = new PDFParse({ data });
  try {
    const extracted = await parser.getText({ cellSeparator: "\t" });
    const lines = extracted.pages.flatMap((page) => page.text.split(/\r?\n/).map(cleanCell).filter(Boolean));
    const dateMatch = lines.join(" ").match(datePattern);
    const flightDate = dateMatch ? isoDate(dateMatch[1], dateMatch[2], dateMatch[3]) : null;
    if (!flightDate) return { pages: extracted.total, flightDate: null, rows: [], warnings: ["Belgede geçerli operasyon tarihi bulunamadı."] };

    const rows: ParsedFlightRow[] = [];
    lines.forEach((line, index) => {
      const parsed = parseHeuristicRow(splitCells(line), index + 1, flightDate);
      if (parsed) rows.push(parsed);
    });
    return {
      pages: extracted.total,
      flightDate,
      rows,
      warnings: rows.length ? [] : ["Uçuş satırı bulunamadı. Kaynak PDF sütun düzeni doğrulanmalı."],
    };
  } finally {
    await parser.destroy();
  }
}

export function normalizedParsedInstructor(row: ParsedFlightRow): string {
  return normalizePersonName(row.instructorName);
}
