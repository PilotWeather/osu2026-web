import { cleanCell, normalizeAircraftRegistration, normalizePersonName } from "@/src/lib/flights/normalize";
import { parseHHMM } from "@/src/lib/flights/time";

export type SourceFlightStatus = "COMPLETED" | "CANCELLED";

export interface ParsedFlightRow {
  rowNumber: number;
  flightStatus: SourceFlightStatus;
  flightDate: string;
  sourceTeam: string;
  sourceFlightCode: string;
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
  trainingTask: string | null;
  route: string | null;
  remarks: string | null;
  airborneDurationMinutes: number | null;
  groundDurationMinutes: number | null;
  sortieDurationMinutes: number | null;
  warnings: string[];
  valid: boolean;
}

export interface FlightParseValidation {
  passed: boolean;
  errors: string[];
  scheduledRows: number;
  completedRows: number;
  cancelledRows: number;
  completedDurationMinutes: number;
  teamCompletedRows: Record<string, number>;
  teamCompletedDurationMinutes: Record<string, number>;
}

export interface FlightParseResult {
  pages: number;
  flightDate: string | null;
  rows: ParsedFlightRow[];
  warnings: string[];
  validation: FlightParseValidation;
}

const monthNumbers: Record<string, number> = {
  OCAK: 1, ŞUBAT: 2, MART: 3, NİSAN: 4, MAYIS: 5, HAZİRAN: 6,
  TEMMUZ: 7, AĞUSTOS: 8, EYLÜL: 9, EKİM: 10, KASIM: 11, ARALIK: 12,
};
const rowPrefix = /^([✔✖])\s+(\d+)\s+(TC[- ]?[A-Z0-9]{2,6})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,3}:\d{2})\s+([\s\S]+)$/u;
const anchoredBody = /^([\s\S]*?)\s+(LT[A-Z]{2})\s+(LT[A-Z]{2})\s+([A-Z]{2,12}-\d+)\s+([\s\S]+)$/u;

function preserveCells(line: string): string {
  return line.replace(/\u00a0/g, " ").split("\t").map(cleanCell).join("\t").trim();
}

function parseOperationalDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(20\d{2})\b/u);
  if (!match) return null;
  const month = monthNumbers[match[2].toLocaleUpperCase("tr-TR")];
  if (!month) return null;
  const day = Number(match[1]);
  const date = new Date(Date.UTC(Number(match[3]), month - 1, day));
  if (date.getUTCDate() !== day) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitNames(nameBlock: string, personnelNames: string[]): { instructor: string | null; student: string | null; warning?: string } {
  const originalTokens = cleanCell(nameBlock).split(" ");
  const normalizedBlock = normalizePersonName(nameBlock);
  const candidates = personnelNames
    .map((name) => ({ name, normalized: normalizePersonName(name) }))
    .filter((candidate) => normalizedBlock === candidate.normalized || normalizedBlock.startsWith(`${candidate.normalized} `))
    .sort((a, b) => b.normalized.length - a.normalized.length);
  if (candidates.length === 1 || (candidates.length > 1 && candidates[0].normalized.length > candidates[1].normalized.length)) {
    const tokenCount = candidates[0].normalized.split(" ").length;
    return { instructor: originalTokens.slice(0, tokenCount).join(" "), student: originalTokens.slice(tokenCount).join(" ") || null };
  }
  const cells = nameBlock.split("\t").map(cleanCell).filter(Boolean);
  if (cells.length >= 2) return { instructor: cells[0], student: cells.slice(1).join(" ") };
  return { instructor: cleanCell(nameBlock) || null, student: null, warning: "Öğretmen ve öğrenci adı güvenle ayrılamadı." };
}

function splitRouteAndRemarks(tail: string): { route: string | null; remarks: string | null } {
  const cells = tail.split("\t").map(cleanCell).filter(Boolean);
  if (cells.length >= 2) return { route: cells[0], remarks: cells.at(-1) ?? null };
  const value = cleanCell(tail);
  const match = value.match(/^(.*?(?:NOLU SAHA|ESKİŞEHİR-\s*\d+))\s+(.+)$/u);
  return match ? { route: match[1], remarks: match[2] } : { route: value || null, remarks: null };
}

