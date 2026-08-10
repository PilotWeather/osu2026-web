import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { normalizePersonName } from "@/src/lib/flights/normalize";

export type ReconciliationStatus = "AUTO_MATCHED" | "REVIEW_REQUIRED" | "UNMATCHED";

export interface NaeronInstructorIdentity {
  key: string;
  employeeId: string | null;
  vmId: string | null;
  name: string;
}

export interface ReconciliationItem extends NaeronInstructorIdentity {
  status: ReconciliationStatus;
  confidence: string;
  personnelId: string | null;
  personnelName: string | null;
  needsUpdate: boolean;
}

interface RawIdentity { employeeId: string | null; vmId: string | null; name: string | null }

function identityKey(identity: Omit<NaeronInstructorIdentity, "key">) {
  if (identity.employeeId) return `employee:${identity.employeeId}`;
  if (identity.vmId) return `vm:${identity.vmId}`;
  return `name:${normalizePersonName(identity.name)}`;
}

export async function getNaeronInstructorIdentities(): Promise<NaeronInstructorIdentity[]> {
  const rows = await prisma.$queryRaw<RawIdentity[]>(Prisma.sql`
    SELECT DISTINCT
      NULLIF("naeronPayload"->>'i_ID', '') AS "employeeId",
      NULLIF("naeronPayload"->>'instructorVMID', '') AS "vmId",
      NULLIF(BTRIM("naeronPayload"->>'instructorName_'), '') AS "name"
    FROM "Flight"
    WHERE "naeronPayload" IS NOT NULL
      AND NULLIF(BTRIM("naeronPayload"->>'instructorName_'), '') IS NOT NULL
  `);
  const unique = new Map<string, NaeronInstructorIdentity>();
  for (const row of rows) {
    if (!row.name) continue;
    const identity = { employeeId: row.employeeId, vmId: row.vmId, name: row.name };
    unique.set(identityKey(identity), { key: identityKey(identity), ...identity });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function getPersonnelReconciliation(): Promise<ReconciliationItem[]> {
  const [identities, personnel] = await Promise.all([
    getNaeronInstructorIdentities(),
    prisma.personnel.findMany({ select: { id: true, firstName: true, lastName: true, canonicalFullName: true, naeronEmployeeId: true, naeronVmId: true, aliases: { select: { normalizedAlias: true } } } }),
  ]);
  const byEmployee = new Map<string, typeof personnel>(); const byVm = new Map<string, typeof personnel>();
  const byName = new Map<string, typeof personnel>(); const byAlias = new Map<string, typeof personnel>();
  const identitiesByName = new Map<string, Set<string>>();
  const add = (map: Map<string, typeof personnel>, key: string | null, person: (typeof personnel)[number]) => { if (!key) return; const list = map.get(key) ?? []; list.push(person); map.set(key, list); };
  for (const person of personnel) {
    add(byEmployee, person.naeronEmployeeId, person); add(byVm, person.naeronVmId, person);
    add(byName, normalizePersonName(`${person.firstName} ${person.lastName}`), person);
    add(byName, normalizePersonName(person.canonicalFullName), person);
    for (const alias of person.aliases) add(byAlias, alias.normalizedAlias, person);
  }
  for (const identity of identities) { const normalized = normalizePersonName(identity.name); const keys = identitiesByName.get(normalized) ?? new Set<string>(); keys.add(identity.key); identitiesByName.set(normalized, keys); }
  return identities.map((identity) => {
    const normalized = normalizePersonName(identity.name);
    const employee = identity.employeeId ? byEmployee.get(identity.employeeId) ?? [] : [];
    const vm = identity.vmId ? byVm.get(identity.vmId) ?? [] : [];
    const names = byName.get(normalized) ?? []; const aliases = byAlias.get(normalized) ?? [];
    let matches = employee; let confidence = "Naeron i_ID";
    if (!matches.length) { matches = vm; confidence = "Naeron VM ID"; }
    if (!matches.length) { matches = names; confidence = "Tam normalize isim"; }
    if (!matches.length) { matches = aliases; confidence = "PersonnelAlias"; }
    const uniqueIds = new Set(matches.map((person) => person.id));
    const person = uniqueIds.size === 1 ? matches[0] : null;
    const nameBased = confidence === "Tam normalize isim" || confidence === "PersonnelAlias";
    const stableConflict = Boolean(person && ((identity.employeeId && person.naeronEmployeeId && identity.employeeId !== person.naeronEmployeeId) || (identity.vmId && person.naeronVmId && identity.vmId !== person.naeronVmId)));
    const crossIdConflict = employee.length > 0 && vm.length > 0 && new Set([...employee, ...vm].map((item) => item.id)).size > 1;
    const ambiguousNaeronName = nameBased && (identitiesByName.get(normalized)?.size ?? 0) > 1;
    const requiresReview = uniqueIds.size > 1 || stableConflict || crossIdConflict || ambiguousNaeronName;
    const localName = person ? `${person.firstName} ${person.lastName}`.trim() : "";
    const aliasMissing = Boolean(person && localName !== identity.name.trim() && !person.aliases.some((alias) => alias.normalizedAlias === normalizePersonName(localName)));
    const needsUpdate = Boolean(person && (person.canonicalFullName !== identity.name.trim() || (identity.employeeId && !person.naeronEmployeeId) || (identity.vmId && !person.naeronVmId) || aliasMissing));
    return {
      ...identity, personnelId: person?.id ?? null,
      personnelName: person ? person.canonicalFullName || `${person.firstName} ${person.lastName}`.trim() : null,
      confidence: matches.length ? confidence : "Eşleşme yok",
      status: requiresReview ? "REVIEW_REQUIRED" : person ? "AUTO_MATCHED" : "UNMATCHED",
      needsUpdate,
    };
  });
}

async function updateHistoricalFlights(identity: NaeronInstructorIdentity, personnelId: string) {
  if (identity.employeeId) return prisma.$executeRaw(Prisma.sql`UPDATE "Flight" SET "instructorId" = ${personnelId}, "updatedAt" = NOW() WHERE "instructorId" IS NULL AND "naeronPayload"->>'i_ID' = ${identity.employeeId}`);
  if (identity.vmId) return prisma.$executeRaw(Prisma.sql`UPDATE "Flight" SET "instructorId" = ${personnelId}, "updatedAt" = NOW() WHERE "instructorId" IS NULL AND "naeronPayload"->>'instructorVMID' = ${identity.vmId}`);
  return prisma.$executeRaw(Prisma.sql`UPDATE "Flight" SET "instructorId" = ${personnelId}, "updatedAt" = NOW() WHERE "instructorId" IS NULL AND BTRIM("naeronPayload"->>'instructorName_') = ${identity.name}`);
}

export async function linkNaeronInstructor(identity: NaeronInstructorIdentity, personnelId: string) {
  const person = await prisma.personnel.findUnique({ where: { id: personnelId }, select: { id: true, firstName: true, lastName: true, canonicalFullName: true, naeronEmployeeId: true, naeronVmId: true, aliases: { select: { normalizedAlias: true } } } });
  if (!person) throw new Error("Personnel record not found.");
  if (identity.employeeId) {
    const owner = await prisma.personnel.findFirst({ where: { naeronEmployeeId: identity.employeeId, id: { not: personnelId } }, select: { id: true } });
    if (owner) throw new Error("This Naeron employee ID is already linked to another Personnel record. Manual duplicate review is required.");
  }
  if (identity.vmId) {
    const owner = await prisma.personnel.findFirst({ where: { naeronVmId: identity.vmId, id: { not: personnelId } }, select: { id: true } });
    if (owner) throw new Error("This Naeron VM ID is already linked to another Personnel record. Manual duplicate review is required.");
  }
  if (person.naeronEmployeeId && identity.employeeId && person.naeronEmployeeId !== identity.employeeId) throw new Error("Personnel already has a different Naeron employee ID.");
  if (person.naeronVmId && identity.vmId && person.naeronVmId !== identity.vmId) throw new Error("Personnel already has a different Naeron VM ID.");

  const oldName = `${person.firstName} ${person.lastName}`.trim(); const canonicalName = identity.name.trim();
  const oldNormalized = normalizePersonName(oldName);
  const aliasNeeded = Boolean(oldNormalized && oldName !== canonicalName && !person.aliases.some((alias) => alias.normalizedAlias === oldNormalized));
  await prisma.$transaction(async (tx) => {
    await tx.personnel.update({ where: { id: personnelId }, data: { naeronEmployeeId: identity.employeeId ?? person.naeronEmployeeId, naeronVmId: identity.vmId ?? person.naeronVmId, canonicalFullName: canonicalName } });
    if (aliasNeeded) await tx.personnelAlias.upsert({ where: { personnelId_normalizedAlias: { personnelId, normalizedAlias: oldNormalized } }, update: { alias: oldName }, create: { personnelId, alias: oldName, normalizedAlias: oldNormalized } });
  });
  const flightsLinked = await updateHistoricalFlights(identity, personnelId);
  return { aliasCreated: aliasNeeded, canonicalUpdated: person.canonicalFullName !== canonicalName, flightsLinked };
}

export async function autoReconcileNaeronPersonnel() {
  const items = await getPersonnelReconciliation();
  let matched = 0; let aliasesCreated = 0; let canonicalNamesUpdated = 0; let flightsLinked = 0;
  for (const item of items) {
    if (item.status !== "AUTO_MATCHED" || !item.personnelId || !item.needsUpdate) continue;
    try {
      const result = await linkNaeronInstructor(item, item.personnelId);
      matched += 1; aliasesCreated += Number(result.aliasCreated); canonicalNamesUpdated += Number(result.canonicalUpdated); flightsLinked += result.flightsLinked;
    } catch {
      // Conflicting stable IDs are intentionally left for ADMIN review.
    }
  }
  const refreshed = await getPersonnelReconciliation();
  return { total: refreshed.length, matched, reviewRequired: refreshed.filter((item) => item.status === "REVIEW_REQUIRED").length, unmatched: refreshed.filter((item) => item.status === "UNMATCHED").length, aliasesCreated, canonicalNamesUpdated, flightsLinked };
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + Number(a[i - 1] !== b[j - 1])); previous = current; } }
  return row[b.length];
}

