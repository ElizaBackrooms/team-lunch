import { NextResponse } from "next/server";
import { z } from "zod";
import { hasStripe } from "@/lib/features";
import { createSharePaymentIntent } from "@/lib/payments/stripe";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("usd"),
  customerEmail: z.string().email().optional(),
  stripeAccountId: z.string().optional(),
});

export async function POST(req: Request) {
  if (!hasStripe()) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        hint: "Set STRIPE_SECRET_KEY or use mock pay on /pay",
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const intent = await createSharePaymentIntent(parsed.data);

  return NextResponse.json({
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  });
}
