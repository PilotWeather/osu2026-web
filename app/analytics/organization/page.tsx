import { connection } from "next/server";
import { AppHeader } from "@/src/components/navigation/app-header";
import { AnalyticsNav, RangeFilter } from "@/src/components/analytics/analytics-nav";
import { requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { analyticsRange } from "@/src/lib/flights/range";
import { formatDuration } from "@/src/lib/flights/time";

interface OrganizationPageProps { searchParams: Promise<Record<string, string | undefined>> }
interface OrganizationValue { count: number; minutes: number; instructors: Set<string>; students: Set<string> }

function OrganizationTable({ title, data }: { title: string; data: Map<string, OrganizationValue> }) {
  return <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><h2 className="p-5 text-lg font-semibold">{title}</h2><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr>{[title.slice(0, -1), "Sorties", "Duration", "Instructors", "Students"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{Array.from(data).sort((a, b) => b[1].minutes - a[1].minutes).map(([name, value]) => <tr key={name} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3 font-semibold">{name}</td><td className="px-4 py-3">{value.count}</td><td className="px-4 py-3">{formatDuration(value.minutes)}</td><td className="px-4 py-3">{value.instructors.size}</td><td className="px-4 py-3">{value.students.size}</td></tr>)}</tbody></table></section>;
}

export default async function OrganizationPage({ searchParams }: OrganizationPageProps) {
  await connection(); await requirePermission("VIEW_DASHBOARD");
  const query = await searchParams; const { from, to } = analyticsRange(query);
  const flights = await prisma.flight.findMany({ where: { flightDate: { gte: from, lte: to }, archivedAt: null, instructorId: { not: null } }, select: { sortieDurationMinutes: true, instructorId: true, studentId: true, instructor: { select: { team: { select: { name: true } }, company: { select: { name: true } } } } } });
  const aggregate = (kind: "team" | "company") => {
    const map = new Map<string, OrganizationValue>();
    for (const flight of flights) {
      const name = flight.instructor?.[kind]?.name;
      if (!name || !flight.instructorId) continue;
      const value = map.get(name) ?? { count: 0, minutes: 0, instructors: new Set<string>(), students: new Set<string>() };
      value.count += 1; value.minutes += flight.sortieDurationMinutes ?? 0; value.instructors.add(flight.instructorId); if (flight.studentId) value.students.add(flight.studentId); map.set(name, value);
    }
    return map;
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0f19] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6"><AppHeader title="Organization Analytics" subtitle="Ekip ve şirket karşılaştırmaları" /><AnalyticsNav /><RangeFilter preset={query.preset} from={query.from} to={query.to} /><div className="grid gap-6 lg:grid-cols-2"><OrganizationTable title="Teams" data={aggregate("team")} /><OrganizationTable title="Companies" data={aggregate("company")} /></div></div></main>;
}
