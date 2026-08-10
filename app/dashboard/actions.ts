"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/src/lib/authz";
import { NaeronSyncInProgressError, runNaeronIncrementalSync } from "@/src/lib/naeron/sync";

export interface DashboardSyncState {
  status: "idle" | "success" | "error" | "running";
  message: string;
  result?: { fetched: number; created: number; updated: number; archived: number; flights: number; aircraft: number; cancelled: number; unmatchedInstructors: number };
}

export const initialDashboardSyncState: DashboardSyncState = { status: "idle", message: "" };

export async function syncNaeronFromDashboard(_previousState: DashboardSyncState): Promise<DashboardSyncState> {
  void _previousState;
  const user = await requirePermission("IMPORT_PDF");
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.DATA_MANAGER) return { status: "error", message: "Bu işlem için yetkiniz yok." };
  try {
    const result = await runNaeronIncrementalSync({ triggeredByEmail: user.email });
    revalidatePath("/dashboard"); revalidatePath("/flights"); revalidatePath("/analytics"); revalidatePath("/admin/sync");
    return { status: "success", message: "Naeron güncellendi", result: { fetched: result.fetched, created: result.created, updated: result.updated, archived: result.archived, flights: result.completedFlights, aircraft: result.aircraftUpdated, cancelled: result.cancelledFlights, unmatchedInstructors: result.unmatchedInstructors } };
  } catch (error) {
    if (error instanceof NaeronSyncInProgressError) return { status: "running", message: "Senkronizasyon zaten çalışıyor." };
    return { status: "error", message: "Naeron senkronizasyonu başarısız. Mevcut veriler gösterilmeye devam ediyor." };
  }
}
