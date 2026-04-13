import { getUserBankrollSnapshot } from "@/features/bankroll/server/service";
import { getServerSession } from "@/features/auth/server/session";
import { fmtCents } from "@/lib/betting";
import { redirect } from "next/navigation";

export default async function BankrollPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const snapshot = await getUserBankrollSnapshot(session.userId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bankroll</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Account performance snapshot</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Track the current bankroll for <span className="font-medium text-slate-900">{session.email}</span>, plus how much capital has been staked and returned so far.
            </p>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-sky-700">Current bankroll</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{fmtCents(snapshot.currentBankrollCents)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Total staked</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{fmtCents(snapshot.totalStakedCents)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Total returned</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{fmtCents(snapshot.totalReturnedCents)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Net profit</div>
            <div className={`mt-3 text-3xl font-semibold ${snapshot.netProfitCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {snapshot.netProfitCents >= 0 ? "+" : "-"}
              {fmtCents(Math.abs(snapshot.netProfitCents))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Win rate</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{snapshot.winRate}%</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">How your bankroll is moving</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Open tickets</span>
                <span className="font-semibold text-slate-950">{snapshot.openTicketsCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Settled tickets</span>
                <span className="font-semibold text-slate-950">{snapshot.settledTicketsCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span>Average stake</span>
                <span className="font-semibold text-slate-950">
                  {snapshot.tickets.length === 0 ? "0.00" : fmtCents(Math.round(snapshot.totalStakedCents / snapshot.tickets.length))}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">What to add next</div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>1. Bankroll transaction history for each stake and payout.</li>
              <li>2. ROI and yield trends by day or week.</li>
              <li>3. Breakdown by open, won, lost, and void positions.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
