/**
 * Env-gated feature flags. App runs in demo mode with zero cloud keys.
 */
export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function hasPrivy() {
  return Boolean(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID,
  );
}

export function authMode(): "demo" | "supabase" {
  return hasSupabase() ? "supabase" : "demo";
}
