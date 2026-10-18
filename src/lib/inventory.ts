// Stock: what's on the shelf for each product, how fast it sells, what each one earns, and what
// needs attention. Everything here is worked out from products (their stock counts and prices),
// the stock history, and where recent sales came from (for the platform fees).

import { THIN_MARGIN, unitProfit } from "./finance";
import { formatMoney } from "./money";
import type { Product, SalesChannel, StockMove, TreasuryEntry } from "./types";

/** How a product's stock is doing. */
export type StockStatus = "out" | "low" | "ok" | "slow" | "untracked";

/**
 * Platform fees, averaged over where recent sales came from, so "profit each" matches how the
 * business really sells rather than one platform's cut.
 */
export interface FeeMix {
  percent: number;
  /** Fixed fee per sale, in money. */
  fixed: number;
  /** One sentence saying where the fee comes from, for the explanations. */
  note: string;
}

export const NO_FEES: FeeMix = { percent: 0, fixed: 0, note: "Platform fees aren't included yet." };

/** What one sale of a product earns. */
export interface Margin {
  /** The platform's cut of one sale. */
  fees: number;
  /** What's left from one sale after the cost to make or buy it and the fees. */
  profit: number;
  /** Profit as a share of the price. */
  margin: number;
  /** The most you can take off the price before a sale stops covering its cost and fees (0 to 1). */
  maxDiscount: number;
}

export interface StockLine {
  product: Product;
  onHand: number;
  /** Units sold in the last 30 days. */
  sold30: number;
  /** Days of the last 30 it sat sold out. */
  daysOut: number;
  /**
   * Average units sold a day over the last 30 days, counting only the days it was on the shelf:
   * a product that sold out sells faster than its sales alone suggest.
   */
  perDay: number;
  /** Days until it runs out at that pace; null when nothing sold recently. */
  daysLeft: number | null;
  /** What the stock cost to make or buy. */
  value: number;
  /** The level that counts as running low. */
  reorderAt: number;
  status: StockStatus;
  margin: Margin;
  /** Profit from what sold in the last 30 days. */
  profit30: number;
}

/** Below two weeks of stock is running low; more than three months of it is slow. */
const LOW_DAYS = 14;
const SLOW_DAYS = 90;

/** A restock plan stands for a week; after that sales and stock have moved on. */
export function planIsCurrent(madeAt: string, now = new Date()) {
  return now.getTime() - new Date(madeAt).getTime() < 7 * 86_400_000;
}

/** Days of sales a restock should leave on the shelf: about 3 weeks to make or receive more, plus 2 to spare. */
export const COVER_DAYS = 35;

/**
 * Pieces to order so the shelf covers the next 5 weeks at `perDay` (raised by `lift` for a coming
 * sale), or 0 when what's there already does, or so nearly does that it can join the next order.
 */
