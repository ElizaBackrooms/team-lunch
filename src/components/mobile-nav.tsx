"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./mobile-nav.module.css";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/vote", label: "Vote" },
  { href: "/join", label: "Join" },
  { href: "/order", label: "Order" },
  { href: "/admin", label: "Host" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.active : styles.link}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
