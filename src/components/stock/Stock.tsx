"use client";

import { useState } from "react";
import clsx from "clsx";
import { ClipboardCheck, Minus, Package, PackageOpen, Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { daysText, marginHealth, unitMoney, type StockLine, type StockStatus } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { useHydrated, usePolaris } from "@/lib/store";
import type { StockMoveKind } from "@/lib/types";
import { useStock } from "@/lib/useStock";
import { MarginsPanel } from "./MarginsPanel";
import { RestockPlanPanel } from "./RestockPlan";
import { StatusPill } from "./StatusPill";
import { StockForm, type StockFormMode } from "./StockForm";

const BAR_STYLE: Record<StockStatus, string> = {
  out: "bg-alert",
  low: "bg-caution",
  ok: "bg-growth",
  slow: "bg-faint",
  untracked: "bg-transparent",
};

/** How long stock lasts, as a bar: full at two months or more. */
function LastsBar({ line }: { line: StockLine }) {
  const share = line.status === "out" ? 0 : line.daysLeft === null ? 1 : Math.min(1, line.daysLeft / 60);
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.08]" aria-hidden>
      <span className={clsx("block h-full rounded-full", BAR_STYLE[line.status])} style={{ width: `${Math.max(line.status === "out" ? 0 : 4, share * 100)}%` }} />
    </span>
  );
}

const MOVE_LABEL: Record<StockMoveKind, string> = { restock: "Restocked", sold: "Sold", count: "Counted" };

type OpenForm = (f: { mode: StockFormMode; productId?: string }) => void;

/**
 * Stock: what's on the shelf, how long it lasts at the recent pace, what each product earns,
 * what to reorder and what's sitting still. Restocks and sales can also log their money in Treasury.
 */
export function Stock() {
  const hydrated = useHydrated();
  // Days left and sales pace read today's date, so it only renders in the browser.
  if (!hydrated) return <div className="h-96 animate-pulse rounded-[1.25rem] bg-fg/[0.04]" />;
  return <StockBody />;
}

function StockBody() {
  const products = usePolaris((s) => s.products);
  const currency = usePolaris((s) => s.profile.currency);
  const { lines, summary: sum, mix } = useStock();
  const [form, setForm] = useState<{ mode: StockFormMode; productId?: string } | null>(null);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });

  // Most urgent first: out, low, healthy, slow, then the ones not tracked yet.
  const order: StockStatus[] = ["out", "low", "ok", "slow", "untracked"];
  const sorted = [...lines].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));

  const header = (
    <PageHeader
      icon={Package}
      eyebrow="Inventory"
      title="Stock"
      description="What's on your shelf, what each product earns you and what to restock next, so your money goes where it makes the most."
      actions={
        products.length > 0 && (
          <>
            <Button onClick={() => setForm({ mode: "restock" })}>
              <Plus className="size-4" aria-hidden /> Restock
            </Button>
            <Button variant="secondary" onClick={() => setForm({ mode: "sold" })}>
              <Minus className="size-4" aria-hidden /> Record sales
            </Button>
            <Button variant="secondary" onClick={() => setForm({ mode: "count" })}>
              <ClipboardCheck className="size-4" aria-hidden /> Count stock
            </Button>
          </>
        )
      }
    />
  );

  if (products.length === 0) {
    return (
      <>
        {header}
        <section className="panel flex flex-col items-center gap-3 p-8 text-center">
          <PackageOpen className="size-9 text-star-300" aria-hidden />
          <h2 className="text-lg font-semibold">Track your stock</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            Add the products you sell, with their price and what one costs you, in Treasury under Margins &amp; overheads. Then
            count what&apos;s on your shelf here: Polaris keeps track as you restock and sell, and shows what each one earns you.
          </p>
          <ButtonLink href="/treasury?tab=costs">Add your products</ButtonLink>
        </section>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        {/* Five tiles in two columns leave one alone on the last row; it takes the full width there.
            Five across only from xl: at lg the sidebar leaves the money figures too little room. */}
        <dl className="grid grid-cols-2 gap-3 *:last:odd:col-span-2 xl:grid-cols-5 xl:*:last:odd:col-span-1">
          <Tile label="Money in stock" value={fmt(sum.value)} note="What the shelf cost you" />
          <Tile
            label="Profit on the shelf"
            value={fmt(sum.shelfProfit)}
            tone={sum.shelfProfit > 0 ? "growth" : undefined}
            note={sum.tracked ? `When it sells for ${fmt(sum.sellValue)}` : "Count your stock to see it"}
          />
          <Tile label="Running low" value={String(sum.low.length)} tone={sum.low.length ? "caution" : undefined} note={sum.low.map((l) => l.product.name).join(", ") || "Nothing right now"} />
          <Tile label="Out of stock" value={String(sum.out.length)} tone={sum.out.length ? "alert" : undefined} note={sum.out.map((l) => l.product.name).join(", ") || "Nothing right now"} />
          <Tile label="Slow sellers" value={fmt(sum.slowValue)} note={sum.slow.length ? `Tied up in ${sum.slow.map((l) => l.product.name).join(", ")}` : "Nothing sitting still"} />
        </dl>

        <ProductsPanel lines={sorted} tracked={sum.tracked} total={products.length} currency={currency} onOpen={setForm} />

        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <MarginsPanel lines={lines} mix={mix} />
          <div className="space-y-6">
            <RestockPlanPanel lines={lines} />
            <StockHistory />
          </div>
        </div>
      </div>

      {form && <StockForm mode={form.mode} productId={form.productId} onClose={() => setForm(null)} />}
    </>
  );
}

