import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, signIn } from "@/auth";
import { ThemeToggle } from "@/src/components/theme-toggle";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await connection();
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (session?.user?.active) redirect("/");

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 text-slate-900 dark:bg-[linear-gradient(180deg,#0b0f19_0%,#0d1320_100%)] dark:text-slate-100">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">NorthFly</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">ÖSU 2026</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Internal Operations System
        </p>

        {params.error ? (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            You are not authorized to access this system.
          </div>
        ) : null}

        <form
          className="mt-7"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs leading-5 text-slate-400 dark:text-slate-500">
          Access is limited to pre-approved NorthFly personnel.
        </p>
      </section>
    </main>
  );
}
