import fs from "node:fs";
import path from "node:path";
import type {
  DdFeePreview,
  DdSelectedModifier,
  DdTracking,
} from "@/lib/dd-cli/types";
import type {
  LunchSession,
  OrderItem,
  SessionParticipant,
  StoreCandidate,
} from "@/lib/types";
import { rankCandidates } from "@/lib/types";
import {
  DEFAULT_ORG_LOCATION,
  type DeliveryLocation,
} from "@/lib/location";

export type DemoState = {
  session: LunchSession;
  location: DeliveryLocation;
  candidates: StoreCandidate[];
  votes: Record<string, string>;
  participant: SessionParticipant | null;
  cart: OrderItem[];
  feePreview: DdFeePreview | null;
  ddOrderId: string | null;
  tracking: DdTracking | null;
};

const DEMO_SESSION_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_ORG = "00000000-0000-4000-8000-0000000000aa";
const DEMO_HOST = "00000000-0000-4000-8000-0000000000bb";
const DEMO_USER = "00000000-0000-4000-8000-0000000000cc";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "session.json");

function fresh(): DemoState {
  return {
    session: {
      id: DEMO_SESSION_ID,
      orgId: DEMO_ORG,
      hostUserId: DEMO_HOST,
      title: "Thursday lunch",
      status: "draft",
      voteClosesAt: null,
      orderByAt: null,
      winningCandidateId: null,
      tipCents: 500,
      feeEstimateCents: 0,
      currency: "usd",
    },
    location: { ...DEFAULT_ORG_LOCATION },
    candidates: [],
    votes: {},
    participant: null,
    cart: [],
    feePreview: null,
    ddOrderId: null,
    tracking: null,
  };
}

type GlobalDemo = { __teamLunchDemo?: DemoState; __teamLunchDemoLoaded?: boolean };
const g = globalThis as unknown as GlobalDemo;

function ensureLoaded() {
  if (g.__teamLunchDemoLoaded && g.__teamLunchDemo) return;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      g.__teamLunchDemo = JSON.parse(raw) as DemoState;
    } else {
      g.__teamLunchDemo = fresh();
    }
  } catch {
    g.__teamLunchDemo = fresh();
  }
  g.__teamLunchDemoLoaded = true;
}

export function persistDemo() {
  ensureLoaded();
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(g.__teamLunchDemo, null, 2), "utf8");
  } catch {
    // ignore disk errors in read-only envs
  }
}

export function getDemo(): DemoState {
  ensureLoaded();
  return g.__teamLunchDemo!;
}

export function resetDemo() {
  g.__teamLunchDemo = fresh();
  g.__teamLunchDemoLoaded = true;
  persistDemo();
  return g.__teamLunchDemo;
}

export function demoIds() {
  return {
    sessionId: DEMO_SESSION_ID,
    orgId: DEMO_ORG,
    hostUserId: DEMO_HOST,
    userId: DEMO_USER,
  };
}

export function applyVotesToCandidates(state: DemoState): StoreCandidate[] {
  const counts = new Map<string, number>();
  for (const candidateId of Object.values(state.votes)) {
    counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
  }
  const withVotes = state.candidates.map((c) => ({
    ...c,
    voteCount: counts.get(c.id) ?? 0,
  }));
  return rankCandidates(withVotes);
}

export type { DdSelectedModifier, DeliveryLocation };
