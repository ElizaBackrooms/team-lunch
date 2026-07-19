import type {
  DdCartLine,
  DdCheckoutResult,
  DdCliHealth,
  DdFeePreview,
  DdHistoryOrder,
  DdMenu,
  DdSearchParams,
  DdStore,
  DdTracking,
  DoorDashCli,
} from "./types";
import { MOCK_MENUS } from "./mock-menus";

const MOCK_STORES: DdStore[] = [
  {
    id: "dd_chipotle_01",
    name: "Chipotle",
    description: "Mexican fast-casual",
    etaMinutes: 28,
    dealLabel: "20% off bowls",
    dealScore: 2.5,
    rating: 4.5,
    distanceMiles: 0.6,
  },
  {
    id: "dd_sweetgreen_01",
    name: "Sweetgreen",
    description: "Salads & bowls",
    etaMinutes: 32,
    dealLabel: null,
    dealScore: 0.5,
    rating: 4.6,
    distanceMiles: 0.8,
  },
  {
    id: "dd_thaibasil_01",
    name: "Thai Basil",
    description: "Thai comfort",
    etaMinutes: 40,
    dealLabel: "Free delivery",
    dealScore: 1.8,
    rating: 4.7,
    distanceMiles: 1.1,
  },
  {
    id: "dd_cava_01",
    name: "CAVA",
    description: "Mediterranean",
    etaMinutes: 25,
    dealLabel: "$5 off $25+",
    dealScore: 2.0,
    rating: 4.4,
    distanceMiles: 0.5,
  },
  {
    id: "dd_shake_01",
    name: "Shake Shack",
    description: "Burgers",
    etaMinutes: 35,
    dealLabel: null,
    dealScore: 0.2,
    rating: 4.3,
    distanceMiles: 1.4,
  },
];

function resolveSearchQuery(params: DdSearchParams | string): string {
  if (typeof params === "string") return params;
  if (params.near) return `${params.query} near ${params.near}`.trim();
  if (params.lat != null && params.lng != null) {
    return `${params.query} near ${params.lat},${params.lng}`;
  }
  return params.query;
}

function foodTotal(lines: DdCartLine[]) {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

function previewFromLines(
  lines: DdCartLine[],
  tipCents: number,
): DdFeePreview {
  const foodCents = foodTotal(lines);
  const deliveryFeeCents = 399;
  const serviceFeeCents = Math.round(foodCents * 0.15);
  const taxCents = Math.round(foodCents * 0.0875);
  const joinerEstimate = Math.max(
    new Set(lines.map((l) => l.participantLabel ?? "anon")).size,
    1,
  );
  const multiOrderFeesCents =
    (deliveryFeeCents + serviceFeeCents) * joinerEstimate;
  const singleFees = deliveryFeeCents + serviceFeeCents;
  return {
    foodCents,
    deliveryFeeCents,
    serviceFeeCents,
    taxCents,
    tipCents,
    totalCents: foodCents + deliveryFeeCents + serviceFeeCents + taxCents + tipCents,
    multiOrderFeesCents,
    feesSavedCents: Math.max(multiOrderFeesCents - singleFees, 0),
  };
}

const g = globalThis as unknown as {
  __ddMockOrders?: Map<
    string,
    { storeName: string; result: DdCheckoutResult; tick: number }
  >;
};

function orderStore() {
  if (!g.__ddMockOrders) g.__ddMockOrders = new Map();
  return g.__ddMockOrders;
}

function advanceTracking(orderId: string): DdTracking {
  const row = orderStore().get(orderId);
  if (!row) {
    return { status: "cancelled", etaMinutes: null };
  }
  row.tick += 1;
  const stages = [
    "confirmed",
    "preparing",
    "picking_up",
    "delivering",
    "delivered",
  ] as const;
  const idx = Math.min(row.tick, stages.length - 1);
  const status = stages[idx];
  row.result.status = status;
  row.result.tracking = {
    status,
    etaMinutes: status === "delivered" ? 0 : Math.max(35 - row.tick * 7, 3),
    dasherName: row.tick >= 2 ? "Alex D." : null,
    progressPercent: Math.round(((idx + 1) / stages.length) * 100),
  };
  return row.result.tracking;
}

export class MockDoorDashCli implements DoorDashCli {
  async health(): Promise<DdCliHealth> {
    return {
      mode: "mock",
      available: true,
      platformOk: true,
      message:
        "Mock adapter active. Swap to RealDoorDashCli on macOS ARM after waitlist approval.",
      capabilities: [
        "search",
        "menu",
        "cart",
        "preview",
        "checkout",
        "order_status",
        "order_history",
        "reorder",
      ],
    };
  }

  async searchStores(params: DdSearchParams | string): Promise<DdStore[]> {
    const q = resolveSearchQuery(params).toLowerCase().trim();
    // Simulate distance sort when coords present
    const stores = [...MOCK_STORES].sort(
      (a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99),
    );
    if (
      !q ||
      q.includes("lunch") ||
      q.includes("near") ||
      q.includes("market")
    ) {
      return stores;
    }
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }

  async getMenu(storeId: string): Promise<DdMenu> {
    const menu = MOCK_MENUS[storeId];
    if (!menu) {
      return {
        storeId,
        storeName: "Unknown store",
        categories: [],
        items: [],
        storeUrl: null,
      };
    }
    return menu;
  }

  async previewCheckout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdFeePreview> {
    void input.storeId;
    return previewFromLines(input.lines, input.tipCents);
  }

  async buildCart(input: {
    storeId: string;
    lines: DdCartLine[];
  }): Promise<{ ok: true; lineCount: number }> {
    void input.storeId;
    return { ok: true, lineCount: input.lines.length };
  }

  async checkout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdCheckoutResult> {
    const preview = previewFromLines(input.lines, input.tipCents);
    const orderId = `mock_ord_${Date.now().toString(36)}`;
    const store = MOCK_STORES.find((s) => s.id === input.storeId);
    const result: DdCheckoutResult = {
      orderId,
      status: "confirmed",
      placedAt: new Date().toISOString(),
      totalCents: preview.totalCents,
      tracking: {
        status: "confirmed",
        etaMinutes: store?.etaMinutes ?? 35,
        dasherName: null,
        progressPercent: 20,
      },
    };
    orderStore().set(orderId, {
      storeName: store?.name ?? input.storeId,
      result,
      tick: 0,
    });
    return result;
  }

  async getOrderStatus(orderId: string): Promise<DdTracking> {
    return advanceTracking(orderId);
  }

  async listOrderHistory(limit = 10): Promise<DdHistoryOrder[]> {
    return [...orderStore().entries()]
      .slice(-limit)
      .reverse()
      .map(([orderId, row]) => ({
        orderId,
        storeName: row.storeName,
        placedAt: row.result.placedAt,
        totalCents: row.result.totalCents,
        status: row.result.status,
      }));
  }

  async reorder(orderId: string): Promise<DdCheckoutResult> {
    const existing = orderStore().get(orderId);
    if (!existing) {
      throw new Error(`Unknown order ${orderId}`);
    }
    return this.checkout({
      storeId:
        MOCK_STORES.find((s) => s.name === existing.storeName)?.id ??
        "dd_chipotle_01",
      lines: [
        {
          itemId: "reorder_bundle",
          name: `Reorder ${existing.storeName}`,
          quantity: 1,
          unitPriceCents: existing.result.totalCents,
        },
      ],
      tipCents: 0,
    });
  }
}
