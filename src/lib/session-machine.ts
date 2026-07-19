import type { SessionStatus } from "./types";

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["voting", "cancelled"],
  voting: ["locked", "cancelled"],
  locked: ["collecting", "voting", "cancelled"],
  collecting: ["funded", "locked", "cancelled"],
  funded: ["ordering", "cancelled"],
  ordering: ["tracking", "cancelled"],
  tracking: ["settled"],
  settled: [],
  cancelled: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SessionStatus, to: SessionStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid session transition: ${from} → ${to}`);
  }
}

/** UI CTA for the Today board based on status + whether the viewer joined. */
export function todayCta(input: {
  status: SessionStatus;
  hasJoined: boolean;
  hasPaid: boolean;
}): { label: string; href: string } | null {
  const { status, hasJoined, hasPaid } = input;

  if (status === "voting") {
    return { label: "Vote", href: "/vote" };
  }
  if (status === "locked" || status === "collecting") {
    if (!hasJoined) return { label: "Join lunch", href: "/join" };
    if (!hasPaid) return { label: "Pay share", href: "/pay" };
    return { label: "Edit order", href: "/join" };
  }
  if (status === "ordering" || status === "tracking" || status === "funded") {
    return { label: "View order", href: "/order" };
  }
  return null;
}
