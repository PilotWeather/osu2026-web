import fs from "node:fs";
import path from "node:path";

interface RawPersonnelRow {
  [key: string]: string | undefined;
}

function normalizeText(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ").replace(/\u00a0/g, " ");
}

function normalizeDate(value?: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const [day, month, year] = normalized.split(/[./-]/).map((part) => part.trim());
  if (!day || !month || !year) return null;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizePlate(value?: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.toUpperCase().replace(/\s+/g, " ");
}

function normalizeTeam(value?: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.replace(/^team\s*/i, "Team ").replace(/\s+/g, " ");
}

function normalizeCompany(value?: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.toUpperCase();
}

export function importPersonnelFromFile(filePath: string) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((columns) => columns.some((value) => value?.trim()));

  return rows.slice(1).map((columns) => {
    const row: RawPersonnelRow = {};
    rows[0].forEach((header, index) => {
      row[header] = columns[index];
    });

    return {
      sourceSequence: normalizeText(row["P"])
        ? Number.parseInt(normalizeText(row["P"]) ?? "0", 10)
        : null,
      firstName: normalizeText(row["AD"]),
      lastName: normalizeText(row["SOYAD"]),
      email: normalizeText(row["E-POSTA"]),
      phone: normalizeText(row["GSM"]),
      company: normalizeCompany(row["ŞİRKET"]),
      team: normalizeTeam(row["EKİP"]),
      birthDate: normalizeDate(row["DOĞUM TARİHİ"]),
      tshirtSize: normalizeText(row["TSHIRT BEDEN"]),
      licenseNo: normalizeText(row["LİSANS NO"]),
      vehiclePlate: normalizePlate(row["ARACI VAR İSE PLAKASI"]),
      notes: normalizeText(row["Açıklama"]),
      credentials: [
        { type: "SEP", expiryDate: normalizeDate(row["SEP BİTİŞ"]) },
        { type: "SEP_FI", expiryDate: normalizeDate(row["SEP-FI BİTİŞ"]) },
        { type: "CLASS_1", expiryDate: normalizeDate(row["CLASS 1 BİTİŞ"]) },
      ],
    };
  });
}

const result = importPersonnelFromFile(process.argv[2] ?? "./data/personnel.tsv");
console.log(`Parsed ${result.length} rows`);