export function coverOrder(perDay: number, onHand: number, lift = 1) {
  const need = Math.ceil(perDay * COVER_DAYS * lift);
  const order = Math.max(0, need - onHand);
  return onHand > 0 && order < Math.max(3, need * 0.1) ? 0 : order;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (today: Date, n: number) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
const pct = (share: number) => `${Math.round(share * 100)}%`;

/** The fees on a typical sale: each platform's fee, weighted by how much sold there in the last 3 months. */
export function feeMix(channels: SalesChannel[], entries: TreasuryEntry[], today = new Date()): FeeMix {
  const byName = new Map(channels.map((c) => [c.name, c]));
  const from = daysAgo(today, 90);
  let total = 0;
  let percent = 0;
  let fixed = 0;
  for (const e of entries) {
    const ch = e.type === "income" && e.channel ? byName.get(e.channel) : undefined;
    if (!ch || e.date <= from) continue;
    total += e.amount;
    percent += e.amount * ch.feePercent;
    fixed += e.amount * ch.feeFixed;
  }
  if (total > 0) {
    const mix = { percent: percent / total, fixed: fixed / total };
    if (!mix.percent && !mix.fixed) return { ...mix, note: "Your recent sales came through platforms that take no fee." };
    return { ...mix, note: `Fees are the ${Math.round(mix.percent * 10) / 10}% your platforms took on average, weighted by where you sold in the last 3 months.` };
  }
  if (channels.length === 1) {
    const [c] = channels;
    return { percent: c.feePercent, fixed: c.feeFixed, note: c.feePercent || c.feeFixed ? `Fees are ${c.name}'s ${c.feePercent}% cut.` : "You sell without platform fees." };
  }
  return { ...NO_FEES, note: "Platform fees aren't included: log sales with the platform they came through and they will be." };
}

export function marginOf(product: Product, mix: FeeMix): Margin {
  const { fees, profit, margin } = unitProfit(product, { feePercent: mix.percent, feeFixed: mix.fixed });
  // The lowest price that still covers the cost and the fees (which shrink with the price).
  const floor = (product.unitCost + mix.fixed) / (1 - mix.percent / 100);
  const maxDiscount = product.price > 0 ? Math.min(1, Math.max(0, 1 - floor / product.price)) : 0;
  return { fees, profit, margin, maxDiscount };
}

/**
 * Of the last 30 days, how many a product's stock was on record and how many of those it sat
 * sold out, worked back from today's count through its history (`history` is newest first).
 * A day is sold out when it ended with nothing on the shelf and nothing sold that day.
 */
function shelfDays(onHand: number, history: StockMove[], today: Date) {
  if (!history.length) return { recorded: 30, out: 0 };
  const first = history[history.length - 1].date;
  let level = onHand;
  let k = 0;
  let recorded = 0;
  let out = 0;
  for (let back = 0; back < 30; back++) {
    const day = daysAgo(today, back);
    // Undo everything after this day, so `level` is what was left at its end.
    while (k < history.length && history[k].date > day) level -= history[k++].qty;
    if (day < first) break;
    recorded++;
    let soldToday = false;
    for (let j = k; j < history.length && history[j].date === day; j++) if (history[j].kind === "sold") soldToday = true;
    if (level <= 0 && !soldToday) out++;
  }
  return { recorded, out };
}

export function stockLines(products: Product[], moves: StockMove[], mix: FeeMix = NO_FEES, today = new Date()): StockLine[] {
  const from = daysAgo(today, 30);
  const to = iso(today);
  const sold = new Map<string, number>();
  const history = new Map<string, StockMove[]>();
  for (const m of moves) {
    if (m.kind === "sold" && m.date > from && m.date <= to) sold.set(m.productId, (sold.get(m.productId) ?? 0) - m.qty);
    const list = history.get(m.productId);
    if (list) list.push(m);
    else history.set(m.productId, [m]);
  }
  return products.map((product) => {
    const tracked = product.stock !== undefined;
    const onHand = Math.max(0, product.stock ?? 0);
    const sold30 = sold.get(product.id) ?? 0;
    const shelf = tracked ? shelfDays(onHand, (history.get(product.id) ?? []).sort((a, b) => b.date.localeCompare(a.date)), today) : { recorded: 30, out: 0 };
    // At least a week, so a few days' sales don't make a wild pace.
    const perDay = sold30 / Math.max(7, shelf.recorded - shelf.out);
    const daysLeft = perDay > 0 ? onHand / perDay : null;
    const reorderAt = product.reorderAt ?? Math.max(3, Math.ceil(perDay * LOW_DAYS));
    const margin = marginOf(product, mix);
    let status: StockStatus = "ok";
    if (!tracked) status = "untracked";
    else if (onHand <= 0) status = "out";
    else if (onHand <= reorderAt) status = "low";
    else if (sold30 === 0 || (daysLeft !== null && daysLeft > SLOW_DAYS)) status = "slow";
    return { product, onHand, sold30, daysOut: shelf.out, perDay, daysLeft, value: onHand * product.unitCost, reorderAt, status, margin, profit30: sold30 * margin.profit };
  });
}

export interface StockSummary {
  tracked: number;
  /** Money tied up in stock, at cost. */
  value: number;
  /** What the stock on hand sells for at full price. */
  sellValue: number;
  /** The profit in the stock on hand, once it sells at full price. */
  shelfProfit: number;
  /** Profit from everything sold in the last 30 days. */
  profit30: number;
  low: StockLine[];
  out: StockLine[];
  slow: StockLine[];
  slowValue: number;
}

export function stockSummary(lines: StockLine[]): StockSummary {
  const tracked = lines.filter((l) => l.status !== "untracked");
  const slow = tracked.filter((l) => l.status === "slow");
  const sum = (pick: (l: StockLine) => number) => tracked.reduce((s, l) => s + pick(l), 0);
  return {
    tracked: tracked.length,
    value: sum((l) => l.value),
    sellValue: sum((l) => l.onHand * l.product.price),
    shelfProfit: sum((l) => l.onHand * Math.max(0, l.margin.profit)),
    profit30: sum((l) => l.profit30),
    low: tracked.filter((l) => l.status === "low"),
    out: tracked.filter((l) => l.status === "out"),
    slow,
    slowValue: slow.reduce((s, l) => s + l.value, 0),
  };
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  out: "Out of stock",
  low: "Running low",
  ok: "Healthy",
  slow: "Slow seller",
  untracked: "Not tracked",
};

/** "about 4 days", "about 3 weeks"... */
export function daysText(days: number | null) {
  if (days === null) return "no recent sales";
  if (days < 1) return "under a day";
  if (days < 14) return `about ${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  if (days < 365) return `about ${Math.round(days / 30)} months`;
  return "over a year";
}

/**
 * Money for one unit: whole amounts, or cents for cheap products. Pass the product's price as
 * `price` so a price split into cost, fees and profit is all in the same style.
 */
export function unitMoney(amount: number, currency: string, price = amount) {
  return formatMoney(amount, currency, { compact: Math.abs(price) >= 20 });
}

/** Whether a margin needs a warning: a loss, thin, or fine. */
export function marginHealth(m: Margin): "loss" | "thin" | null {
  return m.profit <= 0 ? "loss" : m.margin < THIN_MARGIN ? "thin" : null;
}

export interface MarginNote {
  tone: "good" | "caution" | "alert";
  text: string;
}

/**
 * What the margins mean for what to stock, as a few plain sentences, most pressing first:
 * anything sold at a loss, profit lost to empty shelves, the best earner, money sitting still.
 */
export function marginNotes(lines: StockLine[], currency: string): MarginNote[] {
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const unit = (n: number, l: StockLine) => unitMoney(n, currency, l.product.price);
  const notes: MarginNote[] = [];

  for (const l of lines.filter((x) => x.margin.profit <= 0).slice(0, 2)) {
    notes.push({
      tone: "alert",
      text: `${l.product.name} ${l.margin.profit < 0 ? `loses ${unit(-l.margin.profit, l)} on every sale` : "makes nothing on a sale"} once its cost and fees are paid. Raise the price or cut the cost before buying more.`,
    });
  }

  const missed = lines.filter((l) => l.status === "out" && l.perDay > 0 && l.margin.profit > 0).sort((a, b) => b.profit30 - a.profit30)[0];
  if (missed) {
    notes.push({
      tone: "alert",
      text: `${missed.product.name} is sold out. At its recent pace that's about ${fmt(missed.perDay * 7 * missed.margin.profit)} of profit missed every week, so restock it first.`,
    });
  }

  const earners = lines.filter((l) => l.profit30 > 0 && l.status !== "slow").sort((a, b) => b.profit30 - a.profit30);
  const best = earners[0];
  if (best) {
    const keep = best.status === "low" ? " It's running low, so keep it stocked first." : best.status === "out" ? "" : " Keep it in stock.";
    notes.push({
      tone: "good",
      text: `${best.product.name} earns you the most: ${fmt(best.profit30)} profit from ${best.sold30} sold in 30 days, at ${unit(best.margin.profit, best)} each (${pct(best.margin.margin)} of the price).${keep}`,
    });
  }

  const still = lines.filter((l) => l.status === "slow" && l.value > 0).sort((a, b) => b.value - a.value)[0];
  if (still) {
    const off = Math.floor(still.margin.maxDiscount * 100);
    const instead = earners.find((l) => l !== still);
    notes.push({
      tone: "caution",
      text: `${fmt(still.value)} is tied up in ${still.product.name} (${still.onHand} in stock, ${still.sold30} sold in 30 days).${off >= 5 ? ` Each makes ${unit(still.margin.profit, still)}, so there's room for a discount: anything under ${off}% off still covers its cost and fees.` : ""} Clearing some frees cash${instead ? ` for ${instead.product.name}` : ""}.`,
    });
  }

  const thin = lines.filter((l) => marginHealth(l.margin) === "thin" && l.sold30 > 0).sort((a, b) => b.sold30 - a.sold30)[0];
  if (thin) {
    notes.push({
      tone: "caution",
      text: `${thin.product.name} keeps just ${pct(thin.margin.margin)} of its price as profit. One discount or a fee rise could wipe it out, so check its price before ordering more.`,
    });
  }

  return notes.slice(0, 4);
}

