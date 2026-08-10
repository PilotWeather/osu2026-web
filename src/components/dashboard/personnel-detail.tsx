"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initialPersonnelUpdateState, updatePersonnel } from "@/app/personnel/actions";
import { FlyingStatusBadge } from "@/src/components/dashboard/flying-status-badge";
import { formatDate } from "@/src/lib/expiry";
import type { Personnel, PersonnelCredentialType } from "@/src/types/personnel";

interface PersonnelDetailProps {
  person: Personnel;
  companies: string[];
  teams: string[];
  canEdit: boolean;
  onClose: () => void;
}

function credentialDate(person: Personnel, type: PersonnelCredentialType): string {
  return person.credentials.find((credential) => credential.type === type)?.expiryDate ?? "";
}

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function Field({ label, name, defaultValue, error, type = "text", required = false }: { label: string; name: string; defaultValue?: string; error?: string; type?: string; required?: boolean }) {
  return <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}<input className={`${inputClass} ${error ? "border-red-500" : ""}`} name={name} type={type} defaultValue={defaultValue} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}/>{error ? <span id={`${name}-error`} className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span> : null}</label>;
}

export function PersonnelDetail({ person, companies, teams, canEdit, onClose }: PersonnelDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const action = updatePersonnel.bind(null, person.id);
  const [state, formAction, pending] = useActionState(action, initialPersonnelUpdateState);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    const update = window.setTimeout(() => { setEditing(false); setToast(state.message); }, 0);
    const clear = window.setTimeout(() => setToast(""), 3500);
    return () => { window.clearTimeout(update); window.clearTimeout(clear); };
  }, [router, state]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editing) setEditing(false); else onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editing, onClose]);

  const detailRows = [
    ["Ad Soyad", `${person.firstName} ${person.lastName}`], ["Şirket", person.company ?? "-"], ["Ekip", person.team ?? "-"],
    ["E-posta", person.email ?? "-"], ["Telefon", person.phone ?? "-"], ["T.C. Kimlik No", person.nationalId ?? "-"],
    ["Doğum tarihi", formatDate(person.birthDate)], ["T-shirt bedeni", person.tshirtSize ?? "-"], ["Araç plakası", person.vehiclePlate ?? "-"],
    ["Lisans numarası", person.licenseNo ?? "-"], ["Kaynak sıra", person.sourceSequence?.toString() ?? "-"],
    ["Oluşturulma", formatDate(person.createdAt)], ["Güncellenme", formatDate(person.updatedAt)],
  ];

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/65 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !editing) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="personnel-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50">
      {toast ? <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">{toast}</div> : null}
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Personel Detayı</p><h2 id="personnel-detail-title" className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{person.firstName} {person.lastName}</h2><div className="mt-3"><FlyingStatusBadge isActive={person.isActiveFlying} detailed /></div></div>
        <div className="flex gap-2">{canEdit && !editing ? <button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Düzenle</button> : null}<button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Kapat</button></div></div>

      {editing ? <form action={formAction} className="mt-6 space-y-5">
        {state.message && !state.success ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{state.message}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" name="firstName" defaultValue={person.firstName} error={state.fieldErrors.firstName} required/><Field label="Soyad" name="lastName" defaultValue={person.lastName} error={state.fieldErrors.lastName} required/>
          <Field label="E-posta" name="email" type="email" defaultValue={person.email ?? ""} error={state.fieldErrors.email}/><Field label="Telefon" name="phone" type="tel" defaultValue={person.phone ?? ""} error={state.fieldErrors.phone}/>
          <Field label="Doğum tarihi" name="birthDate" type="date" defaultValue={person.birthDate ?? ""} error={state.fieldErrors.birthDate}/><Field label="T-shirt bedeni" name="tshirtSize" defaultValue={person.tshirtSize ?? ""} error={state.fieldErrors.tshirtSize}/>
          <Field label="Lisans numarası" name="licenseNo" defaultValue={person.licenseNo ?? ""} error={state.fieldErrors.licenseNo}/><Field label="Araç plakası" name="vehiclePlate" defaultValue={person.vehiclePlate ?? ""} error={state.fieldErrors.vehiclePlate}/>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Şirket<select name="company" defaultValue={person.company ?? ""} className={inputClass} aria-invalid={Boolean(state.fieldErrors.company)}><option value="">Şirket yok</option>{companies.map((company) => <option key={company} value={company}>{company}</option>)}</select>{state.fieldErrors.company ? <span className="mt-1 block text-xs text-red-600">{state.fieldErrors.company}</span> : null}</label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ekip<select name="team" defaultValue={person.team ?? ""} className={inputClass} aria-invalid={Boolean(state.fieldErrors.team)}><option value="">Ekip yok</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}</select>{state.fieldErrors.team ? <span className="mt-1 block text-xs text-red-600">{state.fieldErrors.team}</span> : null}</label>
          <Field label="SEP geçerlilik" name="sepExpiry" type="date" defaultValue={credentialDate(person, "SEP")} error={state.fieldErrors.sepExpiry}/><Field label="SEP-FI geçerlilik" name="sepFiExpiry" type="date" defaultValue={credentialDate(person, "SEP_FI")} error={state.fieldErrors.sepFiExpiry}/>
          <Field label="Class 1 geçerlilik" name="class1Expiry" type="date" defaultValue={credentialDate(person, "CLASS_1")} error={state.fieldErrors.class1Expiry}/>
          <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700"><input name="isActiveFlying" type="checkbox" defaultChecked={person.isActiveFlying} className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>Aktif uçuş</label>
        </div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Açıklamalar<textarea name="notes" defaultValue={person.notes ?? ""} rows={4} className={inputClass}/></label>
        <p className="text-xs text-slate-500">T.C. kimlik numarası bu ekrandan değiştirilemez.</p>
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" onClick={() => setEditing(false)} disabled={pending} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">İptal</button><button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{pending ? "Kaydediliyor…" : "Kaydet"}</button></div>
      </form> : <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">{detailRows.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{value}</p></div>)}</div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lisans süreleri</p><div className="mt-3 space-y-2">{person.credentials.map((credential) => <div key={credential.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"><span className="font-medium">{credential.type === "SEP_FI" ? "SEP-FI" : credential.type === "CLASS_1" ? "Class 1" : "SEP"}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">{credential.expiryDate ? formatDate(credential.expiryDate) : "Bilgi Yok"}</span></div>)}</div></div>
        {person.notes ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Açıklamalar</p><p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{person.notes}</p></div> : null}
      </>}
    </div>
  </div>;
}
