"use client";

import { useState } from "react";
import { TicketsList } from "@/app/_components/TicketsList";
import type { Ticket } from "@/lib/types";

export function TicketsHistoryPanel({ tickets }: { tickets: Ticket[] }) {
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  return (
    <TicketsList
      tickets={tickets}
      expandedTicketId={expandedTicketId}
      onToggleExpanded={(id) => setExpandedTicketId((prev) => (prev === id ? null : id))}
      maxItems={null}
      title="Ticket History"
      emptyMessage="You haven’t placed any tickets yet."
      footerMessage={
        tickets.length > 0 ? `Showing all ${tickets.length} tickets for this account.` : undefined
      }
    />
  );
}
