import { AppNav } from "@/src/components/navigation/app-nav";
import { UserMenu } from "@/src/components/auth/user-menu";
import { ThemeToggle } from "@/src/components/theme-toggle";

export function AppHeader({ title, subtitle, eyebrow = "ÖSU 2026" }: { title: string; subtitle: string; eyebrow?: string }) {
  return (
    <header className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p></div>
        <div className="flex flex-col gap-3 lg:items-end"><div className="flex items-center gap-3"><UserMenu /><ThemeToggle /></div><AppNav /></div>
      </div>
    </header>
  );
}
