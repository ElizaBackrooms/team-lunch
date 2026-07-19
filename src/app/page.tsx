"use client";

import Link from "next/link";
import { todayCta } from "@/lib/session-machine";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import { formatAddress } from "@/lib/location";
import styles from "./page.module.css";

export default function TodayBoardPage() {
  const { data, health, error, busy, search } = useLunchSession();
  const ranked = data?.candidates ?? [];
  const leader = ranked[0];
  const maxVotes = Math.max(...ranked.map((c) => c.voteCount ?? 0), 1);
  const status = data?.session.status ?? "draft";
  const cta = data
    ? todayCta({
        status,
        hasJoined: Boolean(data.participant),
        hasPaid: data.participant?.status === "paid",
      })
    : null;

  return (
    <main className={styles.shell}>
      <header className={styles.brand}>
        <p className={styles.org}>Acme Labs</p>
        <h1 className={styles.title}>Team Lunch</h1>
        <p className={styles.sub}>
          A calm place to see what the office is craving — join only if you want
          in.
        </p>
      </header>

      {health ? (
        <p className={styles.footnote}>
          DoorDash: {health.mode}
          {health.available ? " ready" : " offline"} ·{" "}
          <Link href="/admin">Host tools</Link>
          {health.mode === "mock" ? (
            <>
              {" "}
              ·{" "}
              <a
                href="https://forms.gle/gvCQZvu9C1EKA6aM6"
                target="_blank"
                rel="noreferrer"
              >
                Join CLI waitlist
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {data?.location ? (
        <p className={styles.footnote}>
          Near {data.location.label}: {formatAddress(data.location)}
        </p>
      ) : null}
      {error ? <p className="errorBanner">{error}</p> : null}

      <section className={styles.hero} aria-label="Today leading pick">
        <div className={styles.statusRow}>
          <span className={styles.pill}>{status}</span>
          <span className={styles.muted}>
            {data?.session.title ?? "Thursday lunch"}
          </span>
        </div>
        <h2 className={styles.winner}>
          {leader?.name ??
            (status === "draft" ? "No session yet" : "No votes yet")}
        </h2>
        {leader?.dealLabel ? (
          <p className={styles.deal}>{leader.dealLabel}</p>
        ) : (
          <p className={styles.deal}>
            {ranked.length
              ? "Leading by votes + deal score"
              : "Host searches stores near the office"}
          </p>
        )}
        <div className={styles.actions}>
          {cta ? (
            <Link className={styles.cta} href={cta.href}>
              {cta.label}
            </Link>
          ) : status === "draft" || ranked.length === 0 ? (
            <button
              className={styles.cta}
              type="button"
              disabled={busy}
              onClick={() => void search("lunch", { locationMode: "org" })}
            >
              Start — search near office
            </button>
          ) : null}
          {data?.ddOrderId ? (
            <Link className={styles.ctaSecondary} href="/order">
              Track order
            </Link>
          ) : null}
        </div>
      </section>

      <section className={styles.tally} aria-label="Live vote tally">
        <h3 className={styles.sectionLabel}>Live votes</h3>
        {ranked.length === 0 ? (
          <p className={styles.muted}>Waiting for nearby search…</p>
        ) : (
          <ul className={styles.list}>
            {ranked.map((c) => (
              <li key={c.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <span>{c.name}</span>
                  <span className={styles.muted}>{c.voteCount ?? 0}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{
                      width: `${((c.voteCount ?? 0) / maxVotes) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.footnote}>
          Viewing is open to the org. Ordering is opt-in — skip anytime.
        </p>
      </section>
    </main>
  );
}
