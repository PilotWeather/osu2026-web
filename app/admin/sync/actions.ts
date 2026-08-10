"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/src/lib/authz";
import { runNaeronFullSync, runNaeronIncrementalSync } from "@/src/lib/naeron/sync";

function resultRedirect(batchId: string): never { revalidatePath("/admin/sync"); redirect(`/admin/sync?batch=${batchId}`); }

export async function runIncrementalSyncAction(): Promise<void> {
  const user = await requirePermission("IMPORT_PDF");
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.DATA_MANAGER) throw new Error("Forbidden");
  const result = await runNaeronIncrementalSync(); resultRedirect(result.batchId);
}

export async function runFullSyncAction(formData: FormData): Promise<void> {
  const user = await requirePermission("VIEW_DASHBOARD");
  if (user.role !== UserRole.ADMIN) throw new Error("Forbidden");
  if (formData.get("confirmFullSync") !== "yes") redirect("/admin/sync?status=error&message=Full+sync+onay%C4%B1+gereklidir.");
  const result = await runNaeronFullSync(); resultRedirect(result.batchId);
}
