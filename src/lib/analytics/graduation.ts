import "server-only";

import { prisma } from "@/src/lib/db";
import { personnelDisplayName } from "@/src/lib/personnel-display";

export const GRADUATION_TASKS = ["INT-10", "INT-11", "INT-12", "INT-13", "INT-14"] as const;
export type GraduationTask = (typeof GRADUATION_TASKS)[number];
export type GraduationState = "BEFORE_INT10" | "INT10_COMPLETED" | "INT11_COMPLETED" | "INT12_READY_FOR_GRADUATION_DAY" | "GRADUATED" | "CONTROL_REQUIRED";
export type GraduationTeam = "Team 1" | "Team 2" | "Team 3" | "Team 4" | "Team Belirsiz";

export interface RelevantFlight {
  id: string;
  task: GraduationTask;
  date: string;
  instructor: string | null;
  aircraft: string | null;
  team: GraduationTeam;
}

export interface StudentGraduationProgress {
  studentId: string;
  studentName: string;
  naeronPersonId: string | null;
  naeronVmId: string | null;
  state: GraduationState;
  hasGraduated: boolean;
  team: GraduationTeam;
  taskDates: Record<GraduationTask, string | null>;
  latestFlight: RelevantFlight;
  anomalies: string[];
  earliestGraduationDate: string | null;
  earliestGraduationLabel: string | null;
  int11And12SameSelectedDay: boolean;
}

export interface GraduationRadarData {
  selectedDate: string | null;
  students: StudentGraduationProgress[];
  todayInt10: StudentGraduationProgress[];
  todayInt11: StudentGraduationProgress[];
  todayInt12: StudentGraduationProgress[];
  graduatedToday: StudentGraduationProgress[];
  controlRequired: StudentGraduationProgress[];
  readyNextDay: StudentGraduationProgress[];
  withinTwoDays: StudentGraduationProgress[];
}

export function normalizeGraduationTask(value: string | null | undefined): GraduationTask | null {
  if (!value) return null;
  const normalized = value.trim().toLocaleUpperCase("en-US").replace(/[‐‑‒–—−]/g, "-");
  // Naeron duty labels may append a task qualifier (for example "INT-12 M.T.").
  // Only accept an INT-10..14 prefix followed by whitespace, never another task code.
  const match = normalized.match(/^INT[\s-]*(1[0-4])(?:\s+[^\s].*)?$/);
  return match ? `INT-${match[1]}` as GraduationTask : null;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return dateKey(value);
}

// Student currently has no direct Team relation. Keep the instructor-based fallback
// isolated so a reliable Student.team source can replace it without changing the engine.
function teamFromLatestInstructor(teamName: string | null | undefined): GraduationTeam {
  if (!teamName) return "Team Belirsiz";
  const number = teamName.match(/(?:^|\D)([1-4])(?:\D|$)/)?.[1];
  return number ? `Team ${number}` as GraduationTeam : "Team Belirsiz";
}

function stateFrom(taskDates: Record<GraduationTask, string | null>, anomalies: string[]): GraduationState {
  if (anomalies.length) return "CONTROL_REQUIRED";
  if (taskDates["INT-14"]) return "GRADUATED";
  if (taskDates["INT-12"]) return "INT12_READY_FOR_GRADUATION_DAY";
  if (taskDates["INT-11"]) return "INT11_COMPLETED";
  if (taskDates["INT-10"]) return "INT10_COMPLETED";
  return "BEFORE_INT10";
}

function sequenceAnomalies(flights: RelevantFlight[]) {
  const anomalies = new Set<string>();
  const byTask = new Map<GraduationTask, RelevantFlight[]>();
  const byDateTask = new Map<string, number>();
  const byDate = new Map<string, number>();
  for (const flight of flights) {
    const list = byTask.get(flight.task) ?? [];
    list.push(flight);
    byTask.set(flight.task, list);
    const key = `${flight.date}:${flight.task}`;
    byDateTask.set(key, (byDateTask.get(key) ?? 0) + 1);
    byDate.set(flight.date, (byDate.get(flight.date) ?? 0) + 1);
  }

  const dates13 = new Set((byTask.get("INT-13") ?? []).map((flight) => flight.date));
  const dates14 = new Set((byTask.get("INT-14") ?? []).map((flight) => flight.date));
  for (const date of dates13) if (!dates14.has(date)) anomalies.add(`${date}: INT-13 tamamlandı, aynı gün INT-14 bulunamadı.`);
  for (const date of dates14) if (!dates13.has(date)) anomalies.add(`${date}: INT-14 tamamlandı, aynı gün INT-13 bulunamadı.`);
  for (const [key, count] of byDateTask) if (count > 1) anomalies.add(`${key.replace(":INT", ": INT")}: aynı görev ${count} kez kaydedilmiş.`);
  for (const [date, count] of byDate) if (count > 2) anomalies.add(`${date}: bir günde ${count} ilgili INT sortisi kaydedilmiş (azami 2).`);

  const first = (task: GraduationTask) => byTask.get(task)?.[0]?.date ?? null;
  const first10 = first("INT-10"); const first11 = first("INT-11"); const first12 = first("INT-12");
  const first13 = first("INT-13"); const first14 = first("INT-14");
  if (first11 && !first10) anomalies.add("INT-11 mevcut, öncesinde INT-10 kaydı bulunamadı.");
  if (first12 && !first11) anomalies.add("INT-12 mevcut, öncesinde INT-11 kaydı bulunamadı.");
  if ((first13 || first14) && !first12) anomalies.add("INT-13/14 mevcut, öncesinde INT-12 kaydı bulunamadı.");
  if (first10 && first11 && first10 > first11) anomalies.add("INT-11, INT-10'dan önce tamamlanmış.");
  if (first11 && first12 && first11 > first12) anomalies.add("INT-12, INT-11'den önce tamamlanmış.");
  const laterDates = (["INT-11", "INT-12", "INT-13", "INT-14"] as GraduationTask[]).flatMap((task) => (byTask.get(task) ?? []).map((flight) => flight.date));
  const last10 = byTask.get("INT-10")?.at(-1)?.date;
  if (last10 && laterDates.some((date) => date < last10)) anomalies.add("INT-10, daha ileri bir INT görevinden sonra tekrar kaydedilmiş.");
  return [...anomalies];
}

