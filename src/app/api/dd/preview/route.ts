import { NextResponse } from "next/server";
import { z } from "zod";
import { previewSessionFees } from "@/lib/dd-cli/product";
import { applyVotesToCandidates, getDemo, persistDemo } from "@/lib/demo-store";

const bodySchema = z.object({
  tipCents: z.number().int().nonnegative().optional(),
});

/** Fee preview for consolidated cart — used before / during pay. */
export async function POST(req: Request) {
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

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const tipCents = parsed.success
    ? (parsed.data.tipCents ?? demo.session.tipCents)
    : demo.session.tipCents;

  const participantIds = new Set(demo.cart.map((i) => i.participantId));
  if (demo.participant) participantIds.add(demo.participant.id);
  const participantCount = Math.max(participantIds.size, 1);
  const preview = await previewSessionFees({
    ddStoreId: winner.ddStoreId,
    items: demo.cart,
    tipCents,
    participantCount,
  });

  demo.feePreview = preview;
  demo.session.feeEstimateCents =
    preview.deliveryFeeCents + preview.serviceFeeCents + preview.taxCents;
  demo.session.tipCents = tipCents;

  if (demo.participant) {
    const food = demo.cart.reduce(
      (s, i) => s + i.unitPriceCents * i.quantity,
      0,
    );
    demo.participant.foodSubtotalCents = food;
    demo.participant.feeShareCents = preview.feeShareCents;
    demo.participant.tipShareCents = preview.tipShareCents;
    demo.participant.totalDueCents =
      food + preview.feeShareCents + preview.tipShareCents;
  }

  persistDemo();
  return NextResponse.json({ preview, participant: demo.participant });
}
