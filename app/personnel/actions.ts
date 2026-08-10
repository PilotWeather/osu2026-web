"use server";

import { CredentialType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { normalizeAircraftRegistration, normalizePersonName } from "@/src/lib/flights/normalize";

export interface PersonnelUpdateState {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string>;
}

export const initialPersonnelUpdateState: PersonnelUpdateState = { success: false, message: "", fieldErrors: {} };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+0-9() ./-]{3,30}$/;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  return text(formData, name) || null;
}

function parseDate(value: string, field: string, errors: Record<string, string>): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors[field] = "Geçerli bir tarih girin.";
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors[field] = "Geçerli bir tarih girin.";
    return null;
  }
  return date;
}

export async function updatePersonnel(
  personnelId: string,
  _previousState: PersonnelUpdateState,
  formData: FormData,
): Promise<PersonnelUpdateState> {
  const currentUser = await requirePermission("VIEW_DASHBOARD");
  if (currentUser.role !== UserRole.ADMIN) throw new Error("Forbidden");

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const email = optionalText(formData, "email")?.toLowerCase() ?? null;
  const phone = optionalText(formData, "phone");
  const licenseNo = optionalText(formData, "licenseNo");
  const tshirtSize = optionalText(formData, "tshirtSize");
  const notes = optionalText(formData, "notes");
  const companyName = optionalText(formData, "company");
  const teamName = optionalText(formData, "team");
  const rawPlate = optionalText(formData, "vehiclePlate");
  const fieldErrors: Record<string, string> = {};

  if (!firstName) fieldErrors.firstName = "Ad zorunludur.";
  else if (firstName.length > 100) fieldErrors.firstName = "Ad en fazla 100 karakter olabilir.";
  if (!lastName) fieldErrors.lastName = "Soyad zorunludur.";
  else if (lastName.length > 100) fieldErrors.lastName = "Soyad en fazla 100 karakter olabilir.";
  if (email && !emailPattern.test(email)) fieldErrors.email = "Geçerli bir e-posta adresi girin.";
  if (phone && !phonePattern.test(phone)) fieldErrors.phone = "Telefon yalnızca rakam ve standart telefon işaretleri içerebilir.";
  if (licenseNo && licenseNo.length > 50) fieldErrors.licenseNo = "Lisans numarası en fazla 50 karakter olabilir.";
  if (tshirtSize && tshirtSize.length > 20) fieldErrors.tshirtSize = "T-shirt bedeni en fazla 20 karakter olabilir.";

  const birthDate = parseDate(text(formData, "birthDate"), "birthDate", fieldErrors);
  const credentialDates = {
    SEP: parseDate(text(formData, "sepExpiry"), "sepExpiry", fieldErrors),
    SEP_FI: parseDate(text(formData, "sepFiExpiry"), "sepFiExpiry", fieldErrors),
    CLASS_1: parseDate(text(formData, "class1Expiry"), "class1Expiry", fieldErrors),
  } satisfies Record<CredentialType, Date | null>;

  let vehiclePlate: string | null = null;
  if (rawPlate) {
    vehiclePlate = normalizeAircraftRegistration(rawPlate) ?? rawPlate.toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
    if (!/^[A-Z0-9ÇĞİÖŞÜ -]{2,20}$/u.test(vehiclePlate)) fieldErrors.vehiclePlate = "Geçerli bir araç plakası girin.";
  }
  if (Object.keys(fieldErrors).length) return { success: false, message: "Lütfen işaretli alanları düzeltin.", fieldErrors };

  const existing = await prisma.personnel.findUnique({ where: { id: personnelId } });
  if (!existing) return { success: false, message: "Personel kaydı bulunamadı.", fieldErrors: {} };

  const [company, team] = await Promise.all([
    companyName ? prisma.company.findUnique({ where: { name: companyName } }) : null,
    teamName ? prisma.team.findUnique({ where: { name: teamName } }) : null,
  ]);
  if (companyName && !company) fieldErrors.company = "Geçerli bir şirket seçin.";
  if (teamName && !team) fieldErrors.team = "Geçerli bir ekip seçin.";
  if (Object.keys(fieldErrors).length) return { success: false, message: "Lütfen işaretli alanları düzeltin.", fieldErrors };

  const oldFullName = `${existing.firstName} ${existing.lastName}`.trim();
  const oldNormalizedName = normalizePersonName(oldFullName);
  const newNormalizedName = normalizePersonName(`${firstName} ${lastName}`);

  await prisma.$transaction(async (tx) => {
    await tx.personnel.update({
      where: { id: existing.id },
      data: { firstName, lastName, email, phone, birthDate, tshirtSize, licenseNo, notes,
        isActiveFlying: formData.get("isActiveFlying") === "on", companyId: company?.id ?? null, teamId: team?.id ?? null },
    });
    if (oldNormalizedName && oldNormalizedName !== newNormalizedName) {
      await tx.personnelAlias.upsert({
        where: { personnelId_normalizedAlias: { personnelId: existing.id, normalizedAlias: oldNormalizedName } },
        update: { alias: oldFullName },
        create: { personnelId: existing.id, alias: oldFullName, normalizedAlias: oldNormalizedName },
      });
    }
    await tx.vehicle.updateMany({ where: { personnelId: existing.id, active: true }, data: { active: false } });
    if (vehiclePlate) {
      await tx.vehicle.upsert({
        where: { personnelId_plate: { personnelId: existing.id, plate: vehiclePlate } },
        update: { active: true }, create: { personnelId: existing.id, plate: vehiclePlate, active: true },
      });
    }
    for (const type of Object.values(CredentialType)) {
      await tx.credential.upsert({
        where: { personnelId_type: { personnelId: existing.id, type } },
        update: { expiryDate: credentialDates[type] }, create: { personnelId: existing.id, type, expiryDate: credentialDates[type] },
      });
    }
  });

  for (const path of ["/", "/dashboard", "/flights", "/analytics", "/analytics/instructors"]) revalidatePath(path);
  return { success: true, message: "Personel bilgileri güncellendi.", fieldErrors: {} };
}
