import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getAuthorizedUser } from "@/src/lib/authz";

const roleLabels = {
  ADMIN: "Admin",
  DATA_MANAGER: "Data Manager",
  VIEWER: "Viewer",
} as const;

export async function UserMenu() {
  const [session, user] = await Promise.all([auth(), getAuthorizedUser()]);
  if (!session?.user || !user) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-full border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {(session.user.name ?? user.name).charAt(0).toLocaleUpperCase("tr-TR")}
        </span>
      )}
      <div className="hidden min-w-0 sm:block">
        <p className="max-w-40 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {session.user.name ?? user.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabels[user.role]}</p>
      </div>
      {user.role === "ADMIN" ? (
        <Link href="/admin/users" className="rounded-xl px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:focus-visible:ring-blue-400">
          Admin · Users
        </Link>
      ) : null}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-blue-400"
        >
          Çıkış
        </button>
      </form>
    </div>
  );
}
