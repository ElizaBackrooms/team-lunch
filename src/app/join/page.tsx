"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  DdMenuItem,
  DdSelectedModifier,
} from "@/lib/dd-cli/types";
import { lineUnitPrice } from "@/lib/dd-cli/types";
import { useLunchSession } from "@/lib/hooks/use-lunch-session";
import { formatAddress } from "@/lib/location";
import styles from "../page.module.css";

function defaultSelections(item: DdMenuItem): Record<string, string[]> {
  const sel: Record<string, string[]> = {};
  for (const g of item.modifierGroups) {
    const defaults = g.options.filter((o) => o.isDefault && o.available);
    if (defaults.length) {
      sel[g.id] = defaults.slice(0, Math.max(g.min, 1)).map((o) => o.id);
    } else if (g.required && g.min > 0) {
      const first = g.options.find((o) => o.available);
      sel[g.id] = first ? [first.id] : [];
    } else {
      sel[g.id] = [];
    }
  }
  return sel;
}

function toModifiers(
  item: DdMenuItem,
  sel: Record<string, string[]>,
): DdSelectedModifier[] {
  const out: DdSelectedModifier[] = [];
  for (const g of item.modifierGroups) {
    for (const optId of sel[g.id] ?? []) {
      const opt = g.options.find((o) => o.id === optId);
      if (!opt) continue;
      out.push({
        groupId: g.id,
        groupName: g.name,
        optionId: opt.id,
        optionName: opt.name,
        priceCents: opt.priceCents,
      });
    }
  }
  return out;
}

