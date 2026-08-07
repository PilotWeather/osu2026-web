"use client";

import { formatDate, getExpiryStatus } from "@/src/lib/expiry";

interface ExpiryBadgeProps {
  expiryDate: string | null;
  label: string;
}

export function ExpiryBadge({ expiryDate, label }: ExpiryBadgeProps) {
  const status = getExpiryStatus(expiryDate);

  const toneClasses: Record<string, string> = {
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/25",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/25",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/25",
    success: "bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/25",
    neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600",
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[status.tone]}`}>
        {status.label}
      </span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}: {formatDate(expiryDate)}</span>
    </div>
  );
}
