import { prisma } from "@/src/lib/db";
import type { Personnel, PersonnelCredentialType } from "@/src/types/personnel";

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

function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "OSU2026 cannot start without PostgreSQL. Configure DATABASE_URL in the server environment.",
    );
  }
}

export async function getPersonnelList(): Promise<Personnel[]> {
  requireDatabaseUrl();
  const rows = await prisma.personnel.findMany({
    orderBy: [{ sourceSequence: "asc" }, { lastName: "asc" }],
    select: {
      id: true, sourceSequence: true, firstName: true, lastName: true, phone: true,
      email: true, birthDate: true, tshirtSize: true, licenseNo: true, notes: true,
      isActiveFlying: true,
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
    isActiveFlying: row.isActiveFlying,
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

export async function getPersonnelById(id: string): Promise<Personnel | null> {
  return (await getPersonnelList()).find((person) => person.id === id) ?? null;
}
