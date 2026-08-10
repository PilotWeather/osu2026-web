"use server";

import { FlightStatus, ImportRowStatus, ImportStatus, Prisma, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requirePermission } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { flightSignature, normalizeAircraftRegistration, normalizePersonName, sha256 } from "@/src/lib/flights/normalize";
import { normalizedParsedInstructor, parseCompletedFlightsPdf, type ParsedFlightRow } from "@/src/lib/flights/parser";
import { operationalDateTime } from "@/src/lib/flights/time";

const maxPdfBytes = 4 * 1024 * 1024;

function messageRedirect(path: string, status: "success" | "error", message: string): never {
  redirect(`${path}?${new URLSearchParams({ status, message })}`);
}

export async function uploadFlightPdf(formData: FormData): Promise<void> {
  await requirePermission("IMPORT_PDF");
  const session = await auth();
  const file = formData.get("pdf");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    messageRedirect("/imports", "error", "Yalnızca PDF dosyası yükleyebilirsiniz.");
  }
  if (file.size <= 0 || file.size > maxPdfBytes) {
    messageRedirect("/imports", "error", "PDF dosyası 4 MB veya daha küçük olmalıdır.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const fileHash = sha256(data);
  const duplicate = await prisma.importBatch.findFirst({
    where: { fileHash, status: ImportStatus.IMPORTED },
    select: { id: true },
  });
  if (duplicate) messageRedirect("/imports", "error", "Bu dosya daha önce içe aktarılmış.");

  const personnel = await prisma.personnel.findMany({ select: { id: true, firstName: true, lastName: true, aliases: { select: { alias: true, normalizedAlias: true } } } });
  let parsed;
  try {
    parsed = await parseCompletedFlightsPdf(data, personnel.flatMap((person) => [`${person.firstName} ${person.lastName}`, ...person.aliases.map((alias) => alias.alias)]));
  } catch {
    messageRedirect("/imports", "error", "PDF metni okunamadı. Dosyanın metin tabanlı olduğundan emin olun.");
  }
  if (!parsed.rows.length) {
    messageRedirect("/imports", "error", parsed.warnings[0] ?? "PDF içinde uçuş satırı bulunamadı.");
  }
  const personnelByName = new Map<string, Set<string>>();
  const addPersonnelName = (name: string, personnelId: string) => {
    const ids = personnelByName.get(name) ?? new Set<string>();
    ids.add(personnelId);
    personnelByName.set(name, ids);
  };
  for (const person of personnel) {
    const key = normalizePersonName(`${person.firstName} ${person.lastName}`);
    addPersonnelName(key, person.id);
    for (const alias of person.aliases) {
      addPersonnelName(alias.normalizedAlias, person.id);
    }
  }

  const prepared = parsed.rows.map((row) => {
    if (row.flightStatus === "CANCELLED") return { row, normalized: "", instructorId: null, warning: null, status: ImportRowStatus.CANCELLED };
    const normalized = normalizedParsedInstructor(row);
    const matches = normalized ? [...(personnelByName.get(normalized) ?? [])] : [];
    const instructorId = matches.length === 1 ? matches[0] : null;
    const warning = !row.valid
      ? row.warnings.join(" ") || "Geçersiz satır."
      : matches.length === 0 && normalized
        ? "Personel eşleşmesi bulunamadı."
        : matches.length > 1
          ? "Birden fazla personel eşleşmesi bulundu."
          : row.warnings.join(" ") || null;
    const status = !row.valid ? ImportRowStatus.INVALID : warning ? ImportRowStatus.REVIEW : ImportRowStatus.READY;
    return { row, normalized, instructorId, warning, status };
  });
  const validRows = prepared.filter((item) => item.row.flightStatus === "COMPLETED" && item.status !== ImportRowStatus.INVALID).length;
  const warningRows = prepared.filter((item) => item.status === ImportRowStatus.REVIEW).length;
  const rejectedRows = prepared.filter((item) => item.status === ImportRowStatus.INVALID).length;
  const batchStatus = parsed.validation.passed && warningRows === 0 && rejectedRows === 0 ? ImportStatus.PARSED : ImportStatus.REVIEW_REQUIRED;
  const flightDate = parsed.flightDate ? new Date(`${parsed.flightDate}T00:00:00.000Z`) : null;

  const batch = await prisma.importBatch.create({
    data: {
      originalFilename: file.name.slice(0, 255),
      fileHash,
      flightDate,
      status: batchStatus,
      totalRows: prepared.length,
      sourceRows: parsed.validation.scheduledRows,
      completedRows: parsed.validation.completedRows,
      cancelledRows: parsed.validation.cancelledRows,
      validationDurationMinutes: parsed.validation.completedDurationMinutes,
      validationPassed: parsed.validation.passed,
      validRows,
      warningRows,
      rejectedRows,
      uploadedByUserId: session?.user?.id || null,
      rows: {
        create: prepared.map((item) => ({
          rowNumber: item.row.rowNumber,
          status: item.status,
          rawData: item.row as unknown as Prisma.InputJsonValue,
          normalizedInstructor: item.normalized || null,
          instructorId: item.instructorId,
          warning: item.warning,
        })),
      },
    },
  });
  redirect(`/imports/${batch.id}`);
}

export async function confirmFlightImport(batchId: string, formData: FormData): Promise<void> {
  await requirePermission("IMPORT_PDF");
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId }, include: { rows: true } });
  if (!batch) messageRedirect("/imports", "error", "İçe aktarma kaydı bulunamadı.");
  if (batch.status === ImportStatus.IMPORTED) messageRedirect(`/imports/${batch.id}`, "error", "Bu dosya daha önce içe aktarılmış.");
  if (!batch.validationPassed) messageRedirect(`/imports/${batch.id}`, "error", "PDF doğrulaması başarısız; veritabanına yazılmadı.");
  const priorImported = await prisma.importBatch.findFirst({ where: { fileHash: batch.fileHash, status: ImportStatus.IMPORTED, id: { not: batch.id } } });
  if (priorImported) messageRedirect("/imports", "error", "Bu dosya daha önce içe aktarılmış.");

  const personnelIds = new Set((await prisma.personnel.findMany({ select: { id: true } })).map((person) => person.id));
  const selected = new Map<string, string | null>();
  for (const row of batch.rows) {
    const value = String(formData.get(`instructor_${row.id}`) ?? "");
    selected.set(row.id, personnelIds.has(value) ? value : row.instructorId);
    const raw = row.rawData as unknown as ParsedFlightRow;
    if (raw.flightStatus === "COMPLETED" && row.status !== ImportRowStatus.INVALID && raw.instructorName && !selected.get(row.id)) {
      messageRedirect(`/imports/${batch.id}`, "error", "Tüm eşleşmeyen öğretmenleri seçin.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let importedRows = 0;
    let duplicateRows = 0;
    for (const row of batch.rows) {
      if (row.status === ImportRowStatus.INVALID) continue;
      const raw = row.rawData as unknown as ParsedFlightRow;
      const registration = normalizeAircraftRegistration(raw.aircraftRegistration);
      if (!registration) continue;
      const instructorId = selected.get(row.id) ?? null;
      const aircraft = await tx.aircraft.upsert({
        where: { registration },
        update: { aircraftType: raw.aircraftType || undefined, active: true },
        create: { registration, aircraftType: raw.aircraftType || null },
      });
      const normalizedStudent = normalizePersonName(raw.studentName);
      const student = normalizedStudent
        ? await tx.student.upsert({
            where: { normalizedName: normalizedStudent },
            update: { displayName: raw.studentName?.trim() || normalizedStudent },
            create: { normalizedName: normalizedStudent, displayName: raw.studentName?.trim() || normalizedStudent },
          })
        : null;
      const signature = flightSignature({
        flightDate: raw.flightDate,
        sourceSortieNo: raw.sourceSortieNo,
        aircraftRegistration: registration,
        takeoffTime: raw.takeoffTime,
        landingTime: raw.landingTime,
        instructorName: raw.instructorName,
      });
      const exists = await tx.flight.findUnique({ where: { signature }, select: { id: true } });
      if (exists) {
        duplicateRows += 1;
        await tx.importRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.DUPLICATE, instructorId } });
        continue;
      }
      await tx.flight.create({
        data: {
          signature,
          externalId: `pdf:${signature}`,
          status: raw.flightStatus === "CANCELLED" ? FlightStatus.CANCELLED : FlightStatus.COMPLETED,
          flightDate: new Date(`${raw.flightDate}T00:00:00.000Z`),
          sourceFlightCode: raw.sourceFlightCode,
          sourceTeam: raw.sourceTeam,
          trainingTask: raw.trainingTask,
          sourceSortieNo: raw.sourceSortieNo,
          sourceFlightType: raw.sourceFlightType,
          aircraftId: aircraft.id,
          instructorId,
          studentId: student?.id ?? null,
          studentName: raw.studentName?.trim() || null,
          departureAirport: raw.departureAirport,
          arrivalAirport: raw.arrivalAirport,
          takeoffTime: operationalDateTime(raw.flightDate, raw.takeoffTime),
          landingTime: operationalDateTime(raw.flightDate, raw.landingTime),
          airborneDurationMinutes: raw.airborneDurationMinutes,
          groundDurationMinutes: raw.groundDurationMinutes,
          sortieDurationMinutes: raw.sortieDurationMinutes,
          flightRules: raw.flightRules,
          runway: raw.runway,
          frequency: raw.frequency,
          remarks: raw.remarks,
          importBatchId: batch.id,
        },
      });
      await tx.importRow.update({ where: { id: row.id }, data: { status: ImportRowStatus.IMPORTED, instructorId } });
      if (raw.flightStatus === "COMPLETED") importedRows += 1;
    }
    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.IMPORTED,
        importedRows,
        warningRows: batch.warningRows + duplicateRows,
        completedAt: new Date(),
      },
    });
    return { importedRows, duplicateRows };
  });
  messageRedirect(`/imports/${batch.id}`, "success", `${result.importedRows} uçuş içe aktarıldı${result.duplicateRows ? `, ${result.duplicateRows} tekrar atlandı` : ""}.`);
}

