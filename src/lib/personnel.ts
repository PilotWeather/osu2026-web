import { prisma } from "@/src/lib/db";
import { requirePermission } from "@/src/lib/authz";
import type { Personnel, PersonnelCredentialType } from "@/src/types/personnel";

function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "OSU2026 cannot start without PostgreSQL. Configure DATABASE_URL in the server environment.",
    );
  }
}

export async function getPersonnelList(): Promise<Personnel[]> {
  requireDatabaseUrl();
  await requirePermission("VIEW_DASHBOARD");
  const rows = await prisma.personnel.findMany({
    orderBy: [{ sourceSequence: "asc" }, { lastName: "asc" }],
    select: {
      id: true, sourceSequence: true, firstName: true, lastName: true, canonicalFullName: true, nationalId: true, phone: true,
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
    canonicalFullName: row.canonicalFullName,
    // TODO(public-release): Mask national ID and phone before this system is exposed publicly.
    nationalId: row.nationalId,
    phone: row.phone,
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
