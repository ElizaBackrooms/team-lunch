export type MembershipRole = "member" | "host" | "admin";

export type SessionStatus =
  | "draft"
  | "voting"
  | "locked"
  | "collecting"
  | "funded"
  | "ordering"
  | "tracking"
  | "settled"
  | "cancelled";

export type PaymentRail = "stripe" | "privy";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";

export type ParticipantStatus =
  | "joined"
  | "cart_ready"
  | "paid"
  | "dropped"
  | "refunded";

export type LunchSession = {
  id: string;
  orgId: string;
  hostUserId: string;
  title: string;
  status: SessionStatus;
  voteClosesAt: string | null;
  orderByAt: string | null;
  winningCandidateId: string | null;
  tipCents: number;
  feeEstimateCents: number;
  currency: string;
};

export type StoreCandidate = {
  id: string;
  sessionId: string;
  ddStoreId: string;
  name: string;
  imageUrl: string | null;
  dealLabel: string | null;
  dealScore: number;
  etaMinutes: number | null;
  voteCount?: number;
  rankScore?: number;
};

export type SessionParticipant = {
  id: string;
  sessionId: string;
  userId: string;
  status: ParticipantStatus;
  foodSubtotalCents: number;
  feeShareCents: number;
  tipShareCents: number;
  totalDueCents: number;
};

export type OrderItem = {
  id: string;
  participantId: string;
  sessionId: string;
  ddItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  modifiers: import("@/lib/dd-cli/types").DdSelectedModifier[];
  notes: string | null;
};

/** Winning store = highest (votes + deal_score). Ties break on deal_score. */
export function rankCandidates(candidates: StoreCandidate[]): StoreCandidate[] {
  return [...candidates].sort((a, b) => {
    const ra = (a.voteCount ?? 0) + a.dealScore;
    const rb = (b.voteCount ?? 0) + b.dealScore;
    if (rb !== ra) return rb - ra;
    return b.dealScore - a.dealScore;
  });
}

/** Split delivery/service/tip evenly across paid/cart-ready participants. */
export function splitFees(params: {
  feeCents: number;
  tipCents: number;
  participantCount: number;
}): { feeShareCents: number; tipShareCents: number } {
  const n = Math.max(params.participantCount, 1);
  return {
    feeShareCents: Math.ceil(params.feeCents / n),
    tipShareCents: Math.ceil(params.tipCents / n),
  };
}
