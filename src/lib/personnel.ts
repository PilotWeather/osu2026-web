import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/src/lib/db";
import type { Personnel, PersonnelCredentialType } from "@/src/types/personnel";

interface SnapshotPersonnel {
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
  credentials: Array<{ type: PersonnelCredentialType; expiryDate: string | null }>;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  let visibleDigits = 4;
  return [...phone].reverse().map((character) => {
    if (!/\d/.test(character)) return character;
    if (visibleDigits > 0) {
      visibleDigits -= 1;
      return character;
    }
    return "•";
  }).reverse().join("");
}

function snapshotToPublic(row: SnapshotPersonnel): Personnel {
  const timestamp = new Date(0).toISOString();
  return {
    id: `source-${row.sourceSequence}`,
    sourceSequence: row.sourceSequence,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: maskPhone(row.phone),
    email: row.email,
    birthDate: row.birthDate,
    tshirtSize: row.tshirtSize,
    licenseNo: row.licenseNo,
    notes: row.notes,
    company: row.company,
    team: row.team,
    vehiclePlate: row.vehiclePlate,
    credentials: row.credentials.map((credential) => ({
      id: `${credential.type.toLowerCase()}-${row.sourceSequence}`,
      type: credential.type,
      expiryDate: credential.expiryDate,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function readSnapshot(): Promise<Personnel[]> {
  const snapshotPath = path.join(process.cwd(), "data", "parsed-personnel.json");
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    return (JSON.parse(raw) as SnapshotPersonnel[]).map(snapshotToPublic);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function readDatabase(): Promise<Personnel[]> {
  const rows = await prisma.personnel.findMany({
    orderBy: [{ sourceSequence: "asc" }, { lastName: "asc" }],
    select: {
      id: true, sourceSequence: true, firstName: true, lastName: true, phone: true,
      email: true, birthDate: true, tshirtSize: true, licenseNo: true, notes: true,
      createdAt: true, updatedAt: true,
      company: { select: { name: true } },
      team: { select: { name: true } },
      vehicles: { where: { active: true }, select: { plate: true } },
      credentials: { select: { id: true, type: true, expiryDate: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    sourceSequence: row.sourceSequence,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: maskPhone(row.phone),
    email: row.email,
    birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
    tshirtSize: row.tshirtSize,
    licenseNo: row.licenseNo,
    notes: row.notes,
    company: row.company?.name ?? null,
    team: row.team?.name ?? null,
    vehiclePlate: row.vehicles.map((vehicle) => vehicle.plate).join(" - ") || null,
    credentials: row.credentials.map((credential) => ({
      id: credential.id,
      type: credential.type as PersonnelCredentialType,
      expiryDate: credential.expiryDate?.toISOString().slice(0, 10) ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getPersonnelList(): Promise<Personnel[]> {
  if (process.env.DATABASE_URL) return readDatabase();
  if (process.env.NODE_ENV !== "production" && process.env.USE_PERSONNEL_SNAPSHOT === "true") {
    return readSnapshot();
  }
  throw new Error(
    "DATABASE_URL is required. For an explicit local-only fallback, set USE_PERSONNEL_SNAPSHOT=true.",
  );
}

export async function getPersonnelById(id: string): Promise<Personnel | null> {
  return (await getPersonnelList()).find((person) => person.id === id) ?? null;
}
