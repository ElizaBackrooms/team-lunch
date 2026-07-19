# Contributing

Thanks for helping with Team Lunch.

## Who this is for

- **Any OS** — build the Next.js PWA, mock DoorDash, voting, pay UI
- **macOS Apple Silicon (M1–M4)** — wire real [DoorDash CLI](https://github.com/doordash-oss/doordash-cli) after [waitlist](https://forms.gle/gvCQZvu9C1EKA6aM6) approval

## Dev setup

```bash
git clone <this-repo>
cd <repo>
npm install
cp .env.example .env.local
npm run dev
```

```bash
# with server running
E2E_BASE=http://localhost:3000 npm run e2e
```

## Mac builders — real dd-cli

1. Join the waitlist and install `dd-cli` from DoorDash’s releases  
2. In `.env.local`:

```bash
DD_CLI_MOCK=0
DD_CLI_USE_REAL=1
DD_CLI_BIN=dd-cli
```

3. Confirm: `npm run worker:dd -- health`  
4. Improve `src/lib/dd-cli/real.ts` against your local `dd-cli --help`  
5. Open a PR with command flags that actually work on your binary  

## Good first PRs

- Real CLI flag mapping / JSON parsers  
- Supabase auth + replace `.data/session.json`  
- Stripe Elements checkout UI  
- PWA icons (PNG) + better offline  
- Multi-participant fee split UX  

## Rules

- Do not commit `.env.local`, `.data/`, or secrets  
- Keep the mock adapter working so Windows/Linux contributors can develop  
- Prefer small PRs with a short “how to test” note  
