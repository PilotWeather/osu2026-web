import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { FlightsTable, type FlightListItem } from "@/src/components/flights/flights-table";
import { can, requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { formatDuration, formatOperationalTime } from "@/src/lib/flights/time";
import { personnelDisplayName } from "@/src/lib/personnel-display";

interface FlightsPageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function FlightsPage({ searchParams }: FlightsPageProps) {
  await connection(); const user = await requirePermission("VIEW_DASHBOARD");
  const q = await searchParams;
  const date = q.date?.match(/^\d{4}-\d{2}-\d{2}$/) ? q.date : undefined;
  const flights = await prisma.flight.findMany({
    where: {
      archivedAt: null,
      archived: false,
      status: "COMPLETED",
      ...(date ? { flightDate: new Date(`${date}T00:00:00.000Z`) } : {}),
      ...(q.instructor ? { instructorId: q.instructor } : {}), ...(q.student ? { studentId: q.student } : {}), ...(q.aircraft ? { aircraftId: q.aircraft } : {}),
      ...(q.team ? { instructor: { teamId: q.team } } : {}), ...(q.company ? { instructor: { companyId: q.company } } : {}),
      ...(q.search ? { OR: [{ aircraft: { registration: { contains: q.search, mode: "insensitive" } } }, { studentName: { contains: q.search, mode: "insensitive" } }, { instructor: { OR: [{ canonicalFullName: { contains: q.search, mode: "insensitive" } }, { firstName: { contains: q.search, mode: "insensitive" } }, { lastName: { contains: q.search, mode: "insensitive" } }] } }] } : {}),
    },
    orderBy: [{ flightDate: "desc" }, { takeoffTime: "asc" }], take: 250,
    include: { aircraft: true, instructor: true, student: true, importBatch: { select: { originalFilename: true } } },
  });
  const [instructors, students, aircraft, teams, companies] = await Promise.all([
    prisma.personnel.findMany({ orderBy: { firstName: "asc" }, select: { id:true,firstName:true,lastName:true,canonicalFullName:true } }),
    prisma.student.findMany({ orderBy: { displayName: "asc" } }), prisma.aircraft.findMany({ orderBy: { registration: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }), prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);
  const items: FlightListItem[] = flights.map(f=>({id:f.id,date:f.flightDate.toISOString().slice(0,10),sortie:f.sourceSortieNo??f.externalPlanId??"-",aircraft:f.aircraft?.registration??"-",aircraftType:f.aircraft?.aircraftType??null,instructor:personnelDisplayName(f.instructor),student:f.student?.displayName??f.studentName??"-",takeoff:formatOperationalTime(f.takeoffTime),landing:formatOperationalTime(f.landingTime),duration:formatDuration(f.sortieDurationMinutes),departure:f.departureAirport??"-",arrival:f.arrivalAirport??"-",rules:f.flightRules??"-",runway:f.runway??"-",frequency:f.frequency??"-",remarks:f.remarks??"-",airborne:formatDuration(f.airborneDurationMinutes),ground:formatDuration(f.groundDurationMinutes),batch:f.importBatch?.originalFilename??"Naeron RestBI"}));
  const selectClass="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6"><AppHeader title="Tamamlanan Uçuşlar" subtitle="İçe aktarılan günlük uçuş kayıtları" />
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4 xl:grid-cols-7"><input className={selectClass} name="date" type="date" defaultValue={date}/><input className={selectClass} name="search" placeholder="Öğretmen, öğrenci, uçak" defaultValue={q.search}/><select className={selectClass} name="instructor" defaultValue={q.instructor}><option value="">Tüm öğretmenler</option>{instructors.map(x=><option key={x.id} value={x.id}>{personnelDisplayName(x)}</option>)}</select><select className={selectClass} name="student" defaultValue={q.student}><option value="">Tüm öğrenciler</option>{students.map(x=><option key={x.id} value={x.id}>{x.displayName}</option>)}</select><select className={selectClass} name="aircraft" defaultValue={q.aircraft}><option value="">Tüm uçaklar</option>{aircraft.map(x=><option key={x.id} value={x.id}>{x.registration}</option>)}</select><select className={selectClass} name="team" defaultValue={q.team}><option value="">Tüm ekipler</option>{teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><div className="flex gap-2"><select className={`${selectClass} min-w-0 flex-1`} name="company" defaultValue={q.company}><option value="">Tüm şirketler</option>{companies.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Filtrele</button></div></form>
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800">{items.length} kayıt (en fazla 250)</div><FlightsTable flights={items} canEdit={can(user.role,"EDIT_FLIGHTS")}/></section>
  </div></main>;
}
