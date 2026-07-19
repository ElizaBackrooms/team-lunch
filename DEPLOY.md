# Deploy (Vercel)

This is a standard Next.js App Router project. **No custom `vercel.json` is required** — Vercel’s default Next.js build is enough.

## One-click / dashboard

1. Push the repo to GitHub (do **not** commit `.env`, `.env.local`, or secrets).
2. In [Vercel](https://vercel.com): **Add New Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Leave Build Command / Output as defaults (`next build`).
5. Add optional env vars only if you have them (`STRIPE_*`, `NEXT_PUBLIC_SUPABASE_*`, Privy, etc.). Demo mode works with none.
6. Deploy.

Or from the CLI:

```bash
npx vercel
```

## Demo store on serverless

`.data/session.json` **does not persist** on Vercel (read-only filesystem + ephemeral instances).

| Environment | Behavior |
|-------------|----------|
| Local (`npm run dev`) | Persist to `.data/session.json` |
| Vercel (`VERCEL=1`) | **Memory-only** via `globalThis` — demo works for the lifetime of the instance; cold starts / new instances reset state |

**Recommendation:** treat Vercel as **mock/demo only**. For multi-user production persistence, wire Supabase (schema hooks already exist) instead of the file store.

## After deploy

- Open `/` → should show “Loading session…” briefly, then the Today board (not an empty flash).
- Host tools → search → vote flow should work until the serverless instance recycles.
