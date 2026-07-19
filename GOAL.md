# Team Lunch — completion goal

Goal: ship a usable **web + mobile PWA** MVP with mock DoorDash, real location/menu UX, and clean hooks for Supabase / Stripe / Privy / dd-cli when keys exist.

## Definition of done

- [x] Persistent local session store (survives server restart; multi-tab OK on one machine)
- [x] Auth gate: demo mode without keys; Supabase Auth when env present (`/api/features` + `authMode`)
- [x] Stripe pay path: UI + API; mock pay if no `STRIPE_SECRET_KEY`
- [x] Privy optional (optionalDependency; no hard crash without keys)
- [x] PWA: icons + minimal service worker + installable manifest
- [x] Mobile shell: bottom nav for Today / Vote / Join / Order / Host
- [x] One-command e2e smoke script (API flow) exits 0
- [x] `npm run build` succeeds
- [x] README: setup, env, location model, dd-cli waitlist notes
- [x] Session load UI: no empty flash before `/api/session` (hook `loading`)
- [x] Vercel demo: memory-only store when `VERCEL` set; see `DEPLOY.md` / `WORKABLE.md`

**Status: COMPLETE** (2026-07-18) — see also `WORKABLE.md` for open-source readiness notes.

## Out of scope until waitlist / secrets

- Live DoorDash checkout on Windows
- Production multi-tenant Supabase RLS hardening beyond schema
- Native App Store / Play wrappers (Capacitor later)
- Durable shared session on serverless (use Supabase later)

## How to re-verify

```bash
npm run build
npx tsc --noEmit
E2E_BASE=http://localhost:3001 npm run e2e
```
