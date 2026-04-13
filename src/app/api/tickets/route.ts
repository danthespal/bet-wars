import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server/require-user";
import { createTicketForUser, listUserTickets, TicketServiceError } from "@/features/tickets/server/service";
import * as z from "zod";

const PickSchema = z.enum(["1", "X", "2"]);

const TicketLegSchema = z
  .object({
    matchId: z.number().int().positive(),
    pick: PickSchema,
  })
  .strict();

const CreateTicketSchema = z
  .object({
    stake: z.number().finite().gt(0).max(1_000_000),
    legs: z.array(TicketLegSchema).min(1).max(20),
  })
  .strict();

function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ ok: false, error, details }, { status: 400 });
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));
    return badRequest("Invalid request", details);
  }

  const { stake, legs } = parsed.data;
  const stakeCents = toCents(stake);

  if (!Number.isFinite(stakeCents) || stakeCents <= 0) {
    return badRequest("Invalid stake");
  }

  try {
    const ticket = await createTicketForUser(auth.session.userId, {
      stakeCents,
      legs,
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e: unknown) {
    if (e instanceof TicketServiceError) {
      return NextResponse.json(
        { ok: false, error: e.message, ...(e.extra ?? {}) },
        { status: e.status }
      );
    }
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const tickets = await listUserTickets(auth.session.userId);

  return NextResponse.json({ tickets });
}
