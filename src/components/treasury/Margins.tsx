"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Plus, Target, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { THIN_MARGIN, totalOverheads, unitProfit } from "@/lib/finance";
import { fieldClass, parseAmount } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { mascotName, newId, usePolaris } from "@/lib/store";
import type { Product, SalesChannel } from "@/lib/types";

/** Products and the platforms they sell on. */
export function ProductsAndPlatforms() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProductsCard />
      <ChannelsCard />
    </div>
  );
}

/** What one sale of each product earns on each platform, after making it and the platform's cut. */
export function ProfitPerSale() {
  const products = usePolaris((s) => s.products);
  const channels = usePolaris((s) => s.channels);
  const currency = usePolaris((s) => s.profile.currency);
  const guide = usePolaris((s) => mascotName(s.profile));

  return (
      <section className="panel p-5 sm:p-6">
        <h2 className="font-semibold">Profit per sale, by platform</h2>
        <p className="mt-0.5 text-xs text-muted">
          What you keep from one sale after the cost to make it and the platform&apos;s cut.
        </p>
        {products.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-fg/10 p-6 text-center text-sm text-muted">
            Add a product above to see what each sale earns you.
          </p>
        ) : (
          // A table when there's room; one card per product on phones, so nothing scrolls sideways.
          <div className="@container mt-4">
            <div className="space-y-3 @xl:hidden">
              {products.map((p) => (
                <div key={p.id} className="rounded-xl bg-fg/[0.03] p-3.5 ring-1 ring-line">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-faint">
                    Sells {formatMoney(p.price, currency)} · costs {formatMoney(p.unitCost, currency)}
                  </p>
                  <ul className="mt-2 divide-y divide-line">
                    {channels.map((ch) => (
                      <li key={ch.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{ch.name}</span>
                          <span className="block text-xs text-faint">
                            {ch.feePercent}% fee{ch.feeFixed ? ` + ${formatMoney(ch.feeFixed, currency)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <MarginFigure product={p} channel={ch} currency={currency} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto @xl:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  {channels.map((ch) => (
                    <th key={ch.id} className="px-3 py-2 text-right font-medium">
                      {ch.name}
                      <span className="block font-normal">
                        {ch.feePercent}% fee{ch.feeFixed ? ` + ${formatMoney(ch.feeFixed, currency)}` : ""}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-faint">
                        Sells {formatMoney(p.price, currency)} · costs {formatMoney(p.unitCost, currency)}
                      </p>
                    </td>
                    {channels.map((ch) => (
                      <td key={ch.id} className="px-3 py-3 text-right tabular-nums">
                        <MarginFigure product={p} channel={ch} currency={currency} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="mt-3 text-xs text-faint">
              &ldquo;Thin&rdquo; means under {THIN_MARGIN * 100}% of the price is left as profit: a rule of thumb, not a
              law. Ask {guide} what&apos;s normal for your industry.
            </p>
          </div>
        )}
      </section>
  );
}

/** Profit and margin from one sale of a product on one platform, flagged when thin or a loss. */
function MarginFigure({ product, channel, currency }: { product: Product; channel: SalesChannel; currency: string }) {
  const { profit, margin } = unitProfit(product, channel);
  const status = profit < 0 ? "loss" : margin < THIN_MARGIN ? "thin" : null;
  return (
    <>
      <span className="block font-semibold">{formatMoney(profit, currency)}</span>
      <span className="block text-xs text-muted">{Math.round(margin * 100)}% margin</span>
      {status && (
        <span className={clsx("mt-1 inline-flex items-center gap-1 text-[11px] font-semibold", status === "loss" ? "text-alert" : "text-caution")}>
          {status === "loss" ? <TrendingDown className="size-3" aria-hidden /> : <AlertTriangle className="size-3" aria-hidden />}
          {status === "loss" ? "Loss" : "Thin"}
        </span>
      )}
    </>
  );
}

function ProductsCard() {
  const products = usePolaris((s) => s.products);
  const currency = usePolaris((s) => s.profile.currency);
  const saveProduct = usePolaris((s) => s.saveProduct);
  const removeProduct = usePolaris((s) => s.removeProduct);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");

  function add() {
    const p = parseAmount(price);
    const c = parseAmount(cost);
    if (!name.trim()) return setError("Name the product.");
    if (!(p > 0)) return setError("Enter a selling price above zero.");
    if (!(c >= 0)) return setError("Enter what one unit costs you to make or buy.");
    saveProduct({ id: newId(), name: name.trim().slice(0, 60), price: p, unitCost: c });
    setName("");
    setPrice("");
    setCost("");
    setError("");
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-semibold">Your products</h2>
      <p className="mt-0.5 text-xs text-muted">Unit cost = ingredients or materials plus packaging for one item.</p>
      <ul className="mt-4 divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="block text-xs text-faint">
                Sells {formatMoney(p.price, currency)} · costs {formatMoney(p.unitCost, currency)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => removeProduct(p.id)}
              aria-label={`Remove ${p.name}`}
              className="rounded-full p-1.5 text-faint hover:bg-fg/[0.06] hover:text-alert"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 grid grid-cols-[1fr_5.5rem_5.5rem] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Chocolate cake" aria-label="Product name" className={fieldClass} />
        <input inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setError(""); }} placeholder="Price" aria-label={`Selling price in ${currency}`} className={fieldClass} />
        <input inputMode="decimal" value={cost} onChange={(e) => { setCost(e.target.value); setError(""); }} placeholder="Unit cost" aria-label={`Cost per unit in ${currency}`} className={fieldClass} />
        <Button type="submit" variant="secondary" size="sm" className="col-span-3 justify-self-start">
          <Plus className="size-3.5" aria-hidden /> Add product
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ChannelsCard() {
  const channels = usePolaris((s) => s.channels);
  const currency = usePolaris((s) => s.profile.currency);
  const saveChannel = usePolaris((s) => s.saveChannel);
  const removeChannel = usePolaris((s) => s.removeChannel);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [fixed, setFixed] = useState("");
  const [error, setError] = useState("");

  function add() {
    const pct = fee ? parseAmount(fee) : 0;
    const fx = fixed ? parseAmount(fixed) : 0;
    if (!name.trim()) return setError("Name the platform, e.g. GrabFood or Shopee.");
    if (!(pct >= 0 && pct < 100)) return setError("The fee should be between 0 and 100%.");
    if (!(fx >= 0)) return setError("The fixed fee should be a number.");
    saveChannel({ id: newId(), name: name.trim().slice(0, 40), feePercent: pct, feeFixed: fx });
    setName("");
    setFee("");
    setFixed("");
    setError("");
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-semibold">Where you sell</h2>
      <p className="mt-0.5 text-xs text-muted">Add each platform and the commission it takes. Check your contract for the exact fee.</p>
      <ul className="mt-4 divide-y divide-line">
        {channels.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
            <span className="tabular-nums text-muted">
              {c.feePercent}%{c.feeFixed ? ` + ${formatMoney(c.feeFixed, currency)}` : ""}
            </span>
            <button
              type="button"
              onClick={() => removeChannel(c.id)}
              disabled={channels.length === 1}
              aria-label={`Remove ${c.name}`}
              className="rounded-full p-1.5 text-faint hover:bg-fg/[0.06] hover:text-alert disabled:opacity-30"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 grid grid-cols-[1fr_5rem_5.5rem] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. GrabFood" aria-label="Platform name" className={fieldClass} />
        <input inputMode="decimal" value={fee} onChange={(e) => { setFee(e.target.value); setError(""); }} placeholder="Fee %" aria-label="Commission percentage" className={fieldClass} />
        <input inputMode="decimal" value={fixed} onChange={(e) => { setFixed(e.target.value); setError(""); }} placeholder="+ per order" aria-label={`Fixed fee per order in ${currency}`} className={fieldClass} />
        <Button type="submit" variant="secondary" size="sm" className="col-span-3 justify-self-start">
          <Plus className="size-3.5" aria-hidden /> Add platform
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** Sales needed each month to cover fixed costs, for one product on one platform. */
export function BreakEvenCard() {
  const products = usePolaris((s) => s.products);
  const channels = usePolaris((s) => s.channels);
  const overheads = usePolaris((s) => s.overheads);
  const currency = usePolaris((s) => s.profile.currency);
  const [productId, setProductId] = useState("");
  const [channelId, setChannelId] = useState("");

  const product = products.find((p) => p.id === productId) ?? products[0];
  const channel = channels.find((c) => c.id === channelId) ?? channels[0];
  const fixed = totalOverheads(overheads);

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Target className="size-4 text-star-300" aria-hidden /> Break-even
      </h2>
      <p className="mt-0.5 text-xs text-muted">How much you need to sell each month just to cover your fixed costs.</p>

      {!product || fixed === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-fg/10 p-6 text-center text-sm text-muted">
          {!product ? "Add a product above first." : "Add your fixed monthly costs above first."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">If I only sold</span>
              <select value={product.id} onChange={(e) => setProductId(e.target.value)} className={fieldClass}>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-800">
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Through</span>
              <select value={channel.id} onChange={(e) => setChannelId(e.target.value)} className={fieldClass}>
                {channels.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface-800">
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <BreakEvenResult
            fixed={fixed}
            profit={unitProfit(product, channel).profit}
            price={product.price}
            name={product.name}
            currency={currency}
          />
        </>
      )}
    </section>
  );
}

function BreakEvenResult({
  fixed,
  profit,
  price,
  name,
  currency,
}: {
  fixed: number;
  profit: number;
  price: number;
  name: string;
  currency: string;
}) {
  if (profit <= 0) {
    return (
      <p className="mt-5 flex items-start gap-2 rounded-xl bg-alert/10 p-4 text-sm text-alert ring-1 ring-alert/30">
        <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden />
        Each {name} sold this way loses money after costs and fees, so selling more can never cover your fixed costs.
        Raise the price or cut the cost first.
      </p>
    );
  }
  const units = Math.ceil(fixed / profit);
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <Figure label="Units a month" value={units.toLocaleString()} />
      <Figure label="About per day" value={(units / 30).toFixed(1)} />
      <Figure label="Sales needed" value={formatMoney(units * price, currency, { compact: true })} />
      <p className="text-xs leading-relaxed text-muted sm:col-span-3">
        Your fixed costs are {formatMoney(fixed, currency)} a month and each {name} leaves {formatMoney(profit, currency)} after
        costs and fees. Everything you sell beyond {units.toLocaleString()} a month is profit.
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-fg/[0.04] p-3.5 ring-1 ring-line">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
