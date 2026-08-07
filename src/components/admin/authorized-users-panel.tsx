"use client";

import type { UserRole } from "@prisma/client";
import { createAuthorizedUser, toggleAuthorizedUserStatus, updateAuthorizedUser } from "@/app/admin/users/actions";

interface AuthorizedUserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthorizedUsersPanelProps {
  users: AuthorizedUserRow[];
  currentEmail: string;
}

const roles: UserRole[] = ["ADMIN", "DATA_MANAGER", "VIEWER"];

function confirmOwnAccess(event: React.FormEvent<HTMLFormElement>, message: string) {
  const form = event.currentTarget;
  const isSelf = form.dataset.self === "true";
  if (!isSelf) return;
  if (!window.confirm(message)) {
    event.preventDefault();
    return;
  }
  const confirmation = form.elements.namedItem("confirmSelf");
  if (confirmation instanceof HTMLInputElement) confirmation.value = "true";
}

function confirmOwnRoleChange(event: React.FormEvent<HTMLFormElement>) {
  const role = event.currentTarget.elements.namedItem("role");
  if (role instanceof HTMLSelectElement && role.value === "ADMIN") return;
  confirmOwnAccess(event, "You are about to change your own admin access. Continue?");
}

export function AuthorizedUsersPanel({ users, currentEmail }: AuthorizedUsersPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add authorized user</h2>
        <form action={createAuthorizedUser} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_0.8fr_auto_auto] xl:items-end">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input required type="email" name="email" autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Name <span className="font-normal text-slate-400">(optional)</span>
            <input name="name" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Role
            <select name="role" defaultValue="VIEWER" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="active" defaultChecked className="size-4 accent-blue-600" /> Active
          </label>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900">Add user</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created / Updated</th><th className="px-5 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((user) => {
                const isSelf = user.email === currentEmail;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <form id={`edit-${user.id}`} action={updateAuthorizedUser} data-self={isSelf} onSubmit={confirmOwnRoleChange}>
                        <input type="hidden" name="id" value={user.id} /><input type="hidden" name="confirmSelf" defaultValue="false" />
                        <input name="name" defaultValue={user.name} aria-label={`Name for ${user.email}`} className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                      </form>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">{user.email}{isSelf ? <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">You</span> : null}</td>
                    <td className="px-5 py-4"><select form={`edit-${user.id}`} name="role" defaultValue={user.role} aria-label={`Role for ${user.email}`} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{roles.map((role) => <option key={role}>{role}</option>)}</select></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.active ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{user.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4 text-xs leading-5 text-slate-500 dark:text-slate-400"><div>{user.createdAt}</div><div>Updated {user.updatedAt}</div></td>
                    <td className="px-5 py-4"><div className="flex gap-2"><button form={`edit-${user.id}`} type="submit" className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Save</button><form action={toggleAuthorizedUserStatus} data-self={isSelf && user.active} onSubmit={(event) => confirmOwnAccess(event, "You are about to disable your own access.")}><input type="hidden" name="id" value={user.id} /><input type="hidden" name="confirmSelf" defaultValue="false" /><button type="submit" className={`rounded-lg px-3 py-2 font-semibold ${user.active ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300" : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-300"}`}>{user.active ? "Disable" : "Enable"}</button></form></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
