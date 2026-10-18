// Your Week: the last 7 days in numbers, the problems most worth the owner's attention, and how
// last week's problems look now. It's worked out from their own records, with no AI, so it's
// instant, free, and only ever says what the numbers show.
//
// It's a guide, not a boss: each problem says what's going on, why it matters in money, and a few
// options. The owner decides what, if anything, to do.

import { upcomingEvents, type CalendarEvent } from "./calendar";
import { expensesByCategory, runwayMonths } from "./finance";
import { daysText, feeMix, marginHealth, stockLines, stockSummary, unitMoney, type StockLine } from "./inventory";
import { formatMoney, monthKey } from "./money";
import type { BusinessProfile, Mission, Product, SalesChannel, StockMove, TreasuryEntry } from "./types";

export type WeekTone = "alert" | "caution" | "good" | "info";

export interface WeekPriority {
  id: string;
  tone: WeekTone;
  /** What's going on, said as a fact: "Tailored blazer is sold out". */
  title: string;
  /** Why it matters, in the owner's own numbers. */
  why: string;
  /** A few things they could do. None is picked for them. */
  options: string[];
  /** Where the numbers behind it are. */
  href: string;
  /** False for things that aren't problems: a coming sale day, a mission ready to report, a next step. */
  problem: boolean;
  /** The number behind it, for comparing next week (e.g. money tied up in a slow seller). */
  measure?: number;
}

/** One of last week's problems, and how it looks now. */
export interface WeekFollowUp {
  id: string;
  /** How it was described a week ago. */
  then: string;
  now: string;
  verdict: "solved" | "better" | "same" | "worse";
}

export interface YourWeek {
  /** "12–18 October" */
  label: string;
  /** Money in for the last four weeks, oldest first, labelled by the day each starts. */
  weeks: { label: string; income: number }[];
  income: number;
  expenses: number;
  net: number;
  /** The 7 days before, when anything was logged in them. */
  prev: { income: number; expenses: number; net: number } | null;
  topChannel: { name: string; amount: number } | null;
  /** The product that made the most profit this week, from the stock records. */
  bestSeller: { name: string; sold: number; profit: number; each: number } | null;
  /** At most three, most pressing first. */
  priorities: WeekPriority[];
  /** The biggest problems a week ago and how each looks now; empty without enough history. */
  lastWeek: WeekFollowUp[];
  /** Sale days and festivals in the next two weeks. */
  coming: (CalendarEvent & { daysAway: number })[];
  headline: string;
}

interface Input {
  entries: TreasuryEntry[];
  missions: Mission[];
  products: Product[];
  channels: SalesChannel[];
  stockMoves: StockMove[];
  cashOnHand: number | null;
  profile: Pick<BusinessProfile, "currency" | "country">;
}

/** What each kind of priority is about: no more than two of the three may be about one thing. */
type Area = "stock" | "money" | "sales" | "missions" | "records";
type Found = WeekPriority & { score: number; area: Area };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const WORDS = ["No problems", "One problem", "Two problems", "Three problems"];

function rangeLabel(from: Date, to: Date) {
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric" });
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: "long" });
  return from.getMonth() === to.getMonth() ? `${day(from)}–${day(to)} ${month(to)}` : `${day(from)} ${month(from)} – ${day(to)} ${month(to)}`;
}

/** The shop as it looked on a day: stock lines, cash runway and this month's costs. */
function snapshot(input: Input, today: Date) {
  const mix = feeMix(input.channels, input.entries, today);
  const lines = stockLines(input.products, input.stockMoves, mix, today);
  const month = monthKey(today);
  const all = expensesByCategory(input.entries, month);
  return {
    lines,
    summary: stockSummary(lines),
    runway: input.cashOnHand === null ? null : runwayMonths(input.cashOnHand, input.entries, today),
    // Buying stock is expected to be the biggest cost, so it's left out of the comparison.
    costs: all.filter((c) => c.category !== "Ingredients / stock"),
    spent: all.reduce((s, c) => s + c.amount, 0),
    latest: input.entries.reduce((d, e) => (e.date > d ? e.date : d), ""),
  };
}

