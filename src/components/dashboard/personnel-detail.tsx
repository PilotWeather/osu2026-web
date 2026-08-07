"use client";

import { formatDate } from "@/src/lib/expiry";
import type { Personnel } from "@/src/types/personnel";

interface PersonnelDetailProps {
  person: Personnel | null;
  onClose: () => void;
}

export function PersonnelDetail({ person, onClose }: PersonnelDetailProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Personel Detayı</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{person.firstName} {person.lastName}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">Kapat</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {detailRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lisans süreleri</p>
          <div className="mt-3 space-y-2">
            {person.credentials.map((credential) => {
              const label = credential.type === "SEP_FI" ? "SEP-FI" : credential.type === "CLASS_1" ? "Class 1" : "SEP";
              return (
                <div key={credential.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <span>{label}</span>
                  <span>{credential.expiryDate ? formatDate(credential.expiryDate) : "Bilgi Yok"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {person.notes ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Açıklamalar</p>
            <p className="mt-2 text-sm text-slate-700">{person.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
