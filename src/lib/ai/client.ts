import {
  activityLift,
  addMonths,
  effectiveRevenue,
  expensesByCategory,
  monthSeries,
  monthStats,
  runwayMonths,
  totalOverheads,
  unitProfit,
} from "@/lib/finance";
import { todayIso } from "@/lib/inputs";
import { feeMix, planIsCurrent, stockFacts, stockLines } from "@/lib/inventory";
import { levelInfo } from "@/lib/levels";
import { formatMoney, monthKey } from "@/lib/money";
import { newId, uncoveredFoundations, usePolaris } from "@/lib/store";
import type { StudioOutput, StudioTool } from "@/lib/studio";
import type { Mission, MonthlyReport, TreasuryEntry } from "@/lib/types";
import type { BusinessFacts, MissionMode } from "./prompts";
import type { GeneratedMission, MissionReview, MoneyReview, MonthReportText, ParsedTransaction, RestockPlan } from "./shared";

export class AiError extends Error {}

async function errorFrom(res: Response) {
  try {
    const data = await res.json();
    return new AiError(data.error ?? "Something went wrong.");
  } catch {
    return new AiError("Something went wrong. Check your connection and try again.");
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

type State = ReturnType<typeof usePolaris.getState>;

/** Reported numbers, sales, level and money, so every AI call knows where the business stands. */
export function businessFacts(state: State): BusinessFacts {
  const revenue = effectiveRevenue(state.revenue, state.entries);
  const lvl = levelInfo(state.xp, revenue, state.profile.currency);
  return {
    insights: state.insights.map(({ label, value }) => ({ label, value })),
    revenue: revenue.lifetime > 0 || state.revenue.updatedAt ? revenue : undefined,
    level: `Level ${lvl.level} (${lvl.title})${lvl.nextGate ? `. Next level needs ${lvl.nextGate}.` : "."}`,
    money: moneySummary(state) || undefined,
    today: todayIso(),
  };
}

/** Plain-text Treasury summary for the AI: recent months, margins, overheads and cash. */
export function moneySummary(state: State) {
  const c = state.profile.currency;
  const fmt = (n: number) => formatMoney(n, c, { compact: true });
  const lines: string[] = [];

  const months = monthSeries(state.entries, new Date(), 6).filter((m) => m.income || m.expenses);
  if (months.length) {
    lines.push(`Monthly money in / out / net: ${months.map((m) => `${m.label} ${fmt(m.income)} / ${fmt(m.expenses)} / ${fmt(m.net)}`).join("; ")}`);
    const top = expensesByCategory(state.entries, months[months.length - 1].key).slice(0, 4);
    if (top.length) lines.push(`Biggest expenses this month: ${top.map((t) => `${t.category} ${fmt(t.amount)}`).join(", ")}`);
  }
  if (state.products.length) {
    lines.push(
      `Profit per unit after platform fees: ${state.products
        .slice(0, 8)
        .map((p) => `${p.name} (price ${fmt(p.price)}, cost ${fmt(p.unitCost)}): ${state.channels.map((ch) => `${ch.name} ${Math.round(unitProfit(p, ch).margin * 100)}%`).join(", ")}`)
        .join("; ")}`,
    );
  }
  if (state.channels.some((ch) => ch.feePercent || ch.feeFixed)) {
    lines.push(`Sales platforms and fees: ${state.channels.map((ch) => `${ch.name} ${ch.feePercent}%${ch.feeFixed ? ` + ${fmt(ch.feeFixed)}/order` : ""}`).join(", ")}`);
  }
  if (state.overheads.length) {
    lines.push(`Fixed monthly overheads ${fmt(totalOverheads(state.overheads))}: ${state.overheads.map((o) => `${o.name} ${fmt(o.amount)}`).join(", ")}`);
  }
  if (state.cashOnHand !== null) {
    const runway = runwayMonths(state.cashOnHand, state.entries);
    lines.push(`Cash in the bank: ${fmt(state.cashOnHand)}${runway !== null ? ` (about ${runway.toFixed(1)} months of runway at the recent loss rate)` : ""}`);
  }
  // A restock plan from the last week still stands; older ones are out of date.
  const saved = state.restockPlan;
  const latest =
    saved && planIsCurrent(saved.at)
      ? {
          madeOn: new Date(saved.at).toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
          items: saved.plan.items,
          budget: saved.plan.cash?.budget?.items ?? null,
        }
      : null;
  const stock = stockFacts(state.products, state.stockMoves, feeMix(state.channels, state.entries), c, latest);
  if (stock) lines.push(stock);
  return lines.join("\n");
}

/** Lumi's restock plan for every product whose stock is tracked. */
export async function planRestock() {
  const state = usePolaris.getState();
  const products = stockLines(state.products, state.stockMoves, feeMix(state.channels, state.entries))
    .filter((l) => l.status !== "untracked")
    .map((l) => ({
      name: l.product.name,
      price: l.product.price,
      unitCost: l.product.unitCost,
      profit: l.margin.profit,
      maxDiscount: l.margin.maxDiscount,
      onHand: l.onHand,
      sold30: l.sold30,
      daysOut: l.daysOut,
      perDay: l.perDay,
    }));
  return postJson<RestockPlan>("/api/inventory/plan", {
    profile: state.profile,
    facts: businessFacts(state),
    products,
    cash: state.cashOnHand,
    fixedCosts: totalOverheads(state.overheads),
  });
}

/** Streams an advisor reply, calling onText with the full text so far. Resolves with the final text. */
export async function streamChat(opts: {
  messages: { role: "user" | "assistant"; content: string }[];
  page?: string;
  signal?: AbortSignal;
  onText: (textSoFar: string) => void;
}) {
  const state = usePolaris.getState();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: opts.messages,
      profile: state.profile,
      snapshot: buildSnapshot(state.missions),
      facts: businessFacts(state),
      page: opts.page,
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    opts.onText(text);
  }
  return text;
}

export async function generateMissions(opts: {
  mode: MissionMode;
  text?: string;
  source: Mission["source"];
}): Promise<Mission[]> {
  const state = usePolaris.getState();
  const lvl = levelInfo(state.xp, effectiveRevenue(state.revenue, state.entries), state.profile.currency);
  const { missions } = await postJson<{ missions: GeneratedMission[] }>("/api/missions", {
    mode: opts.mode,
    profile: state.profile,
    text: opts.text,
    existing: state.missions.map((m) => m.title),
    gaps: uncoveredFoundations(state.profile, state.missions),
    facts: businessFacts(state),
    nextGate: lvl.nextGate,
  });
  const now = new Date().toISOString();
  return missions.map((m) => ({
    id: newId(),
    title: m.title,
    description: m.description,
    category: m.category,
    xp: m.xp,
    status: "todo",
    steps: m.steps.map((text) => ({ id: newId(), text, done: false })),
    checkIn: m.checkIn.map((q) => ({ id: newId(), ...q })),
    foundations: m.foundations,
    source: opts.source,
    createdAt: now,
  }));
}

/** Sends a bank statement file to be read and categorised. The server doesn't keep it. */
export async function importStatement(file: File, month?: string) {
  const state = usePolaris.getState();
  const form = new FormData();
  form.append("file", file);
  const direct = state.channels.find((c) => c.feePercent === 0 && c.feeFixed === 0)?.name;
  form.append("meta", JSON.stringify({ currency: state.profile.currency, month, channels: state.channels.map((c) => c.name), direct }));
  const res = await fetch("/api/treasury/statement", { method: "POST", body: form });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { transactions: ParsedTransaction[] }).transactions;
}