/** Everything worth a look on `today`, scored. */
function findAll(input: Input, today: Date): Found[] {
  const { lines, summary, runway, costs, spent, latest } = snapshot(input, today);
  const fmt = (n: number) => formatMoney(n, input.profile.currency, { compact: true });
  const unit = (n: number, l: StockLine) => unitMoney(n, input.profile.currency, l.product.price);
  const pace = (l: StockLine) => `${Math.round(l.perDay * 7 * 10) / 10} a week`;
  const found: Found[] = [];
  const from = iso(shift(today, -6));

  for (const l of lines.filter((x) => marginHealth(x.margin) === "loss" && (x.sold30 > 0 || x.status !== "untracked")).slice(0, 1)) {
    found.push({
      id: `loss-${l.product.id}`,
      score: 95,
      area: "stock",
      tone: "alert",
      problem: true,
      title: `${l.product.name} sells at a loss`,
      why: `Each one loses ${unit(-l.margin.profit, l)} once its cost and platform fees are paid, so selling more of it only loses more.`,
      options: ["Raise its price", "Find a cheaper supplier, or cut what goes into it", "Stop restocking it and sell what's left"],
      href: "/stock",
    });
  }

  const soldOut = summary.out.filter((l) => l.perDay > 0 && l.margin.profit > 0).sort((a, b) => b.perDay * b.margin.profit - a.perDay * a.margin.profit);
  if (soldOut.length) {
    const l = soldOut[0];
    const missed = l.perDay * 7 * l.margin.profit;
    found.push({
      id: `out-${l.product.id}`,
      score: 85 + Math.min(10, missed / 100),
      area: "stock",
      tone: "alert",
      problem: true,
      title: `${l.product.name} is sold out`,
      why: `It was selling about ${pace(l)}, so that's roughly ${fmt(missed)} of profit a week you're not making.${soldOut.length > 1 ? ` ${soldOut.length - 1} more ${soldOut.length === 2 ? "is" : "are"} sold out too.` : ""}`,
      options: ["Reorder it", "Point customers to a similar piece meanwhile", "Take pre-orders until it's back"],
      href: "/stock",
    });
  }

  if (runway !== null && runway < 3) {
    const months = runway < 1 ? "under a month" : `about ${runway.toFixed(1)} months`;
    found.push({
      id: "runway",
      score: runway < 2 ? 92 : 82,
      area: "money",
      tone: runway < 2 ? "alert" : "caution",
      problem: true,
      title: `Cash covers ${months}`,
      why: `At the losses of recent months, the cash in the bank runs out in ${months}.`,
      options: ["Pause or cut a cost", "Push sales of the products that earn the most", "Slow down how much stock you buy"],
      href: "/treasury",
    });
  }

  const soon = upcomingEvents(iso(today), 10, input.profile.country ?? "")[0];
  if (soon) {
    const [y, m, d] = soon.date.split("-").map(Number);
    const daysAway = Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
    found.push({
      id: `event-${soon.date}`,
      score: 78 - daysAway,
      area: "sales",
      tone: "info",
      problem: false,
      title: `${soon.name} is ${daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`}`,
      why: "Shops usually get busier around days like this, so anything you'd want ready, like stock or a post, needs to be ready before then.",
      options: ["Check your stock covers it", "Plan what you'll post or offer", "Let it pass if it doesn't suit your shop"],
      href: "/studio",
    });
  }

  const low = summary.low.filter((l) => l.daysLeft !== null && l.daysLeft < 10).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  if (low) {
    found.push({
      id: `low-${low.product.id}`,
      score: 74,
      area: "stock",
      tone: "caution",
      problem: true,
      title: `${low.product.name} is running low`,
      why: `${low.onHand} left, enough for ${daysText(low.daysLeft)} at the recent pace of ${pace(low)}.`,
      options: ["Reorder before it runs out", "Let it sell out if you're winding it down"],
      href: "/stock",
    });
  }

  if (!input.entries.length || latest < from) {
    found.push({
      id: "records",
      score: 70,
      area: "records",
      tone: "caution",
      problem: true,
      title: input.entries.length ? "Nothing logged this week" : "No sales logged yet",
      why: input.entries.length
        ? `Nothing's logged since ${new Date(`${latest}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" })}, so this picture of your shop is out of date.`
        : "Polaris works from what you log, so it can't see how the shop is doing yet.",
      options: ["Log this week's sales and costs", "Import a bank statement"],
      href: "/treasury?tab=sheet",
    });
  }

  const open = input.missions.filter((m) => m.status !== "done");
  const ready = open.find((m) => m.steps.length > 0 && m.steps.every((s) => s.done));
  if (ready) {
    found.push({
      id: `report-${ready.id}`,
      score: 65,
      area: "missions",
      tone: "good",
      problem: false,
      title: `"${ready.title}" is ready to report`,
      why: `Every step is done. Telling Polaris how it went earns ${ready.xp} XP and shows whether it worked.`,
      options: [],
      href: "/missions",
    });
  }

  if (costs[0] && spent > 0 && costs[0].amount / spent >= 0.35) {
    const share = Math.round((costs[0].amount / spent) * 100);
    found.push({
      id: `cost-${costs[0].category}`,
      score: 55,
      area: "money",
      tone: "caution",
      problem: true,
      title: `${costs[0].category} is ${share}% of this month's spending`,
      why: `${fmt(costs[0].amount)} so far this month, the biggest cost after stock.`,
      options: ["Check what it's bringing back", "Trim or pause part of it", "Keep it if it's paying for itself"],
      href: "/treasury",
    });
  }

  const still = summary.slow.filter((l) => l.value > 0).sort((a, b) => b.value - a.value)[0];
  if (still) {
    const off = Math.floor(still.margin.maxDiscount * 100);
    found.push({
      id: `slow-${still.product.id}`,
      score: 50,
      area: "stock",
      tone: "caution",
      problem: true,
      measure: still.value,
      title: `${still.product.name} is selling slowly`,
      why: `${fmt(still.value)} of your money is sitting in ${still.onHand} of them, with ${still.sold30} sold in 30 days.`,
      options: ["Bundle it with a best seller", off >= 5 ? `Discount it: anything under ${off}% off still covers its cost and fees` : "A small discount", "Stop reordering it"],
      href: "/stock",
    });
  }

  const working = open.find((m) => m !== ready && m.steps.some((s) => s.done) && m.steps.some((s) => !s.done)) ?? open.find((m) => m !== ready && m.steps.some((s) => !s.done));
  const step = working?.steps.find((s) => !s.done);
  if (working && step) {
    found.push({
      id: `step-${working.id}`,
      score: 30,
      area: "missions",
      tone: "info",
      problem: false,
      title: `Next step: ${step.text}`,
      why: `In your mission "${working.title}".`,
      options: [],
      href: "/missions",
    });
  }

  return found.sort((a, b) => b.score - a.score);
}

