"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { FOUNDATIONS } from "@/lib/categories";
import { CURRENCIES, currencyForCountry } from "@/lib/currency";
import { usePolaris } from "@/lib/store";
import type { Foundation } from "@/lib/types";

/** Country plus a checklist of business basics already in place. Saves to the profile as you edit. */
export function BusinessBasics({ className }: { className?: string }) {
  const profile = usePolaris((s) => s.profile);
  const updateProfile = usePolaris((s) => s.updateProfile);
  const selected = new Set(profile.foundations ?? []);

  function toggle(id: Foundation) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateProfile({ foundations: FOUNDATIONS.map((f) => f.id).filter((f) => next.has(f)) });
  }

  return (
    <div className={className}>
      <div className="flex max-w-md flex-wrap items-start gap-3">
        <label className="block min-w-0 flex-1 basis-56">
          <span className="text-sm font-semibold">Where is your business based?</span>
          <input
            value={profile.country}
            onChange={(e) => {
              const currency = currencyForCountry(e.target.value);
              updateProfile({ country: e.target.value, ...(currency && { currency }) });
            }}
            placeholder="e.g. Malaysia"
            className="mt-2 w-full rounded-xl bg-fg/[0.05] px-4 py-2.5 text-sm ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-star-400/70"
          />
        </label>
        {/* Set from the country; change it only if you trade in another currency. */}
        <label className="block w-28">
          <span className="text-sm font-semibold">Currency</span>
          <select
            value={profile.currency}
            onChange={(e) => updateProfile({ currency: e.target.value })}
            className="mt-2 w-full rounded-xl bg-fg/[0.05] px-3 py-2.5 text-sm ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-star-400/70"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-surface-800">
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1.5 max-w-md text-xs text-faint">
        Used to name the right offices for registration and permits. Your currency follows your country; change it only if you trade in another one.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">What do you already have in place?</legend>
        <p className="mt-1 text-xs text-faint">Tick what&apos;s done. Polaris plans missions for the gaps.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FOUNDATIONS.map((f) => {
            const on = selected.has(f.id);
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(f.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-all active:scale-[0.97]",
                  on
                    ? "bg-growth/10 text-growth ring-growth/40"
                    : "bg-fg/[0.04] text-muted ring-line hover:bg-fg/[0.08] hover:text-ink",
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                {f.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
