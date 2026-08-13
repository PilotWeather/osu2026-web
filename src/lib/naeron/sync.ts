if (typeof window !== "undefined") throw new Error("Naeron synchronization is server-only.");

import { FlightStatus, NaeronSyncMode, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/db";
import { normalizeAircraftRegistration, normalizePersonName } from "@/src/lib/flights/normalize";
import { getNaeronChanges, getNaeronDeleted, getNaeronSnapshot, type NaeronAircraftRow, type NaeronFlightRow, type NaeronPage } from "@/src/lib/naeron/client";
import { naeronMinutesFromMidnight, parseNaeronDate } from "@/src/lib/naeron/time";
import { autoReconcileNaeronPersonnel, linkNaeronInstructor } from "@/src/lib/naeron/personnel-reconciliation";

const FLIGHTS_TABLE = "bi_flights";
const AIRCRAFT_TABLE = "bi_aircrafts_simulators";
const PAGE_SIZE = 250;
const LOCK_TIMEOUT_MS = 15 * 60 * 1_000;

export class NaeronSyncInProgressError extends Error {
  constructor() { super("Senkronizasyon zaten çalışıyor."); this.name = "NaeronSyncInProgressError"; }
}

export interface NaeronSyncResult {
  batchId: string; fetched: number; created: number; updated: number; archived: number;
  completedFlights: number; cancelledFlights: number; unmatchedInstructors: number;
  unmatchedStudents: number; aircraftUpdated: number; errors: number; durationMs: number;
}

interface MatchContext {
  personnelByEmployee: Map<string, Set<string>>; personnelByVm: Map<string, Set<string>>; personnelByName: Map<string, Set<string>>; personnelByAlias: Map<string, Set<string>>; reconciledPersonnel: Set<string>;
  studentsByPerson: Map<string, string>; studentsByVm: Map<string, string>; studentsByName: Map<string, string>;
  aircraftByExternal: Map<string, string>; aircraftByVm: Map<string, string>; aircraftByRegistration: Map<string, string>;
  aircraftUpdatedById: Map<string, Date>;
}

function addName(map: Map<string, Set<string>>, name: string, id: string) {
  const ids = map.get(name) ?? new Set<string>(); ids.add(id); map.set(name, ids);
}

async function acquireSyncLock(triggeredByEmail?: string) {
  await prisma.naeronSyncState.upsert({ where: { tableName: FLIGHTS_TABLE }, update: {}, create: { tableName: FLIGHTS_TABLE } });
  const token = randomUUID(); const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);
  const locked = await prisma.naeronSyncState.updateMany({
    where: { tableName: FLIGHTS_TABLE, OR: [{ syncLockToken: null }, { syncLockedAt: { lt: staleBefore } }] },
    data: { syncLockToken: token, syncLockedAt: new Date(), syncLockedByEmail: triggeredByEmail ?? null },
  });
  if (locked.count !== 1) throw new NaeronSyncInProgressError();
  return token;
}

async function releaseSyncLock(token: string) {
  await prisma.naeronSyncState.updateMany({ where: { tableName: FLIGHTS_TABLE, syncLockToken: token }, data: { syncLockToken: null, syncLockedAt: null, syncLockedByEmail: null } });
}

