import { notFound } from "next/navigation";
import { connection } from "next/server";
import { archiveFlight, updateFlight } from "@/app/imports/actions";
import { AppHeader } from "@/src/components/navigation/app-header";
import { requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { formatOperationalTime } from "@/src/lib/flights/time";

interface FlightEditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
}

export default async function FlightEditPage({ params, searchParams }: FlightEditPageProps) {
  await connection();
  const user = await requirePermission("EDIT_FLIGHTS");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [flight, personnel] = await Promise.all([
    prisma.flight.findUnique({ where: { id }, include: { aircraft: true, student: true } }),
    prisma.personnel.findMany({ orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!flight) notFound();
  const update = updateFlight.bind(null, id);
  const archive = archiveFlight.bind(null, id);
  const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800";
  const fields = [
    ["Sorti No", "sourceSortieNo", flight.sourceSortieNo ?? ""], ["Uçak", "aircraft", flight.aircraft.registration],
    ["Öğrenci", "studentName", flight.student?.displayName ?? flight.studentName ?? ""], ["Kalkış meydanı", "departureAirport", flight.departureAirport ?? ""],
    ["Varış meydanı", "arrivalAirport", flight.arrivalAirport ?? ""], ["Kalkış", "takeoffTime", formatOperationalTime(flight.takeoffTime)],
    ["İniş", "landingTime", formatOperationalTime(flight.landingTime)],
  ];
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl space-y-6">
    <AppHeader title="Uçuş Düzeltme" subtitle={`${flight.flightDate.toISOString().slice(0, 10)} · ${flight.aircraft.registration}`} />
    {query.message ? <div className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-300">{query.message}</div> : null}
    <form action={update} className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      {fields.map(([label, name, value]) => <label key={name} className="text-sm font-medium">{label}<input name={name} defaultValue={value} className={inputClass} /></label>)}
      <label className="text-sm font-medium">Öğretmen<select name="instructorId" defaultValue={flight.instructorId ?? ""} className={inputClass}><option value="">-</option>{personnel.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></label>
      {[["Sorti dakika", "sortieDurationMinutes", flight.sortieDurationMinutes], ["Havada dakika", "airborneDurationMinutes", flight.airborneDurationMinutes], ["Yer dakika", "groundDurationMinutes", flight.groundDurationMinutes]].map(([label, name, value]) => <label key={name as string} className="text-sm font-medium">{label}<input type="number" min="0" name={name as string} defaultValue={value ?? ""} className={inputClass} /></label>)}
      <label className="text-sm font-medium sm:col-span-2">Açıklama<textarea name="remarks" defaultValue={flight.remarks ?? ""} className={inputClass} /></label>
      <div className="flex justify-end sm:col-span-2"><button className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Kaydet</button></div>
    </form>
    {user.role === "ADMIN" ? <form action={archive} className="flex flex-wrap items-center justify-end gap-3"><label className="text-sm text-slate-600 dark:text-slate-400"><input type="checkbox" required name="confirmArchive" className="mr-2 accent-red-600" />Arşivlemeyi onaylıyorum</label><button className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">Arşivle</button></form> : null}
  </div></main>;
}
