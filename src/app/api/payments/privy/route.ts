import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivySharePayment } from "@/lib/payments/privy";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.enum(["usd", "usdc"]).default("usdc"),
  txHash: z.string().min(8),
  walletAddress: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await verifyPrivySharePayment(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 402 });
  }

  // TODO: insert payment_intents + ledger_entries; mark participant paid
  // TODO: if all active participants paid → session status = funded

  return NextResponse.json({ ok: true });
}
