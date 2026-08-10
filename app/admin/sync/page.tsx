import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { getAuthorizedUser } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { runFullSyncAction, runIncrementalSyncAction } from "@/app/admin/sync/actions";

interface SyncPageProps { searchParams: Promise<{ batch?: string; status?: string; message?: string }> }
export const maxDuration = 300;
const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function NaeronSyncPage({ searchParams }: SyncPageProps) {
  await connection(); const [user, query] = await Promise.all([getAuthorizedUser(), searchParams]);
  if (!user) redirect("/login"); if (user.role === "VIEWER") redirect("/");
  const [state, selectedBatch, latestBatch] = await Promise.all([
    prisma.naeronSyncState.findUnique({ where: { tableName: "bi_flights" } }),
    query.batch ? prisma.naeronSyncBatch.findUnique({ where: { id: query.batch } }) : null,
    prisma.naeronSyncBatch.findFirst({ where: { tableName: "bi_flights" }, orderBy: { startedAt: "desc" } }),
  ]);
  const batch = selectedBatch ?? latestBatch;
  const duration = batch?.completedAt ? batch.completedAt.getTime() - batch.startedAt.getTime() : null;
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <AppHeader title="Naeron Senkronizasyonu" subtitle="RestBI V2 uçuş ve uçak verilerini PostgreSQL ile eşitleyin" eyebrow="Operations Data" />
    {query.message ? <div role="status" className={`rounded-2xl border p-4 text-sm ${query.status === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700"}`}>{query.message}</div> : null}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Durum", state?.lastError ? "Hata" : state?.lastSuccessfulSyncAt ? "Hazır" : "İlk sync bekleniyor"],
      ["Son başarılı", state?.lastSuccessfulSyncAt ? dateTime.format(state.lastSuccessfulSyncAt) : "-"],
      ["Son full sync", state?.lastFullSyncAt ? dateTime.format(state.lastFullSyncAt) : "-"],
      ["Son hata", state?.lastError ?? "-"],
    ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</section>
    <section className="grid gap-5 lg:grid-cols-2"><form action={runIncrementalSyncAction} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold">Incremental Sync</h2><p className="mt-2 text-sm text-slate-500">Kayıtlı changes/deleted cursor’larından devam eder. ADMIN ve DATA_MANAGER çalıştırabilir.</p><button disabled={!state?.lastFullSyncAt} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Uçuşları Güncelle</button></form>
      {user.role === "ADMIN" ? <form action={runFullSyncAction} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10"><h2 className="text-lg font-semibold">Full Sync</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Tüm snapshot’ı işler, ardından changes ve deleted akışlarını tüketir.</p><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="confirmFullSync" value="yes"/>Tüm geçmiş senkronizasyonunu onaylıyorum.</label><button className="mt-4 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">Full Sync</button></form> : null}</section>
    {batch ? <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sonuç</p><h2 className="mt-1 text-xl font-semibold">{batch.mode} · {batch.success ? "Başarılı" : batch.completedAt ? "Başarısız" : "Çalışıyor"}</h2></div><span className="text-sm text-slate-500">{dateTime.format(batch.startedAt)}</span></div>{batch.errorMessage ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{batch.errorMessage}</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{[
        ["Fetched",batch.fetched],["Created",batch.created],["Updated",batch.updated],["Archived",batch.archived],["Completed",batch.completedFlights],["Cancelled",batch.cancelledFlights],["Unmatched FI",batch.unmatchedInstructors],["Unmatched students",batch.unmatchedStudents],["Aircraft",batch.aircraftUpdated],["Duration",duration === null ? "-" : `${(duration/1000).toFixed(1)}s`],
      ].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div></section> : null}
  </div></main>;
}
