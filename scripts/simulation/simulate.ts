// Does following Polaris make a business do better?
//
// Atelier Nura (the demo fashion label) runs for a few months twice, through the same market and
// the same luck:
//   - "With Polaris": every month the owner asks Lumi what to do, gets missions from that advice,
//     a money check-up, a campaign plan for the month's big sale and, at month end, the Wrapped.
//     All of it comes from the real app (its browser code calling the running server and Nemotron).
//     The simulated owner (also Nemotron, playing Aina) may only change something when Polaris
//     said so, and has to say which output it followed.
//   - "On autopilot": the same owner without Polaris, keeping her habits.
// The market model (market.ts) turns each month's decisions into sales, costs and ledger entries,
// which go back into the app, so next month's advice sees what happened.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMonthReport, generateMissions, generateStudio, moneySummary, planRestock, reviewMission, reviewMoney, streamChat } from "@/lib/ai/client";
import { MODELS, NO_THINKING } from "@/lib/ai/nebius";
import type { MoneyReview, RestockPlan } from "@/lib/ai/shared";
import { demoBusiness } from "@/lib/demo";
import { formatMoney, monthKey } from "@/lib/money";
import { usePolaris } from "@/lib/store";
import type { Campaign } from "@/lib/studio";
import type { Mission, MonthlyReport } from "@/lib/types";
import { HABITS, NO_ONE_OFFS, PRODUCTS, START, clampPlan, seasonFor, simulateMonth, type MarketState, type Metrics, type Plan, type Settings } from "./market";

interface Config {
  months: number;
  seed: number;
  base: string;
  baselineOnly: boolean;
  out: string;
}

const clock = (globalThis as unknown as { __simClock: { set: (d: Date | number) => void } }).__simClock;
const rm = (n: number) => formatMoney(n, "MYR", { compact: true });
const log = (...a: unknown[]) => console.log(`[${new (globalThis as unknown as { __simClock: { real: DateConstructor } }).__simClock.real().toLocaleTimeString()}]`, ...a);

/** What happened in one simulated month of one run. */
interface MonthLog {
  month: string;
  plan: Plan;
  metrics: Metrics;
  polaris?: {
    question: string;
    advice: string;
    missionsAdded: string[];
    checkup: MoneyReview | null;
    restockPlan: RestockPlan | null;
    campaigns: Pick<Campaign, "name" | "offer" | "budget">[];
    changes: { what: string; from: string; to: string; because: string }[];
    finished: { title: string; verdict: string; feedback: string }[];
    wrapped: Pick<MonthlyReport, "headline" | "problems" | "closing"> | null;
    errors: string[];
  };
}

// ---------- The simulated owner -------------------------------------------------------------

async function nemotron(system: string, user: string, maxTokens = 1800) {
  const base = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
        body: JSON.stringify({
          model: MODELS.smart,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          ...NO_THINKING,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const text = data.choices[0]?.message?.content ?? "";
      return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, unknown>;
    } catch (err) {
      log(`  owner call failed (attempt ${attempt + 1})`, String(err).slice(0, 200));
    }
  }
  return null;
}

