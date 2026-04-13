import { TicketsHistoryPanel } from "@/app/_components/TicketsHistoryPanel";
import { getUserBankroll } from "@/features/bankroll/server/service";
import { getServerSession } from "@/features/auth/server/session";
import { listUserTickets, summarizeTickets } from "@/features/tickets/server/service";
import { fmtCents } from "@/lib/betting";
import { redirect } from "next/navigation";

export default async function TicketsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const [tickets, bankroll] = await Promise.all([
    listUserTickets(session.userId),
    getUserBankroll(session.userId),
  ]);

  const summary = summarizeTickets(tickets);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Account tickets</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Your full ticket history</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Review every ticket tied to <span className="font-medium text-slate-900">{session.email}</span>, including open exposure and settled outcomes.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Current bankroll: <span className="font-semibold">{fmtCents(bankroll?.amountCents ?? 0)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Total tickets</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.totalTickets}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Open tickets</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.openTicketsCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Won / Lost</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">
              {summary.wonTicketsCount} / {summary.lostTicketsCount}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Open exposure</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{fmtCents(summary.openExposureCents)}</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <TicketsHistoryPanel tickets={tickets} />
      </div>
    </main>
  );
}
