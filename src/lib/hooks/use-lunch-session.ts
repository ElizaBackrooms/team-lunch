"use client";

import { useCallback, useEffect, useState } from "react";
import type { DdCliHealth, DdMenu, DdSelectedModifier } from "@/lib/dd-cli/types";
import type { DeliveryLocation } from "@/lib/location";
import type {
  LunchSession,
  OrderItem,
  SessionParticipant,
  StoreCandidate,
} from "@/lib/types";

export type SessionSnapshot = {
  session: LunchSession;
  location: DeliveryLocation;
  candidates: StoreCandidate[];
  votes: Record<string, string>;
  participant: SessionParticipant | null;
  cart: OrderItem[];
  feePreview: {
    foodCents: number;
    deliveryFeeCents: number;
    serviceFeeCents: number;
    taxCents: number;
    tipCents: number;
    totalCents: number;
    multiOrderFeesCents: number;
    feesSavedCents: number;
  } | null;
  ddOrderId: string | null;
  tracking: {
    status: string;
    etaMinutes?: number | null;
    dasherName?: string | null;
    progressPercent?: number;
  } | null;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ? JSON.stringify(body.error) : res.statusText);
  }
  return body as T;
}

export function useLunchSession() {
  const [data, setData] = useState<SessionSnapshot | null>(null);
  const [health, setHealth] = useState<DdCliHealth | null>(null);
  const [menu, setMenu] = useState<DdMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** True until the first `/api/session` request settles (success or error). */
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const snap = await json<SessionSnapshot>("/api/session");
    setData(snap);
    return snap;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [snap, h] = await Promise.all([
          json<SessionSnapshot>("/api/session"),
          json<DdCliHealth>("/api/dd/health"),
        ]);
        if (cancelled) return;
        setData(snap);
        setHealth(h);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "load_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "request_failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    data,
    health,
    menu,
    error,
    busy,
    loading,
    refresh,
    reset: () =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "reset" }),
        });
        setData(snap);
        setMenu(null);
      }),
    setOrgLocation: () =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "set_location", mode: "org" }),
        });
        setData(snap);
      }),
    useDeviceLocation: () =>
      run(async () => {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported in this browser"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 12_000,
            maximumAge: 60_000,
          });
        });
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({
            action: "set_location",
            mode: "device",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        });
        setData(snap);
        return snap.location;
      }),
    search: (
      query = "lunch",
      opts?: {
        locationMode?: "org" | "device" | "manual";
        lat?: number;
        lng?: number;
      },
    ) =>
      run(async () => {
        const res = await json<{
          session: LunchSession;
          candidates: StoreCandidate[];
          location: DeliveryLocation;
        }>("/api/dd/search", {
          method: "POST",
          body: JSON.stringify({
            query,
            openVoting: true,
            locationMode: opts?.locationMode ?? "org",
            lat: opts?.lat,
            lng: opts?.lng,
          }),
        });
        await refresh();
        return res;
      }),
    searchNearMe: (query = "lunch") =>
      run(async () => {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 12_000,
          });
        });
        const res = await json("/api/dd/search", {
          method: "POST",
          body: JSON.stringify({
            query,
            openVoting: true,
            locationMode: "device",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        });
        await refresh();
        return res;
      }),
    vote: (candidateId: string) =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "vote", candidateId }),
        });
        setData(snap);
      }),
    lock: () =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "lock" }),
        });
        setData(snap);
      }),
    join: () =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "join" }),
        });
        setData(snap);
      }),
    loadMenu: () =>
      run(async () => {
        const res = await json<{ menu: DdMenu }>("/api/dd/menu");
        setMenu(res.menu);
        return res.menu;
      }),
    addItem: (item: {
      ddItemId: string;
      name: string;
      unitPriceCents: number;
      quantity?: number;
      modifiers?: DdSelectedModifier[];
      notes?: string | null;
    }) =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "add_item", quantity: 1, ...item }),
        });
        setData(snap);
      }),
    preview: () =>
      run(async () => {
        await json("/api/dd/preview", {
          method: "POST",
          body: JSON.stringify({}),
        });
        await refresh();
      }),
    markPaid: () =>
      run(async () => {
        const snap = await json<SessionSnapshot>("/api/session", {
          method: "POST",
          body: JSON.stringify({ action: "mark_paid" }),
        });
        setData(snap);
      }),
    checkout: () =>
      run(async () => {
        await json("/api/dd/checkout", { method: "POST" });
        await refresh();
      }),
    track: () =>
      run(async () => {
        await json("/api/dd/track", { method: "POST", body: JSON.stringify({}) });
        await refresh();
      }),
  };
}
