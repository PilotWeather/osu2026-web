import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/db";
import { normalizePersonName } from "../src/lib/flights/normalize";
import { parseCompletedFlightsPdf } from "../src/lib/flights/parser";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: npm run test:flight-parser -- <pdf-path>");
  const personnel = await prisma.personnel.findMany({ select: { firstName: true, lastName: true } });
  const personnelNames = personnel.map((person) => `${person.firstName} ${person.lastName}`);
  const result = await parseCompletedFlightsPdf(new Uint8Array(await readFile(path)), personnelNames);
  const known = new Set(personnelNames.map(normalizePersonName));
  const instructors = [...new Set(result.rows.map((row) => row.instructorName).filter((value): value is string => Boolean(value)))];
  const students = new Set(result.rows.map((row) => normalizePersonName(row.studentName)).filter(Boolean));
  const registrations = new Set(result.rows.map((row) => row.aircraftRegistration).filter(Boolean));
  const unmatched = instructors.filter((name) => !known.has(normalizePersonName(name)));
  console.log(JSON.stringify({ flightDate: result.flightDate, validation: result.validation,
    aircraftCount: registrations.size, studentCount: students.size, instructorCount: instructors.length,
    matchedInstructorCount: instructors.length - unmatched.length, unmatchedInstructors: unmatched,
    warnings: result.warnings }, null, 2));
  if (!result.validation.passed) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
