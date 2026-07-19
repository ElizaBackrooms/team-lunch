"use client";

import Link from "next/link";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import styles from "../page.module.css";

export default function VotePage() {
  const { data, error, busy, loading, vote, search } = useLunchSession();
  const candidates = data?.candidates ?? [];
  const maxVotes = Math.max(...candidates.map((c) => c.voteCount ?? 0), 1);

  if (loading) {
    return (
      <main className={styles.shell}>
        <Link href="/" className="backLink">
          ← Today
        </Link>
        <header className={styles.brand}>
          <p className={styles.org}>Optional</p>
          <h1 className={styles.title}>Vote</h1>
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
        <p className={styles.org}>Optional</p>
        <h1 className={styles.title}>Vote</h1>
        <p className={styles.sub}>
          Candidates come from dd-cli search. You do not need to join lunch to
          vote.
        </p>
      </header>

      {error ? <p className="errorBanner">{error}</p> : null}

      {candidates.length === 0 ? (
        <section className={styles.hero}>
          <p className={styles.deal}>No stores yet — host needs to search.</p>
          <button
            className={styles.cta}
            type="button"
            disabled={busy}
            onClick={() => void search("lunch near me")}
          >
            Seed from dd-cli search
          </button>
        </section>
      ) : (
        <section className={styles.tally}>
          <h3 className={styles.sectionLabel}>
            {data?.session.status === "voting"
              ? "Tap to vote"
              : `Session is ${data?.session.status}`}
          </h3>
          <ul className={styles.list}>
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={styles.voteBtn}
                  disabled={busy || data?.session.status !== "voting"}
                  onClick={() => void vote(c.id)}
                >
                  <div className={styles.rowTop}>
                    <span>
                      {c.name}
                      {c.dealLabel ? (
                        <span className={styles.muted}> · {c.dealLabel}</span>
                      ) : null}
                    </span>
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
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
