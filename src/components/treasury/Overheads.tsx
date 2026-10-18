"use client";

import { useState } from "react";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { averageMonthlySales, totalOverheads } from "@/lib/finance";
import { OVERHEAD_PRESETS } from "@/lib/categories";
import { fieldClass, parseAmount } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { mascotName, newId, usePolaris } from "@/lib/store";
import { BarList } from "./CashflowChart";

/** Fixed monthly costs: the list of costs, and what they mean per day and against sales. */
export function OverheadsSection() {
  const overheads = usePolaris((s) => s.overheads);
  const entries = usePolaris((s) => s.entries);
  const profile = usePolaris((s) => s.profile);
  const saveOverhead = usePolaris((s) => s.saveOverhead);
  const removeOverhead = usePolaris((s) => s.removeOverhead);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const currency = profile.currency;
  const total = totalOverheads(overheads);
  const sales = averageMonthlySales(entries);
  const share = sales > 0 ? total / sales : null;
  const unused = OVERHEAD_PRESETS.filter((p) => !overheads.some((o) => o.name === p));

  function add() {
    const v = parseAmount(amount);
    if (!name.trim()) return setError("Name the cost, e.g. Rent.");
    if (!(v > 0)) return setError("Enter the monthly amount.");
    saveOverhead({ id: newId(), name: name.trim().slice(0, 40), amount: v });
    setName("");
    setAmount("");
    setError("");
  }

  // The monthly total and the biggest costs sit on the Overview with the other headline numbers;
  // here is where costs are entered, beside what they mean day to day.
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="panel p-5 sm:p-6">
        <h2 className="font-semibold">Fixed monthly costs</h2>
        <p className="mt-0.5 text-xs text-muted">
          Costs you pay every month whether or not you sell anything. Ingredients and stock don&apos;t go here.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {overheads.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium" title={o.name}>
                {o.name}
              </span>
              <span className="tabular-nums text-muted">{formatMoney(o.amount, currency)}</span>
              <button
                type="button"
                onClick={() => removeOverhead(o.id)}
                aria-label={`Remove ${o.name}`}
                className="tap-target relative rounded-full p-1.5 text-faint transition-colors hover:bg-fg/[0.06] hover:text-alert"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {unused.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Common costs">
            {unused.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setName(p)}
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs ring-1 transition-colors",
                  name === p ? "bg-star-400/15 text-star-200 ring-star-400/60" : "text-muted ring-line hover:bg-fg/[0.06] hover:text-ink",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <form
          className="mt-3 grid grid-cols-[1fr_7rem] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Cost name" aria-label="Cost name" className={fieldClass} />
          <input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder={`${currency} / month`} aria-label={`Monthly amount in ${currency}`} className={fieldClass} />
          <Button type="submit" variant="secondary" size="sm" className="col-span-2 justify-self-start">
            <Plus className="size-3.5" aria-hidden /> Add cost
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm text-alert">
            {error}
          </p>
        )}
      </section>

      <div className="grid gap-3">
        <Tile label="Cost to stay open, per day" value={formatMoney(total / 30, currency)} note="Your fixed costs spread over 30 days" />
        <Tile
          label="Share of your average sales"
          value={share === null ? "–" : `${Math.round(share * 100)}%`}
          note={share === null ? "Log sales in the Monthly sheet to see this" : `of ${formatMoney(sales, currency, { compact: true })} a month`}
          tone={share !== null && share >= 1 ? "bad" : undefined}
        />
      </div>
    </div>
  );
}

/** Fixed costs ranked by size, with a nudge to ask Lumi whether they're healthy. */
export function BiggestFixedCosts({ className }: { className?: string }) {
  const overheads = usePolaris((s) => s.overheads);
  const entries = usePolaris((s) => s.entries);
  const profile = usePolaris((s) => s.profile);
  const openMascot = usePolaris((s) => s.openMascot);
  const currency = profile.currency;
  const sales = averageMonthlySales(entries);

  return (
    <section className={clsx("panel p-5 sm:p-6", className)}>
      <h2 className="font-semibold">Biggest fixed costs</h2>
      <p className="mt-0.5 text-xs text-muted">Monthly amount per cost</p>
      <div className="mt-5">
        {overheads.length ? (
          <BarList rows={[...overheads].sort((a, b) => b.amount - a.amount).map((o) => ({ label: o.name, amount: o.amount }))} currency={currency} />
        ) : (
          <p className="text-sm text-faint">Add your rent, bills and salaries in Margins &amp; overheads to see where your fixed money goes.</p>
        )}
      </div>
      {overheads.length > 0 && (
        <button
          type="button"
          onClick={() =>
            openMascot(
              `Look at my fixed monthly costs for my ${profile.industry ?? ""} business: ${overheads
                .map((o) => `${o.name} ${formatMoney(o.amount, currency)}`)
                .join(", ")}. ${sales > 0 ? `My average monthly sales are about ${formatMoney(sales, currency)}.` : ""} Are any of these too high for a business like mine, and how could I lower them?`,
            )
          }
          className="tap-target relative mt-6 inline-flex items-center gap-2 rounded-full bg-star-400/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-star-200 ring-1 ring-star-400/40 transition-[transform,background-color] duration-150 ease-out hover:bg-star-400/20 active:scale-[0.97]"
        >
          <Mascot size={26} still /> Ask {mascotName(profile)} if these are healthy
        </button>
      )}
    </section>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "bad" }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={clsx("mt-1.5 text-2xl font-bold", tone === "bad" && "text-alert")}>{value}</p>
      {note && <p className="mt-1 text-xs text-faint">{note}</p>}
    </div>
  );
}