type SheetRow = Pick<TreasuryEntry, "id" | "date" | "amount" | "type" | "category" | "channel"> & { description: string };

export function categoriseRows(rows: SheetRow[]) {
  const state = usePolaris.getState();
  return postJson<{ updates: { id: string; category?: string; channel?: string }[] }>("/api/treasury/sheet", {
    mode: "categorise",
    rows,
    channels: state.channels.map((c) => c.name),
    currency: state.profile.currency,
  });
}

export function checkSheet(rows: SheetRow[]) {
  const state = usePolaris.getState();
  return postJson<{ flags: { id: string; issue: string }[]; summary: string }>("/api/treasury/sheet", {
    mode: "check",
    rows,
    channels: state.channels.map((c) => c.name),
    currency: state.profile.currency,
  });
}

/** Builds the Month Wrapped story for `key` ("YYYY-MM"): figures computed here, narrative from Nemotron Ultra. */
export async function createMonthReport(key: string): Promise<MonthlyReport> {
  const state = usePolaris.getState();
  const c = state.profile.currency;
  const fmt = (n: number) => formatMoney(n, c);
  const [y, m] = key.split("-").map(Number);
  const end = new Date(y, m - 1, 1);

  const stats = monthStats(state.entries, key);
  const prevKey = monthKey(addMonths(end, -1));
  const prevStats = monthStats(state.entries, prevKey);
  const previous = prevStats.transactions ? prevStats : null;
  const history = monthSeries(state.entries, end, 6).map(({ key: k, label, income, expenses, net }) => ({ key: k, label, income, expenses, net }));
  const overheads = totalOverheads(state.overheads);

  const relevant = state.activities
    .filter((a) => a.date.startsWith(key) || a.date.startsWith(prevKey))
    .sort((a, b) => a.date.localeCompare(b.date));
  const lifts = new Map(relevant.map((a) => [a.id, activityLift(state.entries, a)]));

  const text = [
    `MONTH: ${stats.label}. Money in ${fmt(stats.income)}, money out ${fmt(stats.expenses)}, net ${fmt(stats.net)}${stats.margin !== null ? `, margin ${Math.round(stats.margin * 100)}%` : ""}. ${stats.transactions} transactions.`,
    stats.byChannel.length && `Sales by platform: ${stats.byChannel.map((x) => `${x.name} ${fmt(x.amount)}`).join(", ")}.`,
    stats.byCategory.length && `Spending by category: ${stats.byCategory.map((x) => `${x.name} ${fmt(x.amount)}`).join(", ")}.`,
    previous &&
      `LAST MONTH (${previous.label}): in ${fmt(previous.income)}, out ${fmt(previous.expenses)}, net ${fmt(previous.net)}. Platforms: ${previous.byChannel.map((x) => `${x.name} ${fmt(x.amount)}`).join(", ") || "none"}. Spending: ${previous.byCategory.map((x) => `${x.name} ${fmt(x.amount)}`).join(", ") || "none"}.`,
    `LAST 6 MONTHS (oldest first): ${history.map((h) => `${h.label} in ${fmt(h.income)} / out ${fmt(h.expenses)} / net ${fmt(h.net)}`).join("; ")}.`,
    overheads && `FIXED OVERHEADS: ${fmt(overheads)} a month (${state.overheads.map((o) => `${o.name} ${fmt(o.amount)}`).join(", ")}).`,
    relevant.length
      ? `ACTIVITIES (this month and last):\n${relevant
          .map((a) => {
            const l = lifts.get(a.id)!;
            const side = (v: number | null, why: string) => (v === null ? why : fmt(v));
            return `- id ${a.id} | ${a.date} | ${a.kind} | ${a.title}${a.cost ? ` | cost ${fmt(a.cost)}` : ""} | avg daily sales 7 days before ${side(l.before, "no sales logged (not enough data)")}, 7 days after ${side(l.after, "not enough data yet")}`;
          })
          .join("\n")}`
      : "ACTIVITIES: none recorded this month or last.",
  ]
    .filter(Boolean)
    .join("\n");

  const story = await postJson<MonthReportText>("/api/treasury/month-report", {
    profile: state.profile,
    facts: businessFacts(state),
    month: text,
  });

  const verdicts = new Map(story.activities.map((a) => [a.activityId, a]));
  return {
    month: key,
    createdAt: new Date().toISOString(),
    stats,
    previous,
    history,
    overheads,
    headline: story.headline,
    stories: story.stories,
    activities: relevant.map((a) => ({
      activityId: a.id,
      title: a.title,
      kind: a.kind,
      date: a.date,
      verdict: verdicts.get(a.id)?.verdict ?? "no clear effect",
      explanation: verdicts.get(a.id)?.explanation ?? "",
      before: lifts.get(a.id)?.before ?? null,
      after: lifts.get(a.id)?.after ?? null,
    })),
    problems: story.problems,
    closing: story.closing,
  };
}

