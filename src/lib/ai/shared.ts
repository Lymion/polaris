import type { CheckInKind, Foundation, MissionCategory } from "@/lib/types";

// Shared by the server prompts and the client UI. No server-only imports here.

export const MISSION_CATEGORIES: MissionCategory[] = ["legal", "operations", "finance", "sales", "marketing", "branding"];

export const FOUNDATION_IDS: Foundation[] = [
  "registered",
  "licenses",
  "bank",
  "bookkeeping",
  "suppliers",
  "pricing",
  "brand",
  "online",
];

const CHECKIN_KINDS: CheckInKind[] = ["number", "percent", "money", "text"];

export const AREA_PREFIX = "AREA:";

export interface GeneratedMission {
  title: string;
  description: string;
  category: MissionCategory;
  xp: number;
  steps: string[];
  checkIn: { question: string; kind: CheckInKind }[];
  foundations: Foundation[];
}

function isCategory(v: unknown): v is MissionCategory {
  return typeof v === "string" && (MISSION_CATEGORIES as string[]).includes(v);
}

function strings(v: unknown, max: number, maxLen: number) {
  return Array.isArray(v)
    ? v
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, maxLen))
        .slice(0, max)
    : [];
}

/**
 * Validates and cleans missions returned by the model. Drops anything unusable.
 * `allowedFoundations` limits which basics a mission may claim, so the model can't
 * create a second "register your business" mission for a gap that's already covered.
 */
export function sanitizeMissions(raw: unknown, allowedFoundations: Foundation[] = []): GeneratedMission[] {
  const list = (raw as { missions?: unknown })?.missions;
  if (!Array.isArray(list)) return [];
  const claimed = new Set<Foundation>();
  return list
    .map((m): GeneratedMission | null => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim().slice(0, 80) : "";
      if (!title) return null;
      const xp = Math.round(Number(o.xp) / 5) * 5;
      const category = typeof o.category === "string" ? o.category.toLowerCase().split(/[^a-z]/)[0] : "";

      const checkIn = (Array.isArray(o.checkIn) ? o.checkIn : [])
        .map((q) => {
          const r = (q ?? {}) as Record<string, unknown>;
          const question = typeof r.question === "string" ? r.question.trim().slice(0, 160) : "";
          const kind = CHECKIN_KINDS.includes(r.kind as CheckInKind) ? (r.kind as CheckInKind) : "text";
          return question ? { question, kind } : null;
        })
        .filter((q): q is { question: string; kind: CheckInKind } => q !== null)
        .slice(0, 3);

      const foundations = strings(o.foundations, 3, 20).filter(
        (f): f is Foundation => allowedFoundations.includes(f as Foundation) && !claimed.has(f as Foundation),
      );
      foundations.forEach((f) => claimed.add(f));

      return {
        title,
        description: typeof o.description === "string" ? o.description.trim().slice(0, 240) : "",
        category: isCategory(category) ? category : "operations",
        xp: Number.isFinite(xp) ? Math.min(250, Math.max(25, xp)) : 100,
        steps: strings(o.steps, 6, 220),
        checkIn,
        foundations,
      };
    })
    .filter((m): m is GeneratedMission => m !== null)
    .slice(0, 6);
}

/**
 * Lumi's restock plan: how many of each product to order now and why, with what the order costs
 * and the profit it makes once sold. Orders come first, best return on the money spent first.
 */
export interface RestockPlan {
  summary: string;
  items: { product: string; order: number; why: string; cost: number; profit: number }[];
  watch: string;
  /** The order against the cash in the bank; null when the cash isn't known or nothing's ordered. */
  cash: {
    /** Kept back first: a month of fixed costs. */
    reserve: number;
    /** What's left for stock. */
    spendable: number;
    /** How long the ordered products' sales take to bring the order's cost back. */
    paybackWeeks: number | null;
    /** When the plan costs more than `spendable`: the order that fits, best return first. */
    budget: { items: { product: string; order: number }[]; cost: number; profit: number } | null;
  } | null;
}

/** The AI's judgement for a restock plan: a coming event and its lift, and ideas for slow sellers. */
export interface RestockJudgement {
  event: string;
  /** Extra demand over the next 5 weeks, in percent (0 to 60). */
  uplift: number;
  why: string;
  clear: Map<string, string>;
  watch: string;
}

export function sanitizeRestockJudgement(raw: unknown, products: string[]): RestockJudgement | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const uplift = Number(o.uplift);
  const event = text(o.event, 80);
  const known = new Map(products.map((p) => [p.toLowerCase(), p]));
  const clear = new Map<string, string>();
  for (const c of Array.isArray(o.clear) ? o.clear : []) {
    const r = (c ?? {}) as Record<string, unknown>;
    const product = typeof r.product === "string" ? known.get(r.product.trim().toLowerCase()) : undefined;
    const idea = text(r.idea, 240);
    if (product && idea) clear.set(product, idea);
  }
  return {
    event,
    // No event, no lift; and keep any lift modest whatever the model says.
    uplift: event && Number.isFinite(uplift) ? Math.min(60, Math.max(0, Math.round(uplift))) : 0,
    why: text(o.why, 240),
    clear,
    watch: text(o.watch, 240),
  };
}

export interface MoneyReview {
  score: number;
  headline: string;
  strengths: string[];
  issues: { title: string; detail: string; severity: "fix" | "watch" }[];
  actions: string[];
}

