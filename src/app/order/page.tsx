"use client";

import Link from "next/link";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import styles from "../page.module.css";

export default function OrderPage() {
  const { data, error, busy, loading, track } = useLunchSession();
  const t = data?.tracking;

  if (loading) {
    return (
      <main className={styles.shell}>
        <Link href="/" className="backLink">
          ← Today
        </Link>
        <header className={styles.brand}>
          <p className={styles.org}>Live</p>
          <h1 className={styles.title}>Order</h1>
          <p className={styles.sub}>Loading session…</p>
        </header>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <Link href="/" className="backLink">
        ← Today
      </Link>
      <header className={styles.brand}>
        <p className={styles.org}>Live</p>
        <h1 className={styles.title}>Order</h1>
        <p className={styles.sub}>
          Quiet tracking for the whole org — join not required.
        </p>
      </header>

      {error ? <p className="errorBanner">{error}</p> : null}

      {!data?.ddOrderId ? (
        <p className={styles.deal}>
          No DoorDash order yet. Host checkouts from admin after the pot is
          funded.
        </p>
      ) : (
        <section className={styles.hero}>
          <div className={styles.statusRow}>
            <span className={styles.pill}>{t?.status ?? "pending"}</span>
            <span className={styles.muted}>{data.ddOrderId}</span>
          </div>
          <h2 className={styles.winner}>
            {t?.etaMinutes != null ? `${t.etaMinutes} min` : "On the way"}
          </h2>
          <p className={styles.deal}>
            {t?.dasherName ? `Dasher ${t.dasherName}` : "Waiting for dasher"}
            {t?.progressPercent != null ? ` · ${t.progressPercent}%` : ""}
          </p>
          {data.feePreview ? (
            <p className={styles.footnote}>
              Fees saved vs N orders: $
              {(data.feePreview.feesSavedCents / 100).toFixed(2)}
            </p>
          ) : null}
          <button
            className={styles.cta}
            type="button"
            disabled={busy}
            onClick={() => void track()}
          >
            Refresh tracking
          </button>
        </section>
      )}
    </main>
  );
}
