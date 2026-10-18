import type { ReactNode } from "react";
import { BreakEvenCard, ProductsAndPlatforms, ProfitPerSale } from "./Margins";
import { OverheadsSection } from "./Overheads";

/**
 * What each sale earns and what it costs to stay open: products and platforms with the profit
 * per sale, then fixed costs, then break-even, which needs both.
 */
export function MarginsOverheadsTab() {
  return (
    <div className="space-y-6">
      <Heading>Margins</Heading>
      <ProductsAndPlatforms />
      <ProfitPerSale />
      <Heading>Overheads</Heading>
      <OverheadsSection />
      <BreakEvenCard />
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-star-400 first:pt-0">{children}</h2>;
}
