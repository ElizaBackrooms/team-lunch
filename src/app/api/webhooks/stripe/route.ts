import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "missing_webhook_config" }, { status: 400 });
  }

  const payload = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const sessionId = intent.metadata?.session_id;
    const participantId = intent.metadata?.participant_id;

    // TODO:
    // 1) payment_intents.status = succeeded
    // 2) session_participants.status = paid
    // 3) ledger_entries direction = in
    // 4) if all non-dropped participants paid → lunch_sessions.status = funded
    void sessionId;
    void participantId;
  }

  return NextResponse.json({ received: true });
}
