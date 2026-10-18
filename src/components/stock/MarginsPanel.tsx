"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowRight, Coins, TrendingDown, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { marginHealth, marginNotes, unitMoney, type FeeMix, type MarginNote, type StockLine } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { usePolaris } from "@/lib/store";

const NOTE_STYLE: Record<MarginNote["tone"], { icon: typeof TrendingUp; className: string }> = {
  good: { icon: TrendingUp, className: "text-growth" },
  caution: { icon: AlertTriangle, className: "text-caution" },
  alert: { icon: TrendingDown, className: "text-alert" },
};

/**
 * What each product earns you: every price split into what it cost, the platform's cut and the
 * profit that's left, ranked by the profit it brought in lately, then what that means for stock.
 */
export function MarginsPanel({ lines, mix }: { lines: StockLine[]; mix: FeeMix }) {
  const currency = usePolaris((s) => s.profile.currency);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const ranked = [...lines].sort((a, b) => b.profit30 - a.profit30 || b.margin.margin - a.margin.margin);
  const notes = marginNotes(lines, currency);

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Coins className="size-4 text-star-300" aria-hidden /> What each product earns you
      </h2>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        Where the money from one sale goes, best earners first. {mix.note}
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-hidden>
        <Key className="bg-fg/25">Cost to make or buy</Key>
        <Key className="bg-caution/70">Platform fees</Key>
        <Key className="bg-growth">Profit</Key>
      </p>

      <ul className="mt-3 space-y-4">
        {ranked.map((l) => {
          const { price } = l.product;
          const unit = (n: number) => unitMoney(n, currency, price);
          const share = (n: number) => (price > 0 ? Math.max(0, n / price) : 0);
          const cost = Math.min(1, share(l.product.unitCost));
          const fees = Math.min(1 - cost, share(l.margin.fees));
          const profit = Math.max(0, 1 - cost - fees);
          const health = marginHealth(l.margin);
          const split = `${unit(price)} = ${unit(l.product.unitCost)} cost + ${unit(l.margin.fees)} fees + ${l.margin.profit < 0 ? `a ${unit(-l.margin.profit)} loss` : `${unit(l.margin.profit)} profit`}`;
          return (
            <li key={l.product.id}>
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{l.product.name}</span>
                <span className={clsx("shrink-0 tabular-nums font-semibold", health === "loss" ? "text-alert" : health === "thin" ? "text-caution" : "text-growth")}>
                  {l.margin.profit < 0 ? `−${unit(-l.margin.profit)}` : unit(l.margin.profit)} each
                  <span className="font-normal text-muted"> · {Math.round(l.margin.margin * 100)}%</span>
                </span>
              </p>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-fg/[0.06]" role="img" aria-label={split}>
                <span className="bg-fg/25" style={{ width: `${cost * 100}%` }} />
                <span className="bg-caution/70" style={{ width: `${fees * 100}%` }} />
                <span className="bg-growth" style={{ width: `${profit * 100}%` }} />
              </div>
              <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums">
                <span className="text-faint">{split}</span>
                <span className="text-muted">{l.sold30 > 0 ? `${fmt(l.profit30)} from ${l.sold30} sold in 30 days` : "None sold in 30 days"}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {notes.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">What this means for your stock</h3>
          <ul className="mt-2 space-y-2.5">
            {notes.map((n) => {
              const { icon: Icon, className } = NOTE_STYLE[n.tone];
              return (
                <li key={n.text} className="flex gap-2.5 text-sm leading-relaxed">
                  <Icon className={clsx("mt-0.5 size-4 shrink-0", className)} aria-hidden />
                  <span>{n.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <span>Profit per platform, overheads and break-even are in Treasury.</span>
        <ButtonLink href="/treasury?tab=costs" variant="ghost" size="sm">
          Change prices or costs <ArrowRight className="size-3.5" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}

function Key({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("size-2.5 rounded-full", className)} />
      {children}
    </span>
  );
}