/** The top three, no more than two about the same thing. */
function pickTop(found: Found[]): WeekPriority[] {
  const picked: WeekPriority[] = [];
  const perArea = new Map<Area, number>();
  for (const f of found) {
    if (picked.length === 3) break;
    if ((perArea.get(f.area) ?? 0) >= 2) continue;
    perArea.set(f.area, (perArea.get(f.area) ?? 0) + 1);
    picked.push({ id: f.id, tone: f.tone, title: f.title, why: f.why, options: f.options, href: f.href, problem: f.problem, measure: f.measure });
  }
  return picked;
}

/**
 * The shop a week ago, rebuilt from its own history: stock put back to what it was before the
 * last 7 days' restocks and sales, records and cash up to that day. Null when there's no history.
 */
function weekAgo(input: Input, today: Date): Input | null {
  const then = iso(shift(today, -7));
  const entries = input.entries.filter((e) => e.date <= then);
  const stockMoves = input.stockMoves.filter((m) => m.date <= then);
  if (!entries.length && !stockMoves.length) return null;
  const after = input.stockMoves.filter((m) => m.date > then);
  const products = input.products.map((p) => {
    if (p.stock === undefined) return p;
    // Not tracked yet a week ago: its first stock record came later.
    if (!stockMoves.some((m) => m.productId === p.id) && after.some((m) => m.productId === p.id)) return { ...p, stock: undefined };
    return { ...p, stock: Math.max(0, p.stock - after.filter((m) => m.productId === p.id).reduce((s, m) => s + m.qty, 0)) };
  });
  const sinceNet = input.entries.filter((e) => e.date > then).reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
  return { ...input, entries, stockMoves, products, cashOnHand: input.cashOnHand === null ? null : input.cashOnHand - sinceNet };
}

/** How each of last week's problems looks today. */
function followUp(then: WeekPriority[], input: Input, today: Date): WeekFollowUp[] {
  const now = snapshot(input, today);
  const fmt = (n: number) => formatMoney(n, input.profile.currency, { compact: true });
  const line = (id: string) => now.lines.find((l) => l.product.id === id);
  const from = iso(shift(today, -6));
  return then.map((p): WeekFollowUp => {
    const [kind, ...rest] = p.id.split("-");
    const key = rest.join("-");
    const base = { id: p.id, then: p.title };
    const l = line(key);
    switch (kind) {
      case "loss":
        if (!l) return { ...base, now: "No longer on your product list.", verdict: "solved" };
        return l.margin.profit > 0
          ? { ...base, now: `Now makes ${unitMoney(l.margin.profit, input.profile.currency, l.product.price)} on each sale.`, verdict: "solved" }
          : { ...base, now: "Still sells at a loss.", verdict: "same" };
      case "out":
        if (!l) return { ...base, now: "No longer on your product list.", verdict: "solved" };
        return l.onHand > 0 ? { ...base, now: `Back in stock: ${l.onHand} on the shelf.`, verdict: "solved" } : { ...base, now: "Still sold out.", verdict: "same" };
      case "low":
        if (!l) return { ...base, now: "No longer on your product list.", verdict: "solved" };
        if (l.status === "out") return { ...base, now: "It ran out.", verdict: "worse" };
        return l.status === "low" ? { ...base, now: `${l.onHand} left, about ${daysText(l.daysLeft)}.`, verdict: "same" } : { ...base, now: `Restocked: ${l.onHand} on the shelf.`, verdict: "solved" };
      case "slow": {
        if (!l || l.status !== "slow") return { ...base, now: "It's selling at a normal pace again.", verdict: "solved" };
        const less = p.measure !== undefined && l.value < p.measure;
        return { ...base, now: `${fmt(l.value)} still tied up in it${less ? `, down from ${fmt(p.measure!)}` : ""}.`, verdict: less ? "better" : "same" };
      }
      case "runway":
        return now.runway === null || now.runway >= 3
          ? { ...base, now: "Cash isn't running down at the recent pace.", verdict: "solved" }
          : { ...base, now: `Cash covers about ${now.runway.toFixed(1)} months.`, verdict: "same" };
      case "records":
        return now.latest >= from ? { ...base, now: "Sales are logged again.", verdict: "solved" } : { ...base, now: "Still nothing logged.", verdict: "same" };
      case "cost": {
        const c = now.costs.find((x) => x.category === key);
        const share = c && now.spent > 0 ? Math.round((c.amount / now.spent) * 100) : 0;
        return share >= 35 ? { ...base, now: `Now ${share}% of this month's spending.`, verdict: "same" } : { ...base, now: `Down to ${share}% of this month's spending.`, verdict: "solved" };
      }
      default:
        return { ...base, now: "", verdict: "same" };
    }
  });
}

