import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius } from "@/lib/ai/nebius";
import { businessContext, parseFacts, restockPrompt } from "@/lib/ai/prompts";
import { extractJson, sanitizeRestockJudgement, type RestockJudgement, type RestockPlan } from "@/lib/ai/shared";
import { COVER_DAYS, coverOrder } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { guard } from "@/lib/server/guard";
import type { BusinessProfile } from "@/lib/types";

interface StockRow {
  name: string;
  price: number;
  unitCost: number;
  /** Profit on one sale after cost and the average platform fee (the app knows where they sell). */
  profit?: number;
  /** The largest discount that still covers cost and fees, 0 to 1. */
  maxDiscount?: number;
  onHand: number;
  sold30: number;
  /** Days of the last 30 it sat sold out. */
  daysOut?: number;
  /** The app's sales pace a day, counting only days it was in stock (worked out from sold30 and daysOut without it). */
  perDay?: number;
}

interface PlanRequest {
  profile?: Partial<BusinessProfile>;
  facts?: unknown;
  products?: StockRow[];
  /** Cash in the bank, if they've entered it. */
  cash?: number | null;
  /** Fixed costs a month (rent, staff...): kept back before anything goes on stock. */
  fixedCosts?: number;
}

/** A product with more than this many days of stock (or no recent sales) is a slow seller. */
const SLOW_DAYS = 90;

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

/**
 * Lumi's restock plan. The arithmetic is done here, from each product's sales pace (the model got
 * it wrong when asked to). Nemotron Super adds the judgement: a coming sale or season and how
 * much it lifts demand, and how to clear slow sellers.
 */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: PlanRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const products = (Array.isArray(body.products) ? body.products : [])
    .filter((p) => p && typeof p.name === "string" && p.name.trim())
    .slice(0, 40)
    .map((p) => {
      const sold30 = num(p.sold30);
      const onHand = Math.round(num(p.onHand));
      // Sales only happen while there's stock, so the pace counts the days it was on the shelf.
      const daysOut = Math.min(23, Math.round(num(p.daysOut)));
      const perDay = Number.isFinite(Number(p.perDay)) ? Math.min(num(p.perDay), sold30 / 7) : sold30 / (30 - daysOut);
      const daysLeft = perDay > 0 ? onHand / perDay : null;
      const price = num(p.price);
      const unitCost = num(p.unitCost);
      // Without the app's after-fees figures, fall back to price minus cost.
      const profit = Number.isFinite(Number(p.profit)) ? Number(p.profit) : price - unitCost;
      const maxDiscount = Number.isFinite(Number(p.maxDiscount)) ? Math.min(1, Math.max(0, Number(p.maxDiscount))) : price > 0 ? Math.max(0, 1 - unitCost / price) : 0;
      return { name: p.name.trim().slice(0, 60), price, unitCost, profit, maxDiscount, onHand, sold30, daysOut, perDay, daysLeft, slow: onHand > 0 && (daysLeft === null || daysLeft > SLOW_DAYS) };
    });
  if (products.length === 0) return Response.json({ error: "Track the stock of at least one product first." }, { status: 400 });

  const profile = body.profile ?? {};
  const currency = typeof profile.currency === "string" ? profile.currency : "USD";
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  // Today's date and the coming sale days arrive with the business details (facts.today).
  const facts = parseFacts(body.facts);
  const pace = (p: (typeof products)[number]) => `${Math.round(p.perDay * 7 * 10) / 10} a week`;
  const table = products
    .map(
      (p) =>
        `- ${p.name}: ${p.onHand} in stock, sells about ${pace(p)}${p.daysOut >= 3 ? ` (sold out ${p.daysOut} of the last 30 days)` : ""}, makes ${fmt(p.profit)} profit on a ${fmt(p.price)} sale${p.slow ? ` (slow seller; any discount over ${Math.floor(p.maxDiscount * 100)}% sells at a loss)` : ""}`,
    )
    .join("\n");

  const request = {
    model: MODELS.smart,
    messages: [
      { role: "system", content: [restockPrompt(profile.mascotName?.trim() || "Lumi"), businessContext(profile, facts)].join("\n\n") },
      { role: "user", content: `Products:\n${table}` },
    ],
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  let judgement: RestockJudgement | null = null;
  for (let attempt = 0; attempt < 2 && !judgement; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      judgement = sanitizeRestockJudgement(extractJson(completion.choices[0]?.message?.content ?? ""), products.map((p) => p.name));
    } catch (err) {
      console.error(`[restock plan] attempt ${attempt + 1} failed`, err);
    }
  }
  if (!judgement) return Response.json({ error: "Couldn't plan your restock right now. Try again in a moment." }, { status: 502 });

  // The plan itself: enough for the next 5 weeks at the recent pace, plus the event's lift.
  const lift = 1 + judgement.uplift / 100;
  const days = (d: number | null) =>
    d === null ? "a long time" : d < 1.5 ? "about a day" : d < 14 ? `about ${Math.round(d)} days` : `about ${Math.round(d / 7)} weeks`;
  const items: RestockPlan["items"] = products.map((p) => {
    const none = { product: p.name, order: 0, cost: 0, profit: 0 };
    if (p.slow) {
      return { ...none, why: `${p.onHand} in stock but only ${p.sold30} sold in 30 days. ${judgement.clear.get(p.name) ?? "Clear some before buying more."}` };
    }
    // Restocking something that sells at a loss only loses more, however fast it sells.
    if (p.profit <= 0) {
      return { ...none, why: `Each one sold loses ${fmt(-p.profit)} after its cost and fees. Fix the price or the cost before ordering more.` };
    }
    const order = coverOrder(p.perDay, p.onHand, lift);
    if (order === 0) {
      return Math.ceil(p.perDay * COVER_DAYS * lift) > p.onHand
        ? { ...none, why: `${p.onHand} in stock covers nearly all of the next 5 weeks at ${pace(p)}. Top it up with your next order.` }
        : { ...none, why: `${p.onHand} in stock lasts ${days(p.daysLeft)} at ${pace(p)}, past the next 5 weeks.` };
    }
    const soldOut = p.daysOut >= 3 ? ` It was sold out ${p.daysOut} of the last 30 days, so that pace counts only the days it was on the shelf.` : "";
    return {
      product: p.name,
      order,
      cost: order * p.unitCost,
      profit: order * p.profit,
      why: `Sells ${pace(p)} and ${p.onHand === 0 ? "it's sold out" : `${p.onHand} left lasts ${days(p.daysLeft)}`}. ${order} more covers the next 5 weeks${judgement.uplift ? `, with ${judgement.uplift}% extra for ${judgement.event}` : ""}.${soldOut}`,
    };
  });
  // What earns the most back for each unit of money spent goes first, for when cash is short.
  const back = (i: RestockPlan["items"][number]) => (i.cost > 0 ? i.profit / i.cost : 0);
  items.sort((a, b) => Number(b.order > 0) - Number(a.order > 0) || back(b) - back(a));
  const ordering = items.filter((i) => i.order > 0);
  const units = ordering.reduce((s, i) => s + i.order, 0);
  const cost = ordering.reduce((s, i) => s + i.cost, 0);
  const profit = ordering.reduce((s, i) => s + i.profit, 0);
  const money = cashCheck(ordering, products, cost, body);
  const weeks = (w: number) => (w < 1 ? "under a week" : `about ${Math.round(w)} ${Math.round(w) === 1 ? "week" : "weeks"}`);
  const afford = !money
    ? ""
    : money.budget
      ? money.spendable > 0
        ? ` That's more than you can spare while keeping ${fmt(money.reserve)} for a month of fixed costs. With ${fmt(money.spendable)}, order from the top of the list down and stop there, rather than cutting every line a little.`
        : ` You don't have cash to spare for stock once a month of fixed costs (${fmt(money.reserve)}) is kept aside, so wait for this month's sales to come in.`
      : ` You can afford it and still keep a month of fixed costs${money.paybackWeeks !== null ? `, and these pieces should sell enough to pay the order back in ${weeks(money.paybackWeeks)}` : ""}. Ordering less risks sold-out shelves.`;
  const summary = ordering.length
    ? `Order ${units} pieces across ${ordering.length} ${ordering.length === 1 ? "product" : "products"} for about ${fmt(cost)}. Once they sell, that's about ${fmt(profit)} profit.${afford}${judgement.event ? ` ${judgement.why || `This allows for ${judgement.event}.`}` : ""}`
    : `Nothing needs ordering right now: your stock covers the next 5 weeks.${judgement.event ? ` ${judgement.why}` : ""}`;

  return Response.json({ summary, items, watch: judgement.watch, cash: money } satisfies RestockPlan);
}

