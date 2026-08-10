"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialDashboardSyncState, syncNaeronFromDashboard } from "@/app/dashboard/actions";

function SyncButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 dark:focus-visible:ring-offset-slate-900">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`size-4 ${pending ? "animate-spin" : ""}`}><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>
    {pending ? "Senkronize ediliyor..." : "Naeron'dan Güncelle"}
  </button>;
}

export function NaeronSyncControl({ lastSyncLabel, health, active, canReview }: { lastSyncLabel: string; health: "green" | "amber" | "red"; active: boolean; canReview: boolean }) {
  const [state, action] = useActionState(syncNaeronFromDashboard, initialDashboardSyncState);
  const currentHealth = state.status === "error" ? "red" : state.status === "success" ? "green" : health;
  const dot = currentHealth === "green" ? "bg-emerald-500" : currentHealth === "amber" ? "bg-amber-500" : "bg-red-500";
  return <div className="relative flex flex-col items-end gap-2">
    <div className="flex flex-wrap items-center justify-end gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><span className={`size-2 rounded-full ${dot}`} aria-hidden="true"/>Naeron · {state.status === "success" ? "şimdi" : lastSyncLabel}</span><form action={action}><SyncButton disabled={active}/></form></div>
    {active && state.status === "idle" ? <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Senkronizasyon zaten çalışıyor.</p> : null}
    {state.message ? <div role="status" className={`max-w-xl rounded-xl border px-3 py-2 text-xs shadow-sm ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : state.status === "running" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"}`}><p className="font-semibold">{state.message}</p>{state.result ? <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]"><span>Fetched {state.result.fetched}</span><span>Created {state.result.created}</span><span>Updated {state.result.updated}</span><span>Archived {state.result.archived}</span><span>Flights {state.result.flights}</span><span>Aircraft {state.result.aircraft}</span><span>Cancelled {state.result.cancelled}</span><span>Unmatched FI {state.result.unmatchedInstructors}</span>{state.result.unmatchedInstructors > 0 && canReview ? <Link href="/admin/personnel-reconciliation" className="font-bold underline">Eşleşmeleri İncele</Link> : null}</div> : null}</div> : null}
  </div>;
}
