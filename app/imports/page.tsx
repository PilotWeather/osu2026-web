import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { PdfUpload } from "@/src/components/imports/pdf-upload";
import { can, requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";

interface ImportsPageProps { searchParams: Promise<{ status?: string; message?: string }> }
const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  await connection();
  const user = await requirePermission("VIEW_DASHBOARD");
  const params = await searchParams;
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" }, take: 50,
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
      <AppHeader title="Günlük Uçuş Kaydı İçe Aktar" subtitle="Uçuş Kontrol Kulesi günlük uçuş kayıt PDF'sini yükleyin." eyebrow="Completed Flights" />
      {params.message ? <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${params.status === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"}`}>{params.message}</div> : null}
      {can(user.role, "IMPORT_PDF") ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><PdfUpload /></section> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">VIEWER rolü içe aktarma yapamaz. Geçmiş kayıtları görüntüleyebilirsiniz.</div>}
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="text-lg font-semibold">İçe Aktarma Geçmişi</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80"><tr><th className="px-5 py-3">Yükleme</th><th className="px-5 py-3">Dosya</th><th className="px-5 py-3">Uçuş Tarihi</th><th className="px-5 py-3">Satır</th><th className="px-5 py-3">İçe Aktarılan</th><th className="px-5 py-3">Uyarı</th><th className="px-5 py-3">Yükleyen</th><th className="px-5 py-3">Durum</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{batches.map((batch) => <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40"><td className="px-5 py-3">{dateFormat.format(batch.createdAt)}</td><td className="px-5 py-3 font-medium"><Link href={`/imports/${batch.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{batch.originalFilename}</Link></td><td className="px-5 py-3">{batch.flightDate?.toISOString().slice(0,10) ?? "-"}</td><td className="px-5 py-3">{batch.totalRows}</td><td className="px-5 py-3">{batch.importedRows}</td><td className="px-5 py-3">{batch.warningRows}</td><td className="px-5 py-3">{batch.uploadedBy?.name ?? batch.uploadedBy?.email ?? "-"}</td><td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">{batch.status}</span></td></tr>)}</tbody></table></div></section>
    </div></main>
  );
}
