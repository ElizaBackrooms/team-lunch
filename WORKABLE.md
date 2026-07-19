# Workable status (2026-07-18)

What works today for open-source contributors and demos.

## Solid now

- [x] Mock DoorDash lunch flow (search → vote → join/menu → pay → checkout → track)
- [x] Local session persistence via `.data/session.json`
- [x] Vercel-safe demo store: memory-only when `VERCEL` is set (no FS writes)
- [x] Client loading gate: `useLunchSession().loading` until first `/api/session` resolves
- [x] PWA shell + mobile bottom nav
- [x] Optional Stripe / Supabase / Privy when env present; demo without keys
- [x] `npm run build` + e2e smoke script
- [x] Deploy notes in `DEPLOY.md` (Vercel defaults, no custom config required)

## Known limits

- Vercel demo state is **per-instance** and resets on cold start — not multi-tenant production storage
- Live DoorDash CLI checkout still waitlist / platform constrained (see Host tools)
- Production auth/RLS beyond the existing schema hooks is out of scope until secrets land

## Quick verify

```bash
npm run build
npx tsc --noEmit
npm run dev
# then open /, /vote, /admin — no empty “No stores yet” / “Status: …” flash before load
```
