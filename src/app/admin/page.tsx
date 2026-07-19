"use client";

import Link from "next/link";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import { formatAddress } from "@/lib/location";
import {
  DD_CLI_PLATFORM_NOTE,
  DD_CLI_REPO,
  DD_CLI_WAITLIST,
} from "@/lib/dd-cli/waitlist";
import styles from "../page.module.css";

export default function AdminPage() {
  const {
    data,
    health,
    error,
    busy,
    loading,
    reset,
    search,
    searchNearMe,
    setOrgLocation,
    useDeviceLocation,
    lock,
    checkout,
    track,
  } = useLunchSession();

  if (loading) {
    return (
      <main className={styles.shell}>
        <Link href="/" className="backLink">
          ← Today
        </Link>
        <header className={styles.brand}>
          <p className={styles.org}>Host</p>
          <h1 className={styles.title}>Host tools</h1>
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
        <p className={styles.org}>Host</p>
        <h1 className={styles.title}>Host tools</h1>
        <p className={styles.sub}>
          Set where lunch delivers, then search nearby — office address by
          default, GPS only if you ask.
        </p>
      </header>

      {health ? (
        <p className={styles.metaLine}>
          Adapter: <strong>{health.mode}</strong> — {health.message}
        </p>
      ) : null}
      {error ? <p className="errorBanner">{error}</p> : null}

      <section className={styles.hero}>
        <h3 className={styles.sectionLabel}>DoorDash CLI waitlist</h3>
        <p className={styles.deal}>
          Live search / checkout needs DoorDash beta access. Until then this app
          uses a mock adapter so you can build and test on any machine.
        </p>
        <p className={styles.footnote}>{DD_CLI_PLATFORM_NOTE}</p>
        <div className={styles.actions}>
          <a
            className={styles.cta}
            href={DD_CLI_WAITLIST}
            target="_blank"
            rel="noreferrer"
          >
            Join dd-cli waitlist
          </a>
          <a
            className={styles.ctaSecondary}
            href={DD_CLI_REPO}
            target="_blank"
            rel="noreferrer"
          >
            GitHub / download
          </a>
        </div>
      </section>

      <section className={styles.tally}>
        <h3 className={styles.sectionLabel}>Delivery location</h3>
        <p className={styles.metaLine}>
          {data?.location
            ? `${data.location.label} (${data.location.source}): ${formatAddress(data.location)}`
            : "…"}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.ctaSecondary}
            type="button"
            disabled={busy}
            onClick={() => void setOrgLocation()}
          >
            Use office address
          </button>
          <button
            className={styles.ctaSecondary}
            type="button"
            disabled={busy}
            onClick={() => void useDeviceLocation()}
          >
            Use my location
          </button>
        </div>
        <p className={styles.footnote}>
          Browser only asks for GPS when you tap “Use my location” / search near
          me — not on every visit.
        </p>
      </section>

      <section className={styles.tally}>
        <h3 className={styles.sectionLabel}>Session</h3>
        <p className={styles.metaLine}>
          Status: {data?.session.status ?? "…"} · candidates:{" "}
          {data?.candidates.length ?? 0} · cart: {data?.cart.length ?? 0}
          {data?.ddOrderId ? ` · order ${data.ddOrderId}` : ""}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.cta}
            disabled={busy}
            type="button"
            onClick={() => void search("lunch", { locationMode: "org" })}
          >
            1. Search near office
          </button>
          <button
            className={styles.ctaSecondary}
            disabled={busy}
            type="button"
            onClick={() => void searchNearMe("lunch")}
          >
            Search near me
          </button>
          <button
            className={styles.ctaSecondary}
            disabled={busy || data?.session.status !== "voting"}
            type="button"
            onClick={() => void lock()}
          >
            2. Lock winner
          </button>
          <button
            className={styles.cta}
            disabled={busy || data?.session.status !== "funded"}
            type="button"
            onClick={() => void checkout()}
          >
            3. Checkout
          </button>
          <button
            className={styles.ctaSecondary}
            disabled={busy || !data?.ddOrderId}
            type="button"
            onClick={() => void track()}
          >
            4. Refresh tracking
          </button>
          <button
            className={styles.ctaGhost}
            type="button"
            disabled={busy}
            onClick={() => void reset()}
          >
            Reset demo
          </button>
        </div>
        <p className={styles.footnote}>
          After search: vote → join + customize menu → pay → checkout here.
        </p>
      </section>
    </main>
  );
}
