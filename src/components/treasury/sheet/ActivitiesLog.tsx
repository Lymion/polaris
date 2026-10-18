"use client";

import { useState } from "react";
import clsx from "clsx";
import { CalendarHeart, Plus, Trash2 } from "lucide-react";
import { rovingKeys } from "@/components/ui/a11y";
import { Button } from "@/components/ui/Button";
import { ACTIVITY_KINDS } from "@/lib/excel";
import { fieldClass, parseAmount, todayIso } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { newId, usePolaris } from "@/lib/store";
import type { ActivityKind } from "@/lib/types";

/** "What happened this month?": launches, promos, events and ads, so the report can link them to sales. */
export function ActivitiesLog({ month }: { month: string }) {
  const all = usePolaris((s) => s.activities);
  const currency = usePolaris((s) => s.profile.currency);
  const saveActivity = usePolaris((s) => s.saveActivity);
  const removeActivity = usePolaris((s) => s.removeActivity);
  const activities = all.filter((a) => a.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));

  const today = todayIso();
  const [date, setDate] = useState(today.startsWith(month) ? today : `${month}-01`);
  const [kind, setKind] = useState<ActivityKind>("promotion");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");

  function add() {
    if (!title.trim()) return setError("Say what happened, e.g. “Weekend 20% off on cupcakes”.");
    if (!date.startsWith(month)) return setError("Pick a date in this month.");
    saveActivity({ id: newId(), date, kind, title: title.trim().slice(0, 120), cost: parseAmount(cost) || 0 });
    setTitle("");
    setCost("");
    setError("");
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarHeart className="size-4 text-star-300" aria-hidden /> What happened this month?
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        Launches, promotions, events, new ads. Your month report links each one to what it did for sales.
      </p>

      {activities.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-14 shrink-0 text-xs tabular-nums text-faint">
                {new Date(`${a.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
              <span className="shrink-0 rounded-full bg-fg/[0.06] px-2 py-0.5 text-xs text-muted">
                {ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label}
              </span>
              <span className="min-w-0 flex-1 truncate" title={a.title}>
                {a.title}
              </span>
              {a.cost > 0 && <span className="text-xs tabular-nums text-muted">{formatMoney(a.cost, currency)}</span>}
              <button
                type="button"
                onClick={() => removeActivity(a.id)}
                aria-label={`Remove ${a.title}`}
                className="tap-target relative rounded-full p-1.5 text-faint transition-colors hover:bg-fg/[0.06] hover:text-alert"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type" onKeyDown={rovingKeys}>
          {ACTIVITY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              tabIndex={kind === k.id ? 0 : -1}
              onClick={() => setKind(k.id)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                kind === k.id ? "bg-star-400/15 text-star-200 ring-star-400/60" : "text-muted ring-line hover:bg-fg/[0.06] hover:text-ink",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[9rem_1fr_7rem] [&>*]:min-w-0">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={fieldClass} />
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="e.g. Launched pandan cupcakes"
            aria-label="What happened"
            className={fieldClass}
          />
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost (opt.)" aria-label={`Cost in ${currency}`} className={fieldClass} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" size="sm">
          <Plus className="size-3.5" aria-hidden /> Add activity
        </Button>
      </form>
    </section>
  );
}