/** Plain-text stock summary for the AI, or "" when no stock is tracked. */
export function stockFacts(
  products: Product[],
  moves: StockMove[],
  mix: FeeMix,
  currency: string,
  /** The restock plan the owner made lately, if any: its numbers replace the plain rule's. */
  latestPlan: { madeOn: string; items: { product: string; order: number; cost: number }[]; budget: { product: string; order: number }[] | null } | null = null,
) {
  const lines = stockLines(products, moves, mix);
  const sum = stockSummary(lines);
  if (!sum.tracked) return "";
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const parts = [`Stock on hand worth ${fmt(sum.value)} at cost, which sells for ${fmt(sum.sellValue)} (${fmt(sum.shelfProfit)} profit), across ${sum.tracked} tracked products.`];
  parts.push(
    `Profit each after cost and average platform fees, and profit from the last 30 days' sales: ${lines
      .map((l) => `${l.product.name} ${unitMoney(l.margin.profit, currency, l.product.price)} (${pct(l.margin.margin)}), ${fmt(l.profit30)} from ${l.sold30} sold`)
      .join("; ")}.`,
  );
  if (sum.out.length) parts.push(`Out of stock: ${sum.out.map((l) => `${l.product.name} (about ${fmt(l.perDay * 7 * Math.max(0, l.margin.profit))} profit a week missed)`).join(", ")}.`);
  if (latestPlan) {
    // The owner ran the restock plan lately: quote it, so every answer gives the same numbers.
    const ordering = latestPlan.items.filter((i) => i.order > 0);
    parts.push(
      `Lumi's restock plan from the Stock page, made ${latestPlan.madeOn} (it includes any lift for a coming sale): ${
        ordering.length ? `order ${ordering.map((i) => `${i.order} ${i.product} (${fmt(i.cost)})`).join(", ")}` : "nothing needs ordering"
      }.${latestPlan.budget ? ` If cash is tight, the order that fits: ${latestPlan.budget.map((i) => `${i.order} ${i.product}`).join(", ") || "nothing yet"}.` : ""} When stock orders come up, quote these quantities exactly; never make up your own.`,
    );
  } else {
    // The same rule as the restock plan, before any lift for a coming sale.
    const orders = lines
      .filter((l) => l.status !== "untracked" && l.status !== "slow" && l.margin.profit > 0)
      .map((l) => ({ l, order: coverOrder(l.perDay, l.onHand) }))
      .filter((o) => o.order > 0);
    parts.push(
      orders.length
        ? `Polaris's restock numbers, enough for the next 5 weeks at the recent pace: ${orders.map((o) => `${o.l.product.name} ${o.order} (${fmt(o.order * o.l.product.unitCost)})`).join(", ")}. These don't include a coming sale: if one is near, tell them to run the restock plan on the Stock page for the final numbers. When stock orders come up, use these quantities; never make up your own.`
        : "Polaris's restock numbers: nothing needs ordering for the next 5 weeks at the recent pace. Don't suggest your own order quantities.",
    );
  }
  const short = lines.filter((l) => l.daysOut >= 3);
  if (short.length) parts.push(`Sold out for part of the last 30 days, so demand was higher than sales show: ${short.map((l) => `${l.product.name} (${l.daysOut} days)`).join(", ")}.`);
  if (sum.low.length) parts.push(`Running low: ${sum.low.map((l) => `${l.product.name} (${l.onHand} left, ${daysText(l.daysLeft)})`).join(", ")}.`);
  if (sum.slow.length) {
    parts.push(
      `Slow sellers: ${sum.slow.map((l) => `${l.product.name} (${l.onHand} in stock, ${l.sold30} sold in 30 days; a discount over ${pct(l.margin.maxDiscount)} would sell at a loss)`).join(", ")}, ${fmt(sum.slowValue)} tied up.`,
    );
  }
  return parts.join(" ");
}