export function generateStudio(tool: StudioTool, input: Record<string, unknown>) {
  const state = usePolaris.getState();
  return postJson<StudioOutput>("/api/studio", { tool, input, profile: state.profile, facts: businessFacts(state) });
}

export async function reviewMoney() {
  const state = usePolaris.getState();
  return postJson<MoneyReview>("/api/treasury/review", { profile: state.profile, facts: businessFacts(state) });
}

export async function reviewMission(mission: Mission, answers: { question: string; answer: string }[]) {
  const state = usePolaris.getState();
  return postJson<MissionReview>("/api/missions/review", {
    mission: { title: mission.title, description: mission.description, steps: mission.steps.map((s) => s.text) },
    answers,
    profile: state.profile,
    facts: businessFacts(state),
  });
}

/** Plain-text summary of the user's progress, so the advisor knows where they stand. */
export function buildSnapshot(missions: Mission[]) {
  const open = missions.filter((m) => m.status !== "done");
  const done = missions.filter((m) => m.status === "done");
  return [
    `Missions completed: ${done.length}${done.length ? ` (latest: ${done.slice(-3).map((m) => m.title).join("; ")})` : ""}.`,
    open.length
      ? `Open missions: ${open
          .slice(0, 8)
          .map((m) => `${m.title} (${m.steps.filter((s) => s.done).length}/${m.steps.length} steps)`)
          .join("; ")}.`
      : "No open missions.",
  ].join("\n");
}
