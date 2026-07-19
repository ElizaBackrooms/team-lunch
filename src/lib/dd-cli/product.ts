import { getDoorDashCli } from "./index";
import type { DdCartLine, DdFeePreview, DdStore } from "./types";
import type { OrderItem, StoreCandidate } from "@/lib/types";
import { splitFees } from "@/lib/types";
import { formatAddress, type DeliveryLocation } from "@/lib/location";

/** 1. Search → store candidates for voting (always near a delivery location) */
export async function seedCandidatesFromSearch(input: {
  sessionId: string;
  query: string;
  location: DeliveryLocation;
}): Promise<StoreCandidate[]> {
  const dd = getDoorDashCli();
  const nearPart =
    input.location.lat != null && input.location.lng != null
      ? `${input.location.lat},${input.location.lng}`
      : formatAddress(input.location);

  const stores = await dd.searchStores({
    query: input.query || "lunch",
    near: nearPart,
    lat: input.location.lat ?? undefined,
    lng: input.location.lng ?? undefined,
  });
  return stores.map((s) => storeToCandidate(input.sessionId, s));
}

export function storeToCandidate(sessionId: string, s: DdStore): StoreCandidate {
  return {
    id: crypto.randomUUID(),
    sessionId,
    ddStoreId: s.id,
    name: s.name,
    imageUrl: s.imageUrl ?? null,
    dealLabel: s.dealLabel ?? null,
    dealScore: s.dealScore,
    etaMinutes: s.etaMinutes ?? null,
    voteCount: 0,
  };
}

/** 2. Menu for join screen */
export async function loadMenuForJoin(ddStoreId: string) {
  return getDoorDashCli().getMenu(ddStoreId);
}

/** 3. Fee preview from consolidated cart — drives pay shares */
export async function previewSessionFees(input: {
  ddStoreId: string;
  items: OrderItem[];
  tipCents: number;
  participantCount: number;
}): Promise<
  DdFeePreview & {
    feeShareCents: number;
    tipShareCents: number;
  }
> {
  const lines = orderItemsToCartLines(input.items);
  const preview = await getDoorDashCli().previewCheckout({
    storeId: input.ddStoreId,
    lines,
    tipCents: input.tipCents,
  });
  const fees =
    preview.deliveryFeeCents + preview.serviceFeeCents + preview.taxCents;
  const shares = splitFees({
    feeCents: fees,
    tipCents: input.tipCents,
    participantCount: input.participantCount,
  });
  return { ...preview, ...shares };
}

/** 4–5. Build cart + checkout when funded */
export async function placeConsolidatedOrder(input: {
  ddStoreId: string;
  items: OrderItem[];
  tipCents: number;
}) {
  const dd = getDoorDashCli();
  const lines = orderItemsToCartLines(input.items);
  await dd.buildCart({ storeId: input.ddStoreId, lines });
  return dd.checkout({
    storeId: input.ddStoreId,
    lines,
    tipCents: input.tipCents,
  });
}

/** 6. Tracking */
export async function trackOrder(ddOrderId: string) {
  return getDoorDashCli().getOrderStatus(ddOrderId);
}

/** 7. History */
export async function lunchOrderHistory(limit = 10) {
  return getDoorDashCli().listOrderHistory(limit);
}

/** 8. Reorder prior DD order into a new checkout */
export async function reorderPriorLunch(ddOrderId: string) {
  return getDoorDashCli().reorder(ddOrderId);
}

export function orderItemsToCartLines(items: OrderItem[]): DdCartLine[] {
  return items.map((item) => ({
    itemId: item.ddItemId,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    modifiers: item.modifiers,
    notes: item.notes,
    participantLabel: item.participantId,
  }));
}

export async function ddHealth() {
  return getDoorDashCli().health();
}
