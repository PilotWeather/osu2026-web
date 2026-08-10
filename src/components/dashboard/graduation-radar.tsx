import Link from "next/link";
import type { GraduationRadarData, GraduationState, GraduationTask, StudentGraduationProgress } from "@/src/lib/analytics/graduation";
import { GRADUATION_TASKS } from "@/src/lib/analytics/graduation";

const stateLabels: Record<GraduationState, string> = {
  BEFORE_INT10: "INT-10 öncesi",
  INT10_COMPLETED: "INT-10 tamamlandı",
  INT11_COMPLETED: "INT-11 tamamlandı",
  INT12_READY_FOR_GRADUATION_DAY: "Mezuniyet gününe hazır",
  GRADUATED: "Mezun",
  CONTROL_REQUIRED: "Kontrol gerekli",
};

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function StudentProgress({ student, showInt12Today }: { student: StudentGraduationProgress; showInt12Today?: string | null }) {
  const critical = student.state === "CONTROL_REQUIRED";
  return (
    <details className="group rounded-xl border border-slate-200 bg-white open:shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{student.studentName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{student.team} · Son görev {student.latestFlight.task}{showInt12Today ? ` · ${student.taskDates["INT-12"] === showInt12Today ? "INT-12 ✓" : "INT-12 bekliyor"}` : ""}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${critical ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : student.state === "GRADUATED" || student.state === "INT12_READY_FOR_GRADUATION_DAY" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>{stateLabels[student.state]}</span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-3 text-sm dark:border-slate-700">
        <div className="grid grid-cols-5 gap-1.5">
          {GRADUATION_TASKS.map((task) => <div key={task} className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800"><p className="text-[10px] font-bold text-slate-500">{task}</p><p className={`mt-1 text-xs font-semibold ${student.taskDates[task] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{student.taskDates[task] ? `✓ ${shortDate(student.taskDates[task])}` : "—"}</p></div>)}
        </div>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div><dt className="text-slate-500">Son ilgili uçuş</dt><dd className="font-medium">{shortDate(student.latestFlight.date)} · {student.latestFlight.instructor ?? "Öğretmen belirsiz"} · {student.latestFlight.aircraft ?? "Uçak belirsiz"}</dd></div>
          <div><dt className="text-slate-500">Muhtemel / en erken</dt><dd className="font-medium">{student.earliestGraduationLabel ? `${student.earliestGraduationLabel} · ${shortDate(student.earliestGraduationDate)}` : "Normal tahmin yok"}</dd></div>
        </dl>
        {student.anomalies.length ? <ul className="mt-3 space-y-1 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{student.anomalies.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
        <Link href={`/analytics/graduation?student=${student.studentId}`} className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">Öğrenci detayını aç →</Link>
      </div>
    </details>
  );
}

function StudentList({ students, empty = "Öğrenci yok", showInt12Today }: { students: StudentGraduationProgress[]; empty?: string; showInt12Today?: string | null }) {
  if (!students.length) return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">{empty}</p>;
  return <div className="space-y-2">{students.map((student) => <StudentProgress key={student.studentId} student={student} showInt12Today={showInt12Today} />)}</div>;
}

function completedToday(student: StudentGraduationProgress, task: GraduationTask, selectedDate: string | null) {
  return Boolean(selectedDate && student.taskDates[task] === selectedDate);
}

export function GraduationRadar({ data }: { data: GraduationRadarData }) {
  const teams = ["Team 1", "Team 2", "Team 3", "Team 4", "Team Belirsiz"] as const;
  const summary = [
    ["Bugün INT-10", data.todayInt10.length, "blue"],
    ["Bugün INT-11", data.todayInt11.length, "amber"],
    ["INT-13/14 Hazır", data.readyNextDay.length, "green"],
    ["Bugün Mezun", data.graduatedToday.length, "green"],
    ["Kontrol Gerekli", data.controlRequired.length, "red"],
  ] as const;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Operasyonel takip</p><h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Mezuniyet Radarı</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Seçili operasyon tarihi: {shortDate(data.selectedDate)} · Yalnızca tamamlanmış INT uçuşları</p></div>
        <Link href="/analytics/graduation" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Tüm mezuniyet analizi</Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${color === "red" ? "text-red-600 dark:text-red-400" : color === "green" ? "text-emerald-600 dark:text-emerald-400" : color === "amber" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>{value}</p></div>)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {teams.map((team) => {
          const students = data.students.filter((student) => student.team === team);
          const rows = [
            ["Bugün INT-10", students.filter((student) => completedToday(student, "INT-10", data.selectedDate)).length],
            ["Bugün INT-11", students.filter((student) => completedToday(student, "INT-11", data.selectedDate)).length],
            ["INT-12 tamam / hazır", students.filter((student) => student.state === "INT12_READY_FOR_GRADUATION_DAY").length],
            ["Bugün mezun", students.filter((student) => student.hasGraduated && completedToday(student, "INT-14", data.selectedDate)).length],
            ["Kontrol gerekli", students.filter((student) => student.state === "CONTROL_REQUIRED").length],
          ];
          return <details key={team} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" open={team !== "Team Belirsiz"}><summary className="cursor-pointer list-none font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{team}<span className="float-right text-sm text-slate-400">{students.length}</span></summary><dl className="mt-3 space-y-2">{rows.map(([label,value]) => <div key={label} className="flex justify-between text-xs"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></details>;
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-500/5"><h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Yarın Mezun Olabilir</h3><p className="mb-3 mt-1 text-xs text-emerald-700/70 dark:text-emerald-400/70">INT-12 tamamlandı; bu bir plan değil, en erken operasyonel tahmindir.</p><StudentList students={data.readyNextDay} /></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-500/5"><h3 className="font-semibold text-amber-800 dark:text-amber-300">2 Gün İçinde</h3><p className="mb-3 mt-1 text-xs text-amber-700/70 dark:text-amber-400/70">INT-10 veya INT-11 aşamasındaki en erken tahmin.</p><StudentList students={data.withinTwoDays} /></div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[{title:"Bugün INT-10 Uçanlar",students:data.todayInt10},{title:"Bugün INT-11 Uçanlar",students:data.todayInt11,int11:true},{title:"Bugün INT-12 Tamamlayanlar",students:data.todayInt12},{title:"Bugün Mezun Olanlar",students:data.graduatedToday}].map((group) => <div key={group.title}><h3 className="mb-3 font-semibold">{group.title}</h3><StudentList students={group.students} showInt12Today={group.int11 ? data.selectedDate : null} /></div>)}
      </div>
      <div className="mt-5"><h3 className="mb-3 font-semibold text-red-700 dark:text-red-300">Kontrol Gerekli</h3><StudentList students={data.controlRequired} empty="INT sıralama anomalisi bulunmadı." /></div>
    </section>
  );
}
