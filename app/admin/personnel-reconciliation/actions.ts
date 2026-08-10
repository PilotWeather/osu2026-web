"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/src/lib/authz";
import { autoReconcileNaeronPersonnel, getNaeronInstructorIdentities, linkNaeronInstructor } from "@/src/lib/naeron/personnel-reconciliation";

function finish(status: "success" | "error", message: string): never {
  redirect(`/admin/personnel-reconciliation?${new URLSearchParams({ status, message })}`);
}

export async function runSafePersonnelReconciliation(): Promise<void> {
  await requirePermission("MANAGE_USERS");
  const result = await autoReconcileNaeronPersonnel();
  revalidatePath("/admin/personnel-reconciliation"); revalidatePath("/dashboard"); revalidatePath("/flights");
  finish("success", `${result.matched} güvenli eşleşme işlendi; ${result.aliasesCreated} alias oluşturuldu, ${result.flightsLinked} geçmiş uçuş bağlandı.`);
}

export async function linkNaeronPersonnelManually(formData: FormData): Promise<void> {
  await requirePermission("MANAGE_USERS");
  const key = String(formData.get("identityKey") ?? ""); const personnelId = String(formData.get("personnelId") ?? "");
  if (!key || !personnelId) finish("error", "Naeron eğitmeni ve personel seçimi zorunludur.");
  const identity = (await getNaeronInstructorIdentities()).find((item) => item.key === key);
  if (!identity) finish("error", "Naeron eğitmen kimliği artık mevcut değil.");
  try {
    const result = await linkNaeronInstructor(identity, personnelId);
    revalidatePath("/admin/personnel-reconciliation"); revalidatePath("/dashboard"); revalidatePath("/flights");
    finish("success", `Eşleşme kaydedildi; ${result.flightsLinked} geçmiş uçuş bağlandı.`);
  } catch (error) {
    finish("error", error instanceof Error ? error.message : "Eşleşme kaydedilemedi.");
  }
}
