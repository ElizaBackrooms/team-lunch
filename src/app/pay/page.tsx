"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import styles from "../page.module.css";

type Features = {
  stripe: boolean;
  privy: boolean;
  authMode: string;
};

export default function PayPage() {
  const { data, error, busy, preview, markPaid } = useLunchSession();
  const [features, setFeatures] = useState<Features | null>(null);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);
  const p = data?.participant;
  const fee = data?.feePreview;

  useEffect(() => {
    void fetch("/api/features")
      .then((r) => r.json())
      .then(setFeatures)
      .catch(() => setFeatures({ stripe: false, privy: false, authMode: "demo" }));
  }, []);

  async function payWithStripe() {
    if (!p || !data) return;
    setStripeMsg(null);
    const res = await fetch("/api/payments/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: data.session.id,
        participantId: p.id,
        amountCents: Math.max(p.totalDueCents, 50),
        currency: data.session.currency,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStripeMsg(body.error ? JSON.stringify(body.error) : "Stripe failed");
      return;
    }
    setStripeMsg(
      body.clientSecret
        ? "PaymentIntent created — wire Stripe.js Elements next (secret ready)."
        : "Stripe response OK",
    );
    await markPaid();
  }

  return (
    <main className={styles.shell}>
      <Link href="/" className="backLink">
        ← Today
      </Link>
      <header className={styles.brand}>
        <p className={styles.org}>Your share</p>
        <h1 className={styles.title}>Pay</h1>
        <p className={styles.sub}>
          {features?.stripe
            ? "Stripe keys detected — card path available."
            : "No Stripe keys — mock pay funds the pot (demo)."}
          {features?.privy ? " Privy env present for crypto later." : ""}
        </p>
      </header>

      {error ? <p className="errorBanner">{error}</p> : null}
      {stripeMsg ? <p className={styles.footnote}>{stripeMsg}</p> : null}

      {!p ? (
        <p className={styles.deal}>
          Join lunch and add items first.{" "}
          <Link href="/join">Go to join →</Link>
        </p>
      ) : (
        <section className={styles.tally}>
          <h3 className={styles.sectionLabel}>Breakdown</h3>
          <ul className={styles.breakdown}>
            <li className={styles.rowTop}>
              <span>Food</span>
              <span>${(p.foodSubtotalCents / 100).toFixed(2)}</span>
            </li>
            <li className={styles.rowTop}>
              <span>Fee share</span>
              <span>${(p.feeShareCents / 100).toFixed(2)}</span>
            </li>
            <li className={styles.rowTop}>
              <span>Tip share</span>
              <span>${(p.tipShareCents / 100).toFixed(2)}</span>
            </li>
            <li className={`${styles.rowTop} ${styles.breakdownTotal}`}>
              <span>Total due</span>
              <span>${(p.totalDueCents / 100).toFixed(2)}</span>
            </li>
          </ul>

          {fee ? (
            <p className={styles.footnote}>
              Consolidated fees save ~${(fee.feesSavedCents / 100).toFixed(2)}{" "}
              vs separate orders.
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              className={styles.ctaSecondary}
              type="button"
              disabled={busy}
              onClick={() => void preview()}
            >
              Refresh preview
            </button>
            {features?.stripe ? (
              <button
                className={styles.cta}
                type="button"
                disabled={busy || p.status === "paid"}
                onClick={() => void payWithStripe()}
              >
                Pay with Stripe
              </button>
            ) : null}
            <button
              className={features?.stripe ? styles.ctaGhost : styles.cta}
              type="button"
              disabled={busy || p.status === "paid"}
              onClick={() => void markPaid()}
            >
              {p.status === "paid" ? "Paid — pot funded" : "Mock pay (fund pot)"}
            </button>
            {data?.session.status === "funded" ? (
              <Link className={styles.ctaGhost} href="/admin">
                Host: place order →
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
