import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyVotesToCandidates,
  demoIds,
  getDemo,
  persistDemo,
  resetDemo,
} from "@/lib/demo-store";
import type { OrderItem } from "@/lib/types";
import {
  DEFAULT_ORG_LOCATION,
  locationFromCoords,
} from "@/lib/location";

const modifierSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  priceCents: z.number().int(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("vote"), candidateId: z.string().uuid() }),
  z.object({ action: z.literal("lock") }),
  z.object({ action: z.literal("join") }),
  z.object({
    action: z.literal("add_item"),
    ddItemId: z.string(),
    name: z.string(),
    unitPriceCents: z.number().int().nonnegative(),
    quantity: z.number().int().positive().optional().default(1),
    modifiers: z.array(modifierSchema).optional().default([]),
    notes: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("clear_cart") }),
  z.object({ action: z.literal("mark_paid") }),
  z.object({ action: z.literal("open_collecting") }),
  z.object({
    action: z.literal("set_location"),
    mode: z.enum(["org", "device", "manual"]),
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z
      .object({
        label: z.string().optional(),
        line1: z.string(),
        city: z.string(),
        region: z.string(),
        postalCode: z.string(),
        country: z.string().default("US"),
        line2: z.string().optional(),
      })
      .optional(),
  }),
]);

export async function GET() {
  return NextResponse.json(readSnapshot(getDemo()));
}

export async function POST(req: Request) {
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const demo = getDemo();
  const { userId } = demoIds();
  const body = parsed.data;

  switch (body.action) {
    case "reset":
      resetDemo();
      break;
    case "set_location": {
      if (body.mode === "org") {
        demo.location = { ...DEFAULT_ORG_LOCATION };
      } else if (body.mode === "device") {
        if (body.lat == null || body.lng == null) {
          return NextResponse.json(
            { error: "device_requires_coords" },
            { status: 400 },
          );
        }
        demo.location = locationFromCoords({
          lat: body.lat,
          lng: body.lng,
        });
      } else if (body.address) {
        demo.location = {
          label: body.address.label ?? "Custom",
          line1: body.address.line1,
          line2: body.address.line2,
          city: body.address.city,
          region: body.address.region,
          postalCode: body.address.postalCode,
          country: body.address.country,
          source: "manual",
        };
      } else {
        return NextResponse.json({ error: "manual_requires_address" }, { status: 400 });
      }
      break;
    }
    case "vote": {
      if (demo.session.status !== "voting") {
        return NextResponse.json({ error: "not_voting" }, { status: 409 });
      }
      if (!demo.candidates.some((c) => c.id === body.candidateId)) {
        return NextResponse.json({ error: "unknown_candidate" }, { status: 404 });
      }
      demo.votes[userId] = body.candidateId;
      break;
    }
    case "lock": {
      const ranked = applyVotesToCandidates(demo);
      if (!ranked[0]) {
        return NextResponse.json({ error: "no_candidates" }, { status: 400 });
      }
      demo.session.winningCandidateId = ranked[0].id;
      demo.session.status = "locked";
      break;
    }
    case "join": {
      if (!["locked", "collecting"].includes(demo.session.status)) {
        return NextResponse.json({ error: "join_after_lock" }, { status: 409 });
      }
      demo.participant = {
        id: crypto.randomUUID(),
        sessionId: demo.session.id,
        userId,
        status: "joined",
        foodSubtotalCents: 0,
        feeShareCents: 0,
        tipShareCents: 0,
        totalDueCents: 0,
      };
      demo.session.status = "collecting";
      break;
    }
    case "add_item": {
      if (!demo.participant) {
        return NextResponse.json({ error: "not_joined" }, { status: 409 });
      }
      const mods = body.modifiers ?? [];
      const item: OrderItem = {
        id: crypto.randomUUID(),
        participantId: demo.participant.id,
        sessionId: demo.session.id,
        ddItemId: body.ddItemId,
        name: body.name,
        quantity: body.quantity,
        unitPriceCents: body.unitPriceCents,
        modifiers: mods,
        notes: body.notes ?? null,
      };
      demo.cart.push(item);
      demo.participant.status = "cart_ready";
      demo.participant.foodSubtotalCents = demo.cart.reduce(
        (s, i) => s + i.unitPriceCents * i.quantity,
        0,
      );
      break;
    }
    case "clear_cart":
      demo.cart = [];
      if (demo.participant) {
        demo.participant.foodSubtotalCents = 0;
        demo.participant.status = "joined";
      }
      break;
    case "open_collecting":
      demo.session.status = "collecting";
      break;
    case "mark_paid": {
      if (!demo.participant) {
        return NextResponse.json({ error: "not_joined" }, { status: 409 });
      }
      demo.participant.status = "paid";
      demo.session.status = "funded";
      break;
    }
  }

  return NextResponse.json(writeSnapshot(getDemo()));
}

function readSnapshot(demo: ReturnType<typeof getDemo>) {
  return {
    session: demo.session,
    location: demo.location,
    candidates: applyVotesToCandidates(demo),
    votes: demo.votes,
    participant: demo.participant,
    cart: demo.cart,
    feePreview: demo.feePreview,
    ddOrderId: demo.ddOrderId,
    tracking: demo.tracking,
    ids: demoIds(),
  };
}

function writeSnapshot(demo: ReturnType<typeof getDemo>) {
  persistDemo();
  return readSnapshot(demo);
}