async function createContext(): Promise<MatchContext> {
  const [personnel, students, aircraft] = await Promise.all([
    prisma.personnel.findMany({ select: { id: true, firstName: true, lastName: true, canonicalFullName: true, naeronEmployeeId: true, naeronVmId: true, aliases: { select: { normalizedAlias: true } } } }),
    prisma.student.findMany({ select: { id: true, normalizedName: true, naeronPersonId: true, naeronVmId: true } }),
    prisma.aircraft.findMany({ select: { id: true, registration: true, naeronAircraftId: true, naeronVmId: true, upstreamUpdatedAt: true } }),
  ]);
  const context: MatchContext = { personnelByEmployee: new Map(), personnelByVm: new Map(), personnelByName: new Map(), personnelByAlias: new Map(), reconciledPersonnel: new Set(), studentsByPerson: new Map(), studentsByVm: new Map(), studentsByName: new Map(), aircraftByExternal: new Map(), aircraftByVm: new Map(), aircraftByRegistration: new Map(), aircraftUpdatedById: new Map() };
  for (const person of personnel) {
    if (person.naeronEmployeeId) addName(context.personnelByEmployee, person.naeronEmployeeId, person.id);
    if (person.naeronVmId) addName(context.personnelByVm, person.naeronVmId, person.id);
    addName(context.personnelByName, normalizePersonName(`${person.firstName} ${person.lastName}`), person.id);
    if (person.canonicalFullName) addName(context.personnelByName, normalizePersonName(person.canonicalFullName), person.id);
    for (const alias of person.aliases) addName(context.personnelByAlias, alias.normalizedAlias, person.id);
  }
  for (const student of students) { if (student.naeronPersonId) context.studentsByPerson.set(student.naeronPersonId, student.id); if (student.naeronVmId) context.studentsByVm.set(student.naeronVmId, student.id); context.studentsByName.set(student.normalizedName, student.id); }
  for (const item of aircraft) { if (item.naeronAircraftId) context.aircraftByExternal.set(item.naeronAircraftId, item.id); if (item.naeronVmId) context.aircraftByVm.set(item.naeronVmId, item.id); context.aircraftByRegistration.set(item.registration, item.id); if (item.upstreamUpdatedAt) context.aircraftUpdatedById.set(item.id, item.upstreamUpdatedAt); }
  return context;
}

async function matchPersonnel(context: MatchContext, externalId: number | null, vmId: string | null, name: string | null): Promise<string | null> {
  const external = externalId === null ? null : String(externalId);
  const unique = (ids: Set<string> | undefined) => ids?.size === 1 ? [...ids][0] : undefined;
  const employeeId = external ? unique(context.personnelByEmployee.get(external)) : undefined;
  const personnelVmId = vmId ? unique(context.personnelByVm.get(vmId)) : undefined;
  if (employeeId && personnelVmId && employeeId !== personnelVmId) return null;
  let id = employeeId ?? personnelVmId;
  const normalizedName = normalizePersonName(name);
  id ??= normalizedName ? unique(context.personnelByName.get(normalizedName)) : undefined;
  id ??= normalizedName ? unique(context.personnelByAlias.get(normalizedName)) : undefined;
  if (!id) return null;
  const reconciliationKey = `${external ?? ""}:${vmId ?? ""}:${normalizedName}`;
  if (name && !context.reconciledPersonnel.has(reconciliationKey)) {
    try {
      await linkNaeronInstructor({ key: reconciliationKey, employeeId: external, vmId, name: name.trim() }, id);
      context.reconciledPersonnel.add(reconciliationKey);
    } catch {
      return null;
    }
  }
  if (external) addName(context.personnelByEmployee, external, id);
  if (vmId) addName(context.personnelByVm, vmId, id);
  if (normalizedName) addName(context.personnelByName, normalizedName, id);
  return id;
}

async function matchStudent(context: MatchContext, externalId: number | null, vmId: string | null, displayName: string | null): Promise<string | null> {
  const external = externalId === null ? null : String(externalId);
  let id = external ? context.studentsByPerson.get(external) : undefined;
  id ??= vmId ? context.studentsByVm.get(vmId) : undefined;
  const normalizedName = normalizePersonName(displayName);
  id ??= normalizedName ? context.studentsByName.get(normalizedName) : undefined;
  if (!id && normalizedName) {
    const student = await prisma.student.create({ data: { normalizedName, displayName: displayName?.trim() || normalizedName, naeronPersonId: external, naeronVmId: vmId } });
    id = student.id; context.studentsByName.set(normalizedName, id);
  } else if (id) {
    const data: { naeronPersonId?: string; naeronVmId?: string } = {};
    if (external && !context.studentsByPerson.has(external)) data.naeronPersonId = external;
    if (vmId && !context.studentsByVm.has(vmId)) data.naeronVmId = vmId;
    if (Object.keys(data).length) await prisma.student.update({ where: { id }, data });
  }
  if (id && external) context.studentsByPerson.set(external, id);
  if (id && vmId) context.studentsByVm.set(vmId, id);
  return id ?? null;
}

