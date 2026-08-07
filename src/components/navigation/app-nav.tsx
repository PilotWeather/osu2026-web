import Link from "next/link";
import { getAuthorizedUser } from "@/src/lib/authz";

const links = [
  ["Dashboard", "/dashboard"],
  ["Personnel", "/"],
  ["Flights", "/flights"],
  ["Imports", "/imports"],
  ["Analytics", "/analytics"],
] as const;

export async function AppNav() {
  const user = await getAuthorizedUser();
  if (!user) return null;
  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">{label}</Link>
      ))}
      {user.role === "ADMIN" ? <Link href="/admin/users" className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10">Admin</Link> : null}
    </nav>
  );
}
