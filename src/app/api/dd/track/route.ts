import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/dd-cli/product";
import { getDemo, persistDemo } from "@/lib/demo-store";

export async function GET(req: Request) {
  const demo = getDemo();
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") ?? demo.ddOrderId;

  if (!orderId) {
    return NextResponse.json({ error: "no_order" }, { status: 404 });
  }

  const tracking = await trackOrder(orderId);
  demo.tracking = tracking;
  if (tracking.status === "delivered") {
    demo.session.status = "settled";
  }

  persistDemo();
  return NextResponse.json({
    orderId,
    tracking,
    session: demo.session,
    feesSavedCents: demo.feePreview?.feesSavedCents ?? null,
  });
}
