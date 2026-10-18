"use client";

import { feeMix, stockLines, stockSummary } from "./inventory";
import { usePolaris } from "./store";

/** Every product's stock line and the totals, with profit after the fees of where you really sell. */
export function useStock() {
  const products = usePolaris((s) => s.products);
  const moves = usePolaris((s) => s.stockMoves);
  const channels = usePolaris((s) => s.channels);
  const entries = usePolaris((s) => s.entries);
  const mix = feeMix(channels, entries);
  const lines = stockLines(products, moves, mix);
  return { mix, lines, summary: stockSummary(lines) };
}
