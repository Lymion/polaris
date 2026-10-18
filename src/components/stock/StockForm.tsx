"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { unitProfit } from "@/lib/finance";
import { fieldClass, parseAmount, todayIso } from "@/lib/inputs";
import { daysText, marginHealth, marginOf, unitMoney } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { usePolaris } from "@/lib/store";
import type { Product } from "@/lib/types";
import { useStock } from "@/lib/useStock";

export type StockFormMode = "restock" | "sold" | "count";

const TITLES: Record<StockFormMode, string> = { restock: "Restock", sold: "Record sales", count: "Count stock" };

/**
 * One form for the three things that change stock. A restock can log what it cost, and a sale
 * what it brought in, as Treasury entries, so the money and the shelf stay in step. Each one
 * also says what the units in it earn, so the decision is made with the margin in view.
 */
export function StockForm({ mode, productId, onClose }: { mode: StockFormMode; productId?: string; onClose: () => void }) {
  const products = usePolaris((s) => s.products);
  const channels = usePolaris((s) => s.channels);
  const currency = usePolaris((s) => s.profile.currency);
  const restock = usePolaris((s) => s.restock);
  const recordSold = usePolaris((s) => s.recordSold);
  const countStock = usePolaris((s) => s.countStock);
  const setReorderAt = usePolaris((s) => s.setReorderAt);

  const [id, setId] = useState(productId ?? products[0]?.id ?? "");
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState(product ? String(product.unitCost) : "");
  const [date, setDate] = useState(todayIso());
  const [logMoney, setLogMoney] = useState(true);
  const [channel, setChannel] = useState(channels[0]?.name ?? "");
  const [reorder, setReorder] = useState(product?.reorderAt !== undefined ? String(product.reorderAt) : "");
  const [error, setError] = useState("");

  const units = Math.round(parseAmount(qty));
  const cost = parseAmount(unitCost);
  const fmt = (n: number) => formatMoney(n, currency);
  const restockTotal = units > 0 && cost > 0 ? units * cost : 0;
  const saleTotal = product && units > 0 ? units * product.price : 0;

  function pickProduct(next: string) {
    setId(next);
    const p = products.find((x) => x.id === next);
    setUnitCost(p ? String(p.unitCost) : "");
    setReorder(p?.reorderAt !== undefined ? String(p.reorderAt) : "");
  }

  function save() {
    if (!product) return setError("Pick a product.");
    if (!date) return setError("Pick a date.");
    if (mode === "count") {
      if (!Number.isFinite(units) || units < 0) return setError("Enter how many you counted (0 or more).");
      countStock(product.id, units, date);
      const level = Math.round(parseAmount(reorder));
      setReorderAt(product.id, reorder.trim() && Number.isFinite(level) ? level : undefined);
      return onClose();
    }
    if (!(units > 0)) return setError("Enter how many units.");
    if (mode === "restock") {
      if (logMoney && !(cost > 0)) return setError("Enter what one unit cost, or untick logging the cost.");
      restock(product.id, units, { date, cost: logMoney ? restockTotal : undefined });
    } else {
      recordSold(product.id, units, { date, sale: logMoney ? { amount: saleTotal, channel: channel || undefined } : undefined });
    }
    onClose();
  }

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Product</span>
          <select value={id} onChange={(e) => pickProduct(e.target.value)} className={fieldClass}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.stock !== undefined ? ` (${p.stock} in stock)` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{mode === "count" ? "How many you counted" : mode === "restock" ? "Units in" : "Units sold"}</span>
            <input inputMode="numeric" value={qty} onChange={(e) => (setQty(e.target.value), setError(""))} placeholder="0" className={fieldClass} autoFocus />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </label>
        </div>

        {mode === "restock" && (
          <>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Cost per unit ({currency})</span>
              <input inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className={fieldClass} />
            </label>
            {product && <RestockMargin product={product} units={units} cost={cost} />}
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={logMoney} onChange={(e) => setLogMoney(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-star-400)]" />
              <span>
                Log {restockTotal ? <b>{fmt(restockTotal)}</b> : "the cost"} in Treasury as a stock cost
              </span>
            </label>
          </>
        )}

        {mode === "sold" && (
          <>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Sold on</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={fieldClass}>
                {channels.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {product && <SaleMargin product={product} units={units} channel={channel} />}
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={logMoney} onChange={(e) => setLogMoney(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-star-400)]" />
              <span>
                Log {saleTotal ? <b>{fmt(saleTotal)}</b> : "the sale"} in Treasury as income
                <span className="block text-xs text-muted">Untick if these sales are already in your sheet, for example from a bank statement.</span>
              </span>
            </label>
          </>
        )}

        {mode === "count" && (
          <>
            {product && units > 0 && <CountMargin product={product} units={units} />}
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Warn me when it falls to</span>
              <input inputMode="numeric" value={reorder} onChange={(e) => setReorder(e.target.value)} placeholder="Automatic: about two weeks of sales" className={fieldClass} />
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit">{mode === "count" ? "Save count" : mode === "restock" ? "Add stock" : "Take out of stock"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** A box of plain sentences about the money in this form, tinted when there's something to watch. */
function Explain({ tone, children }: { tone?: "caution" | "alert"; children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className={clsx(
        "space-y-1.5 rounded-xl p-3 text-sm leading-relaxed ring-1",
        tone === "alert" ? "bg-alert/10 ring-alert/30" : tone === "caution" ? "bg-caution/10 ring-caution/30" : "bg-fg/[0.04] ring-line",
      )}
    >
      {children}
    </div>
  );
}

/**
 * What a restock earns: profit on each at this unit cost, the batch's profit once sold, and how
 * many have to sell before the money spent comes back.
 */
function RestockMargin({ product, units, cost }: { product: Product; units: number; cost: number }) {
  const currency = usePolaris((s) => s.profile.currency);
  const { mix, lines } = useStock();
  const unit = (n: number) => unitMoney(n, currency, product.price);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const paid = cost > 0 ? cost : product.unitCost;
  const m = marginOf({ ...product, unitCost: paid }, mix);
  const health = marginHealth(m);
  const change = paid - product.unitCost;
  const perDay = lines.find((l) => l.product.id === product.id)?.perDay ?? 0;
  // Each sale brings in the price less the platform's cut; the batch is paid back after this many.
  const takeHome = product.price - m.fees;
  const payback = units > 0 && takeHome > 0 ? Math.ceil((units * paid) / takeHome) : null;

  return (
    <Explain tone={health === "loss" ? "alert" : health === "thin" ? "caution" : undefined}>
      <p>
        Each sells for {unit(product.price)} and costs you {unit(paid)}
        {m.fees > 0 ? `, plus about ${unit(m.fees)} in fees` : ""}:{" "}
        {m.profit < 0 ? (
          <b className="text-alert">a {unit(-m.profit)} loss on every sale</b>
        ) : (
          <>
            <b className={health === "thin" ? "text-caution" : "text-growth"}>{unit(m.profit)} profit</b> ({Math.round(m.margin * 100)}% of the price)
          </>
        )}
        .
      </p>
      {Math.abs(change) >= 0.01 && (
        <p className="text-muted">
          That&apos;s {unit(Math.abs(change))} {change > 0 ? "more" : "less"} a piece than you&apos;ve been paying, so each makes {unit(Math.abs(change))}{" "}
          {change > 0 ? "less" : "more"}.
        </p>
      )}
      {units > 0 && m.profit > 0 && (
        <p className="text-muted">
          These {units} cost {fmt(units * paid)} and sell for {fmt(units * product.price)}: about <b className="text-ink">{fmt(units * m.profit)} profit</b> once
          they&apos;re all sold.
          {payback !== null &&
            ` Your money is back after ${Math.min(payback, units)} ${payback === 1 ? "sale" : "sales"}${perDay > 0 ? `, ${daysText(payback / perDay)} at your recent pace` : ""}.`}
        </p>
      )}
      {health === "loss" && <p className="text-alert">Raise the price or find a cheaper supplier before buying more.</p>}
      {health === "thin" && <p className="text-caution">That&apos;s thin: one discount or a fee rise could wipe the profit out.</p>}
    </Explain>
  );
}

/** What a sale keeps after the cost of what was sold and the chosen platform's fee. */
function SaleMargin({ product, units, channel }: { product: Product; units: number; channel: string }) {
  const currency = usePolaris((s) => s.profile.currency);
  const channels = usePolaris((s) => s.channels);
  const unit = (n: number) => unitMoney(n, currency, product.price);
  const fmt = (n: number) => formatMoney(n, currency);
  const ch = channels.find((c) => c.name === channel) ?? { name: channel, feePercent: 0, feeFixed: 0 };
  const here = unitProfit(product, ch);
  // Where the same product keeps the most, to compare with.
  const best = channels.map((c) => ({ c, p: unitProfit(product, c).profit })).sort((a, b) => b.p - a.p)[0];
  const n = Math.max(units, 0);

  return (
    <Explain tone={here.profit < 0 ? "alert" : undefined}>
      {n > 0 ? (
        <p>
          {n} × {unit(product.price)} = {fmt(n * product.price)} in. After what they cost you ({fmt(n * product.unitCost)})
          {here.fees > 0 ? ` and ${ch.name}'s fee (${fmt(n * here.fees)})` : ""}, you keep{" "}
          <b className={here.profit < 0 ? "text-alert" : "text-growth"}>{fmt(n * here.profit)}</b> ({Math.round(here.margin * 100)}%).
        </p>
      ) : (
        <p>
          Each sale on {ch.name} keeps <b className={here.profit < 0 ? "text-alert" : "text-growth"}>{unit(here.profit)}</b> after its cost
          {here.fees > 0 ? " and fees" : ""} ({Math.round(here.margin * 100)}% of the price).
        </p>
      )}
      {best && best.c.name !== ch.name && best.p - here.profit >= 0.5 && (
        <p className="text-muted">
          On {best.c.name} the same sale keeps {unit(best.p - here.profit)} more each.
        </p>
      )}
    </Explain>
  );
}

/** What the counted stock holds: the money in it and the profit it makes once sold. */
function CountMargin({ product, units }: { product: Product; units: number }) {
  const currency = usePolaris((s) => s.profile.currency);
  const { mix } = useStock();
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const m = marginOf(product, mix);
  return (
    <Explain>
      <p>
        {units} on the shelf hold {fmt(units * product.unitCost)} of your money
        {m.profit > 0 ? (
          <>
            {" "}
            and make about <b className="text-growth">{fmt(units * m.profit)} profit</b> once sold
          </>
        ) : (
          ", but sell at a loss after cost and fees"
        )}
        .
      </p>
    </Explain>
  );
}