async function matchAircraft(context: MatchContext, row: Pick<NaeronFlightRow, "a_ID" | "aircraft" | "aircraftName_">): Promise<string | null> {
  const external = row.a_ID === null ? null : String(row.a_ID); const vmId = row.aircraft;
  const registration = normalizeAircraftRegistration(row.aircraftName_);
  let id = external ? context.aircraftByExternal.get(external) : undefined;
  id ??= vmId ? context.aircraftByVm.get(vmId) : undefined;
  if (id) return id;
  id ??= registration ? context.aircraftByRegistration.get(registration) : undefined;
  if (!id && registration) {
    const item = await prisma.aircraft.create({ data: { registration, naeronAircraftId: external, naeronVmId: vmId } }); id = item.id;
  } else if (id) {
    const data: { naeronAircraftId?: string; naeronVmId?: string; active?: boolean } = { active: true };
    if (external && !context.aircraftByExternal.has(external)) data.naeronAircraftId = external;
    if (vmId && !context.aircraftByVm.has(vmId)) data.naeronVmId = vmId;
    await prisma.aircraft.update({ where: { id }, data });
  }
  if (id && external) context.aircraftByExternal.set(external, id); if (id && vmId) context.aircraftByVm.set(vmId, id); if (id && registration) context.aircraftByRegistration.set(registration, id);
  return id ?? null;
}

function statusOf(row: NaeronFlightRow): FlightStatus {
  const status = row._flightStatus?.trim().toLowerCase();
  if (row.canceled === 1 || status === "canceled" || status === "cancelled") return FlightStatus.CANCELLED;
  if (row.incomplete === 1 || status === "incomplete") return FlightStatus.INCOMPLETE;
  if (row.realized === 1 || status === "approved") return FlightStatus.COMPLETED;
  return FlightStatus.UNKNOWN;
}

function decimal(value: string | null): Prisma.Decimal | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  return new Prisma.Decimal(value);
}