export default function JoinPage() {
  const {
    data,
    menu,
    error,
    busy,
    loading,
    join,
    loadMenu,
    addItem,
    preview,
  } = useLunchSession();

  const [customizing, setCustomizing] = useState<DdMenuItem | null>(null);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");

  const locked = ["locked", "collecting", "funded"].includes(
    data?.session.status ?? "",
  );
  const winner = data?.candidates?.find(
    (c) => c.id === data.session.winningCandidateId,
  );

  useEffect(() => {
    if (data?.participant && !menu) {
      void loadMenu();
    }
  }, [data?.participant, menu, loadMenu]);

  const previewPrice = useMemo(() => {
    if (!customizing) return 0;
    return lineUnitPrice(customizing.priceCents, toModifiers(customizing, sel));
  }, [customizing, sel]);

  function openCustomize(item: DdMenuItem) {
    if (!item.available) return;
    if (item.modifierGroups.length === 0) {
      void addItem({
        ddItemId: item.id,
        name: item.name,
        unitPriceCents: item.priceCents,
        modifiers: [],
      });
      return;
    }
    setCustomizing(item);
    setSel(defaultSelections(item));
    setNotes("");
  }

  function toggleOption(groupId: string, optionId: string, max: number) {
    setSel((prev) => {
      const cur = prev[groupId] ?? [];
      if (max === 1) return { ...prev, [groupId]: [optionId] };
      if (cur.includes(optionId)) {
        return { ...prev, [groupId]: cur.filter((id) => id !== optionId) };
      }
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, optionId] };
    });
  }

  function confirmAdd() {
    if (!customizing) return;
    for (const g of customizing.modifierGroups) {
      const count = (sel[g.id] ?? []).length;
      if (count < g.min) {
        return;
      }
    }
    const modifiers = toModifiers(customizing, sel);
    void addItem({
      ddItemId: customizing.id,
      name: customizing.name,
      unitPriceCents: previewPrice,
      modifiers,
      notes: notes || null,
    }).then(() => {
      setCustomizing(null);
    });
  }

  if (loading) {
    return (
      <main className={styles.shell}>
        <Link href="/" className="backLink">
          ← Today
        </Link>
        <header className={styles.brand}>
          <p className={styles.org}>Opt-in</p>
          <h1 className={styles.title}>Join lunch</h1>
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
        <p className={styles.org}>Opt-in</p>
        <h1 className={styles.title}>Join lunch</h1>
        <p className={styles.sub}>
          Full in-app menu — sizes, proteins, add-ons, spice. Not an embedded
          DoorDash page.
        </p>
      </header>

      {data?.location ? (
        <p className={styles.footnote}>
          Delivering to {data.location.label}: {formatAddress(data.location)}
        </p>
      ) : null}

      {error ? <p className="errorBanner">{error}</p> : null}

      {!locked ? (
        <p className={styles.deal}>
          Waiting for host to lock a winner (status:{" "}
          {data?.session.status ?? "draft"}).
        </p>
      ) : !data?.participant ? (
        <section className={styles.hero}>
          <h2 className={styles.winner}>{winner?.name ?? "Winning store"}</h2>
          <p className={styles.deal}>{winner?.dealLabel ?? "Locked pick"}</p>
          <button
            className={styles.cta}
            type="button"
            disabled={busy}
            onClick={() => void join().then(() => loadMenu())}
          >
            I&apos;m in — show menu
          </button>
        </section>
      ) : (
        <section className={styles.tally}>
          <h3 className={styles.sectionLabel}>
            Menu · {menu?.storeName ?? winner?.name}
          </h3>
          {menu?.storeUrl ? (
            <p className={styles.footnote}>
              Prefer browsing on DoorDash?{" "}
              <a href={menu.storeUrl} target="_blank" rel="noreferrer">
                Open store link
              </a>{" "}
              (orders still placed in-app).
            </p>
          ) : null}
          {!menu ? (
            <button
              className={styles.cta}
              type="button"
              disabled={busy}
              onClick={() => void loadMenu()}
            >
              Load menu
            </button>
          ) : (
            <ul className={styles.list}>
              {menu.items.map((item) => (
                <li key={item.id} className={styles.menuRow}>
                  <div className={styles.rowTop}>
                    <span>
                      {item.name}
                      {item.popular ? (
                        <span className={styles.muted}> · popular</span>
                      ) : null}
                      {!item.available ? (
                        <span className={styles.muted}> · sold out</span>
                      ) : null}
                      <span className={styles.muted}>
                        {" "}
                        · ${(item.priceCents / 100).toFixed(2)}
                        {item.calories ? ` · ${item.calories} cal` : ""}
                      </span>
                      {item.description ? (
                        <span
                          className={styles.muted}
                          style={{ display: "block", marginTop: 4 }}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className={styles.ctaSoft}
                      disabled={busy || !item.available}
                      onClick={() => openCustomize(item)}
                    >
                      {item.modifierGroups.length ? "Customize" : "Add"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {customizing ? (
            <div className={styles.hero} style={{ marginTop: "0.5rem" }}>
              <h3 className={styles.sectionLabel}>Customize · {customizing.name}</h3>
              {customizing.modifierGroups.map((g) => (
                <div key={g.id} style={{ marginBottom: "0.85rem" }}>
                  <p className={styles.metaLine}>
                    <strong>{g.name}</strong>
                    {g.required ? " · required" : ""}
                    {g.max > 1 ? ` · pick up to ${g.max}` : ""}
                  </p>
                  <div className={styles.actions}>
                    {g.options.map((o) => {
                      const on = (sel[g.id] ?? []).includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={!o.available}
                          className={on ? styles.ctaSoft : styles.ctaGhost}
                          onClick={() => toggleOption(g.id, o.id, g.max)}
                        >
                          {o.name}
                          {o.priceCents > 0
                            ? ` +$${(o.priceCents / 100).toFixed(2)}`
                            : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <label className={styles.metaLine}>
                Special instructions
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No cilantro, extra napkins…"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "0.65rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--stroke)",
                    background: "var(--bg-elevated)",
                    color: "var(--ink)",
                    font: "inherit",
                  }}
                />
              </label>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ctaGhost}
                  onClick={() => setCustomizing(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.cta}
                  disabled={busy}
                  onClick={confirmAdd}
                >
                  Add · ${(previewPrice / 100).toFixed(2)}
                </button>
              </div>
            </div>
          ) : null}

          <h3 className={styles.sectionLabel}>Your cart</h3>
          {data.cart.length === 0 ? (
            <p className={styles.muted}>Empty</p>
          ) : (
            <>
              <ul className={styles.breakdown}>
                {data.cart.map((line) => (
                  <li key={line.id}>
                    <div className={styles.rowTop}>
                      <span>
                        {line.quantity}× {line.name}
                      </span>
                      <span className={styles.muted}>
                        $
                        {((line.unitPriceCents * line.quantity) / 100).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    {line.modifiers?.length ? (
                      <p className={styles.footnote}>
                        {line.modifiers.map((m) => m.optionName).join(" · ")}
                      </p>
                    ) : null}
                    {line.notes ? (
                      <p className={styles.footnote}>Note: {line.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className={styles.actions}>
                <button
                  className={styles.ctaSecondary}
                  type="button"
                  disabled={busy}
                  onClick={() => void preview()}
                >
                  Preview fees
                </button>
                <Link className={styles.cta} href="/pay">
                  Continue to pay
                </Link>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
