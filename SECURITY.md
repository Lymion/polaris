# Security

How Polaris protects its users' data and its AI budget, and what to do before deploying.

## What the app does

- **Data stays on the device.** Everything is saved in the browser (`localStorage`). There are no accounts and no database. Users can download a backup, restore one, or delete everything from **Your data**. The privacy notice is at `/privacy`.
- **The Nebius key stays on the server.** It's read from `NEBIUS_API_KEY` by the API routes only, and `.env*` files are git-ignored.
- **AI routes are guarded** (`src/lib/server/guard.ts`, called first in every route that reaches Nebius):
  - Requests from another site are refused (Origin and `Sec-Fetch-Site` checks).
  - Bodies are capped (300 KB, or 4.5 MB for statement files).
  - Fair use per visitor: 12 calls a minute and 300 a day, or 4 a minute and 40 a day for the heavy routes (Ultra reviews, Wrapped, statements). A backstop of 3,000 calls a day applies to everyone together (set `POLARIS_DAILY_AI_CAP` to change it).
  - Requests to `localhost` skip the per-visitor limits, for development and the simulation harness.
- **Statements** are capped at 4 MB. In PDF, CSV and Excel files, card and account numbers are blanked before any AI reads them. Photos can't be, so users are warned before a photo is sent.
- **Security headers** (`next.config.ts`): a Content Security Policy that only allows this site's own scripts, styles, fonts and connections; no framing; `nosniff`; a strict referrer policy; HSTS; and no camera, microphone or location access.
- **AI replies can't run code.** Markdown is rendered without raw HTML, and links open in a new tab.

## Before deploying

1. **Rotate the Nebius key** in the Nebius console, and put the new one in the host's environment variables (Vercel: Project → Settings → Environment Variables → `NEBIUS_API_KEY`). Never commit it.
2. **Set a spending limit** on the Nebius account, so a burst of abuse can't run up the bill.
3. **Add a host-level rate limit.** The guard's counts live in each server instance's memory, and a busy host runs several instances. On Vercel, add a Firewall rule that limits `/api/*` per IP (for example 30 requests a minute).
4. **Ask Nebius about zero data retention** for the account, and update `/privacy` if it's switched on.
5. Run `npm audit --omit=dev` and update anything it flags.

## Reporting a problem

Contact the Polaris team privately rather than opening a public issue.
