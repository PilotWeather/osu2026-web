"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/src/lib/authz";
import { NaeronSyncInProgressError, runNaeronIncrementalSync } from "@/src/lib/naeron/sync";

export interface DashboardSyncState {
  status: "idle" | "success" | "error" | "running";
  message: string;
  result?: { success: true; table: "bi_flights"; fetched: number; created: number; updated: number; archived: number; flights: number; aircraft: number; cancelled: number; unmatchedInstructors: number; errors: number; durationMs: number; lastSuccessfulSyncAt: string };
}

export async function syncNaeronFromDashboard(_previousState: DashboardSyncState): Promise<DashboardSyncState> {
  void _previousState;
  const user = await requirePermission("IMPORT_PDF");
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.DATA_MANAGER) return { status: "error", message: "Bu işlem için yetkiniz yok." };
  try {
    const result = await runNaeronIncrementalSync({ triggeredByEmail: user.email });
    revalidatePath("/dashboard"); revalidatePath("/flights"); revalidatePath("/analytics"); revalidatePath("/admin/sync");
    return { status: "success", message: "Naeron güncellendi", result: { success: true, table: "bi_flights", fetched: result.fetched, created: result.created, updated: result.updated, archived: result.archived, flights: result.completedFlights, aircraft: result.aircraftUpdated, cancelled: result.cancelledFlights, unmatchedInstructors: result.unmatchedInstructors, errors: result.errors, durationMs: result.durationMs, lastSuccessfulSyncAt: new Date().toISOString() } };
  } catch (error) {
    if (error instanceof NaeronSyncInProgressError) return { status: "running", message: "Senkronizasyon zaten çalışıyor." };
    const reason = error instanceof Error && /authentication|timed out|database|cursor/i.test(error.message) ? error.message : "Beklenmeyen sunucu hatası.";
    return { status: "error", message: `Naeron senkronizasyonu başarısız. ${reason} Mevcut veriler gösterilmeye devam ediyor.` };
  }
}