function parseRow(line: string, rowNumber: number, flightDate: string, sourceTeam: string, personnelNames: string[]): ParsedFlightRow | null {
  const prefix = line.match(rowPrefix);
  if (!prefix) return null;
  const body = prefix[7].match(anchoredBody);
  const warnings: string[] = [];
  if (!body) {
    return { rowNumber, flightStatus: prefix[1] === "✔" ? "COMPLETED" : "CANCELLED", flightDate, sourceTeam, sourceFlightCode: prefix[2], sourceSortieNo: prefix[2], sourceFlightType: null, aircraftType: null, aircraftRegistration: normalizeAircraftRegistration(prefix[3]), departureAirport: null, takeoffTime: prefix[4], flightRules: null, instructorName: null, studentName: null, arrivalAirport: null, landingTime: prefix[5], frequency: null, runway: null, trainingTask: null, route: null, remarks: null, airborneDurationMinutes: null, groundDurationMinutes: null, sortieDurationMinutes: parseHHMM(prefix[6]), warnings: ["Havalimanı veya eğitim görevi alanları bulunamadı."], valid: false };
  }
  const names = splitNames(body[1], personnelNames);
  if (names.warning) warnings.push(names.warning);
  const route = splitRouteAndRemarks(body[5]);
  const offBlock = parseHHMM(prefix[4]); const onBlock = parseHHMM(prefix[5]); const blockTime = parseHHMM(prefix[6]);
  if (offBlock !== null && onBlock !== null && blockTime !== null && (onBlock - offBlock + 1440) % 1440 !== blockTime) warnings.push("Off Block / On Block farkı kaynak Block Time ile uyuşmuyor.");
  return {
    rowNumber, flightStatus: prefix[1] === "✔" ? "COMPLETED" : "CANCELLED", flightDate, sourceTeam,
    sourceFlightCode: prefix[2], sourceSortieNo: prefix[2], sourceFlightType: body[4], aircraftType: null,
    aircraftRegistration: normalizeAircraftRegistration(prefix[3]), departureAirport: body[2], takeoffTime: prefix[4],
    flightRules: null, instructorName: names.instructor, studentName: names.student, arrivalAirport: body[3], landingTime: prefix[5],
    frequency: null, runway: null, trainingTask: body[4], route: route.route, remarks: route.remarks,
    airborneDurationMinutes: null, groundDurationMinutes: null, sortieDurationMinutes: blockTime,
    warnings, valid: Boolean(names.instructor && names.student && blockTime !== null),
  };
}

function validateRows(rows: ParsedFlightRow[], flightDate: string | null): FlightParseValidation {
  const completed = rows.filter((row) => row.flightStatus === "COMPLETED");
  const cancelled = rows.filter((row) => row.flightStatus === "CANCELLED");
  const teamCompletedRows: Record<string, number> = {}; const teamCompletedDurationMinutes: Record<string, number> = {};
  for (const row of completed) { teamCompletedRows[row.sourceTeam] = (teamCompletedRows[row.sourceTeam] ?? 0) + 1; teamCompletedDurationMinutes[row.sourceTeam] = (teamCompletedDurationMinutes[row.sourceTeam] ?? 0) + (row.sortieDurationMinutes ?? 0); }
  const completedDurationMinutes = completed.reduce((sum, row) => sum + (row.sortieDurationMinutes ?? 0), 0);
  const errors: string[] = [];
  if (flightDate === "2026-08-06") {
    const expectedCounts: Record<string, number> = { "TEAM-1": 33, "TEAM-2": 22, "TEAM-3": 19, "TEAM-4": 27 };
    const expectedMinutes: Record<string, number> = { "TEAM-1": 2028, "TEAM-2": 1310, "TEAM-3": 1142, "TEAM-4": 1588 };
    if (rows.length !== 110) errors.push(`Planlanan satır 110 yerine ${rows.length}.`);
    if (completed.length !== 101) errors.push(`Tamamlanan satır 101 yerine ${completed.length}.`);
    if (cancelled.length !== 9) errors.push(`İptal satırı 9 yerine ${cancelled.length}.`);
    if (completedDurationMinutes !== 6068) errors.push(`Tamamlanan süre 101:08 yerine ${Math.floor(completedDurationMinutes / 60)}:${String(completedDurationMinutes % 60).padStart(2, "0")}.`);
    for (const team of Object.keys(expectedCounts)) {
      if (teamCompletedRows[team] !== expectedCounts[team]) errors.push(`${team} tamamlanan satır ${expectedCounts[team]} yerine ${teamCompletedRows[team] ?? 0}.`);
      if (teamCompletedDurationMinutes[team] !== expectedMinutes[team]) errors.push(`${team} tamamlanan süresi doğrulanamadı.`);
    }
  }
  if (rows.some((row) => !row.valid)) errors.push(`${rows.filter((row) => !row.valid).length} aday satır yapısal olarak geçersiz.`);
  return { passed: errors.length === 0, errors, scheduledRows: rows.length, completedRows: completed.length, cancelledRows: cancelled.length, completedDurationMinutes, teamCompletedRows, teamCompletedDurationMinutes };
}

async function extractText(data: Uint8Array) {
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try { return await parser.getText({ cellSeparator: "\t" }); } finally { await parser.destroy(); }
}

export async function parseCompletedFlightsPdf(data: Uint8Array, personnelNames: string[] = []): Promise<FlightParseResult> {
  const extracted = await extractText(data);
  const lines = extracted.pages.flatMap((page) => page.text.split(/\r?\n/).map(preserveCells).filter(Boolean));
  const flightDate = parseOperationalDate(lines.join("\n"));
  const rows: ParsedFlightRow[] = []; const warnings: string[] = []; let currentTeam: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const team = cleanCell(lines[index]).match(/^TEAM-([1-4])$/i);
    if (team) { currentTeam = `TEAM-${team[1]}`; continue; }
    if (!/^[✔✖]/u.test(lines[index])) continue;
    if (!flightDate) { warnings.push("Belgede geçerli operasyon tarihi bulunamadı."); break; }
    if (!currentTeam) { warnings.push(`${index + 1}. satır için TEAM bölümü bulunamadı.`); continue; }
    const row = parseRow(lines[index], index + 1, flightDate, currentTeam, personnelNames);
    if (row) rows.push(row); else warnings.push(`${index + 1}. uçuş satırı ayrıştırılamadı.`);
  }
  const validation = validateRows(rows, flightDate);
  warnings.push(...validation.errors);
  return { pages: extracted.total, flightDate, rows, warnings, validation };
}

export function normalizedParsedInstructor(row: ParsedFlightRow): string { return normalizePersonName(row.instructorName); }
