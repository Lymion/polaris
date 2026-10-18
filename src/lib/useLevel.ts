"use client";

import { effectiveRevenue } from "./finance";
import { levelInfo } from "./levels";
import { usePolaris } from "./store";

/** Current level, progress and next milestone for the signed-in business. */
export function useLevel() {
  const xp = usePolaris((s) => s.xp);
  const revenue = usePolaris((s) => s.revenue);
  const entries = usePolaris((s) => s.entries);
  const currency = usePolaris((s) => s.profile.currency);
  return { xp, ...levelInfo(xp, effectiveRevenue(revenue, entries), currency) };
}