const SETTINGS_GUIDE = `Settings you control (they stay as they are unless you change them):
- adSpend: ringgit a month on Meta + TikTok ads (0 to 8000).
- tiktokAdShare: share of the ad budget on TikTok, 0 to 1 (rest on Meta).
- priceIndex: 1 = today's prices, 1.1 = everything 10% dearer, 0.9 = 10% cheaper (0.8 to 1.3).
- saleDiscount: how deep this month's big sale goes, 0 (no sale) to 0.5.
- livesPerMonth: TikTok Live try-on sessions this month (0 to 12).
- websitePush: true/false. Parcel inserts + a website-only code so repeat buyers order on your site (which has no 14% Shopee fee). Costs about RM120 a month.
- retention: true/false. A WhatsApp VIP list and loyalty perks for past buyers. About RM60 a month.
- bundles: true/false. Co-ord + scarf bundles and free shipping over RM200.
- stockCover: how much stock you order compared with the pieces you expect to sell (1 = just enough), when you order the usual way. You order 30% extra out of habit (1.3), split like your past batches (40 dresses, 30 co-ords, 40 skirts, 12 blazers, 40 scarves).
- courierDeal: true/false. Negotiate a better courier rate.
- appsTrimmed: true/false. Cancel the apps you don't use (saves RM100 a month).
- packer: true/false. Keep the part-time packer (RM1,100 a month). Without one you can pack about 230 orders a month and do at most 4 Lives.
One-off things this month:
- influencers: creators to gift pieces to this month (about RM220 each), 0 to 10.
- popups: weekend bazaar pop-ups this month (RM350 booth each), 0 to 4. Without a trading licence you risk a RM600 fine at each.
- capsule: true/false. Launch a small new capsule (RM900 for samples).
- getLicence: true/false. Apply for the temporary trading licence for bazaars (RM250).
- restock: pieces of each product to order this month, by exact product name (${PRODUCTS.map((p) => p.name).join(", ")}). It arrives at the start of the month. Follow Lumi's restock plan if you have one (order less only if cash is short). Use null to order the usual way instead.`;

const OWNER = `You are Aina, owner of Atelier Nura, a Malaysian fashion label selling premium-feel pieces at a fraction of boutique prices (TikTok Shop, Shopee, Instagram/WhatsApp, a website and bazaar pop-ups). You run the business with the Polaris app and you follow its guidance.

Each month you turn Polaris's guidance into concrete decisions. Rules:
1. Only change a setting or do a one-off when something Polaris told you this month supports it: Lumi's advice, an open mission, the money check-up, the restock plan, the campaign plan, or last month's Wrapped. Quote the part you followed in "because".
2. If Polaris didn't address something, leave it exactly as it is.
3. Be realistic: don't spend more cash than you have, and remember it's you plus a part-time packer.
4. Pick the open missions you'll work on this month and the ones you'll finish (at most 2 to finish, and only ones your decisions this month actually carry out).

${SETTINGS_GUIDE}

Reply with JSON only:
{"settings":{...all twelve settings with your values...},"oneOffs":{"influencers":0,"popups":0,"capsule":false,"getLicence":false,"restock":{"product name":0} or null},"workingOn":["mission id"],"finishing":["mission id"],"changes":[{"what":"setting","from":"old","to":"new","because":"quote from Polaris"}]}`;

function describeMetrics(m: Metrics) {
  const out = Object.entries(m.missedBy).filter(([, v]) => v > 0);
  return `${m.month}: sales ${rm(m.sales)} from ${m.orders} orders (${m.newOrders} new, ${m.repeatOrders} repeat${m.popupOrders ? `, ${m.popupOrders} at pop-ups` : ""}), average order ${rm(m.aov)}. ${
    m.lostOrders ? `About ${m.lostOrders} orders lost to stock-outs or packing limits. ` : ""
  }${out.length ? `Ran out of: ${out.map(([name, v]) => `${name} (${v} more wanted)`).join(", ")}. ` : ""}Stock left: ${m.inventoryLeft} pieces worth ${rm(m.stockValue)} at cost (bought ${m.unitsBought}). Ads ${rm(m.adSpend)}${m.costPerAdOrder ? `, about ${rm(m.costPerAdOrder)} per order from ads` : ""}. Platform fees ${rm(m.platformFees)}. Costs ${rm(m.expenses)}, net ${rm(m.net)}. Cash now ${rm(m.cash)}. Shop rating ${m.rating}.`;
}

// ---------- The two runs ----------------------------------------------------------------------

function monthStart(first: Date, i: number) {
  return new Date(first.getFullYear(), first.getMonth() + i, 1, 9);
}

/**
 * The same owner without Polaris: keeps her habits. Ads at about 18% of last month's sales,
 * a 35% sale every month, 30% extra stock, and a bazaar in the busy months (one went well once).
 */
function habitPlan(settings: Settings, last: Metrics | null, date: Date): Plan {
  const adSpend = last ? Math.max(800, Math.round((last.sales * 0.18) / 100) * 100) : settings.adSpend;
  const popups = [11, 1].includes(date.getMonth()) ? 1 : 0;
  return { ...settings, adSpend, ...NO_ONE_OFFS, popups };
}

