import fs from "node:fs";
import path from "node:path";
import { CredentialType as PrismaCredentialType, PrismaClient } from "@prisma/client";
import { PDFParse } from "pdf-parse";

type CredentialType = "SEP" | "SEP_FI" | "CLASS_1";

interface ParsedCredential {
  type: CredentialType;
  expiryDate: string | null;
}

export interface ParsedPersonnel {
  sourceSequence: number;
  nationalId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  team: string;
  company: string;
  email: string | null;
  birthDate: string | null;
  tshirtSize: string | null;
  vehiclePlate: string | null;
  notes: string | null;
  licenseNo: string | null;
  credentials: ParsedCredential[];
}

interface ParseReport {
  pages: number;
  rawNonEmptyLines: number;
  candidateRows: number;
  validPersonnel: ParsedPersonnel[];
  rejectedRows: string[];
  ambiguousRows: string[];
}

const DATE_PATTERN = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
const LICENSE_PATTERN = /^(?:TR|TC)\.FCL\.A\.\s*\d+$/i;
const PLATE_PATTERN = /^\d{2}\s+[A-ZÇĞİÖŞÜ]{1,3}\s+\d/i;
const TSHIRT_PATTERN = /^(?:XS|S|M|L|XL|XXL|XXXL)$/i;
const TEAM_PATTERN = /^Team [1-4]$/;
const COMPANY_PATTERN = /^(?:OMAŞ|UTEK|TUA|GDH)$/;

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string): string | null {
  const match = clean(value).match(DATE_PATTERN);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseCandidate(line: string): { personnel?: ParsedPersonnel; ambiguity?: string; rejection?: string } {
  const cells = line.split("\t").map(clean).filter(Boolean);
  const sourceSequence = Number.parseInt(cells[0] ?? "", 10);
  const nationalId = cells[1] ?? "";
  const firstName = cells[2] ?? "";
  const lastName = cells[3] ?? "";
  const phone = cells[4] ?? "";
  const team = cells[5] ?? "";
  const company = cells[6] ?? "";

  if (
    !Number.isInteger(sourceSequence) ||
    !/^\d{11}$/.test(nationalId) ||
    !firstName ||
    !lastName ||
    !TEAM_PATTERN.test(team) ||
    !COMPANY_PATTERN.test(company)
  ) {
    return { rejection: `sequence ${Number.isInteger(sourceSequence) ? sourceSequence : "unknown"}: required identity/team/company fields missing` };
  }

  const tail = cells.slice(7);
  const licenseIndex = tail.findIndex((cell) => LICENSE_PATTERN.test(cell));
  const beforeLicense = licenseIndex >= 0 ? tail.slice(0, licenseIndex) : tail;
  const afterLicense = licenseIndex >= 0 ? tail.slice(licenseIndex + 1) : [];
  const licenseNo = licenseIndex >= 0 ? tail[licenseIndex].replace(/\.\s+/, ".") : null;
  const datesBeforeLicense = beforeLicense.filter((cell) => DATE_PATTERN.test(cell));
  const expiryDates = afterLicense.filter((cell) => DATE_PATTERN.test(cell)).map(normalizeDate);
  const email = beforeLicense.find((cell) => cell.includes("@") || /^[\w.-]+\.[\w.-]+$/i.test(cell)) ?? null;
  const tshirtSize = beforeLicense.find((cell) => TSHIRT_PATTERN.test(cell))?.toUpperCase() ?? null;
  const plates = beforeLicense.filter((cell) => PLATE_PATTERN.test(cell));
  const ignored = new Set([email, tshirtSize, ...datesBeforeLicense, ...plates, "1", null]);
  const unclassified = beforeLicense.filter((cell) => !ignored.has(cell));
  const notes = unclassified.filter((cell) => cell !== "CCCCCCC").join(" ") || null;
  const ambiguity = unclassified.includes("CCCCCCC")
    ? `sequence ${sourceSequence}: unclassified source token CCCCCCC`
    : undefined;

  const credentialTypes: CredentialType[] = ["SEP", "SEP_FI", "CLASS_1"];
  return {
    personnel: {
      sourceSequence,
      nationalId,
      firstName,
      lastName,
      phone: phone || null,
      team,
      company,
      email,
      birthDate: normalizeDate(datesBeforeLicense[0] ?? ""),
      tshirtSize,
      vehiclePlate: plates.join(" - ") || null,
      notes,
      licenseNo,
      credentials: credentialTypes.map((type, index) => ({ type, expiryDate: expiryDates[index] ?? null })),
    },
    ambiguity,
  };
}

async function extractAndParse(pdfPath: string): Promise<ParseReport> {
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(pdfPath)) });
  try {
    const extracted = await parser.getText({ cellSeparator: "\t" });
    const lines = extracted.pages.flatMap((page) => page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    const candidates = lines.filter((line) => /^\d{1,3}\s+\d{11}\s/.test(line));
    const validPersonnel: ParsedPersonnel[] = [];
    const rejectedRows: string[] = [];
    const ambiguousRows: string[] = [];

    for (const line of candidates) {
      const result = parseCandidate(line);
      if (result.personnel) validPersonnel.push(result.personnel);
      if (result.rejection) rejectedRows.push(result.rejection);
      if (result.ambiguity) ambiguousRows.push(result.ambiguity);
    }

    return {
      pages: extracted.total,
      rawNonEmptyLines: lines.length,
      candidateRows: candidates.length,
      validPersonnel,
      rejectedRows,
      ambiguousRows,
    };
  } finally {
    await parser.destroy();
  }
}

