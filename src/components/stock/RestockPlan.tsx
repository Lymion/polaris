"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles, Target, Wallet } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { AiError, generateMissions, planRestock } from "@/lib/ai/client";
import type { RestockPlan } from "@/lib/ai/shared";
import { planIsCurrent, type StockLine } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";

/** Lumi's restock plan: what to order now and why, with the total cost against cash in the bank. */
export function RestockPlanPanel({ lines }: { lines: StockLine[] }) {
  const name = usePolaris((s) => mascotName(s.profile));
  const currency = usePolaris((s) => s.profile.currency);
  const cash = usePolaris((s) => s.cashOnHand);
  const addMissions = usePolaris((s) => s.addMissions);
  const saved = usePolaris((s) => s.restockPlan);
  const savePlan = usePolaris((s) => s.saveRestockPlan);
  const [state, setState] = useState<"idle" | "planning" | "error">("idle");
  const [error, setError] = useState("");
  const [mission, setMission] = useState<"idle" | "making" | "made">("idle");
  const tracked = lines.filter((l) => l.status !== "untracked");
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  // The last plan stays up for a week (Lumi quotes it too); after that it's out of date.
  const plan: RestockPlan | null = saved && planIsCurrent(saved.at) ? saved.plan : null;
  const madeOn = saved ? new Date(saved.at).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : "";

  async function run() {
    setState("planning");
    setError("");
    setMission("idle");
    try {
      savePlan(await planRestock());
      setState("idle");
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't plan your restock right now. Try again in a moment.");
      setState("error");
    }
  }

  const toOrder = plan?.items.filter((i) => i.order > 0) ?? [];
  const skip = plan?.items.filter((i) => i.order === 0) ?? [];
  const total = toOrder.reduce((s, i) => s + i.cost, 0);
  const profit = toOrder.reduce((s, i) => s + i.profit, 0);
  // Profit back for each unit of money spent: what decides which order to place first.
  const back = (i: { cost: number; profit: number }) => (i.cost > 0 ? i.profit / i.cost : 0);
  const budget = plan?.cash?.budget ?? null;
  const weeks = (w: number) => (w < 1 ? "under a week" : `about ${Math.round(w)} ${Math.round(w) === 1 ? "week" : "weeks"}`);

  async function makeMission() {
    if (!plan) return;
    setMission("making");
    try {
      const order = budget
        ? [`Within the cash you can spare (${fmt(plan.cash!.spendable)}), order: ${budget.items.map((i) => `${i.order} × ${i.product}`).join(", ")}`]
        : toOrder.map((i) => `Order ${i.order} × ${i.product} (${fmt(i.cost)}, about ${fmt(i.profit)} profit once sold): ${i.why}`);
      const text = [plan.summary, ...order, plan.watch].filter(Boolean).join("\n");
      const made = await generateMissions({ mode: "advice", text, source: "advisor" });
      addMissions(made.slice(0, 1));
      setMission("made");
    } catch {
      setMission("idle");
      setError("Couldn't make a mission from the plan just now.");
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Mascot size={44} className="shrink-0" mood={state === "planning" ? "thinking" : "idle"} />
        <div className="min-w-0">
          <h2 className="font-semibold">{name}&apos;s restock plan</h2>
          <p className="mt-1 text-sm text-muted">What to order now, from your sales pace, the weeks ahead and what each product earns.</p>
        </div>
      </div>

      {!plan && (
        <Button className="mt-4" onClick={run} disabled={state === "planning" || tracked.length === 0} title={tracked.length ? undefined : "Count at least one product's stock first"}>
          {state === "planning" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {state === "planning" ? "Planning…" : "Plan my restock"}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {error}
        </p>
      )}

      {plan && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-faint">Made {madeOn}. {name} quotes these numbers when you ask about stock.</p>
          <p className="text-sm leading-relaxed">{plan.summary}</p>
          {toOrder.length > 0 && (
            <div className="space-y-2">
              {toOrder.length > 1 && <p className="text-xs text-muted">Best return on your money first.</p>}
              <ul className="space-y-3">
                {toOrder.map((i) => (
                  <li key={i.product} className="rounded-xl bg-fg/[0.04] p-3 ring-1 ring-line">
                    <p className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">
                        Order {i.order} × {i.product}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">{fmt(i.cost)}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{i.why}</p>
                    <p className="mt-1.5 text-xs font-medium tabular-nums text-growth">
                      About {fmt(i.profit)} profit once sold: {formatMoney(back(i), currency)} for every {formatMoney(1, currency, { compact: true })} spent
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {skip.length > 0 && (
            <div className="text-xs leading-relaxed text-muted">
              <p className="font-semibold text-ink">No need to order</p>
              <ul className="mt-1 space-y-1">
                {skip.map((i) => (
                  <li key={i.product}>
                    <span className="font-medium text-ink">{i.product}:</span> {i.why}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-1.5 border-t border-line pt-3 text-sm">
            <p className="flex flex-wrap justify-between gap-2">
              <span>
                Spend <b className="tabular-nums">{fmt(total)}</b>
                {profit > 0 && (
                  <>
                    , make back about <b className="tabular-nums text-growth">{fmt(profit)} profit</b>
                  </>
                )}
              </span>
              {cash !== null && (
                <span className={total > cash ? "text-alert" : "text-muted"}>
                  {total > cash ? "More than your cash" : `${Math.round((total / Math.max(cash, 1)) * 100)}% of your cash`}
                </span>
              )}
            </p>
            {plan.cash && !budget && (
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Wallet className="mt-px size-3.5 shrink-0 text-growth" aria-hidden />
                <span>
                  Fits your cash, with {fmt(plan.cash.reserve)} kept for a month of fixed costs
                  {plan.cash.paybackWeeks !== null && `. Sales of these pieces pay it back in ${weeks(plan.cash.paybackWeeks)}`}.
                </span>
              </p>
            )}
          </div>
          {plan.cash && budget && (
            <div className="rounded-xl bg-caution/10 p-3 text-sm ring-1 ring-caution/30">
              <p className="flex items-center gap-1.5 font-semibold">
                <Wallet className="size-4 shrink-0 text-caution" aria-hidden /> The order that fits your cash
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Keep {fmt(plan.cash.reserve)} for a month of fixed costs and {fmt(plan.cash.spendable)} is left for stock. Spend it from the top of the list down
                instead of trimming every line: the top earns the most back.
              </p>
              {budget.items.length ? (
                <>
                  <ul className="mt-2 space-y-1 tabular-nums">
                    {budget.items.map((i) => (
                      <li key={i.product} className="flex justify-between gap-3">
                        <span>
                          {i.order} × {i.product}
                        </span>
                        {i.order < (toOrder.find((t) => t.product === i.product)?.order ?? 0) && <span className="text-xs text-muted">of {toOrder.find((t) => t.product === i.product)?.order}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">
                    {fmt(budget.cost)}, about <span className="font-medium text-growth">{fmt(budget.profit)} profit</span> once sold. Order the rest when this month&apos;s sales are in.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-muted">Nothing to spare right now: wait for this month&apos;s sales to come in.</p>
              )}
            </div>
          )}
          {plan.watch && <p className="text-xs leading-relaxed text-muted">Watch: {plan.watch}</p>}
          <div className="flex flex-wrap gap-2">
            {mission === "made" ? (
              <Link href="/missions" className="tap-target relative inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold text-growth ring-1 ring-growth/40">
                <Target className="size-4" aria-hidden /> Added to your missions
              </Link>
            ) : (
              <Button size="sm" variant="secondary" onClick={makeMission} disabled={mission === "making" || toOrder.length === 0}>
                {mission === "making" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Target className="size-4" aria-hidden />} Make it a mission
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={run} disabled={state === "planning"}>
              Plan again
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
