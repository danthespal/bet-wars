import { prisma } from "@/lib/prisma";
import { listUserTickets } from "@/features/tickets/server/service";

export async function getUserBankroll(userId: number) {
  return prisma.bankroll.findUnique({
    where: { userId },
  });
}

export async function getUserBankrollSnapshot(userId: number) {
  const [bankroll, tickets] = await Promise.all([getUserBankroll(userId), listUserTickets(userId)]);

  const currentBankrollCents = bankroll?.amountCents ?? 0;
  const totalStakedCents = tickets.reduce((total, ticket) => total + ticket.stakeCents, 0);
  const totalReturnedCents = tickets.reduce((total, ticket) => total + (ticket.payoutCents ?? 0), 0);
  const settledTickets = tickets.filter((ticket) => ticket.status === "settled");
  const openTickets = tickets.filter((ticket) => ticket.status === "open");
  const wonTickets = settledTickets.filter((ticket) => (ticket.payoutCents ?? 0) > 0);

  return {
    bankroll,
    tickets,
    currentBankrollCents,
    totalStakedCents,
    totalReturnedCents,
    netProfitCents: totalReturnedCents - totalStakedCents,
    settledTicketsCount: settledTickets.length,
    openTicketsCount: openTickets.length,
    wonTicketsCount: wonTickets.length,
    winRate:
      settledTickets.length === 0 ? 0 : Math.round((wonTickets.length / settledTickets.length) * 100),
  };
}
