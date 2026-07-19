import { NextResponse } from "next/server";
import { z } from "zod";
import { seedCandidatesFromSearch } from "@/lib/dd-cli/product";
import { applyVotesToCandidates, getDemo, persistDemo } from "@/lib/demo-store";
import {
  DEFAULT_ORG_LOCATION,
  locationFromCoords,
  type DeliveryLocation,
} from "@/lib/location";

const bodySchema = z.object({
  query: z.string().min(1).default("lunch"),
  openVoting: z.boolean().default(true),
  /** Use org address (default), device GPS, or a manual override */
  locationMode: z.enum(["org", "device", "manual"]).default("org"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z
    .object({
      label: z.string().optional(),
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string(),
      country: z.string().default("US"),
    })
    .optional(),
});

function resolveLocation(
  parsed: z.infer<typeof bodySchema>,
  current: DeliveryLocation,
): DeliveryLocation {
  if (parsed.locationMode === "device") {
    if (parsed.lat == null || parsed.lng == null) {
      throw new Error("device_location_requires_lat_lng");
    }
    return locationFromCoords({ lat: parsed.lat, lng: parsed.lng });
  }
  if (parsed.locationMode === "manual" && parsed.address) {
    return {
      label: parsed.address.label ?? "Custom",
      line1: parsed.address.line1,
      line2: parsed.address.line2,
      city: parsed.address.city,
      region: parsed.address.region,
      postalCode: parsed.address.postalCode,
      country: parsed.address.country,
      source: "manual",
    };
  }
  return current.source ? current : { ...DEFAULT_ORG_LOCATION };
}

/** Seed store candidates via dd-cli search near delivery location. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const demo = getDemo();
  let location: DeliveryLocation;
  try {
    location = resolveLocation(parsed.data, demo.location);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "bad_location" },
      { status: 400 },
    );
  }

  demo.location = location;

  const candidates = await seedCandidatesFromSearch({
    sessionId: demo.session.id,
    query: parsed.data.query,
    location,
  });

  demo.candidates = candidates;
  demo.votes = {};
  demo.session.winningCandidateId = null;
  if (parsed.data.openVoting) {
    demo.session.status = "voting";
  }

  persistDemo();
  return NextResponse.json({
    session: demo.session,
    location: demo.location,
    candidates: applyVotesToCandidates(demo),
  });
}

export async function GET() {
  const demo = getDemo();
  return NextResponse.json({
    session: demo.session,
    location: demo.location,
    candidates: applyVotesToCandidates(demo),
  });
}