async function processFlightPage(rows: NaeronFlightRow[], context: MatchContext) {
  const existing = new Map((await prisma.flight.findMany({ where: { externalId: { in: rows.map((row) => String(row.m_ID)) } }, select: { externalId: true, upstreamUpdatedAt: true } })).map((flight) => [flight.externalId, flight]));
  const result = { created: 0, updated: 0, completed: 0, cancelled: 0, unmatchedInstructors: 0, unmatchedStudents: 0, aircraftUpdated: 0 };
  const creates: Prisma.FlightCreateManyInput[] = [];
  const updates: Array<{ externalId: string; data: Prisma.FlightUncheckedUpdateInput }> = [];
  for (const row of rows) {
    const externalId = String(row.m_ID); const incomingUpdatedAt = parseNaeronDate(row._lastRowUpdate) ?? new Date(0);
    const current = existing.get(externalId);
    const status = statusOf(row); if (status === FlightStatus.COMPLETED) result.completed += 1; if (status === FlightStatus.CANCELLED) result.cancelled += 1;
    if (current?.upstreamUpdatedAt && current.upstreamUpdatedAt >= incomingUpdatedAt) continue;
    const [instructorId, observerPersonnelId, studentId, secondStudentId, aircraftId] = await Promise.all([
      matchPersonnel(context, row.i_ID, row.instructorVMID, row.instructorName_), matchPersonnel(context, row.o_ID, row.observerVMID, row.observerName_),
      matchStudent(context, row.s_ID, row.studentVMID, row.studentName_), matchStudent(context, row.s_ID2, row.student2VMID, row.student2Name_), matchAircraft(context, row),
    ]);
    if ((row.i_ID || row.instructorVMID || row.instructorName_) && !instructorId) result.unmatchedInstructors += 1;
    if ((row.s_ID || row.studentVMID || row.studentName_) && !studentId) result.unmatchedStudents += 1;
    if (aircraftId) result.aircraftUpdated += 1;
    const flightDate = parseNaeronDate(row.flightDate) ?? new Date(0); const landingDate = parseNaeronDate(row.landingDate);
    const data = {
      externalPlanId: row.planID === null ? null : String(row.planID), status, flightDate, landingDate,
      sourceSortieNo: row.formNo?.trim() || null, sourceFlightType: row.type, trainingTask: row.dutyName_?.trim() || null,
      aircraftId, instructorId, studentId, secondStudentId, observerPersonnelId, studentName: row.studentName_?.trim() || null,
      departureAirport: row.baseFromName_?.trim() || null, arrivalAirport: row.baseToName_?.trim() || null,
      offBlockTime: naeronMinutesFromMidnight(row.flightDate, row.OffBlock), onBlockTime: naeronMinutesFromMidnight(row.landingDate || row.flightDate, row.OnBlock),
      takeoffTime: naeronMinutesFromMidnight(row.flightDate, row.TakeOff), landingTime: naeronMinutesFromMidnight(row.landingDate || row.flightDate, row.Landing),
      sortieDurationMinutes: row.BlockTime ?? row.duration, airborneDurationMinutes: row.flightDuration,
      route: row.routeName_?.trim() || null, remarks: row.note?.trim() || null, cancellationReason: row.cancelNote?.trim() || null,
      endingTach: decimal(row.tacho), landingCount: row.landingCount, hasFault: row.hasFault === null ? null : row.hasFault === 1,
      faultDescription: row.faultDesc?.trim() || null, faultState: row.faultState?.trim() || null, upstreamUpdatedAt: incomingUpdatedAt,
      upstreamStatus: row._flightStatus, upstreamRealized: row.realized, upstreamCanceled: row.canceled, upstreamIncomplete: row.incomplete,
      naeronPayload: row as Prisma.InputJsonValue, archived: row._lastRowStatus === "destroy",
    };
    if (current) updates.push({ externalId, data });
    else creates.push({ externalId, signature: `naeron:${externalId}`, ...data });
  }
  if (creates.length) result.created = (await prisma.flight.createMany({ data: creates, skipDuplicates: true })).count;
  if (updates.length) { await prisma.$transaction(updates.map((item) => prisma.flight.update({ where: { externalId: item.externalId }, data: item.data }))); result.updated = updates.length; }
  return result;
}

async function syncAircraftInventory(context: MatchContext): Promise<number> {
  let cursor: string | null = null; let updated = 0;
  do {
    const page: NaeronPage<NaeronAircraftRow> = await getNaeronSnapshot<NaeronAircraftRow>(AIRCRAFT_TABLE, { cursor, limit: PAGE_SIZE });
    for (const row of page.data) {
      try {
        if (row.type !== "aircraft") continue;
        const registration = normalizeAircraftRegistration(row.regNo); if (!registration || !Number.isFinite(row.m_ID)) continue;
        const external = String(row.m_ID); let id = context.aircraftByExternal.get(external) ?? (row.vm_ID ? context.aircraftByVm.get(row.vm_ID) : undefined) ?? context.aircraftByRegistration.get(registration);
        const incomingUpdatedAt = parseNaeronDate(row._lastRowUpdate);
        if (id && incomingUpdatedAt && context.aircraftUpdatedById.get(id) && context.aircraftUpdatedById.get(id)! >= incomingUpdatedAt) continue;
        const data = { registration, aircraftType: row.aircraftType, naeronAircraftId: external, naeronVmId: row.vm_ID,
          currentTach: decimal(row.tacho), lastFlightDate: parseNaeronDate(row.lastFlightDate), lastBase: row.lastBaseTo,
          underMaintenance: row.underMaintenance === 1, ueggs: parseNaeronDate(row.UEGGS), naeronPayload: row as Prisma.InputJsonValue,
          upstreamUpdatedAt: incomingUpdatedAt, active: row.outOfInventory !== 1 && row._lastRowStatus !== "destroy" };
        const item = id ? await prisma.aircraft.update({ where: { id }, data }) : await prisma.aircraft.create({ data }); id = item.id;
        context.aircraftByExternal.set(external, id); if (row.vm_ID) context.aircraftByVm.set(row.vm_ID, id); context.aircraftByRegistration.set(registration, id); if (incomingUpdatedAt) context.aircraftUpdatedById.set(id, incomingUpdatedAt); updated += 1;
      } catch {
        // A malformed inventory row must not prevent flight changes from syncing.
      }
    }
    cursor = page.meta.cursor;
    if (!page.meta.hasMore) break;
  } while (cursor);
  return updated;
}

