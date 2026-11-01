@AGENTS.md

# Polaris

Business-growth coach for small shop owners: shows which problem to focus on this week, what it costs, and the options. Built for the Nebius × NVIDIA Global AI Hackathon; all AI runs on NVIDIA Nemotron via Nebius Token Factory.

- Stack: Next.js (App Router, see AGENTS.md: newer than you expect), TypeScript.
- Live demo: https://polaris-jade-ten.vercel.app (deployed on Vercel).

## Run
```bash
npm install
cp .env.example .env.local   # add the Nebius key
npm run dev                  # http://localhost:3000
```
`npm run lint` before committing. `npm run preview` builds and serves on :3001.

## Status
- Submitted to Devpost on 2026-10-20. README has the demo video link.
- The GitHub repo is PUBLIC. Ask before pushing: judging may still be open.
- `footage/` holds screen recordings and is git-ignored.
