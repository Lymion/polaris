"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ParsedTransaction } from "@/lib/ai/shared";
import { formatMoney } from "@/lib/money";
import { mascotName, newId, usePolaris } from "@/lib/store";

/** Shows what Lumi read from a statement before anything is added to the sheet. */
export function ImportPreview({
  transactions,
  month,
  monthLabel,
  onClose,
}: {
  transactions: ParsedTransaction[];
  month: string;
  monthLabel: string;
  onClose: (added: number) => void;
}) {
  const entries = usePolaris((s) => s.entries);
  const profile = usePolaris((s) => s.profile);
  const addEntries = usePolaris((s) => s.addEntries);

  const outside = transactions.filter((t) => !t.date.startsWith(month)).length;
  const isDuplicate = (t: ParsedTransaction) =>
    entries.some((e) => e.date === t.date && e.type === t.type && Math.abs(e.amount - t.amount) < 0.01);
  const duplicates = transactions.filter(isDuplicate).length;

  const [onlyThisMonth, setOnlyThisMonth] = useState(outside > 0 && outside < transactions.length);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const chosen = transactions.filter((t) => (!onlyThisMonth || t.date.startsWith(month)) && (!skipDuplicates || !isDuplicate(t)));
  const income = chosen.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const spent = chosen.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function confirm() {
    addEntries(
      chosen.map((t) => ({
        id: newId(),
        type: t.type,
        category: t.category,
        amount: t.amount,
        date: t.date,
        note: t.description,
        channel: t.channel || undefined,
      })),
    );
    onClose(chosen.length);
  }

  return (
    <Modal onClose={() => onClose(0)} labelledBy="import-title">
      <div className="flex items-center gap-3">
        <Mascot size={60} mood="happy" className="shrink-0" />
        <div>
          <h2 id="import-title" className="text-lg font-bold">
            I found {transactions.length} transactions
          </h2>
          <p className="mt-1 text-sm text-muted">Check them before {mascotName(profile)} adds them to your sheet.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {outside > 0 && (
          <Toggle checked={onlyThisMonth} onChange={setOnlyThisMonth}>
            Only add the {transactions.length - outside} from {monthLabel} ({outside} are from other months)
          </Toggle>
        )}
        {duplicates > 0 && (
          <Toggle checked={skipDuplicates} onChange={setSkipDuplicates}>
            Skip {duplicates} that look already logged (same date, amount and type)
          </Toggle>
        )}
      </div>

      <div className="mt-4 max-h-72 overflow-y-auto rounded-xl ring-1 ring-line">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-28" />
          </colgroup>
          <tbody>
            {chosen.map((t, i) => (
              <tr key={`${t.date}-${i}`} className="border-b border-line/60 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-faint">{t.date.slice(5)}</td>
                <td className="truncate px-3 py-2">
                  <span className="block truncate" title={t.description}>
                    {t.description}
                  </span>
                  <span className="text-faint">
                    {t.category}
                    {t.channel && ` · ${t.channel}`}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                  {t.type === "income" ? "+" : "−"}
                  {formatMoney(t.amount, profile.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Adding {chosen.length}: {formatMoney(income, profile.currency)} in, {formatMoney(spent, profile.currency)} out. You can edit
        any row afterwards.
      </p>
      <Button className="mt-5 w-full" onClick={confirm} disabled={!chosen.length}>
        <Check className="size-4" aria-hidden /> Add {chosen.length} to my sheet
      </Button>
    </Modal>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[#F5B942]" />
      {children}
    </label>
  );
}