async function completeBatch(batchId: string, result: Omit<NaeronSyncResult, "batchId" | "durationMs">, started: number) {
  await prisma.naeronSyncBatch.update({ where: { id: batchId }, data: { ...result, completedAt: new Date(), success: true } });
  return { batchId, ...result, durationMs: Date.now() - started };
}

export async function runNaeronFullSync(options: { startDate?: string; endDate?: string; triggeredByEmail?: string } = {}): Promise<NaeronSyncResult> {
  if (Boolean(options.startDate) !== Boolean(options.endDate)) throw new Error("Both startDate and endDate are required for a restricted sync.");
  const restricted = Boolean(options.startDate); const started = Date.now(); const lockToken = await acquireSyncLock(options.triggeredByEmail);
  const batch = await prisma.naeronSyncBatch.create({ data: { tableName: FLIGHTS_TABLE, mode: NaeronSyncMode.FULL, triggeredByEmail: options.triggeredByEmail } }).catch(async (error) => { await releaseSyncLock(lockToken); throw error; });
  const totals = { fetched: 0, created: 0, updated: 0, archived: 0, completedFlights: 0, cancelledFlights: 0, unmatchedInstructors: 0, unmatchedStudents: 0, aircraftUpdated: 0, errors: 0 };
  try {
    const context = await createContext(); totals.aircraftUpdated = await syncAircraftInventory(context);
    const priorState = restricted ? null : await prisma.naeronSyncState.findUnique({ where: { tableName: FLIGHTS_TABLE } });
    const state = restricted ? null : await prisma.naeronSyncState.upsert({
      where: { tableName: FLIGHTS_TABLE },
      update: { snapshotCursor: priorState?.lastFullSyncAt ? null : priorState?.snapshotCursor, lastError: null },
      create: { tableName: FLIGHTS_TABLE },
    });
    let cursor: string | null = state?.snapshotCursor ?? null;
    do {
      const page = await getNaeronSnapshot<NaeronFlightRow>(FLIGHTS_TABLE, { cursor, limit: PAGE_SIZE, startDate: options.startDate, endDate: options.endDate });
      const pageResult = await processFlightPage(page.data, context); totals.fetched += page.data.length; totals.created += pageResult.created; totals.updated += pageResult.updated;
      totals.completedFlights += pageResult.completed; totals.cancelledFlights += pageResult.cancelled; totals.unmatchedInstructors += pageResult.unmatchedInstructors; totals.unmatchedStudents += pageResult.unmatchedStudents;
      cursor = page.meta.cursor;
      if (state) await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { snapshotCursor: cursor } });
      if (!page.meta.hasMore) break;
    } while (cursor);
    if (!restricted) {
      const incremental = await drainIncremental(context); totals.fetched += incremental.fetched; totals.created += incremental.created; totals.updated += incremental.updated; totals.archived += incremental.archived; totals.completedFlights += incremental.completedFlights; totals.cancelledFlights += incremental.cancelledFlights; totals.unmatchedInstructors += incremental.unmatchedInstructors; totals.unmatchedStudents += incremental.unmatchedStudents;
      await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { lastFullSyncAt: new Date(), lastSuccessfulSyncAt: new Date(), lastError: null } });
    }
    const reconciliation = await autoReconcileNaeronPersonnel(); totals.unmatchedInstructors = reconciliation.unmatched + reconciliation.reviewRequired;
    return await completeBatch(batch.id, totals, started);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Naeron sync error";
    await prisma.naeronSyncBatch.update({ where: { id: batch.id }, data: { completedAt: new Date(), success: false, errors: 1, errorMessage: message } });
    if (!restricted) await prisma.naeronSyncState.upsert({ where: { tableName: FLIGHTS_TABLE }, update: { lastError: message }, create: { tableName: FLIGHTS_TABLE, lastError: message } });
    throw error;
  } finally { await releaseSyncLock(lockToken); }
}