/**
 * The plan against the bank balance. A month of fixed costs stays in the bank (a fifth of the cash
 * when none are entered); the rest can go on stock. When the order costs more than that, the
 * cash-safe order fills from the top of the list (best return on the money first), so the cut
 * falls on what earns least. Also how long the ordered products' sales take to pay the order back.
 */
function cashCheck(
  ordering: RestockPlan["items"],
  products: { name: string; unitCost: number; profit: number; perDay: number }[],
  cost: number,
  body: PlanRequest,
): RestockPlan["cash"] {
  const cash = typeof body.cash === "number" && Number.isFinite(body.cash) ? body.cash : null;
  if (cash === null || !ordering.length) return null;
  const fixed = num(body.fixedCosts);
  const reserve = fixed > 0 ? fixed : cash * 0.2;
  const spendable = Math.max(0, cash - reserve);
  const row = (name: string) => products.find((p) => p.name === name)!;
  // Each sale brings back its cost plus its profit (the price less the platform's cut).
  const weekly = ordering.reduce((s, i) => s + row(i.product).perDay * 7 * (row(i.product).profit + row(i.product).unitCost), 0);
  const paybackWeeks = weekly > 0 ? cost / weekly : null;
  if (cost <= spendable) return { reserve, spendable, paybackWeeks, budget: null };
  let left = spendable;
  const picked = ordering.map((i) => {
    const p = row(i.product);
    const order = p.unitCost > 0 ? Math.min(i.order, Math.floor(left / p.unitCost)) : i.order;
    left -= order * p.unitCost;
    return { product: i.product, order, profit: order * p.profit };
  });
  const items = picked.filter((i) => i.order > 0);
  return {
    reserve,
    spendable,
    paybackWeeks,
    budget: { items: items.map(({ product, order }) => ({ product, order })), cost: spendable - left, profit: items.reduce((s, i) => s + i.profit, 0) },
  };
}
