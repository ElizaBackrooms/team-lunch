import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  DdCartLine,
  DdCheckoutResult,
  DdCliHealth,
  DdFeePreview,
  DdHistoryOrder,
  DdMenu,
  DdMenuItem,
  DdSearchParams,
  DdStore,
  DdTracking,
  DoorDashCli,
} from "./types";

const execFileAsync = promisify(execFile);

/**
 * Real adapter for https://github.com/doordash-oss/doordash-cli
 * Requires: macOS Apple Silicon + waitlist approval + dd-cli on PATH.
 *
 * Command shapes are best-effort against public docs:
 *   dd-cli search --query "..."
 *   dd-cli order history
 * Additional flags (menu/cart/checkout/json) are probed and may need
 * adjustment once you have the binary's --help output.
 */
export class RealDoorDashCli implements DoorDashCli {
  constructor(private readonly bin = process.env.DD_CLI_BIN ?? "dd-cli") {}

  private async run(args: string[]): Promise<string> {
    const { stdout, stderr } = await execFileAsync(this.bin, args, {
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    return stdout;
  }

  private async runJson<T>(args: string[]): Promise<T> {
    try {
      const out = await this.run([...args, "--json"]);
      return JSON.parse(out) as T;
    } catch {
      const out = await this.run(args);
      try {
        return JSON.parse(out) as T;
      } catch {
        throw new Error(
          `dd-cli returned non-JSON for: ${args.join(" ")}\n${out.slice(0, 500)}`,
        );
      }
    }
  }

  async health(): Promise<DdCliHealth> {
    const isDarwinArm =
      process.platform === "darwin" && process.arch === "arm64";
    try {
      await this.run(["--help"]);
      return {
        mode: "cli",
        available: true,
        binary: this.bin,
        platformOk: isDarwinArm,
        message: isDarwinArm
          ? "dd-cli binary reachable"
          : "dd-cli found but official builds are macOS Apple Silicon only",
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
    } catch (err) {
      return {
        mode: "cli",
        available: false,
        binary: this.bin,
        platformOk: isDarwinArm,
        message:
          err instanceof Error
            ? err.message
            : "dd-cli not available — join waitlist / install darwin-arm64",
        capabilities: [],
      };
    }
  }

  async searchStores(params: DdSearchParams | string): Promise<DdStore[]> {
    const query =
      typeof params === "string"
        ? params
        : params.near
          ? `${params.query} near ${params.near}`
          : params.lat != null && params.lng != null
            ? `${params.query} near ${params.lat},${params.lng}`
            : params.query;
    const raw = await this.runJson<unknown>(["search", "--query", query]);
    return normalizeStores(raw);
  }

  async getMenu(storeId: string): Promise<DdMenu> {
    // Probe common shapes; adjust after `dd-cli --help` on approved machine.
    const raw = await this.runJson<unknown>(["menu", "--store", storeId]);
    return normalizeMenu(storeId, raw);
  }

  async previewCheckout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdFeePreview> {
    await this.buildCart(input);
    const raw = await this.runJson<unknown>([
      "checkout",
      "preview",
      "--tip-cents",
      String(input.tipCents),
    ]);
    return normalizePreview(raw, input.lines, input.tipCents);
  }

  async buildCart(input: {
    storeId: string;
    lines: DdCartLine[];
  }): Promise<{ ok: true; lineCount: number }> {
    // Clear + rebuild — exact flags TBD from CLI help.
    try {
      await this.run(["cart", "clear"]);
    } catch {
      // ignore if clear unsupported
    }
    for (const line of input.lines) {
      await this.run([
        "cart",
        "add",
        "--store",
        input.storeId,
        "--item",
        line.itemId,
        "--qty",
        String(line.quantity),
      ]);
    }
    return { ok: true, lineCount: input.lines.length };
  }

  async checkout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdCheckoutResult> {
    await this.buildCart(input);
    const raw = await this.runJson<unknown>([
      "checkout",
      "--tip-cents",
      String(input.tipCents),
      "--confirm",
    ]);
    return normalizeCheckout(raw);
  }

  async getOrderStatus(orderId: string): Promise<DdTracking> {
    const raw = await this.runJson<unknown>(["order", "--order-id", orderId]);
    return normalizeTracking(raw);
  }

  async listOrderHistory(limit = 10): Promise<DdHistoryOrder[]> {
    const raw = await this.runJson<unknown>([
      "order",
      "history",
      "--limit",
      String(limit),
    ]);
    return normalizeHistory(raw);
  }

  async reorder(orderId: string): Promise<DdCheckoutResult> {
    const raw = await this.runJson<unknown>([
      "reorder",
      "--order-id",
      orderId,
      "--confirm",
    ]);
    return normalizeCheckout(raw);
  }
}

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["stores", "results", "data", "items", "orders"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}

function normalizeStores(raw: unknown): DdStore[] {
  return asArray(raw).map((row, i) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? r.store_id ?? r.storeId ?? `store_${i}`),
      name: String(r.name ?? r.title ?? "Store"),
      description: r.description ? String(r.description) : undefined,
      imageUrl: (r.image_url ?? r.imageUrl ?? null) as string | null,
      etaMinutes: num(r.eta_minutes ?? r.etaMinutes),
      dealLabel: (r.deal_label ?? r.dealLabel ?? null) as string | null,
      dealScore: num(r.deal_score ?? r.dealScore) ?? 0,
      rating: num(r.rating),
      distanceMiles: num(r.distance_miles ?? r.distanceMiles),
    };
  });
}