function runAutopilot(first: Date, months: number, seed: number) {
  let state: MarketState = { ...START };
  let settings: Settings = { ...HABITS };
  let last: Metrics | null = null;
  const logs: MonthLog[] = [];
  for (let i = 0; i < months; i++) {
    const date = monthStart(first, i);
    const plan = habitPlan(settings, last, date);
    const res = simulateMonth(state, plan, date, i, seed);
    settings = plan;
    state = res.next;
    last = res.metrics;
    logs.push({ month: res.metrics.month, plan, metrics: res.metrics });
  }
  return logs;
}

/** Replays a run's decisions month by month in a market with different luck. */
function replay(plans: Plan[], first: Date, seed: number) {
  let state: MarketState = { ...START };
  return plans.map((plan, i) => {
    const res = simulateMonth(state, plan, monthStart(first, i), i, seed);
    state = res.next;
    return res.metrics;
  });
}

async function runWithPolaris(first: Date, months: number, seed: number, onMonth: (logs: MonthLog[]) => void) {
  let state: MarketState = { ...START };
  let settings: Settings = { ...HABITS };
  let last: Metrics | null = null;
  let lastWrapped: MonthlyReport | null = null;
  const logs: MonthLog[] = [];
  const app = () => usePolaris.getState();
  const basePrices = new Map(app().products.map((p) => [p.id, p.price]));

  for (let i = 0; i < months; i++) {
    const date = monthStart(first, i);
    const key = monthKey(date);
    const monthName = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const { sale } = seasonFor(date);
    const errors: string[] = [];
    clock.set(date);
    log(`=== ${monthName} (with Polaris) ===`);

    // 0. Open the Stock page and plan the restock first, so Lumi's advice quotes the same numbers.
    let restockPlan: RestockPlan | null = null;
    try {
      restockPlan = await planRestock();
      app().saveRestockPlan(restockPlan);
      log(`  restock: ${restockPlan.items.filter((x) => x.order > 0).map((x) => `${x.order} × ${x.product}`).join(", ") || "nothing"}`);
    } catch (err) {
      errors.push(`restock plan: ${String(err)}`);
    }

    // 1. Ask Lumi, the way an owner would at the start of a month.
    const question = `Hi Lumi, it's the start of ${monthName}. ${last ? `Last month: ${describeMetrics(last)}` : ""} This month's big sale is the ${sale}. What are the 3 most important things I should do this month to make more profit? Please be specific, with numbers.`;
    let advice = "";
    try {
      advice = (await streamChat({ messages: [{ role: "user", content: question }], page: "Home dashboard", onText: () => {} }))
        .split("\n")
        .filter((l) => !/^\s*AREA:/i.test(l))
        .join("\n")
        .trim();
      app().addAdvisorMessage({ id: crypto.randomUUID(), role: "user", content: question });
      app().addAdvisorMessage({ id: crypto.randomUUID(), role: "assistant", content: advice });
      log(`  Lumi: ${advice.slice(0, 160).replace(/\s+/g, " ")}…`);
    } catch (err) {
      errors.push(`chat: ${String(err)}`);
    }

    // 2. Turn the advice into missions, as the app's "make it a mission" does.
    const missionsAdded: string[] = [];
    const open = () => app().missions.filter((m) => m.status !== "done");
    if (advice && open().length < 6) {
      try {
        const made = await generateMissions({ mode: "advice", text: advice, source: "advisor" });
        app().addMissions(made.slice(0, 3));
        missionsAdded.push(...made.slice(0, 3).map((m) => m.title));
        log(`  missions: ${missionsAdded.join(" | ")}`);
      } catch (err) {
        errors.push(`missions: ${String(err)}`);
      }
    }

    // 3. The money check-up (Nemotron Ultra).
    let checkup: MoneyReview | null = null;
    try {
      checkup = await reviewMoney();
      log(`  check-up ${checkup.score}/100: ${checkup.headline}`);
    } catch (err) {
      errors.push(`check-up: ${String(err)}`);
    }

    // 4. A campaign plan for the month's big sale, from the Creative Studio.
    let campaigns: Campaign[] = [];
    try {
      const out = await generateStudio("campaign", {
        goal: "Sell more without giving away the margin",
        occasion: sale,
        budget: `RM${Math.round(settings.adSpend / 2)}`,
        duration: "1 week",
        channels: "TikTok Shop, Shopee, Instagram and WhatsApp, our website",
      });
      if (out.tool === "campaign") campaigns = out.campaigns;
      log(`  campaigns: ${campaigns.map((c) => `${c.name} (${c.offer})`).join(" | ")}`);
    } catch (err) {
      errors.push(`campaign: ${String(err)}`);
    }

    // 5. Aina decides.
    const missionList = open()
      .map((m) => `- id ${m.id}: ${m.title}. ${m.description} Steps: ${m.steps.map((s) => `${s.done ? "[done] " : ""}${s.text}`).join("; ")}`)
      .join("\n");
    const brief = [
      `It's ${monthName}. This month's big sale: ${sale}.`,
      `Your numbers (from the app):\n${moneySummary(app())}`,
      last ? `What you saw last month: ${describeMetrics(last)}` : "",
      `Cash in the bank: ${rm(state.cash)}.`,
      `Current settings: ${JSON.stringify(settings)}`,
      `--- What Polaris told you this month ---`,
      `LUMI'S ADVICE:\n${advice || "(no reply)"}`,
      `OPEN MISSIONS:\n${missionList || "(none)"}`,
      restockPlan
        ? `LUMI'S RESTOCK PLAN: ${restockPlan.summary}\n${restockPlan.items
            .map((x) => (x.order > 0 ? `- Order ${x.order} × ${x.product} (${rm(x.cost)}, about ${rm(x.profit)} profit once sold): ${x.why}` : `- ${x.product}: no order. ${x.why}`))
            .join("\n")}${
            restockPlan.cash?.budget
              ? `\nTHE ORDER THAT FITS YOUR CASH (keeping ${rm(restockPlan.cash.reserve)} for a month of fixed costs, ${rm(restockPlan.cash.spendable)} left for stock): ${restockPlan.cash.budget.items.map((x) => `${x.order} × ${x.product}`).join(", ") || "nothing"}`
              : ""
          }${restockPlan.watch ? `\nWatch: ${restockPlan.watch}` : ""}`
        : "",
      checkup ? `MONEY CHECK-UP (${checkup.score}/100): ${checkup.headline}\nIssues: ${checkup.issues.map((x) => `${x.title}: ${x.detail}`).join(" | ")}\nActions: ${checkup.actions.join(" | ")}` : "",
      campaigns.length ? `CAMPAIGN PLANS FOR THE ${sale.toUpperCase()}:\n${campaigns.map((c) => `- ${c.name}: ${c.bigIdea} Offer: ${c.offer}. Budget: ${c.budget}`).join("\n")}` : "",
      lastWrapped ? `LAST MONTH'S WRAPPED: ${lastWrapped.headline}\nProblems: ${lastWrapped.problems.map((p) => `${p.title}: ${p.rootCause}`).join(" | ")}\nClosing: ${lastWrapped.closing}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const decision = await nemotron(OWNER, brief);
    if (!decision) errors.push("owner: no decision, kept settings");
    const s = (decision?.settings ?? {}) as Partial<Plan>;
    const o = (decision?.oneOffs ?? {}) as Partial<Plan>;
    const plan = clampPlan({ ...s, ...o }, settings);
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    const workingOn = ids(decision?.workingOn);
    const finishing = ids(decision?.finishing).slice(0, 2);
    const changes = (Array.isArray(decision?.changes) ? decision.changes : []).map((c) => {
      const r = (c ?? {}) as Record<string, unknown>;
      return { what: String(r.what ?? ""), from: String(r.from ?? ""), to: String(r.to ?? ""), because: String(r.because ?? "") };
    });
    log(`  Aina changes: ${changes.map((c) => `${c.what} ${c.from}→${c.to}`).join(", ") || "nothing"}; restock ${plan.restock ? JSON.stringify(plan.restock) : "the usual way"}`);
    // New prices show up in the app's products, so its margins stay true.
    for (const p of app().products) {
      const base = basePrices.get(p.id);
      if (base) app().saveProduct({ ...p, price: Math.round(base * plan.priceIndex) });
    }

    // 6. The month happens. Its entries and activities go into the app, and so does the stock:
    // the order on the 2nd, the pieces sold week by week (the money is already in the entries).
    const res = simulateMonth(state, plan, date, i, seed);
    app().addEntries(res.entries);
    for (const p of app().products) {
      const bought = res.metrics.boughtBy[p.name] ?? 0;
      if (bought > 0) app().restock(p.id, bought, { date: `${key}-02`, note: "Tailor batch" });
      const sold = res.metrics.soldBy[p.name] ?? 0;
      [7, 14, 21, 28].forEach((day, w) => {
        const qty = Math.floor(sold / 4) + (w < sold % 4 ? 1 : 0);
        if (qty > 0) app().recordSold(p.id, qty, { date: `${key}-${String(day).padStart(2, "0")}` });
      });
    }
    for (const a of res.activities) app().saveActivity(a);
    if (plan.getLicence) app().saveActivity({ id: crypto.randomUUID(), date: `${key}-09`, kind: "other", title: "Applied for a bazaar trading licence", cost: 250 });
    app().setCashOnHand(Math.round(res.next.cash));
    for (const id of workingOn) {
      const m = app().missions.find((x) => x.id === id && x.status !== "done");
      const step = m?.steps.find((st) => !st.done);
      if (m && step) app().toggleStep(m.id, step.id);
    }
    log(`  result: ${describeMetrics(res.metrics)}`);

    // 7. Month end: report finished missions, then the Wrapped.
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 21);
    clock.set(end);
    const finished: { title: string; verdict: string; feedback: string }[] = [];
    const toFinish = finishing.map((id) => app().missions.find((m) => m.id === id && m.status !== "done")).filter((m): m is Mission => Boolean(m));
    if (toFinish.length) {
      const answers = await nemotron(
        `You are Aina reporting to the Polaris app on missions you finished. Answer each check-in question honestly from this month's numbers and what you did. Reply with JSON only: {"answers":{"<mission id>":["answer to question 1","answer to question 2"]}}`,
        `This month: ${describeMetrics(res.metrics)}\nWhat you changed: ${JSON.stringify(changes)}\n\n${toFinish
          .map((m) => `Mission ${m.id}: ${m.title}\nQuestions:\n${(m.checkIn ?? []).map((q, k) => `${k + 1}. ${q.question}`).join("\n") || "1. What did you do and what happened?"}`)
          .join("\n\n")}`,
      );
      for (const m of toFinish) {
        const qs = m.checkIn?.length ? m.checkIn.map((q) => q.question) : ["What did you do and what happened?"];
        const given = ((answers?.answers as Record<string, unknown> | undefined)?.[m.id] ?? []) as unknown[];
        const qa = qs.map((question, k) => ({ question, answer: String(given[k] ?? "Done this month.") }));
        try {
          const review = await reviewMission(m, qa);
          finished.push({ title: m.title, verdict: review.verdict, feedback: review.feedback });
          if (review.verdict === "complete") app().completeMission(m.id, { answers: qa, feedback: review.feedback, at: new Date().toISOString() }, review.insights);
          log(`  mission "${m.title}": ${review.verdict}`);
        } catch (err) {
          errors.push(`mission review: ${String(err)}`);
        }
      }
    }
    let wrapped: MonthlyReport | null = null;
    try {
      wrapped = await createMonthReport(key);
      app().saveMonthReport(wrapped);
      log(`  Wrapped: ${wrapped.headline}`);
    } catch (err) {
      errors.push(`wrapped: ${String(err)}`);
    }
    lastWrapped = wrapped;

    settings = { ...plan };
    state = res.next;
    last = res.metrics;
    logs.push({
      month: res.metrics.month,
      plan,
      metrics: res.metrics,
      polaris: {
        question,
        advice,
        missionsAdded,
        checkup,
        restockPlan,
        campaigns: campaigns.map(({ name, offer, budget }) => ({ name, offer, budget })),
        changes,
        finished,
        wrapped: wrapped ? { headline: wrapped.headline, problems: wrapped.problems, closing: wrapped.closing } : null,
        errors,
      },
    });
    onMonth(logs);
  }
  return logs;
}

