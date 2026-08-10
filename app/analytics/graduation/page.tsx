import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { AnalyticsNav } from "@/src/components/analytics/analytics-nav";
import { requirePermission } from "@/src/lib/authz";
import { getGraduationRadar, GRADUATION_TASKS, type GraduationState } from "@/src/lib/analytics/graduation";

interface PageProps { searchParams: Promise<{ preset?: string; team?: string; student?: string }> }

const stateLabels: Record<GraduationState, string> = {
  BEFORE_INT10: "INT-10 öncesi", INT10_COMPLETED: "INT-10 tamamlandı", INT11_COMPLETED: "INT-11 tamamlandı",
  INT12_READY_FOR_GRADUATION_DAY: "INT-13/14 hazır", GRADUATED: "Mezun", CONTROL_REQUIRED: "Kontrol gerekli",
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function startDateFor(preset: string, selectedDate: string) {
  if (preset === "all") return null;
  const date = new Date(`${selectedDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (preset === "today" ? 0 : preset === "30" ? 29 : 6));
  return date.toISOString().slice(0, 10);
}

export default async function GraduationAnalyticsPage({ searchParams }: PageProps) {
  await connection(); await requirePermission("VIEW_DASHBOARD");
  const query = await searchParams;
  const data = await getGraduationRadar();
  const preset = ["today", "7", "30", "all"].includes(query.preset ?? "") ? query.preset! : "7";
  const selectedDate = data.selectedDate;
  const from = selectedDate ? startDateFor(preset, selectedDate) : null;
  const teams = ["Team 1", "Team 2", "Team 3", "Team 4", "Team Belirsiz"];
  const team = teams.includes(query.team ?? "") ? query.team! : "all";
  const students = data.students.filter((student) => team === "all" || student.team === team);
  const graduated = students.filter((student) => student.hasGraduated && student.taskDates["INT-14"] && (!from || student.taskDates["INT-14"]! >= from) && (!selectedDate || student.taskDates["INT-14"]! <= selectedDate));
  const detail = students.find((student) => student.studentId === query.student);
  const byDay = new Map<string, number>(); const byTeam = new Map<string, number>();
  for (const student of graduated) { const date = student.taskDates["INT-14"]!; byDay.set(date, (byDay.get(date) ?? 0) + 1); byTeam.set(student.team, (byTeam.get(student.team) ?? 0) + 1); }
  const maxDay = Math.max(1, ...byDay.values()); const maxTeam = Math.max(1, ...byTeam.values());
  const metrics = [
    ["Mezun öğrenciler", graduated.length, "text-emerald-600 dark:text-emerald-400"],
    ["INT-10 aşaması", students.filter((student) => student.state === "INT10_COMPLETED").length, "text-blue-600 dark:text-blue-400"],
    ["INT-11 aşaması", students.filter((student) => student.state === "INT11_COMPLETED").length, "text-amber-600 dark:text-amber-400"],
    ["INT-12 sonrası hazır", students.filter((student) => student.state === "INT12_READY_FOR_GRADUATION_DAY").length, "text-emerald-600 dark:text-emerald-400"],
    ["Kontrol gerekli", students.filter((student) => student.state === "CONTROL_REQUIRED").length, "text-red-600 dark:text-red-400"],
  ] as const;

  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <AppHeader title="Mezuniyet Analizi" subtitle="Tamamlanmış INT görevlerine göre öğrenci ilerlemesi" />
    <AnalyticsNav />
    <form className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <select name="preset" defaultValue={preset} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="today">Bugün</option><option value="7">7 gün</option><option value="30">30 gün</option><option value="all">Tümü</option></select>
      <select name="team" defaultValue={team} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="all">Tüm takımlar</option>{teams.map((item) => <option key={item}>{item}</option>)}</select>
      <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Uygula</button>
    </form>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label,value,color]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p></section>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">Günlük Mezuniyetler</h2><div className="mt-5 flex h-48 items-end gap-2 overflow-x-auto">{[...byDay].sort().map(([date,count]) => <div key={date} className="flex min-w-12 flex-1 flex-col items-center gap-2"><span className="text-xs font-semibold">{count}</span><div className="w-full rounded-t bg-emerald-500" style={{height:`${Math.max(4,count/maxDay*130)}px`}}/><span className="text-[10px] text-slate-500">{date.slice(5)}</span></div>)}{!byDay.size ? <p className="m-auto text-sm text-slate-500">Bu aralıkta mezuniyet yok.</p> : null}</div></section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">Takımlara Göre Mezuniyet</h2><div className="mt-5 space-y-3">{teams.map((item) => {const count=byTeam.get(item)??0;return <div key={item}><div className="mb-1 flex justify-between text-sm"><span>{item}</span><b>{count}</b></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{width:`${count/maxTeam*100}%`}}/></div></div>})}</div></section>
    </div>
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold">Öğrenci Durumları</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="px-4 py-3">Öğrenci</th><th className="px-4 py-3">Takım</th><th className="px-4 py-3">Son görev</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">Tahmin</th></tr></thead><tbody>{students.map((student) => <tr key={student.studentId} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3 font-semibold"><a href={`?preset=${preset}&team=${encodeURIComponent(team)}&student=${student.studentId}`} className="text-blue-600 hover:underline dark:text-blue-400">{student.studentName}</a></td><td className="px-4 py-3">{student.team}</td><td className="px-4 py-3">{student.latestFlight.task} · {dateLabel(student.latestFlight.date)}</td><td className="px-4 py-3">{stateLabels[student.state]}</td><td className="px-4 py-3">{student.earliestGraduationLabel ?? "—"}</td></tr>)}</tbody></table></div></section>
    {detail ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Öğrenci detayı</p><h2 className="mt-1 text-xl font-semibold">{detail.studentName}</h2><p className="text-sm text-slate-500">{detail.team} · {stateLabels[detail.state]}</p></div><p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">Muhtemel / en erken: {detail.earliestGraduationLabel ?? "Normal tahmin yok"}</p></div><div className="mt-5 grid gap-2 sm:grid-cols-5">{GRADUATION_TASKS.map((task) => <div key={task} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs font-bold text-slate-500">{task}</p><p className="mt-1 text-sm font-semibold">{detail.taskDates[task] ? `✓ ${dateLabel(detail.taskDates[task])}` : "—"}</p></div>)}</div><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Son ilgili uçuş</dt><dd className="text-sm font-medium">{dateLabel(detail.latestFlight.date)} · {detail.latestFlight.instructor ?? "—"} · {detail.latestFlight.aircraft ?? "—"}</dd></div><div><dt className="text-xs text-slate-500">En erken mezuniyet tarihi</dt><dd className="text-sm font-medium">{dateLabel(detail.earliestGraduationDate)}</dd></div></dl>{detail.anomalies.length ? <ul className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{detail.anomalies.map((item) => <li key={item}>• {item}</li>)}</ul> : null}</section> : null}
  </div></main>;
}
