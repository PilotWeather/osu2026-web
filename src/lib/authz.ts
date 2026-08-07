import "server-only";

import { cache } from "react";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export type Permission = "VIEW_DASHBOARD" | "IMPORT_PDF" | "IMPORT_EXCEL" | "EDIT_PERSONNEL" | "MANAGE_USERS";

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(["VIEW_DASHBOARD", "IMPORT_PDF", "IMPORT_EXCEL", "EDIT_PERSONNEL", "MANAGE_USERS"]),
  DATA_MANAGER: new Set(["VIEW_DASHBOARD", "IMPORT_PDF", "IMPORT_EXCEL", "EDIT_PERSONNEL"]),
  VIEWER: new Set(["VIEW_DASHBOARD"]),
};

export const getAuthorizedUser = cache(async () => {
  const session = await auth();
  const email = session?.user?.email?.trim().toLocaleLowerCase("en-US");
  if (!email) return null;
  return prisma.authorizedUser.findFirst({
    where: { email, active: true },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
});

export async function requirePermission(permission: Permission) {
  const user = await getAuthorizedUser();
  if (!user || !rolePermissions[user.role].has(permission)) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
