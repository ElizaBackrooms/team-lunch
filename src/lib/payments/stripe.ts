import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

/** Create a PaymentIntent for one participant's lunch share. */
export async function createSharePaymentIntent(input: {
  amountCents: number;
  currency: string;
  sessionId: string;
  participantId: string;
  customerEmail?: string;
  stripeAccountId?: string;
}) {
  const stripe = getStripe();

  return stripe.paymentIntents.create(
    {
      amount: input.amountCents,
      currency: input.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        session_id: input.sessionId,
        participant_id: input.participantId,
        product: "team_lunch_share",
      },
      receipt_email: input.customerEmail,
    },
    input.stripeAccountId
      ? { stripeAccount: input.stripeAccountId }
      : undefined,
  );
}
