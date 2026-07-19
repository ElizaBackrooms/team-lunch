import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/dd-cli/product";
import { getDemo, persistDemo } from "@/lib/demo-store";

/** Read-only tracking snapshot (no mock advance). */
export async function GET(req: Request) {
  const demo = getDemo();
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") ?? demo.ddOrderId;

  if (!orderId) {
    return NextResponse.json({ error: "no_order" }, { status: 404 });
  }

  return NextResponse.json({
    orderId,
    tracking: demo.tracking,
    session: demo.session,
    feesSavedCents: demo.feePreview?.feesSavedCents ?? null,
  });
}

/** Advance / refresh tracking from DoorDash (mock progresses on each call). */
export async function POST(req: Request) {
  const demo = getDemo();
  let orderId = demo.ddOrderId;
  try {
    const body = (await req.json()) as { orderId?: string };
    if (body.orderId) orderId = body.orderId;
  } catch {
    // empty body ok
  }

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
