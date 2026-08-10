import { AppNav } from "@/src/components/navigation/app-nav";
import { UserMenu } from "@/src/components/auth/user-menu";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { getAuthorizedUser } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";
import { NaeronSyncControl } from "@/src/components/naeron/sync-control";

function syncLabel(value: Date | null, now: Date) { if (!value) return "henüz yok"; const minutes=Math.max(0,Math.floor((now.getTime()-value.getTime())/60_000)); if(minutes<1)return "şimdi";if(minutes<60)return `${minutes} dk önce`;if(minutes<1440)return `${Math.floor(minutes/60)} sa önce`;return `${Math.floor(minutes/1440)} gün önce`; }

export async function AppHeader({ title, subtitle, eyebrow = "ÖSU 2026", showNaeronSync = false }: { title: string; subtitle: string; eyebrow?: string; showNaeronSync?: boolean }) {
  const [user, syncState, clock] = showNaeronSync ? await Promise.all([getAuthorizedUser(), prisma.naeronSyncState.findUnique({where:{tableName:"bi_flights"},select:{lastSuccessfulSyncAt:true,lastError:true,syncLockedAt:true,syncLockToken:true}}),prisma.$queryRaw<Array<{now:Date}>>`SELECT NOW() AS "now"`]) : [null, null, [{now:new Date(0)}]];
  const now = clock[0].now;
  const canSync = user?.role === "ADMIN" || user?.role === "DATA_MANAGER";
  const stale = !syncState?.lastSuccessfulSyncAt || now.getTime()-syncState.lastSuccessfulSyncAt.getTime()>15*60_000;
  const active = Boolean(syncState?.syncLockToken && syncState.syncLockedAt && now.getTime()-syncState.syncLockedAt.getTime()<15*60_000);
  return (
    <header className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p></div>
        <div className="flex flex-col gap-3 lg:items-end">{showNaeronSync && canSync ? <NaeronSyncControl lastSyncLabel={syncLabel(syncState?.lastSuccessfulSyncAt ?? null,now)} health={syncState?.lastError ? "red" : stale ? "amber" : "green"} active={active} canReview={user?.role === "ADMIN"}/> : null}<div className="flex items-center gap-3"><UserMenu /><ThemeToggle /></div><AppNav /></div>
      </div>
    </header>
  );
}
