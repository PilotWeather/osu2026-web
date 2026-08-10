import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { OperationTargetCard } from "@/src/components/dashboard/operation-target-card";
import { GraduationRadar } from "@/src/components/dashboard/graduation-radar";
import { requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { formatDuration, formatOperationalTime } from "@/src/lib/flights/time";
import { getGraduationRadar } from "@/src/lib/analytics/graduation";

interface OperationsPageProps { searchParams: Promise<{ date?: string; sort?: string }> }
export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  await connection(); await requirePermission("VIEW_DASHBOARD");
  const query = await searchParams;
  const [latest, operationTotals, syncState, graduationRadar] = await Promise.all([
    prisma.flight.findFirst({ where:{archivedAt:null,archived:false}, orderBy:{flightDate:"desc"}, select:{flightDate:true} }),
    prisma.flight.aggregate({
      where:{flightDate:{gte:new Date("2026-08-03T00:00:00.000Z"),lt:new Date("2026-09-12T00:00:00.000Z")},archivedAt:null,archived:false,status:"COMPLETED"},
      _sum:{sortieDurationMinutes:true},
      _count:{sortieDurationMinutes:true},
    }),
    prisma.naeronSyncState.findUnique({where:{tableName:"bi_flights"},select:{lastSuccessfulSyncAt:true}}),
    getGraduationRadar(),
  ]);
  const selectedDate = query.date?.match(/^\d{4}-\d{2}-\d{2}$/) ? query.date : latest?.flightDate.toISOString().slice(0,10);
  const allFlights = selectedDate ? await prisma.flight.findMany({where:{flightDate:new Date(`${selectedDate}T00:00:00.000Z`),archivedAt:null,archived:false},include:{aircraft:true,instructor:true,student:true},orderBy:query.sort==="landing"?{landingTime:"asc"}:{takeoffTime:"asc"}}) : [];
  const flights=allFlights.filter((flight)=>flight.status==="COMPLETED"); const cancelled=allFlights.filter((flight)=>flight.status==="CANCELLED");
  const totalMinutes=flights.reduce((sum,f)=>sum+(f.sortieDurationMinutes??0),0);
  const instructors=new Set(flights.map(f=>f.instructorId).filter(Boolean)); const students=new Set(flights.map(f=>f.studentId??f.studentName).filter(Boolean)); const aircraft=new Set(flights.map(f=>f.aircraftId));
  const hourly=new Map<number,number>(); for(const flight of flights){if(flight.landingTime){const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hour12:false,timeZone:"UTC"}).format(flight.landingTime));hourly.set(hour,(hourly.get(hour)??0)+1)}}
  const hours=hourly.size?Array.from({length:Math.max(...hourly.keys())-Math.min(...hourly.keys())+1},(_,i)=>Math.min(...hourly.keys())+i):[]; const maxHour=Math.max(1,...hourly.values());
  const cards=[["Toplam Kayıt",allFlights.length],["Tamamlanan",flights.length],["İptal",cancelled.length],["Toplam Uçuş Süresi",formatDuration(totalMinutes)],["Uçan FI",instructors.size],["Uçan Öğrenci",students.size],["Kullanılan Uçak",aircraft.size],["Ortalama Sorti Süresi",formatDuration(flights.length?Math.round(totalMinutes/flights.length):0)]];
  const cancellationReasons=new Map<string,number>(); for(const flight of cancelled){const reason=flight.cancellationReason?.trim()||"Belirtilmemiş";cancellationReasons.set(reason,(cancellationReasons.get(reason)??0)+1)}
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6"><AppHeader title="Operasyon Dashboard" subtitle="Tamamlanmış uçuşların günlük görünümü" />
    <OperationTargetCard completedMinutes={operationTotals._sum.sortieDurationMinutes ?? 0} completedSorties={operationTotals._count.sortieDurationMinutes} lastSyncAt={syncState?.lastSuccessfulSyncAt ?? null} />
    <GraduationRadar data={graduationRadar} />
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><label className="text-sm font-medium">Operasyon tarihi<input name="date" type="date" defaultValue={selectedDate} className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"/></label><button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Göster</button>{!latest?<p className="text-sm text-slate-500">Henüz içe aktarılmış uçuş yok.</p>:null}</form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold">Saatlik Tamamlanan Uçuşlar</h2><div className="mt-6 flex h-52 items-end gap-2">{hours.map(hour=><div key={hour} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${hour.toString().padStart(2,"0")}:00 · ${hourly.get(hour)??0} sorti`}><span className="text-xs font-semibold">{hourly.get(hour)??0}</span><div className="w-full rounded-t bg-blue-500" style={{height:`${Math.max(4,((hourly.get(hour)??0)/maxHour)*150)}px`}}/><span className="text-xs text-slate-500">{hour.toString().padStart(2,"0")}</span></div>)}{hours.length===0?<p className="m-auto text-sm text-slate-500">Bu tarih için veri yok.</p>:null}</div></section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Günlük Zaman Çizelgesi</h2><div className="flex gap-2 text-xs"><a href={`?date=${selectedDate??""}&sort=takeoff`} className="text-blue-600">Kalkış</a><a href={`?date=${selectedDate??""}&sort=landing`} className="text-blue-600">İniş</a></div></div><div className="mt-4 max-h-64 space-y-2 overflow-auto">{flights.map(f=><div key={f.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{query.sort==="landing"?formatOperationalTime(f.landingTime):formatOperationalTime(f.takeoffTime)}</span><span className="font-medium">{f.aircraft?.registration??"-"}</span><span className="truncate text-sm text-slate-500">{f.instructor?`${f.instructor.firstName} ${f.instructor.lastName}`:"-"} · {f.student?.displayName??f.studentName??"-"}</span></div>)}</div></section></div>
    {cancelled.length ? <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold">İptal Nedenleri</h2><div className="mt-4 space-y-2">{[...cancellationReasons].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([reason,count])=><div key={reason} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><span>{reason}</span><b>{count}</b></div>)}</div></section>:null}
  </div></main>;
}