export function sanitizeMoneyReview(raw: unknown): MoneyReview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const headline = typeof o.headline === "string" ? o.headline.trim().slice(0, 200) : "";
  const score = Math.round(Number(o.score));
  if (!headline || !Number.isFinite(score)) return null;
  const issues = (Array.isArray(o.issues) ? o.issues : [])
    .map((i) => {
      const r = (i ?? {}) as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.trim().slice(0, 100) : "";
      const detail = typeof r.detail === "string" ? r.detail.trim().slice(0, 400) : "";
      return title ? { title, detail, severity: r.severity === "fix" ? ("fix" as const) : ("watch" as const) } : null;
    })
    .filter((i): i is MoneyReview["issues"][number] => i !== null)
    .slice(0, 6);
  return {
    score: Math.min(100, Math.max(0, score)),
    headline,
    strengths: strings(o.strengths, 4, 200),
    issues,
    actions: strings(o.actions, 5, 240),
  };
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  channel: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Cleans transactions from the statement reader; categories outside the allowed lists become "Other". */
export function sanitizeTransactions(raw: unknown, income: string[], expense: string[], channels: string[]): ParsedTransaction[] {
  const list = (raw as { transactions?: unknown })?.transactions;
  if (!Array.isArray(list)) return [];
  return list
    .map((t): ParsedTransaction | null => {
      const o = (t ?? {}) as Record<string, unknown>;
      const amount = Math.abs(Number(o.amount));
      const date = typeof o.date === "string" ? o.date.trim() : "";
      if (!Number.isFinite(amount) || amount === 0 || !ISO_DATE.test(date)) return null;
      const type = o.type === "income" ? "income" : "expense";
      const allowed = type === "income" ? income : expense;
      const category = typeof o.category === "string" && allowed.includes(o.category) ? o.category : type === "income" ? "Other income" : "Other";
      const channel = type === "income" && typeof o.channel === "string" && channels.includes(o.channel) ? o.channel : "";
      return {
        date,
        description: typeof o.description === "string" ? o.description.trim().slice(0, 120) : "",
        amount: Math.round(amount * 100) / 100,
        type,
        category,
        channel,
      };
    })
    .filter((t): t is ParsedTransaction => t !== null)
    .slice(0, 500);
}

export interface MonthReportText {
  headline: string;
  stories: { sales: string; costs: string; overheads: string; profit: string };
  activities: { activityId: string; verdict: "boosted" | "no clear effect" | "hurt" | "too early"; explanation: string }[];
  problems: { title: string; rootCause: string; evidence: string }[];
  closing: string;
}

const VERDICTS = ["boosted", "no clear effect", "hurt", "too early"] as const;

export function sanitizeMonthReport(raw: unknown): MonthReportText | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const headline = s(o.headline, 160);
  const st = (o.stories ?? {}) as Record<string, unknown>;
  if (!headline) return null;
  return {
    headline,
    stories: { sales: s(st.sales, 400), costs: s(st.costs, 400), overheads: s(st.overheads, 400), profit: s(st.profit, 400) },
    activities: (Array.isArray(o.activities) ? o.activities : [])
      .map((a) => {
        const r = (a ?? {}) as Record<string, unknown>;
        const verdict = VERDICTS.find((v) => v === r.verdict) ?? "no clear effect";
        return { activityId: s(r.activityId, 60), verdict, explanation: s(r.explanation, 400) };
      })
      .filter((a) => a.activityId)
      .slice(0, 12),
    problems: (Array.isArray(o.problems) ? o.problems : [])
      .map((p) => {
        const r = (p ?? {}) as Record<string, unknown>;
        return { title: s(r.title, 100), rootCause: s(r.rootCause, 400), evidence: s(r.evidence, 300) };
      })
      .filter((p) => p.title && p.rootCause)
      .slice(0, 4),
    closing: s(o.closing, 240),
  };
}

export interface MissionReview {
  verdict: "complete" | "not_yet";
  feedback: string;
  insights: { label: string; value: string }[];
}

export function sanitizeReview(raw: unknown): MissionReview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedback = typeof o.feedback === "string" ? o.feedback.trim().slice(0, 600) : "";
  if (!feedback || (o.verdict !== "complete" && o.verdict !== "not_yet")) return null;
  const insights = (Array.isArray(o.insights) ? o.insights : [])
    .map((i) => {
      const r = (i ?? {}) as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label.trim().slice(0, 60) : "";
      const value = typeof r.value === "string" || typeof r.value === "number" ? String(r.value).trim().slice(0, 80) : "";
      return label && value ? { label, value } : null;
    })
    .filter((i): i is { label: string; value: string } => i !== null)
    .slice(0, 5);
  return { verdict: o.verdict, feedback, insights };
}

/** Pulls the first JSON object out of a model reply, tolerating stray text or code fences. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Splits a streamed advisor reply into its diagnosed area (from the leading "AREA: x" line)
 * and the visible body. While the first line is still streaming, the body stays empty.
 */
export function parseAdvisorReply(text: string): { area: MissionCategory | null; body: string } {
  const trimmed = text.trimStart();
  if (AREA_PREFIX.startsWith(trimmed.slice(0, AREA_PREFIX.length)) && trimmed.length < AREA_PREFIX.length) {
    return { area: null, body: "" };
  }
  if (!trimmed.startsWith(AREA_PREFIX)) return { area: null, body: text };
  const newline = trimmed.indexOf("\n");
  if (newline === -1) return { area: null, body: "" };
  // "Legal & admin" or "legal" both map to "legal".
  const value = trimmed.slice(AREA_PREFIX.length, newline).trim().toLowerCase().split(/[^a-z]/)[0];
  return { area: isCategory(value) ? value : null, body: trimmed.slice(newline + 1).trimStart() };
}
