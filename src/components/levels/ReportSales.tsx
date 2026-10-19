"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { notify } from "@/components/ui/toast";
import { CURRENCIES, currencyForCountry } from "@/lib/currency";
import { LEVELS, gateText } from "@/lib/levels";
import { formatMoney } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";

const inputClass =
  "w-full rounded-xl bg-fg/[0.05] px-4 py-3 text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-focus/70";

/** Button plus dialog for reporting total and best-month sales, which unlock the higher levels. */
export function ReportSales({
  label = "Report sales",
  variant = "secondary",
  size = "sm",
}: {
  label?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <TrendingUp className="size-4" aria-hidden /> {label}
      </Button>
      {open && <SalesDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SalesDialog({ onClose }: { onClose: () => void }) {
  const profile = usePolaris((s) => s.profile);
  const revenue = usePolaris((s) => s.revenue);
  const updateProfile = usePolaris((s) => s.updateProfile);
  const updateRevenue = usePolaris((s) => s.updateRevenue);

  const [currency, setCurrency] = useState(
    revenue.updatedAt ? profile.currency : (currencyForCountry(profile.country) ?? profile.currency),
  );
  const [lifetime, setLifetime] = useState(revenue.lifetime ? String(revenue.lifetime) : "");
  const [bestMonth, setBestMonth] = useState(revenue.bestMonth ? String(revenue.bestMonth) : "");
  const [error, setError] = useState("");

  function save() {
    const total = Number(lifetime.replace(/[^\d.]/g, "") || 0);
    const month = Number(bestMonth.replace(/[^\d.]/g, "") || 0);
    if (!Number.isFinite(total) || !Number.isFinite(month)) return setError("Use numbers only.");
    if (month > total && total > 0) return setError("Your best month can't be more than your total sales.");
    updateProfile({ currency });
    const before = usePolaris.getState().celebration;
    updateRevenue({ lifetime: total, bestMonth: month });
    // A level-up already celebrates; otherwise say the numbers were saved.
    if (usePolaris.getState().celebration === before) {
      notify({ title: "Sales updated", description: `${formatMoney(total, currency, { compact: true })} in total` });
    }
    onClose();
  }

  return (
    <Modal onClose={onClose} labelledBy="sales-title">
      <div className="flex items-center gap-4">
        <Mascot size={72} greet />
        <div>
          <h2 id="sales-title" className="text-xl font-bold tracking-tight">
            How are sales going?
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mascotName(profile)} uses this to unlock levels and plan missions that fit where you are. Rough numbers
            are fine. Sales you log in the Treasury count automatically.
          </p>
        </div>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-surface-800">
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Total sales since you started</span>
          <input
            inputMode="decimal"
            value={lifetime}
            onChange={(e) => {
              setLifetime(e.target.value);
              setError("");
            }}
            placeholder="e.g. 3500"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your best single month of sales</span>
          <input
            inputMode="decimal"
            value={bestMonth}
            onChange={(e) => {
              setBestMonth(e.target.value);
              setError("");
            }}
            placeholder="e.g. 1200"
            className={inputClass}
          />
        </label>

        <details className="rounded-xl bg-fg/[0.03] px-4 py-3 text-sm ring-1 ring-line">
          <summary className="cursor-pointer font-medium text-muted">Which milestones unlock which levels?</summary>
          <ul className="mt-3 space-y-1.5 text-xs text-muted">
            {LEVELS.slice(1).map((l) => (
              <li key={l.level} className="flex justify-between gap-3">
                <span>
                  Level {l.level} · <span className="text-ink">{l.title}</span>
                </span>
                <span className="text-right">
                  {l.xp.toLocaleString()} XP + {gateText(l, currency)}
                </span>
              </li>
            ))}
          </ul>
        </details>

        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Save my numbers
        </Button>
      </form>
    </Modal>
  );
}