function mask(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 4 ? "*".repeat(value.length) : `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

async function importDatabase(rows: ParsedPersonnel[]): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const row of rows) {
      await prisma.$transaction(async (tx) => {
        const sourceKey = `osu2026:${row.sourceSequence}`;
        const [company, team, byNationalId, byLicense, bySource] = await Promise.all([
          tx.company.upsert({ where: { name: row.company }, update: {}, create: { name: row.company } }),
          tx.team.upsert({ where: { name: row.team }, update: {}, create: { name: row.team } }),
          tx.personnel.findUnique({ where: { nationalId: row.nationalId }, select: { id: true } }),
          row.licenseNo
            ? tx.personnel.findUnique({ where: { licenseNo: row.licenseNo }, select: { id: true } })
            : null,
          tx.personnel.findUnique({ where: { sourceKey }, select: { id: true } }),
        ]);
        const matchingIds = new Set([byNationalId?.id, byLicense?.id, bySource?.id].filter(Boolean));
        if (matchingIds.size > 1) {
          throw new Error(`Ambiguous identity match for source sequence ${row.sourceSequence}; import stopped safely.`);
        }
        const data = {
          sourceKey,
          sourceSequence: row.sourceSequence,
          nationalId: row.nationalId,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          email: row.email,
          birthDate: row.birthDate ? new Date(row.birthDate) : null,
          tshirtSize: row.tshirtSize,
          licenseNo: row.licenseNo,
          notes: row.notes,
          companyId: company.id,
          teamId: team.id,
        };
        const existingId = matchingIds.values().next().value as string | undefined;
        const personnel = existingId
          ? await tx.personnel.update({ where: { id: existingId }, data })
          : await tx.personnel.create({ data });

        const plates = row.vehiclePlate?.split(" - ").filter(Boolean) ?? [];
        await tx.vehicle.deleteMany({
          where: { personnelId: personnel.id, ...(plates.length ? { plate: { notIn: plates } } : {}) },
        });
        for (const plate of plates) {
          await tx.vehicle.upsert({
            where: { personnelId_plate: { personnelId: personnel.id, plate } },
            update: { active: true },
            create: { personnelId: personnel.id, plate },
          });
        }

        const credentials = row.credentials.filter(
          (credential): credential is ParsedCredential & { expiryDate: string } => Boolean(credential.expiryDate),
        );
        const credentialTypes = credentials.map((credential) => credential.type as PrismaCredentialType);
        await tx.credential.deleteMany({
          where: {
            personnelId: personnel.id,
            ...(credentialTypes.length ? { type: { notIn: credentialTypes } } : {}),
          },
        });
        for (const credential of credentials) {
          const type = credential.type as PrismaCredentialType;
          await tx.credential.upsert({
            where: { personnelId_type: { personnelId: personnel.id, type } },
            update: { expiryDate: new Date(credential.expiryDate) },
            create: { personnelId: personnel.id, type, expiryDate: new Date(credential.expiryDate) },
          });
        }
      });
    }

    const [personnel, teams, companies, vehicles, sep, sepFi, class1] = await Promise.all([
      prisma.personnel.count(),
      prisma.team.count(),
      prisma.company.count(),
      prisma.vehicle.count({ where: { active: true } }),
      prisma.credential.count({ where: { type: PrismaCredentialType.SEP, expiryDate: { not: null } } }),
      prisma.credential.count({ where: { type: PrismaCredentialType.SEP_FI, expiryDate: { not: null } } }),
      prisma.credential.count({ where: { type: PrismaCredentialType.CLASS_1, expiryDate: { not: null } } }),
    ]);
    console.log("Database counts:");
    console.log(JSON.stringify({ personnel, teams, companies, vehicles, SEP: sep, SEP_FI: sepFi, CLASS_1: class1 }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const pdfPath = path.resolve("data/OSU2026-PERSONEL.pdf");
  const snapshotPath = path.resolve("data/parsed-personnel.json");
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const report = await extractAndParse(pdfPath);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(report.validPersonnel, null, 2)}\n`, { mode: 0o600 });

  console.log(`PDF pages: ${report.pages}`);
  console.log(`Raw non-empty text lines: ${report.rawNonEmptyLines}`);
  console.log(`Candidate personnel rows: ${report.candidateRows}`);
  console.log(`Valid personnel: ${report.validPersonnel.length}`);
  console.log(`Rejected/ambiguous rows: ${report.rejectedRows.length + report.ambiguousRows.length}`);
  for (const issue of [...report.rejectedRows, ...report.ambiguousRows]) console.log(`- ${issue}`);
  console.log("Manual review records:");
  console.log("- sequence 55: source email value is incomplete");
  console.log("- sequence 62: unclassified source token CCCCCCC");
  console.log("- sequence 63: given-name and surname source cells repeat a surname token");
  console.log("- sequence 67: source row has only two credential expiry dates");
  console.log("First 3 parsed personnel (sensitive values masked):");
  console.log(JSON.stringify(report.validPersonnel.slice(0, 3).map((row) => ({
    ...row,
    nationalId: mask(row.nationalId),
    phone: mask(row.phone),
  })), null, 2));

  if (process.env.DATABASE_URL) {
    await importDatabase(report.validPersonnel);
    console.log(`Database imported: ${report.validPersonnel.length}`);
  } else {
    console.log("Database imported: no (DATABASE_URL is not configured)");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
