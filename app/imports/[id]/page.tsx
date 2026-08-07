import { notFound } from "next/navigation";
import { connection } from "next/server";
import { confirmFlightImport } from "@/app/imports/actions";
import { AppHeader } from "@/src/components/navigation/app-header";
import { can, requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import type { ParsedFlightRow } from "@/src/lib/flights/parser";
import { formatDuration } from "@/src/lib/flights/time";

interface ImportReviewPageProps { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; message?: string }> }

export default async function ImportReviewPage({ params, searchParams }: ImportReviewPageProps) {
  await connection();
  const user = await requirePermission("VIEW_DASHBOARD");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [batch, personnel] = await Promise.all([
    prisma.importBatch.findUnique({ where: { id }, include: { rows: { orderBy: { rowNumber: "asc" } }, flights: { select: { id: true } } } }),
    prisma.personnel.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!batch) notFound();
  const parsedRows = batch.rows.map((row) => ({ row, data: row.rawData as unknown as ParsedFlightRow }));
  const totalMinutes = parsedRows.filter((item) => item.data.flightStatus === "COMPLETED").reduce((sum, item) => sum + (item.data.sortieDurationMinutes ?? 0), 0);
  const ready = batch.rows.filter((row) => row.status === "READY").length;
  const warnings = batch.rows.filter((row) => row.status === "REVIEW").length;
  const action = confirmFlightImport.bind(null, batch.id);
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <AppHeader title="İçe Aktarma İncelemesi" subtitle={batch.originalFilename} eyebrow="Review & Confirm" />
    {query.message ? <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${query.status === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"}`}>{query.message}</div> : null}
    {!batch.validationPassed ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">PDF doğrulaması başarısız. Bu önizleme veritabanına aktarılamaz.</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{[["Planlanan",batch.sourceRows],["Tamamlanan",batch.completedRows],["İptal",batch.cancelledRows],["Hazır",ready],["Kontrol",warnings],["Tamamlanan Süre",formatDuration(totalMinutes)]].map(([label,value])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
    <form action={action} className="space-y-4"><section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80"><tr><th className="px-4 py-3">Sorti</th><th className="px-4 py-3">Uçak</th><th className="px-4 py-3">Öğretmen</th><th className="px-4 py-3">Öğrenci</th><th className="px-4 py-3">Kalkış</th><th className="px-4 py-3">İniş</th><th className="px-4 py-3">Süre</th><th className="px-4 py-3">Durum</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{parsedRows.map(({row,data})=><tr key={row.id}><td className="px-4 py-3">{data.sourceSortieNo ?? "-"}</td><td className="px-4 py-3 font-medium">{data.aircraftRegistration ?? "-"}</td><td className="px-4 py-3"><div className="mb-1 text-xs text-slate-500">{data.instructorName ?? "Kaynakta yok"}</div><select name={`instructor_${row.id}`} defaultValue={row.instructorId ?? ""} disabled={data.flightStatus === "CANCELLED" || row.status === "INVALID" || batch.status === "IMPORTED"} className="max-w-52 rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"><option value="">Eşleşme seçin</option>{personnel.map(person=><option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></td><td className="px-4 py-3">{data.studentName ?? "-"}</td><td className="px-4 py-3">{data.takeoffTime ?? "-"}</td><td className="px-4 py-3">{data.landingTime ?? "-"}</td><td className="px-4 py-3">{formatDuration(data.sortieDurationMinutes)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "READY" || row.status === "IMPORTED" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : row.status === "CANCELLED" ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : row.status === "INVALID" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>{row.status}</span>{row.warning ? <p className="mt-1 max-w-52 text-xs text-amber-700 dark:text-amber-300">{row.warning}</p> : null}</td></tr>)}</tbody></table></div></section>
      {batch.status !== "IMPORTED" && batch.validationPassed && can(user.role,"IMPORT_PDF") ? <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-600 dark:text-slate-400">{batch.validRows} tamamlanan kayıt · {formatDuration(totalMinutes)} · {batch.warningRows} uyarı</p><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Uçuşları İçe Aktar</button></div> : null}
    </form>
  </div></main>;
}
