"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { fieldClass, parseAmount, todayIso } from "@/lib/inputs";
import { newId, usePolaris } from "@/lib/store";
import type { EntryType } from "@/lib/types";

/** Quick form for one payment in or out. Lands as a row in the month's sheet. */
export function LogMoney({ month, className }: { month: string; className?: string }) {
  const currency = usePolaris((s) => s.profile.currency);
  const channels = usePolaris((s) => s.channels);
  const addEntry = usePolaris((s) => s.addEntry);
  const [type, setType] = useState<EntryType>("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [channel, setChannel] = useState("");
  // Today when looking at this month; otherwise the 1st of the month being filled in.
  const [date, setDate] = useState(() => (todayIso().startsWith(month) ? todayIso() : `${month}-01`));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function switchType(t: EntryType) {
    setType(t);
    setCategory((t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
  }

  function submit() {
    const value = parseAmount(amount);
    if (!(value > 0)) return setError("Enter an amount above zero.");
    if (!date) return setError("Pick a date.");
    addEntry({
      id: newId(),
      type,
      category,
      amount: Math.round(value * 100) / 100,
      date,
      note: note.trim(),
      channel: type === "income" && channel ? channel : undefined,
    });
    setAmount("");
    setNote("");
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <form
      className={clsx("panel p-5 sm:p-6", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="font-semibold">Log money</h2>
      <p className="mt-0.5 text-xs text-muted">One payment in or out. It goes straight into the sheet above.</p>
      <div className="mt-4 grid grid-cols-2 rounded-full bg-fg/[0.04] p-1 ring-1 ring-line" role="radiogroup" aria-label="Type">
        {(
          [
            ["income", "Money in", ArrowDownLeft],
            ["expense", "Money out", ArrowUpRight],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => switchType(value)}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors",
              type === value ? (value === "income" ? "bg-growth/15 text-growth" : "bg-alert/15 text-alert") : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Amount</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">{currency}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            placeholder="0.00"
            className={clsx(fieldClass, "pl-14 text-base font-semibold")}
          />
        </div>
      </label>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-xs font-medium text-muted">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                category === c ? "bg-star-400/15 text-star-200 ring-star-400/60" : "text-muted ring-line hover:bg-fg/[0.06] hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid grid-cols-2 gap-3 [&>label]:min-w-0">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Date</span>
          <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </label>
        {type === "income" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Sold through</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={fieldClass}>
              <option value="" className="bg-surface-800">
                Not sure
              </option>
              {channels.map((c) => (
                <option key={c.id} value={c.name} className="bg-surface-800">
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={fieldClass} />
          </label>
        )}
      </div>
      {type === "income" && (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, e.g. 3 birthday cakes" className={fieldClass} />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-5 w-full">
        <Plus className="size-4" aria-hidden /> {saved ? "Saved!" : type === "income" ? "Add money in" : "Add money out"}
      </Button>
    </form>
  );
}