// ---------- Report -----------------------------------------------------------------------------

function totals(ms: Metrics[]) {
  const sales = ms.reduce((s, m) => s + m.sales, 0);
  const net = ms.reduce((s, m) => s + m.net, 0);
  const lowestCash = Math.min(...ms.map((m) => m.cash));
  const last3 = ms.slice(-3).reduce((s, m) => s + m.net, 0) / Math.min(3, ms.length);
  const end = ms[ms.length - 1];
  const missed = ms.reduce((s, m) => s + Object.values(m.missedBy).reduce((a, v) => a + v, 0), 0);
  return { sales, net, endCash: end.cash, lowestCash, last3, lost: ms.reduce((s, m) => s + m.lostOrders, 0), missed, endStock: end.stockValue, worth: end.cash + end.stockValue };
}

function verdict(t: ReturnType<typeof totals>, startCash: number) {
  if (t.lowestCash < 0) return "Ran out of cash";
  if (t.endCash > startCash && t.last3 > 0) return "Succeeded: profitable and cash grew";
  if (t.net > 0) return "Got by: small profit";
  return "Struggled: lost money";
}

function report(config: Config, first: Date, polaris: MonthLog[], autopilot: MonthLog[], robustness: { seed: number; polaris: ReturnType<typeof totals>; autopilot: ReturnType<typeof totals> }[]) {
  const p = totals(polaris.map((l) => l.metrics));
  const a = totals(autopilot.map((l) => l.metrics));
  const lines: string[] = [];
  lines.push(`# Atelier Nura: does following Polaris pay off?`, "");
  lines.push(`${polaris.length} simulated months from ${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, market seed ${config.seed}. Starting cash ${rm(START.cash)}.`, "");
  lines.push(`| | With Polaris | On autopilot |`, `|---|---|---|`);
  lines.push(`| Verdict | ${verdict(p, START.cash)} | ${verdict(a, START.cash)} |`);
  lines.push(`| Sales | ${rm(p.sales)} | ${rm(a.sales)} |`);
  lines.push(`| Profit (net) | ${rm(p.net)} | ${rm(a.net)} |`);
  lines.push(`| Cash at the end | ${rm(p.endCash)} | ${rm(a.endCash)} |`);
  lines.push(`| Lowest cash | ${rm(p.lowestCash)} | ${rm(a.lowestCash)} |`);
  lines.push(`| Average net, last 3 months | ${rm(p.last3)} | ${rm(a.last3)} |`);
  lines.push(`| Orders lost (stock-outs, packing) | ${p.lost} | ${a.lost} |`);
  lines.push(`| Pieces wanted but out of stock | ${p.missed} | ${a.missed} |`);
  lines.push(`| Stock left at the end, at cost | ${rm(p.endStock)} | ${rm(a.endStock)} |`);
  lines.push(`| Cash + stock at the end | ${rm(p.worth)} | ${rm(a.worth)} |`, "");
  lines.push(`## Same decisions, different luck`, "", `Each run's month-by-month decisions replayed in markets with other random draws:`, "");
  lines.push(`| Seed | Polaris profit | Autopilot profit | Polaris cash + stock | Autopilot cash + stock |`, `|---|---|---|---|---|`);
  for (const r of robustness) lines.push(`| ${r.seed} | ${rm(r.polaris.net)} | ${rm(r.autopilot.net)} | ${rm(r.polaris.worth)} | ${rm(r.autopilot.worth)} |`);
  lines.push("", `## Month by month`, "");
  lines.push(`| Month | Polaris sales | Polaris net | Autopilot sales | Autopilot net |`, `|---|---|---|---|---|`);
  polaris.forEach((l, i) => lines.push(`| ${l.month} | ${rm(l.metrics.sales)} | ${rm(l.metrics.net)} | ${rm(autopilot[i].metrics.sales)} | ${rm(autopilot[i].metrics.net)} |`));
  for (const l of polaris) {
    const x = l.polaris!;
    lines.push("", `### ${l.month}`, "");
    lines.push(`**Lumi said:** ${x.advice.replace(/\s+/g, " ").slice(0, 900)}`, "");
    if (x.missionsAdded.length) lines.push(`**New missions:** ${x.missionsAdded.join("; ")}`, "");
    if (x.checkup) lines.push(`**Money check-up ${x.checkup.score}/100:** ${x.checkup.headline}. Actions: ${x.checkup.actions.join("; ")}`, "");
    if (x.restockPlan) lines.push(`**Restock plan:** ${x.restockPlan.summary} ${x.restockPlan.items.filter((it) => it.order > 0).map((it) => `${it.order} × ${it.product}`).join(", ")}`, "");
    lines.push(`**Ordered:** ${l.plan.restock ? "following the restock plan: " : "the usual way: "}${Object.entries(l.metrics.boughtBy).filter(([, v]) => v > 0).map(([k, v]) => `${v} × ${k}`).join(", ") || "nothing"}`, "");
    if (x.campaigns.length) lines.push(`**Campaign plans:** ${x.campaigns.map((c) => `${c.name} (${c.offer})`).join("; ")}`, "");
    lines.push(`**What Aina changed:**`, ...(x.changes.length ? x.changes.map((c) => `- ${c.what}: ${c.from} → ${c.to}. Because: "${c.because}"`) : ["- Nothing"]), "");
    lines.push(`**Result:** ${describeMetrics(l.metrics)}`, "");
    if (x.finished.length) lines.push(`**Missions reported:** ${x.finished.map((f) => `${f.title} (${f.verdict}): ${f.feedback}`).join(" | ")}`, "");
    if (x.wrapped) lines.push(`**Wrapped:** ${x.wrapped.headline} ${x.wrapped.problems.map((pr) => `Problem: ${pr.title}.`).join(" ")}`, "");
    if (x.errors.length) lines.push(`**Errors:** ${x.errors.join("; ")}`, "");
  }
  return lines.join("\n");
}

