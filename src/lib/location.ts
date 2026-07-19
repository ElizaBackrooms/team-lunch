/**
 * Location strategy for Team Lunch (web + mobile PWA):
 *
 * 1. Default: organization delivery address (host sets once) — no permission prompt.
 * 2. Optional: device geolocation for WFH / satellite — browser/OS asks once.
 * 3. Manual: type an address override for the session.
 *
 * DoorDash search always resolves to a concrete "near …" query for dd-cli.
 */

export type LocationSource = "org" | "device" | "manual";

export type DeliveryLocation = {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  /** Optional — from device GPS or geocoder */
  lat?: number | null;
  lng?: number | null;
  source: LocationSource;
};

export const DEFAULT_ORG_LOCATION: DeliveryLocation = {
  label: "Office",
  line1: "100 Market St",
  city: "San Francisco",
  region: "CA",
  postalCode: "94105",
  country: "US",
  lat: 37.7936,
  lng: -122.3965,
  source: "org",
};

export function formatAddress(loc: DeliveryLocation): string {
  const line2 = loc.line2 ? `, ${loc.line2}` : "";
  return `${loc.line1}${line2}, ${loc.city}, ${loc.region} ${loc.postalCode}`;
}

/** Build dd-cli search query: "thai near 100 Market St, San Francisco, CA 94105" */
export function buildNearQuery(
  foodQuery: string,
  loc: DeliveryLocation,
): string {
  const food = foodQuery.trim() || "lunch";
  if (loc.lat != null && loc.lng != null) {
    return `${food} near ${loc.lat},${loc.lng}`;
  }
  return `${food} near ${formatAddress(loc)}`;
}

export function locationFromCoords(input: {
  lat: number;
  lng: number;
  label?: string;
}): DeliveryLocation {
  return {
    label: input.label ?? "Current location",
    line1: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`,
    city: "",
    region: "",
    postalCode: "",
    country: "US",
    lat: input.lat,
    lng: input.lng,
    source: "device",
  };
}
