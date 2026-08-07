"use server";

import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { requirePermission } from "@/src/lib/authz";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseRole(value: FormDataEntryValue | null): UserRole | null {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole)
    ? (value as UserRole)
    : null;
}

function returnWith(status: "success" | "error", message: string): never {
  const params = new URLSearchParams({ status, message });
  redirect(`/admin/users?${params.toString()}`);
}

export async function createAuthorizedUser(formData: FormData): Promise<void> {
  await requirePermission("MANAGE_USERS");
  const email = normalizeEmail(formData.get("email"));
  const name = normalizeName(formData.get("name"));
  const role = parseRole(formData.get("role"));
  const active = formData.get("active") === "on";

  if (!emailPattern.test(email)) returnWith("error", "Enter a valid email address.");
  if (!role) returnWith("error", "Select a valid role.");

  try {
    await prisma.authorizedUser.create({
      data: { email, name: name || email.split("@")[0], role, active },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      returnWith("error", "This email is already authorized.");
    }
    throw error;
  }
  revalidatePath("/admin/users");
  returnWith("success", "User added");
}

export async function updateAuthorizedUser(formData: FormData): Promise<void> {
  const currentAdmin = await requirePermission("MANAGE_USERS");
  const id = String(formData.get("id") ?? "");
  const name = normalizeName(formData.get("name"));
  const role = parseRole(formData.get("role"));
  if (!id || !role) returnWith("error", "Invalid user update.");

  const target = await prisma.authorizedUser.findUnique({ where: { id } });
  if (!target) returnWith("error", "Authorized user not found.");
  if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN && target.active) {
    const otherAdmins = await prisma.authorizedUser.count({
      where: { role: UserRole.ADMIN, active: true, id: { not: id } },
    });
    if (otherAdmins === 0) returnWith("error", "At least one active admin is required.");
  }
  if (target.email === currentAdmin.email && role !== UserRole.ADMIN) {
    const confirmed = formData.get("confirmSelf") === "true";
    if (!confirmed) returnWith("error", "Confirm before changing your own admin access.");
  }

  await prisma.authorizedUser.update({
    where: { id },
    data: { name: name || target.email.split("@")[0], role },
  });
  revalidatePath("/admin/users");
  returnWith("success", "User updated");
}

export async function toggleAuthorizedUserStatus(formData: FormData): Promise<void> {
  const currentAdmin = await requirePermission("MANAGE_USERS");
  const id = String(formData.get("id") ?? "");
  const target = await prisma.authorizedUser.findUnique({ where: { id } });
  if (!target) returnWith("error", "Authorized user not found.");

  const nextActive = !target.active;
  if (target.email === currentAdmin.email && !nextActive) {
    const confirmed = formData.get("confirmSelf") === "true";
    if (!confirmed) returnWith("error", "Confirm before disabling your own access.");
  }
  if (target.role === UserRole.ADMIN && !nextActive) {
    const otherAdmins = await prisma.authorizedUser.count({
      where: { role: UserRole.ADMIN, active: true, id: { not: id } },
    });
    if (otherAdmins === 0) returnWith("error", "At least one active admin is required.");
  }

  await prisma.authorizedUser.update({ where: { id }, data: { active: nextActive } });
  revalidatePath("/admin/users");
  returnWith("success", nextActive ? "Access enabled" : "Access disabled");
}
