import { getPersonnelList } from "@/src/lib/personnel";
import { getExpiryStatus } from "@/src/lib/expiry";

interface SummaryCardProps {
  title: string;
  value: string;
  hint: string;
}

function SummaryCard({ title, value, hint }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

export async function SummaryCards() {
  const personnel = await getPersonnelList();
  const activeFlying = personnel.filter((person) => person.isActiveFlying).length;
  const companies = new Set(personnel.map((person) => person.company).filter(Boolean)).size;
  const teams = new Set(personnel.map((person) => person.team).filter(Boolean)).size;

  const upcomingCredentials = personnel.filter((person) =>
    person.credentials.some((credential) => {
      const status = getExpiryStatus(credential.expiryDate);
      return status.status !== "unknown" && status.status !== "valid" && status.daysRemaining !== null && status.daysRemaining <= 90;
    }),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <SummaryCard title="Toplam Personel" value={personnel.length.toString()} hint="Kayıtlı öğretmenler" />
      <SummaryCard title="🟢 Active Flying" value={activeFlying.toString()} hint="Aktif uçuş personeli" />
      <SummaryCard title="⚪ Inactive" value={(personnel.length - activeFlying).toString()} hint="Aktif uçuşta değil" />
      <SummaryCard title="Şirketler" value={companies.toString()} hint="Toplam şirket" />
      <SummaryCard title="Ekipler" value={teams.toString()} hint="Toplam ekip" />
      <SummaryCard title="Yaklaşan Lisans Süreleri" value={upcomingCredentials.length.toString()} hint="90 güne kadar" />
    </div>
  );
}
