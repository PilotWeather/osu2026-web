import { SummaryCards } from "@/src/components/dashboard/summary-cards";
import { PersonnelTable } from "@/src/components/dashboard/personnel-table";
import { getPersonnelList } from "@/src/lib/personnel";

export default async function HomePage() {
  const personnel = await getPersonnelList();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">ÖSU 2026</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Uçuş Öğretmenleri</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Personel, ekip ve lisans geçerlilik takibi
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">MVP görünüm</p>
              <p>Geliştirmeye hazır, üretime yakın operasyon arayüzü</p>
            </div>
          </div>
        </header>

        <SummaryCards />

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Personel Listesi</h2>
              <p className="text-sm text-slate-500">Özel veriler gizlenmiş, yönetim paneli odaklı görünüm</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
              {personnel.length} kayıt
            </div>
          </div>
          <PersonnelTable personnel={personnel} />
        </section>
      </div>
    </main>
  );
}
