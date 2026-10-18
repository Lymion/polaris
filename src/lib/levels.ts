import { usdToLocal } from "./currency";
import { formatMoney } from "./money";
import type { RevenueReport } from "./types";

interface Gate {
  /** "lifetime": total sales so far. "month": best single month of sales. */
  kind: "lifetime" | "month";
  /** Threshold in USD, converted to the user's currency. 0 means "any sale at all". */
  usd: number;
}

interface LevelDef {
  level: number;
  title: string;
  /** Total XP needed to reach this level. Grows roughly ×1.7 per level. */
  xp: number;
  gate?: Gate;
}

/**
 * Levels track the real business, not just app activity: XP from missions is necessary but
 * not enough. Level 1 is a business just starting; Level 3 has made its first 1,000 in sales;
 * Level 10 does 50,000 a month and should be able to run without us.
 */
export const LEVELS: LevelDef[] = [
  { level: 1, title: "Stargazer", xp: 0 },
  { level: 2, title: "Spark", xp: 150, gate: { kind: "lifetime", usd: 0 } },
  { level: 3, title: "Navigator", xp: 400, gate: { kind: "lifetime", usd: 1_000 } },
  { level: 4, title: "Pathfinder", xp: 900, gate: { kind: "month", usd: 2_000 } },
  { level: 5, title: "Trailblazer", xp: 1_800, gate: { kind: "month", usd: 5_000 } },
  { level: 6, title: "Voyager", xp: 3_300, gate: { kind: "month", usd: 10_000 } },
  { level: 7, title: "Captain", xp: 5_800, gate: { kind: "month", usd: 15_000 } },
  { level: 8, title: "Constellation Builder", xp: 9_800, gate: { kind: "month", usd: 25_000 } },
  { level: 9, title: "Luminary", xp: 16_000, gate: { kind: "month", usd: 35_000 } },
  { level: 10, title: "North Star", xp: 25_000, gate: { kind: "month", usd: 50_000 } },
];

export const MAX_LEVEL = LEVELS.length;

function gateMet(def: LevelDef, revenue: RevenueReport, currency: string) {
  if (!def.gate) return true;
  const have = def.gate.kind === "lifetime" ? revenue.lifetime : revenue.bestMonth;
  return def.gate.usd === 0 ? have > 0 : have >= usdToLocal(def.gate.usd, currency);
}

/** Human description of a level's sales milestone, e.g. "RM4,400 in total sales". */
export function gateText(def: LevelDef, currency: string) {
  if (!def.gate) return null;
  if (def.gate.usd === 0) return "your first sale";
  const amount = formatMoney(usdToLocal(def.gate.usd, currency), currency, { compact: true });
  return def.gate.kind === "lifetime" ? `${amount} in total sales` : `${amount} in a single month`;
}

export function levelInfo(xp: number, revenue: RevenueReport, currency: string) {
  let level = 1;
  for (const def of LEVELS.slice(1)) {
    if (xp >= def.xp && gateMet(def, revenue, currency)) level = def.level;
    else break;
  }
  const current = LEVELS[level - 1];
  const next = LEVELS[level] ?? null;
  const span = next ? next.xp - current.xp : 1;
  return {
    level,
    title: current.title,
    next,
    /** Progress through the XP needed for the next level, 0 to 1. */
    progress: next ? Math.min(1, Math.max(0, (xp - current.xp) / span)) : 1,
    xpToNext: next ? Math.max(0, next.xp - xp) : 0,
    /** Enough XP banked, but the sales milestone isn't reported yet. */
    blockedByGate: next ? xp >= next.xp && !gateMet(next, revenue, currency) : false,
    nextGate: next ? gateText(next, currency) : null,
  };
}
