import { NextResponse } from "next/server";
import { lunchOrderHistory } from "@/lib/dd-cli/product";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 10);
  const orders = await lunchOrderHistory(
    Number.isFinite(limit) ? limit : 10,
  );
  return NextResponse.json({ orders });
}
