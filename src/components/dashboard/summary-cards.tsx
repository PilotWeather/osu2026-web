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
  const teamCounts = personnel.reduce<Record<string, number>>((acc, person) => {
    acc[person.team ?? "-"] = (acc[person.team ?? "-"] ?? 0) + 1;
    return acc;
  }, {});

  const upcomingCredentials = personnel.filter((person) =>
    person.credentials.some((credential) => {
      const status = getExpiryStatus(credential.expiryDate);
      return status.status !== "unknown" && status.status !== "valid" && status.daysRemaining !== null && status.daysRemaining <= 90;
    }),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <SummaryCard title="Toplam Öğretmen" value={personnel.length.toString()} hint="Aktif kayıtlı personel" />
      <SummaryCard title="Team 1" value={(teamCounts["Team 1"] ?? 0).toString()} hint="Ekip dağılımı" />
      <SummaryCard title="Team 2" value={(teamCounts["Team 2"] ?? 0).toString()} hint="Ekip dağılımı" />
      <SummaryCard title="Team 3" value={(teamCounts["Team 3"] ?? 0).toString()} hint="Ekip dağılımı" />
      <SummaryCard title="Team 4" value={(teamCounts["Team 4"] ?? 0).toString()} hint="Ekip dağılımı" />
      <SummaryCard title="Yaklaşan Lisans Süreleri" value={upcomingCredentials.length.toString()} hint="90 güne kadar" />
    </div>
  );
}