export async function run(config: Config) {
  const real = (globalThis as unknown as { __simClock: { real: DateConstructor } }).__simClock.real;
  const today = new real();
  // The demo history runs to the end of this month; the simulation starts the month after.
  const historyEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 20);
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1, 9);
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}`;
  const dir = resolve(config.out, stamp);
  mkdirSync(dir, { recursive: true });

  const autopilot = runAutopilot(first, config.months, config.seed);
  if (config.baselineOnly) {
    for (const l of autopilot) console.log(describeMetrics(l.metrics), JSON.stringify({ ad: l.plan.adSpend, popups: l.plan.popups }));
    const t = totals(autopilot.map((l) => l.metrics));
    console.log(verdict(t, START.cash), JSON.stringify(t));
    return;
  }

  clock.set(historyEnd);
  usePolaris.setState({ ...demoBusiness(historyEnd), prefs: usePolaris.getState().prefs });
  log(`Atelier Nura loaded: ${usePolaris.getState().entries.length} entries of history. Simulating ${config.months} months with Polaris (server ${config.base}).`);

  const save = (logs: MonthLog[]) => writeFileSync(resolve(dir, "polaris-run.json"), JSON.stringify(logs, null, 2));
  const polaris = await runWithPolaris(first, config.months, config.seed, save);

  const plansP = polaris.map((l) => l.plan);
  const plansA = autopilot.map((l) => l.plan);
  const robustness = [config.seed, ...[11, 23, 37, 51].filter((s) => s !== config.seed)].map((seed) => ({
    seed,
    polaris: totals(replay(plansP, first, seed)),
    autopilot: totals(replay(plansA, first, seed)),
  }));

  writeFileSync(resolve(dir, "results.json"), JSON.stringify({ config: { ...config, out: "scripts/simulation/results" }, first: first.toISOString(), polaris, autopilot, robustness }, null, 2));
  writeFileSync(resolve(dir, "report.md"), report(config, first, polaris, autopilot, robustness));
  log(`Done. Report: ${resolve(dir, "report.md")}`);
}
