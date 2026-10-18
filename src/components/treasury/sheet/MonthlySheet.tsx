"use client";

import type { ReactNode } from "react";
import { monthKey } from "@/lib/money";
import type { MonthlyReport } from "@/lib/types";
import { LogMoney } from "./LogMoney";
import { CashCard, WrappedStories } from "./MonthPanels";
import { SheetGrid } from "./SheetGrid";

/**
 * One month's money: the sheet edited in place, a quick form for one payment, cash runway and
 * past Wrapped stories. Lumi's helpers (statement, Excel, sorting, mistake check) live on the
 * Overview; rows they flag are marked here.
 */
export function MonthlySheet({
  selected,
  nav,
  flags,
  onWatch,
}: {
  selected: Date;
  nav: ReactNode;
  flags: { id: string; issue: string }[];
  onWatch: (report: MonthlyReport) => void;
}) {
  const month = monthKey(selected);
  return (
    <div className="space-y-6">
      {nav}
      <SheetGrid month={month} flags={new Map(flags.map((f) => [f.id, f.issue]))} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start [&>*]:min-w-0">
        <LogMoney key={month} month={month} />
        <div className="space-y-6">
          <CashCard />
          <WrappedStories onWatch={onWatch} />
        </div>
      </div>
    </div>
  );
}
