import { SummaryCards } from "@/src/components/dashboard/summary-cards";
import { PersonnelTable } from "@/src/components/dashboard/personnel-table";
import { getPersonnelList } from "@/src/lib/personnel";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { UserMenu } from "@/src/components/auth/user-menu";
import { requirePermission } from "@/src/lib/authz";
import { connection } from "next/server";

export default async function HomePage() {
  await connection();
  await requirePermission("VIEW_DASHBOARD");
  const personnel = await getPersonnelList();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] px-4 py-6 text-slate-900 dark:bg-[linear-gradient(180deg,#0b0f19_0%,#0d1320_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">ÖSU 2026</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">Uçuş Öğretmenleri</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Personel, ekip ve lisans geçerlilik takibi
              </p>
            </div>
            <div className="flex items-start gap-3">
              <UserMenu />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <SummaryCards />

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Personel Listesi</h2>
              {/* TODO(public-release): Restore masking for sensitive personnel fields before public release. */}
              <p className="text-sm text-slate-500 dark:text-slate-400">Yetkili kullanıcılar için dahili operasyon görünümü</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {personnel.length} kayıt
            </div>
          </div>
          <PersonnelTable personnel={personnel} />
        </section>
      </div>
    </main>
  );
}
