import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Access denied</div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">You do not have access to this area.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          If you expected admin access, sign in with an admin account or head back to the player area.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/play" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Go to play
          </Link>
          <Link href="/login" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