async function drainIncremental(context: MatchContext) {
  const state = await prisma.naeronSyncState.upsert({ where: { tableName: FLIGHTS_TABLE }, update: {}, create: { tableName: FLIGHTS_TABLE } });
  const totals = { fetched: 0, created: 0, updated: 0, archived: 0, completedFlights: 0, cancelledFlights: 0, unmatchedInstructors: 0, unmatchedStudents: 0, errors: 0 };
  let changesCursor = state.changesCursor;
  do {
    const page = await getNaeronChanges<NaeronFlightRow>(FLIGHTS_TABLE, { cursor: changesCursor, limit: PAGE_SIZE });
    const result = await processFlightPage(page.data, context); totals.fetched += page.data.length; totals.created += result.created; totals.updated += result.updated; totals.completedFlights += result.completed; totals.cancelledFlights += result.cancelled; totals.unmatchedInstructors += result.unmatchedInstructors; totals.unmatchedStudents += result.unmatchedStudents;
    changesCursor = page.meta.cursor ?? changesCursor;
    await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { changesCursor } });
    if (!page.meta.hasMore) break;
  } while (changesCursor);
  let deletedCursor = state.deletedCursor;
  do {
    const page = await getNaeronDeleted(FLIGHTS_TABLE, { cursor: deletedCursor, limit: PAGE_SIZE });
    const ids = page.deletedRecords.map((record) => String(record.recordID));
    if (ids.length) { const result = await prisma.flight.updateMany({ where: { externalId: { in: ids }, archived: false }, data: { archived: true } }); totals.archived += result.count; }
    deletedCursor = page.meta.cursor ?? deletedCursor;
    await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { deletedCursor } });
    if (!page.meta.hasMore) break;
  } while (deletedCursor);
  return totals;
}

export async function runNaeronIncrementalSync(options: { triggeredByEmail?: string } = {}): Promise<NaeronSyncResult> {
  const started = Date.now(); const state = await prisma.naeronSyncState.findUnique({ where: { tableName: FLIGHTS_TABLE } });
  if (!state?.lastFullSyncAt) throw new Error("Complete the initial Naeron full sync before incremental synchronization.");
  const lockToken = await acquireSyncLock(options.triggeredByEmail);
  const batch = await prisma.naeronSyncBatch.create({ data: { tableName: FLIGHTS_TABLE, mode: NaeronSyncMode.INCREMENTAL, triggeredByEmail: options.triggeredByEmail } }).catch(async (error) => { await releaseSyncLock(lockToken); throw error; });
  try {
    const context = await createContext(); const aircraftUpdated = await syncAircraftInventory(context); const result = await drainIncremental(context);
    const reconciliation = await autoReconcileNaeronPersonnel(); result.unmatchedInstructors = reconciliation.unmatched + reconciliation.reviewRequired;
    await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { lastSuccessfulSyncAt: new Date(), lastError: null } });
    return await completeBatch(batch.id, { ...result, aircraftUpdated }, started);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Naeron sync error";
    await prisma.naeronSyncBatch.update({ where: { id: batch.id }, data: { completedAt: new Date(), success: false, errors: 1, errorMessage: message } });
    await prisma.naeronSyncState.update({ where: { tableName: FLIGHTS_TABLE }, data: { lastError: message } }); throw error;
  } finally { await releaseSyncLock(lockToken); }
}
