import { NextResponse } from "next/server";
import { placeConsolidatedOrder } from "@/lib/dd-cli/product";
import { applyVotesToCandidates, getDemo, persistDemo } from "@/lib/demo-store";

/**
 * Place one DoorDash order from all paid cart lines.
 * In production: only after session.status === 'funded'.
 */
export async function POST() {
  const demo = getDemo();
  const ranked = applyVotesToCandidates(demo);
  const winner =
    ranked.find((c) => c.id === demo.session.winningCandidateId) ?? ranked[0];

  if (!winner) {
    return NextResponse.json({ error: "no_winning_store" }, { status: 400 });
  }
  if (demo.cart.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  // Demo: allow checkout from collecting/funded/locked for UI testing
  if (!["collecting", "funded", "locked", "ordering"].includes(demo.session.status)) {
    return NextResponse.json(
      { error: `cannot_checkout_from_${demo.session.status}` },
      { status: 409 },
    );
  }

  demo.session.status = "ordering";
  const result = await placeConsolidatedOrder({
    ddStoreId: winner.ddStoreId,
    items: demo.cart,
    tipCents: demo.session.tipCents,
  });

  demo.ddOrderId = result.orderId;
  demo.tracking = result.tracking ?? null;
  demo.session.status = "tracking";

  persistDemo();
  return NextResponse.json({
    order: result,
    feesSavedCents: demo.feePreview?.feesSavedCents ?? null,
    session: demo.session,
  });
}
