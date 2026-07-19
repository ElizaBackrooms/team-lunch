/**
 * Privy is the crypto rail into the same session pot.
 * Client authenticates with Privy; server verifies the tx / wallet payment
 * and writes ledger_entries with rail = 'privy' — same funded gate as Stripe.
 */

export type PrivySharePayment = {
  sessionId: string;
  participantId: string;
  amountCents: number;
  currency: "usd" | "usdc";
  /** On-chain or Privy transaction reference */
  txHash: string;
  walletAddress: string;
};

export function assertPrivyConfigured() {
  if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    throw new Error("PRIVY_APP_ID / PRIVY_APP_SECRET are not set");
  }
}

/**
 * Verify a completed Privy/wallet payment before marking participant paid.
 * Wire to Privy server SDK / webhook once keys exist.
 */
export async function verifyPrivySharePayment(
  payment: PrivySharePayment,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  assertPrivyConfigured();

  if (!payment.txHash || payment.amountCents <= 0) {
    return { ok: false, reason: "invalid_payment" };
  }

  // TODO: call Privy API to confirm txHash amount + destination wallet
  return { ok: true };
}
