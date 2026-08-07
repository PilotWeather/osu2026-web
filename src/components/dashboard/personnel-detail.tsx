"use client";

import { useEffect } from "react";
import { formatDate } from "@/src/lib/expiry";
import type { Personnel } from "@/src/types/personnel";

interface PersonnelDetailProps {
  person: Personnel | null;
  onClose: () => void;
}

export function PersonnelDetail({ person, onClose }: PersonnelDetailProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!person) return null;

  const detailRows = [
    ["Ad Soyad", `${person.firstName} ${person.lastName}`],
    ["Şirket", person.company ?? "-"],
    ["Ekip", person.team ?? "-"],
    ["E-posta", person.email ?? "-"],
    ["Telefon", person.phone ? person.phone.replace(/\d(?=\d{4})/g, "•") : "-"],
    ["Doğum tarihi", formatDate(person.birthDate)],
    ["T-shirt bedeni", person.tshirtSize ?? "-"],
    ["Araç plakası", person.vehiclePlate ?? "-"],
    ["Lisans numarası", person.licenseNo ?? "-"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/65 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="personnel-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Personel Detayı</p>
            <h2 id="personnel-detail-title" className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{person.firstName} {person.lastName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400">Kapat</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {detailRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lisans süreleri</p>
          <div className="mt-3 space-y-2">
            {person.credentials.map((credential) => {
              const label = credential.type === "SEP_FI" ? "SEP-FI" : credential.type === "CLASS_1" ? "Class 1" : "SEP";
              return (
                <div key={credential.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <span className="font-medium">{label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">{credential.expiryDate ? formatDate(credential.expiryDate) : "Bilgi Yok"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {person.notes ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Açıklamalar</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{person.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
