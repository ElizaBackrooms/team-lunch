import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPriorLunch } from "@/lib/dd-cli/product";
import { getDemo, persistDemo } from "@/lib/demo-store";

const bodySchema = z.object({
  orderId: z.string().min(3),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const demo = getDemo();
  const result = await reorderPriorLunch(parsed.data.orderId);
  demo.ddOrderId = result.orderId;
  demo.tracking = result.tracking ?? null;
  demo.session.status = "tracking";

  persistDemo();
  return NextResponse.json({ order: result, session: demo.session });
}