function estimate(state: GraduationState, selectedDate: string) {
  if (state === "GRADUATED") return { date: selectedDate, label: "Mezun" };
  if (state === "INT12_READY_FOR_GRADUATION_DAY") return { date: addDays(selectedDate, 1), label: "En erken yarın" };
  if (state === "INT10_COMPLETED" || state === "INT11_COMPLETED") return { date: addDays(selectedDate, 2), label: "En erken 2 gün içinde" };
  return { date: null, label: null };
}

export async function getGraduationRadar(): Promise<GraduationRadarData> {
  const [latestCompleted, candidateFlights] = await Promise.all([
    prisma.flight.findFirst({
      where: { status: "COMPLETED", archived: false, archivedAt: null },
      orderBy: [{ flightDate: "desc" }, { takeoffTime: "desc" }],
      select: { flightDate: true },
    }),
    prisma.flight.findMany({
      where: {
        status: "COMPLETED", archived: false, archivedAt: null, studentId: { not: null }, trainingTask: { contains: "INT", mode: "insensitive" },
      },
      orderBy: [{ flightDate: "asc" }, { takeoffTime: "asc" }, { id: "asc" }],
      select: {
        id: true, flightDate: true, trainingTask: true,
        student: { select: { id: true, displayName: true, naeronPersonId: true, naeronVmId: true } },
        instructor: { select: { firstName: true, lastName: true, canonicalFullName: true, team: { select: { name: true } } } },
        aircraft: { select: { registration: true } },
      },
    }),
  ]);

  const selectedDate = latestCompleted ? dateKey(latestCompleted.flightDate) : null;
  if (!selectedDate) return { selectedDate: null, students: [], todayInt10: [], todayInt11: [], todayInt12: [], graduatedToday: [], controlRequired: [], readyNextDay: [], withinTwoDays: [] };

  const grouped = new Map<string, { student: NonNullable<(typeof candidateFlights)[number]["student"]>; flights: RelevantFlight[] }>();
  for (const row of candidateFlights) {
    const task = normalizeGraduationTask(row.trainingTask);
    if (!task || !row.student) continue;
    const group = grouped.get(row.student.id) ?? { student: row.student, flights: [] };
    group.flights.push({
      id: row.id, task, date: dateKey(row.flightDate),
      instructor: row.instructor ? personnelDisplayName(row.instructor) : null,
      aircraft: row.aircraft?.registration ?? null,
      team: teamFromLatestInstructor(row.instructor?.team?.name),
    });
    grouped.set(row.student.id, group);
  }

  const students = [...grouped.values()].map(({ student, flights }): StudentGraduationProgress => {
    const taskDates = Object.fromEntries(GRADUATION_TASKS.map((task) => [task, null])) as Record<GraduationTask, string | null>;
    for (const flight of flights) taskDates[flight.task] = flight.date;
    const anomalies = sequenceAnomalies(flights);
    const state = stateFrom(taskDates, anomalies);
    const latestFlight = flights.at(-1)!;
    const earliest = estimate(state, selectedDate);
    return {
      studentId: student.id, studentName: student.displayName, naeronPersonId: student.naeronPersonId, naeronVmId: student.naeronVmId,
      state, hasGraduated: Boolean(taskDates["INT-14"]), team: latestFlight.team, taskDates, latestFlight, anomalies,
      earliestGraduationDate: earliest.date, earliestGraduationLabel: earliest.label,
      int11And12SameSelectedDay: taskDates["INT-11"] === selectedDate && taskDates["INT-12"] === selectedDate,
    };
  }).sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));

  const onDate = (student: StudentGraduationProgress, task: GraduationTask) => student.taskDates[task] === selectedDate;
  return {
    selectedDate, students,
    todayInt10: students.filter((student) => onDate(student, "INT-10")),
    todayInt11: students.filter((student) => onDate(student, "INT-11")),
    todayInt12: students.filter((student) => onDate(student, "INT-12")),
    graduatedToday: students.filter((student) => student.hasGraduated && onDate(student, "INT-14")),
    controlRequired: students.filter((student) => student.state === "CONTROL_REQUIRED"),
    readyNextDay: students.filter((student) => student.state === "INT12_READY_FOR_GRADUATION_DAY"),
    withinTwoDays: students.filter((student) => student.state === "INT10_COMPLETED" || student.state === "INT11_COMPLETED"),
  };
}