export function yourWeek(input: Input, today = new Date()): YourWeek {
  const currency = input.profile.currency;
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const to = iso(today);
  const from = iso(shift(today, -6));
  const prevFrom = iso(shift(today, -13));

  // Money: this week and the week before, and money in for the last four weeks.
  const weeks = [3, 2, 1, 0].map((back) => {
    const start = shift(today, -6 - back * 7);
    return { from: iso(start), to: iso(shift(start, 6)), label: start.toLocaleDateString(undefined, { day: "numeric", month: "short" }), income: 0 };
  });
  let income = 0;
  let expenses = 0;
  let prevIncome = 0;
  let prevExpenses = 0;
  let prevAny = false;
  const byChannel = new Map<string, number>();
  for (const e of input.entries) {
    if (e.type === "income") {
      const week = weeks.find((w) => e.date >= w.from && e.date <= w.to);
      if (week) week.income += e.amount;
    }
    if (e.date >= from && e.date <= to) {
      if (e.type === "income") {
        income += e.amount;
        if (e.channel) byChannel.set(e.channel, (byChannel.get(e.channel) ?? 0) + e.amount);
      } else expenses += e.amount;
    } else if (e.date >= prevFrom && e.date < from) {
      prevAny = true;
      if (e.type === "income") prevIncome += e.amount;
      else prevExpenses += e.amount;
    }
  }
  const [top] = [...byChannel.entries()].sort((a, b) => b[1] - a[1]);

  // The week's best seller, by the profit it made.
  const { lines } = snapshot(input, today);
  const soldBy = new Map<string, number>();
  for (const m of input.stockMoves) if (m.kind === "sold" && m.date >= from && m.date <= to) soldBy.set(m.productId, (soldBy.get(m.productId) ?? 0) - m.qty);
  const best = lines
    .map((l) => ({ l, sold: soldBy.get(l.product.id) ?? 0 }))
    .filter((x) => x.sold > 0)
    .sort((a, b) => b.sold * b.l.margin.profit - a.sold * a.l.margin.profit)[0];

  const priorities = pickTop(findAll(input, today));

  // Last week's three biggest problems, and how each looks now.
  const past = weekAgo(input, today);
  const lastWeek = past ? followUp(pickTop(findAll(past, shift(today, -7)).filter((f) => f.problem)), input, today) : [];

  const coming = upcomingEvents(to, 14, input.profile.country ?? "").map((e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    const daysAway = Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
    return { ...e, daysAway };
  });

  const change = prevAny && prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;
  const money = income
    ? `${fmt(income)} came in this week${change ? `, ${change > 0 ? "up" : "down"} ${Math.abs(change)}% on the week before` : ""}.`
    : "No sales logged this week yet.";
  const problems = priorities.filter((p) => p.problem).length;
  const needs = problems ? `${WORDS[problems]} worth a look.` : "No problems stand out.";

  return {
    label: rangeLabel(shift(today, -6), today),
    weeks: weeks.map(({ label, income: amount }) => ({ label, income: amount })),
    income,
    expenses,
    net: income - expenses,
    prev: prevAny ? { income: prevIncome, expenses: prevExpenses, net: prevIncome - prevExpenses } : null,
    topChannel: top ? { name: top[0], amount: top[1] } : null,
    bestSeller: best ? { name: best.l.product.name, sold: best.sold, profit: best.sold * best.l.margin.profit, each: best.l.margin.profit } : null,
    priorities,
    lastWeek,
    coming,
    headline: `${money} ${needs}`,
  };
}
