/**
 * DoorDash CLI product integration surface.
 * Official: https://github.com/doordash-oss/doordash-cli
 */

export type DdStore = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  etaMinutes?: number | null;
  dealLabel?: string | null;
  dealScore: number;
  rating?: number | null;
  distanceMiles?: number | null;
};

/** One choice inside a modifier group (size, protein, add-on, etc.) */
export type DdModifierOption = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  isDefault?: boolean;
};

/**
 * DoorDash-style customization group.
 * min/max model single-select (1/1), multi-select (0/3), required extras, etc.
 */
export type DdModifierGroup = {
  id: string;
  name: string;
  min: number;
  max: number;
  required: boolean;
  options: DdModifierOption[];
};

export type DdMenuItem = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  category: string;
  imageUrl?: string | null;
  available: boolean;
  /** Full customization surface — empty = add straight to cart */
  modifierGroups: DdModifierGroup[];
  calories?: number | null;
  spicyLevel?: 0 | 1 | 2 | 3;
  popular?: boolean;
  tags?: string[];
};

export type DdMenu = {
  storeId: string;
  storeName: string;
  categories: string[];
  items: DdMenuItem[];
  /** Optional deep link for “browse on DoorDash” (not embedded iframe) */
  storeUrl?: string | null;
};

/** Selected modifier for a cart line */
export type DdSelectedModifier = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceCents: number;
};

export type DdCartLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  modifiers?: DdSelectedModifier[];
  notes?: string | null;
  participantLabel?: string;
};

export type DdFeePreview = {
  foodCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  multiOrderFeesCents: number;
  feesSavedCents: number;
};

export type DdCheckoutResult = {
  orderId: string;
  status: DdOrderStatus;
  placedAt: string;
  totalCents: number;
  tracking?: DdTracking;
};

export type DdOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "picking_up"
  | "delivering"
  | "delivered"
  | "cancelled";

export type DdTracking = {
  status: DdOrderStatus;
  etaMinutes?: number | null;
  dasherName?: string | null;
  progressPercent?: number;
  raw?: unknown;
};

export type DdHistoryOrder = {
  orderId: string;
  storeName: string;
  placedAt: string;
  totalCents: number;
  status: DdOrderStatus;
};

export type DdSearchParams = {
  query: string;
  /** Already-built near string or full query — adapters may append */
  near?: string;
  lat?: number;
  lng?: number;
};

export type DdCliCapability =
  | "search"
  | "menu"
  | "cart"
  | "preview"
  | "checkout"
  | "order_status"
  | "order_history"
  | "reorder";

export type DdCliHealth = {
  mode: "mock" | "cli";
  available: boolean;
  binary?: string;
  platformOk: boolean;
  message: string;
  capabilities: DdCliCapability[];
};

export interface DoorDashCli {
  health(): Promise<DdCliHealth>;
  searchStores(params: DdSearchParams | string): Promise<DdStore[]>;
  getMenu(storeId: string): Promise<DdMenu>;
  previewCheckout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdFeePreview>;
  buildCart(input: {
    storeId: string;
    lines: DdCartLine[];
  }): Promise<{ ok: true; lineCount: number }>;
  checkout(input: {
    storeId: string;
    lines: DdCartLine[];
    tipCents: number;
  }): Promise<DdCheckoutResult>;
  getOrderStatus(orderId: string): Promise<DdTracking>;
  listOrderHistory(limit?: number): Promise<DdHistoryOrder[]>;
  reorder(orderId: string): Promise<DdCheckoutResult>;
}

/** Base + selected modifier deltas */
export function lineUnitPrice(
  baseCents: number,
  modifiers: DdSelectedModifier[] = [],
): number {
  return (
    baseCents + modifiers.reduce((sum, m) => sum + m.priceCents, 0)
  );
}
