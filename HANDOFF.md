# Handoff

Notes for picking this project up in a fresh session (for example Claude Code on the web).

## What this is

Polaris is a business-growth coach for small shop owners. It shows which problem to focus on this week, what it costs, and the options; the owner decides. Built for the Nebius × NVIDIA Global AI Hackathon (Best Apps and Agents track). Every AI feature runs on NVIDIA Nemotron through Nebius Token Factory. See `README.md` for features, the model table and the design rule "numbers come from code, words come from the model".

- Stack: Next.js 16 (App Router; newer than you expect, see `AGENTS.md`), React 19, TypeScript, Tailwind CSS 4, zustand.
- Data lives in the browser (`localStorage`, store key `polaris`). No accounts, no database.
- Live demo: https://polaris-jade-ten.vercel.app (Vercel, deploys from `main`).

## Current state

- Submitted to Devpost on 2026-10-20. The README links the demo video.
- The repo is public and was a hackathon submission. Judging may still be open, so **ask the owner before pushing to `main`**; do new work on a branch.
- Recent work before submission: Workspace dark mode, a profitable Atelier Nura demo business (`src/lib/demo.ts`), a quick-win mission that appears on "More missions" for the demo, a full walkthrough bug-fix pass, the open-mission limit (`MAX_OPEN_MISSIONS` in `src/lib/store.ts`), timezone-first country guessing (`src/lib/locale.ts`).

## Open work and next steps

The idea under discussion is optional sign-in with cloud sync for about 10 invited accounts. Nothing is built yet.

1. Create a branch and a Supabase project (the owner has to create the project in their own account). Use email magic-link auth with public sign-ups off.
2. Add one table, one row per user, holding the shop state as a JSON blob, protected by row-level security. Reuse the existing backup/restore shape in `src/lib/backup.ts`.
3. Sync: load the cloud copy on sign-in, save a few seconds after changes, last write wins, show "Last synced". Signed-out use must keep working exactly as now. Update `/privacy` and the README, which currently say "no accounts".

## Run and test (Linux sandbox)

Needs Node.js 20.9+ (tested on 24).

```bash
npm install
cp .env.example .env.local   # then set NEBIUS_API_KEY
npm run lint
npm run build                # type-checks and builds
npm run dev                  # http://localhost:3000
```

`npm run preview` builds and serves on port 3001. Load the demo business at `/welcome#atelier-nura`. Without a key the UI works but AI features return an error.

The business simulation (`scripts/simulation`, see README) makes many Token Factory calls and uses credits; don't run it casually.

## Environment variables (names only)

- `NEBIUS_API_KEY`: required for AI features. Create one in Nebius Token Factory (https://tokenfactory.nebius.com). Never commit it; only `.env.local` and the Vercel project settings hold it.
- `NEBIUS_BASE_URL`: optional, defaults to `https://api.tokenfactory.nebius.com/v1/`.
- `POLARIS_DAILY_AI_CAP`: optional daily cap on AI calls across all visitors (`src/lib/server/guard.ts`).

## Only available on the owner's PC

- `.env.local` with the real key.
- `footage/`: screen recordings and the edited demo video (git-ignored, large).
- The video editing scripts and voiceover files (not in the repo).
- Vercel and Nebius dashboards (owner's accounts).

## Gotchas

- Next.js 16 APIs differ from older versions: read `node_modules/next/dist/docs/` before writing framework code. `next dev` rewrites `AGENTS.md`; commit that change rather than reverting it.
- Model IDs are case-sensitive and inconsistent (`src/lib/ai/nebius.ts`); a typo gives a 404.
- Turning reasoning off uses `chat_template_kwargs`, which isn't in the OpenAI SDK types, so it's spread in and cast.
- AI routes check the request origin and rate-limit (`src/lib/server/guard.ts`); calling them with curl from elsewhere is blocked by design.
- If the app jumps straight to a dashboard, the browser already has a saved shop; use a private window or **Your data → delete** to see the welcome page.
- Theme and dark mode are applied before paint by a boot script in `src/lib/appearance.ts`; keep it in sync with `applyPrefs`.
