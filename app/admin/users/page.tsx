import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { AuthorizedUsersPanel } from "@/src/components/admin/authorized-users-panel";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { getAuthorizedUser } from "@/src/lib/authz";
import { prisma } from "@/src/lib/db";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; status?: string; message?: string }>;
}

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await connection();
  const [session, currentUser, params] = await Promise.all([auth(), getAuthorizedUser(), searchParams]);
  if (!session?.user?.id) redirect("/login");
  if (!currentUser || currentUser.role !== "ADMIN") redirect("/");

  const query = params.q?.trim() ?? "";
  const users = await prisma.authorizedUser.findMany({
    where: query ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)] px-4 py-6 text-slate-900 dark:bg-[linear-gradient(180deg,#0b0f19_0%,#0d1320_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Authorized Users</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage access and roles for the internal operations system.</p></div>
          <div className="flex items-center gap-3"><Link href="/" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Dashboard</Link><ThemeToggle /></div>
        </header>

        {params.message ? <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${params.status === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"}`}>{params.message}</div> : null}

        <form className="flex max-w-lg gap-2" action="/admin/users">
          <input name="q" defaultValue={query} placeholder="Search email or name" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Search</button>
        </form>

        <AuthorizedUsersPanel users={users.map((user) => ({ ...user, createdAt: dateFormatter.format(user.createdAt), updatedAt: dateFormatter.format(user.updatedAt) }))} currentEmail={currentUser.email} />
      </div>
    </main>
  );
}
