import { monthKey } from "./money";
import type { Activity, MonthStats, Overhead, Product, RevenueReport, SalesChannel, TreasuryEntry } from "./types";

/** Full figures for one month ("YYYY-MM"). */
export function monthStats(entries: TreasuryEntry[], key: string): MonthStats {
  const inMonth = entries.filter((e) => e.date.startsWith(key));
  const sum = (list: TreasuryEntry[]) => list.reduce((s, e) => s + e.amount, 0);
  const group = (list: TreasuryEntry[], by: (e: TreasuryEntry) => string) => {
    const totals = new Map<string, number>();
    for (const e of list) totals.set(by(e), (totals.get(by(e)) ?? 0) + e.amount);
    return [...totals].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  };
  const incomeRows = inMonth.filter((e) => e.type === "income");
  const expenseRows = inMonth.filter((e) => e.type === "expense");
  const income = sum(incomeRows);
  const expenses = sum(expenseRows);
  const [y, m] = key.split("-").map(Number);
  return {
    key,
    label: new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    income,
    expenses,
    net: income - expenses,
    margin: income > 0 ? (income - expenses) / income : null,
    byCategory: group(expenseRows, (e) => e.category),
    byChannel: group(incomeRows, (e) => e.channel || "Not recorded"),
    transactions: inMonth.length,
  };
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Average daily sales in the 7 days before an activity vs the 7 days from its start.
 * Either side is null when it can't be judged: the week hasn't finished yet, or no sales at all
 * were logged in it (usually a logging gap, which would otherwise look like sales "dropping to zero").
 */
export function activityLift(entries: TreasuryEntry[], activity: Activity, today = new Date()) {
  const daily = (from: string, to: string) => {
    const sales = entries.filter((e) => e.type === "income" && e.date >= from && e.date <= to);
    return sales.length ? sales.reduce((s, e) => s + e.amount, 0) / 7 : null;
  };
  const before = daily(shiftDate(activity.date, -7), shiftDate(activity.date, -1));
  const end = shiftDate(activity.date, 6);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return { before, after: end <= todayIso ? daily(activity.date, end) : null };
}

/**
 * Sales used for level milestones: whichever is higher of what the user reported and what
 * they've logged in the Treasury. Taking the max (not the sum) avoids counting a sale twice.
 */
export function effectiveRevenue(reported: RevenueReport, entries: TreasuryEntry[]): RevenueReport {
  let lifetime = 0;
  const byMonth = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "income") continue;
    lifetime += e.amount;
    const k = e.date.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + e.amount);
  }
  return {
    lifetime: Math.max(reported.lifetime, lifetime),
    bestMonth: Math.max(reported.bestMonth, ...byMonth.values(), 0),
    updatedAt: reported.updatedAt,
  };
}

/** The first day of the month `offset` months from `ref`. */
export function addMonths(ref: Date, offset: number) {
  return new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
}

export interface MonthSummary {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

/** Totals for the `count` months ending with `end` (oldest first). */
export function monthSeries(entries: TreasuryEntry[], end: Date, count: number): MonthSummary[] {
  const months = Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1));
  return months.map((d) => {
    const key = monthKey(d);
    let income = 0;
    let expenses = 0;
    for (const e of entries) {
      if (!e.date.startsWith(key)) continue;
      if (e.type === "income") income += e.amount;
      else expenses += e.amount;
    }
    return { key, label: d.toLocaleDateString(undefined, { month: "short" }), income, expenses, net: income - expenses };
  });
}

/** Expense totals per category for one month, largest first. */
export function expensesByCategory(entries: TreasuryEntry[], key: string) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type === "expense" && e.date.startsWith(key)) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

/** Margins below this are called "thin": a rough rule of thumb, stated as such wherever it's shown. */
export const THIN_MARGIN = 0.15;

/** Profit on one unit of `product` sold through `channel`, after the channel's fees. */
export function unitProfit(product: Product, channel: Pick<SalesChannel, "feePercent" | "feeFixed">) {
  const fees = (product.price * channel.feePercent) / 100 + channel.feeFixed;
  const profit = product.price - product.unitCost - fees;
  return { fees, profit, margin: product.price > 0 ? profit / product.price : 0 };
}

export function totalOverheads(overheads: Overhead[]) {
  return overheads.reduce((sum, o) => sum + o.amount, 0);
}

/** Average monthly sales over the last `months` full or partial months that have any income. */
export function averageMonthlySales(entries: TreasuryEntry[], months = 3, ref = new Date()) {
  const series = monthSeries(entries, ref, months).filter((m) => m.income > 0);
  return series.length ? series.reduce((s, m) => s + m.income, 0) / series.length : 0;
}

/** Months the cash lasts at the average loss of recent months. Null when the business isn't losing money. */
export function runwayMonths(cash: number, entries: TreasuryEntry[], ref = new Date()) {
  const recent = monthSeries(entries, ref, 3).filter((m) => m.income > 0 || m.expenses > 0);
  if (!recent.length) return null;
  const avgNet = recent.reduce((s, m) => s + m.net, 0) / recent.length;
  return avgNet < 0 ? cash / -avgNet : null;
}
