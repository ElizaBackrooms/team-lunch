import { NextResponse } from "next/server";
import { loadMenuForJoin } from "@/lib/dd-cli/product";
import { applyVotesToCandidates, getDemo } from "@/lib/demo-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const demo = getDemo();
  const ranked = applyVotesToCandidates(demo);
  const winner =
    ranked.find((c) => c.id === demo.session.winningCandidateId) ?? ranked[0];

  const storeId = searchParams.get("storeId") ?? winner?.ddStoreId;
  if (!storeId) {
    return NextResponse.json(
      { error: "No store selected — search + lock a winner first" },
      { status: 400 },
    );
  }

  const menu = await loadMenuForJoin(storeId);
  return NextResponse.json({
    storeId,
    storeName: winner?.name ?? menu.storeName,
    menu,
    sessionStatus: demo.session.status,
  });
}
