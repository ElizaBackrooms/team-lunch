# Team Lunch

Open-source **workplace lunch consolidator**: optional voting, optional join, one DoorDash order, split pay.

Built as a **Next.js web + installable PWA**. DoorDash fulfillment goes through the official [`dd-cli`](https://github.com/doordash-oss/doordash-cli) (waitlist). Until you have access, the app runs on a **full mock adapter** so anyone can develop — including on Windows.

> **Don’t have a Mac?** You can still own this repo. Mac contributors with CLI beta access can fork and wire live ordering. See [Contributing](./CONTRIBUTING.md).

## Why Mac comes up

DoorDash’s public CLI builds are **macOS Apple Silicon only** right now. That machine is only needed for the **fulfillment worker** (search → cart → checkout). The product UI runs everywhere.

| You have | You can |
|----------|---------|
| Windows / Linux | Build UI, voting, menus, Stripe, Supabase, mock DD |
| Mac (M1–M4) + waitlist | Flip `DD_CLI_USE_REAL=1` and place real orders |

**Waitlist:** https://forms.gle/gvCQZvu9C1EKA6aM6

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 (or the port Next prints).

```bash
# API smoke (dev server must be running)
E2E_BASE=http://localhost:3000 npm run e2e
```

## Architecture (for forkers)

```
src/app/*                 → PWA screens (Today, Vote, Join, Pay, Order, Host)
src/lib/dd-cli/           → DoorDash adapter (mock + real)
src/lib/dd-cli/real.ts    → Mac builders: map real CLI flags here
workers/dd-cli-worker.ts  → privileged worker entry
supabase/migrations/      → Postgres schema when you leave the file store
```

Default persistence is `.data/session.json` (gitignored). Swap to Supabase when ready.

## What works without cloud keys

| Feature | Behavior |
|--------|----------|
| Location | Office address default; optional browser GPS |
| Vote / join / menu customize | Local session + modifiers |
| Pay | Mock fund pot (Stripe when keys set) |
| DoorDash | Mock CLI (`DD_CLI_MOCK=1`) |
| PWA | Manifest + icon + service worker |

## Env

See `.env.example`:

- **Supabase** → auth + DB  
- **Stripe** → card pay on `/pay`  
- **Privy** → optional crypto (optionalDependency)  
- **`DD_CLI_USE_REAL=1`** → macOS Apple Silicon + approved CLI  

## Product flow

1. Host sets delivery location → search nearby  
2. Team votes  
3. Host locks winner  
4. Opt-in join → customize menu → pay share  
5. Host places one order → everyone tracks  

## Scripts

- `npm run dev` — web app  
- `npm run build` — production build  
- `npm run e2e` — API smoke  
- `npm run worker:dd` — DoorDash worker  

## Status & deploy

- [WORKABLE.md](./WORKABLE.md) — what works vs what’s next  
- [DEPLOY.md](./DEPLOY.md) — local + Vercel  

## License

MIT — see [LICENSE](./LICENSE).

## Call for Mac builders

If you’re on Apple Silicon and on the DoorDash CLI waitlist, PRs that make `RealDoorDashCli` match the real binary are the highest-leverage contribution. Keep the mock path green so the rest of us can keep shipping the product.
