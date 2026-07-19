import { NextResponse } from "next/server";
import { ddHealth } from "@/lib/dd-cli/product";

export async function GET() {
  const health = await ddHealth();
  return NextResponse.json(health);
}
