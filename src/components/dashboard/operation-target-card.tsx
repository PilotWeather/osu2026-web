import { formatDuration } from "@/src/lib/flights/time";

const TARGET_MINUTES = 3_000 * 60;
const OPERATION_START = new Date("2026-08-03T00:00:00.000Z");
const OPERATION_END_EXCLUSIVE = new Date("2026-09-12T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1_000;

interface OperationTargetCardProps {
  completedMinutes: number;
  completedSorties: number;
  lastSyncAt: Date | null;
  now?: Date;
}

function signedDuration(minutes: number) {
  const sign = minutes >= 0 ? "+" : "−";
  return `${sign}${formatDuration(Math.abs(minutes))}`;
}

function relativeSyncTime(value: Date | null, now: Date) {
  if (!value) return "Sync bekleniyor";
  const minutes = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 60_000));
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function OperationTargetCard({ completedMinutes, completedSorties, lastSyncAt, now = new Date() }: OperationTargetCardProps) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const totalDays = Math.round((OPERATION_END_EXCLUSIVE.getTime() - OPERATION_START.getTime()) / DAY_MS);
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((today.getTime() - OPERATION_START.getTime()) / DAY_MS) + 1));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const remainingMinutes = Math.max(0, TARGET_MINUTES - completedMinutes);
  const dailyRequiredMinutes = remainingDays > 0 ? Math.ceil(remainingMinutes / remainingDays) : remainingMinutes;
  const averageSortieMinutes = completedSorties > 0 ? completedMinutes / completedSorties : 60;
  const dailyRequiredSorties = dailyRequiredMinutes > 0 ? Math.ceil(dailyRequiredMinutes / Math.max(1, averageSortieMinutes)) : 0;
  const plannedMinutes = Math.round((TARGET_MINUTES * elapsedDays) / totalDays);
  const planDifference = completedMinutes - plannedMinutes;
  const progress = Math.min(100, Math.max(0, (completedMinutes / TARGET_MINUTES) * 100));
  const ahead = planDifference >= 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">ÖSU 2026</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Operasyon Hedefi</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" aria-hidden="true" />
          API · {relativeSyncTime(lastSyncAt, now)}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {formatDuration(completedMinutes)} <span className="text-base font-medium text-slate-400 sm:text-lg">/ 3000:00</span>
            </p>
            <p className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">%{progress.toFixed(1)}</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Operasyon hedefi ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(progress.toFixed(1))}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-300 dark:from-blue-500 dark:to-cyan-400" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Kalan", formatDuration(remainingMinutes)],
            ["Kalan Gün", remainingDays.toString()],
            ["Günlük Gerekli", formatDuration(dailyRequiredMinutes)],
            ["Gerekli Sorti", `~${dailyRequiredSorties} / gün`],
            ["Tasarı Farkı", signedDuration(planDifference)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Durum</dt>
            <dd className={`mt-1.5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${ahead ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
              <span className={`h-2 w-2 rounded-full ${ahead ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
              {ahead ? "HEDEFİN ÖNÜNDE" : "HEDEFİN GERİSİNDE"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
