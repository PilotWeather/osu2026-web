"use client";

import { formatDate, getExpiryStatus } from "@/src/lib/expiry";

interface ExpiryBadgeProps {
  expiryDate: string | null;
  label: string;
}

export function ExpiryBadge({ expiryDate, label }: ExpiryBadgeProps) {
  const status = getExpiryStatus(expiryDate);

  const toneClasses: Record<string, string> = {
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    warning: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[status.tone]}`}>
        {status.label}
      </span>
      <span className="text-[11px] text-slate-500">{label}: {formatDate(expiryDate)}</span>
    </div>
  );
}
