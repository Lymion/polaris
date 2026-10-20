# Polaris

**Your North Star for business growth.** Polaris helps small business owners who feel lost see which problem to focus on this week, what it's costing them, and what their options are. The owner decides; Polaris shows the numbers and explains them.

Built for the **Nebius × NVIDIA Global AI Hackathon** (Best Apps and Agents track). Every AI feature runs on **NVIDIA Nemotron** models through **Nebius Token Factory**.

- **Live demo:** https://polaris-jade-ten.vercel.app (start your own business there)
- **Demo video:** _link added after upload_

## Why

Most small shops don't fail for lack of advice. They fail because the owner can't tell which of twenty problems matters this week: a best seller that quietly sold out, a product that sells at a loss once platform fees are taken, cash that covers two months of rent. The numbers are in their sales and receipts, but nobody has time to read them.

Polaris reads them. It keeps the owner in charge: problems are stated as facts with what they cost, a few options are listed, and the choice is theirs. The AI guide (Lumi) helps when asked; it never runs the business.

## What it does

- **Home and Your Week.** A short tap-through story of the week: money in and out, the best seller, the top problems (each with why it matters in money and some options), and how last week's problems look now. Computed in code from the shop's own records, so the figures are exact.
- **Treasury.** Log sales and costs in a monthly sheet, import a bank statement (PDF, CSV, Excel or a photo), see cash flow, margins after platform fees, overheads and runway. Includes a deep **Money check-up** and a monthly **Month Wrapped** story.
- **Stock.** Stock on hand, margin per product per sales channel, what's sold out or slow, and a **Restock plan** that fits the cash the shop actually has.
- **Missions.** Concrete step-by-step plans (with XP and levels) generated from the owner's goal; report back when one is done and Polaris reviews what happened.
- **Lumi, the advisor.** A chat that answers using the shop's real numbers and saved plans, not generic tips.
- **Creative Studio.** Brand kits, campaign plans for coming sale days, content calendars and video ideas.
- **Two ways to use it.** Classic pages, or a cosy desk "world" where each part of the app is a room. Five colour themes.

## How it uses NVIDIA Nemotron on Nebius Token Factory

All model calls go through one server-only client, [`src/lib/ai/nebius.ts`](src/lib/ai/nebius.ts). Each job uses the size of model it needs:

| Feature | API route | Model | Why this model |
|---|---|---|---|
| Lumi chat | `/api/chat` | Nemotron 3 Super, reasoning off | Quick, grounded replies in a conversation |
| Missions | `/api/missions` | Nemotron 3 Super, reasoning off | Structured JSON plans in a few seconds |
| Mission review | `/api/missions/review` | Nemotron 3 Super, reasoning off | Checks the owner's report (was it really done?) and remembers what was learned |
| Creative Studio | `/api/studio` | Nemotron 3 Super, reasoning off | Brand, campaign and content ideas |
| Restock plan | `/api/inventory/plan` | Nemotron 3 Super, reasoning off | Adds judgement (a coming sale, what to clear) to quantities computed in code |
| Monthly sheet helpers | `/api/treasury/sheet` | Nemotron 3 Super, reasoning off | Sorts rows into categories and checks the month for mistakes |
| Statement import | `/api/treasury/statement` | Gemma 3 27B (photos only), then Nemotron 3 Super | Token Factory has no NVIDIA vision model, so Gemma transcribes photos and Nemotron categorises |
| Money check-up | `/api/treasury/review` | **Nemotron 3 Ultra, reasoning on** | Deep, strict analysis of margins, costs and cash |
| Month Wrapped | `/api/treasury/month-report` | **Nemotron 3 Ultra, reasoning on** | Links the month's actions to its results |

**Numbers come from code, words come from the model.** Totals, margins, runway, stock cover and order quantities are computed in TypeScript and handed to Nemotron as facts. The prompts ([`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts)) tell it to explain and suggest, never to invent figures. Your Week uses no AI at all.

### Where Token Factory sped things up

- **OpenAI-compatible API.** The official `openai` SDK works with just a different base URL, so the whole integration is one small file.
- **Switching model size is one string.** Super handles everyday calls; Ultra is kept for the two heavy analyses, so the app stays fast and credits last.
- **Reasoning on or off per call.** Turning Nemotron's reasoning off (`chat_template_kwargs.enable_thinking: false`) roughly halved latency (about 10s to 5s for a 5-mission plan on Super) with similar quality.
- **A simulation to test the advice.** [`scripts/simulation`](scripts/simulation) runs Atelier Nura for six simulated months twice through the same market: once following Polaris (the real app, calling Nemotron) and once on autopilot, with Nemotron also playing the shop owner. Results are in [`scripts/simulation/results`](scripts/simulation/results).

**Nebius services used:** Token Factory (inference for every AI feature).

## Run it locally

Needs Node.js 20.9 or newer (tested on Node 24) and a Nebius Token Factory API key.

1. Copy `.env.example` to `.env.local` and add your key:

   ```
   NEBIUS_API_KEY=your-key
   NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
   ```

2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000.

For a production build: `npm run build`, then `npm start`.

### Run the simulation (optional)

This makes many Token Factory calls, so it uses credits.

```bash
npm run preview                                   # production server on port 3001
node scripts/simulation/run.mjs --months 6        # in a second terminal
```

## Privacy and security

- The shop's data stays in the browser (`localStorage`). There are no accounts and no database. Owners can back up, restore or delete everything from **Your data**.
- When an AI feature runs, only the details it needs are sent to Nemotron on Nebius. Card and account numbers in PDF, CSV and Excel statements are blanked first.
- The API key stays on the server, AI routes check where requests come from and limit how often they're called, and the app sends strict security headers. See [SECURITY.md](SECURITY.md) and the `/privacy` page.

## Project layout

- `src/app`: pages (`/`, `/welcome`, `/missions`, `/studio`, `/advisor`, `/treasury`, `/stock`, `/privacy`) and the API routes under `src/app/api`
- `src/components`: the UI, grouped by area (`week`, `treasury`, `stock`, `missions`, `studio`, `advisor`, `world`, …)
- `src/lib`: the data store, money and stock maths, Your Week, and the AI client and prompts (`src/lib/ai`)
- `scripts/simulation`: the business simulation and its results
- `branding`: logo source files

## License

[MIT](LICENSE)