export async function archiveFlight(flightId: string, formData: FormData): Promise<void> {
  const user = await requirePermission("EDIT_FLIGHTS");
  if (user.role !== UserRole.ADMIN) throw new Error("Forbidden");
  if (formData.get("confirmArchive") !== "on") messageRedirect(`/flights/${flightId}/edit`, "error", "Arşivleme işlemini onaylayın.");
  await prisma.flight.update({ where: { id: flightId }, data: { archivedAt: new Date() } });
  messageRedirect("/flights", "success", "Uçuş arşivlendi.");
}

export async function updateFlight(flightId: string, formData: FormData): Promise<void> {
  await requirePermission("EDIT_FLIGHTS");
  const flight = await prisma.flight.findUnique({ where: { id: flightId }, include: { aircraft: true } });
  if (!flight) messageRedirect("/flights", "error", "Uçuş bulunamadı.");
  const registration = normalizeAircraftRegistration(String(formData.get("aircraft") ?? ""));
  if (!registration) messageRedirect(`/flights/${flightId}/edit`, "error", "Geçerli bir uçak tescili girin.");
  const instructorValue = String(formData.get("instructorId") ?? "");
  const instructor = instructorValue ? await prisma.personnel.findUnique({ where: { id: instructorValue } }) : null;
  const studentName = String(formData.get("studentName") ?? "").trim();
  const normalizedStudent = normalizePersonName(studentName);
  const student = normalizedStudent ? await prisma.student.upsert({ where: { normalizedName: normalizedStudent }, update: { displayName: studentName }, create: { normalizedName: normalizedStudent, displayName: studentName } }) : null;
  const sortie = String(formData.get("sourceSortieNo") ?? "").trim() || null;
  const takeoff = String(formData.get("takeoffTime") ?? "").trim() || null;
  const landing = String(formData.get("landingTime") ?? "").trim() || null;
  const date = flight.flightDate.toISOString().slice(0, 10);
  const aircraft = await prisma.aircraft.upsert({ where: { registration }, update: { active: true }, create: { registration } });
  const parseMinutes = (name: string) => { const value = Number(formData.get(name)); return Number.isInteger(value) && value >= 0 ? value : null; };
  const signature = flightSignature({ flightDate: date, sourceSortieNo: sortie, aircraftRegistration: registration, takeoffTime: takeoff, landingTime: landing, instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : null });
  try {
    await prisma.flight.update({ where: { id: flightId }, data: { signature, sourceSortieNo: sortie, aircraftId: aircraft.id, instructorId: instructor?.id ?? null, studentId: student?.id ?? null, studentName: studentName || null, departureAirport: String(formData.get("departureAirport") ?? "").trim() || null, arrivalAirport: String(formData.get("arrivalAirport") ?? "").trim() || null, takeoffTime: operationalDateTime(date, takeoff), landingTime: operationalDateTime(date, landing), sortieDurationMinutes: parseMinutes("sortieDurationMinutes"), airborneDurationMinutes: parseMinutes("airborneDurationMinutes"), groundDurationMinutes: parseMinutes("groundDurationMinutes"), remarks: String(formData.get("remarks") ?? "").trim() || null } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") messageRedirect(`/flights/${flightId}/edit`, "error", "Bu değişiklik mevcut başka bir uçuşla çakışıyor.");
    throw error;
  }
  messageRedirect("/flights", "success", "Uçuş güncellendi.");
}