function normalizeMenu(storeId: string, raw: unknown): DdMenu {
  const root = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = asArray(root.items ?? root.menu ?? raw);
  const items: DdMenuItem[] = itemsRaw.map((row, i) => {
    const r = row as Record<string, unknown>;
    const price =
      num(r.price_cents ?? r.priceCents) ??
      Math.round((num(r.price) ?? 0) * 100);
    return {
      id: String(r.id ?? r.item_id ?? `item_${i}`),
      name: String(r.name ?? "Item"),
      description: r.description ? String(r.description) : undefined,
      priceCents: price,
      category: String(r.category ?? r.category_name ?? "Menu"),
      imageUrl: (r.image_url ?? r.imageUrl ?? null) as string | null,
      available: r.available !== false,
      modifierGroups: [],
      calories: num(r.calories),
      popular: Boolean(r.popular),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
    };
  });
  const categories = [...new Set(items.map((i) => i.category))];
  return {
    storeId: String(root.store_id ?? root.storeId ?? storeId),
    storeName: String(root.store_name ?? root.storeName ?? "Store"),
    categories,
    items,
  };
}

function normalizePreview(
  raw: unknown,
  lines: DdCartLine[],
  tipCents: number,
): DdFeePreview {
  const r = (raw ?? {}) as Record<string, unknown>;
  const foodCents =
    num(r.food_cents ?? r.foodCents) ??
    lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const deliveryFeeCents = num(r.delivery_fee_cents ?? r.deliveryFeeCents) ?? 0;
  const serviceFeeCents = num(r.service_fee_cents ?? r.serviceFeeCents) ?? 0;
  const taxCents = num(r.tax_cents ?? r.taxCents) ?? 0;
  const tip = num(r.tip_cents ?? r.tipCents) ?? tipCents;
  const total =
    num(r.total_cents ?? r.totalCents) ??
    foodCents + deliveryFeeCents + serviceFeeCents + taxCents + tip;
  return {
    foodCents,
    deliveryFeeCents,
    serviceFeeCents,
    taxCents,
    tipCents: tip,
    totalCents: total,
    multiOrderFeesCents: num(r.multi_order_fees_cents) ?? 0,
    feesSavedCents: num(r.fees_saved_cents) ?? 0,
  };
}

function normalizeCheckout(raw: unknown): DdCheckoutResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    orderId: String(r.order_id ?? r.orderId ?? r.id ?? `ord_${Date.now()}`),
    status: (r.status as DdCheckoutResult["status"]) ?? "confirmed",
    placedAt: String(r.placed_at ?? r.placedAt ?? new Date().toISOString()),
    totalCents: num(r.total_cents ?? r.totalCents) ?? 0,
    tracking: normalizeTracking(r.tracking ?? r),
  };
}

function normalizeTracking(raw: unknown): DdTracking {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    status: (r.status as DdTracking["status"]) ?? "pending",
    etaMinutes: num(r.eta_minutes ?? r.etaMinutes),
    dasherName: (r.dasher_name ?? r.dasherName ?? null) as string | null,
    progressPercent: num(r.progress_percent ?? r.progressPercent) ?? undefined,
    raw,
  };
}

function normalizeHistory(raw: unknown): DdHistoryOrder[] {
  return asArray(raw).map((row, i) => {
    const r = row as Record<string, unknown>;
    return {
      orderId: String(r.order_id ?? r.orderId ?? r.id ?? `hist_${i}`),
      storeName: String(r.store_name ?? r.storeName ?? "Store"),
      placedAt: String(r.placed_at ?? r.placedAt ?? new Date().toISOString()),
      totalCents: num(r.total_cents ?? r.totalCents) ?? 0,
      status: (r.status as DdHistoryOrder["status"]) ?? "delivered",
    };
  });
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
