// Works out the numbers on the simulation dashboard from a run's results.json.
//
//   node scripts/simulation/analyse.mjs <results folder name>
//
// Prints each arm's six-month totals (the same as report.md) and "what made the difference":
// the run's Polaris plans replayed with one decision at a time put back to the autopilot habit,
// averaged over five market draws. Nothing here calls the AI; it only replays the market model.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = dirname(fileURLToPath(import.meta.url));
const folder = process.argv[2];
if (!folder) {
  console.error("Usage: node scripts/simulation/analyse.mjs <results folder name>, e.g. 20261016-2303");
  process.exit(1);
}
const jiti = createJiti(import.meta.url, { alias: { "@/": resolve(here, "../../src") + "/" } });
const { simulateMonth, START } = await jiti.import(resolve(here, "market.ts"));

const res = JSON.parse(readFileSync(resolve(here, "results", folder, "results.json"), "utf8"));
const first = new Date(res.first);
const P = res.polaris.map((l) => l.plan);
const A = res.autopilot.map((l) => l.plan);
const seeds = [1, 11, 23, 37, 51];

for (const [name, logs] of [["With Polaris", res.polaris], ["On autopilot", res.autopilot]]) {
  const ms = logs.map((l) => l.metrics);
  const sum = (k) => ms.reduce((s, m) => s + m[k], 0);
  console.log(`${name}: sales ${sum("sales")}, profit ${sum("net")}, end cash ${ms.at(-1).cash}, lowest cash ${Math.min(...ms.map((m) => m.cash))}`);
}

function profit(plans, seed) {
  let s = { ...START };
  let net = 0;
  plans.forEach((plan, i) => {
    const r = simulateMonth(s, plan, new Date(first.getFullYear(), first.getMonth() + i, 1, 9), i, seed);
    s = r.next;
    net += r.metrics.net;
  });
  return net;
}
const avg = (plans) => Math.round(seeds.reduce((t, seed) => t + profit(plans, seed), 0) / seeds.length);

const base = avg(P);
console.log(`\nAveraged over ${seeds.length} market draws: Polaris plans ${base}, autopilot plans ${avg(A)}`);
console.log("Profit each decision added (+) or cost (-), by putting it back to the habit:");
const levers = {
  "Cut ad spend": (p, i) => ({ ...p, adSpend: A[i].adSpend, tiktokAdShare: A[i].tiktokAdShare }),
  "Smaller sale discounts": (p) => ({ ...p, saleDiscount: 0.35 }),
  "Website-only code for repeat buyers": (p) => ({ ...p, websitePush: false }),
  "Bundles and free shipping over RM200": (p) => ({ ...p, bundles: false }),
  "Stock ordered (vs her usual batches)": (p) => ({ ...p, stockCover: 1.3, restock: null }),
  "TikTok Lives (vs 4 a month)": (p) => ({ ...p, livesPerMonth: 4 }),
  "Bazaar pop-ups (vs habit)": (p, i) => ({ ...p, popups: A[i].popups }),
  "Gifted pieces to creators": (p) => ({ ...p, influencers: 0 }),
  "Bazaar trading licence": (p) => ({ ...p, getLicence: false }),
};
for (const [name, revert] of Object.entries(levers)) {
  const impact = base - avg(P.map((p, i) => revert(p, i)));
  if (impact) console.log(`  ${name.padEnd(38)} ${impact > 0 ? "+" : ""}${impact}`);
}