export async function getLikelyPersonnelDuplicates() {
  const personnel = await prisma.personnel.findMany({ select: { id: true, firstName: true, lastName: true, canonicalFullName: true, licenseNo: true, naeronEmployeeId: true, naeronVmId: true } });
  const pairs: Array<{ first: (typeof personnel)[number]; second: (typeof personnel)[number]; reason: string }> = [];
  for (let i = 0; i < personnel.length; i += 1) for (let j = i + 1; j < personnel.length; j += 1) {
    const first = personnel[i]; const second = personnel[j];
    if (first.naeronEmployeeId && first.naeronEmployeeId === second.naeronEmployeeId) pairs.push({ first, second, reason: "Aynı Naeron i_ID" });
    else if (first.naeronVmId && first.naeronVmId === second.naeronVmId) pairs.push({ first, second, reason: "Aynı Naeron VM ID" });
    else if (first.licenseNo && normalizePersonName(first.licenseNo) === normalizePersonName(second.licenseNo)) pairs.push({ first, second, reason: "Aynı lisans numarası" });
    else { const a = normalizePersonName(first.canonicalFullName || `${first.firstName} ${first.lastName}`); const b = normalizePersonName(second.canonicalFullName || `${second.firstName} ${second.lastName}`); const distance = editDistance(a, b); if (Math.max(a.length, b.length) >= 8 && distance <= 2 && 1 - distance / Math.max(a.length, b.length) >= 0.88) pairs.push({ first, second, reason: "Güçlü isim benzerliği" }); }
  }
  return pairs;
}
