import { NextResponse } from "next/server";
import { authMode, hasPrivy, hasStripe, hasSupabase } from "@/lib/features";

export async function GET() {
  return NextResponse.json({
    authMode: authMode(),
    supabase: hasSupabase(),
    stripe: hasStripe(),
    privy: hasPrivy(),
    ddCliMock:
      process.env.DD_CLI_MOCK !== "0" && process.env.DD_CLI_USE_REAL !== "1",
  });
}