function ProductsPanel({ lines, tracked, total, currency, onOpen }: { lines: StockLine[]; tracked: number; total: number; currency: string; onOpen: OpenForm }) {
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  return (
    <section className="panel @container overflow-hidden">
      <div className="px-5 pt-5 sm:px-6">
        <h2 className="font-semibold">Products</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {tracked ? `${tracked} of ${total} tracked. Days left use the last 30 days of sales; profit each is after the cost and platform fees.` : "Count what's on your shelf to start tracking."}
        </p>
      </div>
      {/* Cards when narrow; a table from about 760px. */}
      <ul className="divide-y divide-line @3xl:hidden">
        {lines.map((l) => (
          <li key={l.product.id} className="space-y-2 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-medium">{l.product.name}</p>
              <StatusPill status={l.status} />
            </div>
            <p className="text-sm">
              <ProfitEach line={l} currency={currency} inline />
            </p>
            {l.status === "untracked" ? (
              <Button size="sm" variant="secondary" onClick={() => onOpen({ mode: "count", productId: l.product.id })}>
                <ClipboardCheck className="size-4" aria-hidden /> Count to start tracking
              </Button>
            ) : (
              <>
                <p className="text-sm tabular-nums text-muted">
                  <span className="font-semibold text-ink">{l.onHand}</span> in stock · {l.sold30} sold in 30 days
                  {l.daysOut >= 3 && <span className="text-alert"> (sold out {l.daysOut} of them)</span>} ·{" "}
                  {l.status === "out" ? "sold out" : `lasts ${daysText(l.daysLeft)}`}
                </p>
                <LastsBar line={l} />
                <RowActions line={l} onOpen={onOpen} />
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden @3xl:block">
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-6 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">In stock</th>
              <th className="px-3 py-2 text-right font-medium">Sold, 30 days</th>
              <th className="w-36 px-3 py-2 font-medium">Lasts</th>
              <th className="px-3 py-2 text-right font-medium" title="What one sale leaves after its cost and the platform fees">
                Profit each
              </th>
              <th className="px-3 py-2 text-right font-medium" title="What the stock on the shelf cost you">
                Tied up
              </th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-6 py-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {lines.map((l) => (
              <tr key={l.product.id}>
                <td className="px-6 py-3 font-medium">{l.product.name}</td>
                <td className="px-3 py-3 text-right">{l.status === "untracked" ? "–" : l.onHand}</td>
                <td className="px-3 py-3 text-right">
                  {l.status === "untracked" ? "–" : l.sold30}
                  {l.daysOut >= 3 && (
                    <span className="block text-xs text-alert" title="Days it had nothing on the shelf. The pace counts only the days it was in stock.">
                      sold out {l.daysOut} days
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {l.status === "untracked" ? (
                    <span className="text-faint">–</span>
                  ) : (
                    <span className="block space-y-1">
                      <span className="block text-xs text-muted">{l.status === "out" ? "Ran out" : daysText(l.daysLeft)}</span>
                      <LastsBar line={l} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <ProfitEach line={l} currency={currency} />
                </td>
                <td className="px-3 py-3 text-right">{l.status === "untracked" ? "–" : fmt(l.value)}</td>
                <td className="px-3 py-3">
                  <StatusPill status={l.status} />
                </td>
                <td className="px-6 py-3">
                  {l.status === "untracked" ? (
                    <div className="flex justify-end">
                      <Button size="sm" variant="secondary" onClick={() => onOpen({ mode: "count", productId: l.product.id })}>
                        Start tracking
                      </Button>
                    </div>
                  ) : (
                    <RowActions line={l} onOpen={onOpen} align="end" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Profit from one sale and the margin, coloured when it's thin or a loss. */
function ProfitEach({ line, currency, inline = false }: { line: StockLine; currency: string; inline?: boolean }) {
  const { profit, margin } = line.margin;
  const unit = (n: number) => unitMoney(n, currency, line.product.price);
  const health = marginHealth(line.margin);
  const tone = health === "loss" ? "text-alert" : health === "thin" ? "text-caution" : "text-growth";
  const label = health === "loss" ? "loss" : health === "thin" ? "thin" : null;
  if (inline) {
    return (
      <span className="tabular-nums text-muted">
        <span className={clsx("font-semibold", tone)}>
          {profit < 0 ? `Loses ${unit(-profit)}` : `${unit(profit)} profit`}
        </span>{" "}
        each ({Math.round(margin * 100)}%{label ? `, ${label}` : ""})
        {line.sold30 > 0 && ` · ${formatMoney(line.profit30, currency, { compact: true })} from the last 30 days`}
      </span>
    );
  }
  return (
    <>
      <span className={clsx("block font-semibold", tone)}>{profit < 0 ? `−${unit(-profit)}` : unit(profit)}</span>
      <span className="block text-xs text-muted">
        {Math.round(margin * 100)}%{label ? ` · ${label}` : ""}
      </span>
    </>
  );
}

function StockHistory() {
  const products = usePolaris((s) => s.products);
  const moves = usePolaris((s) => s.stockMoves);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const recent = moves.filter((m) => names.has(m.productId)).slice(0, 8);

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-semibold">Stock history</h2>
      {recent.length ? (
        <ul className="mt-3 divide-y divide-line">
          {recent.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-xs tabular-nums text-faint">
                {new Date(`${m.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
              <span className="min-w-0 flex-1 truncate" title={names.get(m.productId)}>
                {MOVE_LABEL[m.kind]} {names.get(m.productId)}
              </span>
              <span className={clsx("shrink-0 font-semibold tabular-nums", m.qty > 0 ? "text-growth" : m.qty < 0 ? "text-alert" : "text-muted")}>
                {m.qty > 0 ? "+" : m.qty < 0 ? "−" : "±"}
                {Math.abs(m.qty)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-faint">Restocks, sales and counts show up here.</p>
      )}
    </section>
  );
}

function RowActions({ line, onOpen, align = "start" }: { line: StockLine; onOpen: OpenForm; align?: "start" | "end" }) {
  const id = line.product.id;
  const btn = "tap-target relative grid size-8 place-items-center rounded-full text-muted ring-1 ring-line transition-colors hover:bg-fg/[0.06] hover:text-ink";
  return (
    // Wider gaps on touch screens, so the buttons' 44px tap areas don't overlap.
    <div className={clsx("flex gap-1.5 pointer-coarse:gap-3", align === "end" && "justify-end")}>
      <button type="button" className={btn} onClick={() => onOpen({ mode: "restock", productId: id })} aria-label={`Restock ${line.product.name}`} title="Restock">
        <Plus className="size-4" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => onOpen({ mode: "sold", productId: id })} aria-label={`Record sales of ${line.product.name}`} title="Record sales">
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => onOpen({ mode: "count", productId: id })} aria-label={`Count ${line.product.name}`} title="Count stock">
        <ClipboardCheck className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "growth" | "caution" | "alert" }) {
  return (
    <div className="panel min-w-0 p-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={clsx("mt-1.5 text-xl font-bold tabular-nums", tone === "growth" && "text-growth", tone === "caution" && "text-caution", tone === "alert" && "text-alert")}>{value}</dd>
      <dd className="mt-1 line-clamp-2 text-xs leading-snug text-faint" title={note}>
        {note}
      </dd>
    </div>
  );
}
