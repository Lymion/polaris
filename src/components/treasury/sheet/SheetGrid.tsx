"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { rovingKeys } from "@/components/ui/a11y";
import { PresenceItem, Ticker, usePresence } from "@/components/ui/motion";
import { notify } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { parseAmount, todayIso } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { newId, usePolaris } from "@/lib/store";
import type { TreasuryEntry } from "@/lib/types";

const cell =
  "w-full rounded-md bg-transparent px-2 py-1.5 text-sm text-ink ring-1 ring-transparent placeholder:text-faint hover:ring-line focus:bg-fg/[0.05] focus:outline-none focus:ring-focus/70";

/** Default date for a new row: today if this is the current month, otherwise the month's last logged day or its 1st. */
function defaultDate(month: string, rows: TreasuryEntry[]) {
  const today = todayIso();
  if (today.startsWith(month)) return today;
  return rows.length ? rows[rows.length - 1].date : `${month}-01`;
}

/** Spreadsheet-style editor for one month's transactions. */
export function SheetGrid({ month, flags }: { month: string; flags: Map<string, string> }) {
  const entries = usePolaris((s) => s.entries);
  const channels = usePolaris((s) => s.channels);
  const currency = usePolaris((s) => s.profile.currency);
  const addEntry = usePolaris((s) => s.addEntry);
  const updateEntry = usePolaris((s) => s.updateEntry);
  const removeEntry = usePolaris((s) => s.removeEntry);

  const rows = entries.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expenses = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  function setType(row: TreasuryEntry, type: TreasuryEntry["type"]) {
    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    updateEntry(row.id, {
      type,
      category: categories.includes(row.category) ? row.category : categories[categories.length - 1],
      channel: type === "income" ? row.channel : undefined,
    });
  }

  function setAmount(row: TreasuryEntry, type: TreasuryEntry["type"], value: number) {
    if (!(value > 0)) {
      if (row.type === type) updateEntry(row.id, { amount: 0 });
      return;
    }
    setType(row, type);
    updateEntry(row.id, { amount: Math.round(value * 100) / 100 });
  }

  const addRow = () => addEntry({ id: newId(), type: "expense", category: "Other", amount: 0, date: defaultDate(month, rows), note: "" });
  const empty = "This month's sheet is empty. Add rows, upload your bank statement, or fill the Excel template.";
  const shown = usePresence(rows, (r) => r.id);

  // One tap deletes, so the toast offers the way back instead of asking first.
  function remove(row: TreasuryEntry) {
    const index = usePolaris.getState().entries.findIndex((e) => e.id === row.id);
    removeEntry(row.id);
    notify({
      title: "Row deleted",
      description: [row.note, row.amount ? formatMoney(row.amount, currency) : ""].filter(Boolean).join(" · ") || undefined,
      tone: "removed",
      action: { label: "Undo", onClick: () => usePolaris.setState((s) => ({ entries: s.entries.toSpliced(index, 0, row) })) },
    });
  }

  // The full spreadsheet needs about 1000px. Narrower (phones, small tablets), each row
  // becomes a card instead, so nothing has to be scrolled sideways.
  return (
    <div className="panel @container overflow-hidden">
      <div className="@5xl:hidden">
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">{empty}</p>}
        <ul className="divide-y divide-line">
          {shown.list.map(({ key, item: row, state }) => (
            <RowCard
              key={key}
              state={state}
              onSettled={() => shown.settle(key)}
              row={row}
              issue={flags.get(row.id)}
              channels={channels.map((c) => c.name)}
              onUpdate={(patch) => updateEntry(row.id, patch)}
              onType={(type) => setType(row, type)}
              onAmount={(v) => setAmount(row, row.type, v)}
              onRemove={() => remove(row)}
            />
          ))}
        </ul>
        <div className="border-t border-line bg-fg/[0.03] p-4">
          {/* Three across only when the sheet is wide enough for the amounts; narrower, one row each,
              so a long amount never gets cut off or split from its minus sign. */}
          <dl className="grid gap-1.5 tabular-nums @md:grid-cols-3 @md:gap-2 @md:text-center">
            <Total label="Money in" value={formatMoney(income, currency)} num={income} />
            <Total label="Money out" value={formatMoney(expenses, currency)} num={expenses} />
            <Total label="Net" value={formatMoney(income - expenses, currency)} num={income - expenses} alert={income - expenses < 0} />
          </dl>
          <button
            type="button"
            onClick={addRow}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-star-200 ring-1 ring-star-400/40 transition-[transform,background-color] duration-150 ease-out hover:bg-star-400/10 active:scale-[0.97] pointer-coarse:py-3"
          >
            <Plus className="size-4" aria-hidden /> Add row
          </button>
        </div>
      </div>

      <div className="hidden overflow-x-auto @5xl:block">
        <table className="w-full min-w-[1000px] table-fixed text-sm">
          <colgroup>
            <col className="w-36" />
            <col />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-11" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-fg/[0.03] text-left text-xs text-faint">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="px-3 py-2.5 text-right font-medium">Money in</th>
              <th className="px-3 py-2.5 text-right font-medium">Money out</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Sold through</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {shown.list.map(({ key, item: row, state }) => {
              const issue = flags.get(row.id);
              const categories = row.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
              return (
                <FlaggableRow key={key} issue={issue} state={state} onSettled={() => shown.settle(key)}>
                  <td className="px-1.5 py-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => e.target.value && updateEntry(row.id, { date: e.target.value })}
                      aria-label="Date"
                      className={cell}
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      value={row.note}
                      onChange={(e) => updateEntry(row.id, { note: e.target.value.slice(0, 120) })}
                      placeholder="What was it?"
                      aria-label="Description"
                      className={cell}
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <AmountCell value={row.type === "income" ? row.amount : 0} onCommit={(v) => setAmount(row, "income", v)} label="Money in" />
                  </td>
                  <td className="px-1.5 py-1">
                    <AmountCell value={row.type === "expense" ? row.amount : 0} onCommit={(v) => setAmount(row, "expense", v)} label="Money out" />
                  </td>
                  <td className="px-1.5 py-1">
                    <select value={row.category} onChange={(e) => updateEntry(row.id, { category: e.target.value })} aria-label="Category" className={cell}>
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-surface-800">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1.5 py-1">
                    {row.type === "income" ? (
                      <select
                        value={row.channel ?? ""}
                        onChange={(e) => updateEntry(row.id, { channel: e.target.value || undefined })}
                        aria-label="Sold through"
                        className={cell}
                      >
                        <option value="" className="bg-surface-800">
                          –
                        </option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.name} className="bg-surface-800">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 text-faint">–</span>
                    )}
                  </td>
                  <td className="px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      aria-label="Delete row"
                      className="grid size-7 place-items-center rounded-full text-faint transition-[transform,background-color,color] duration-150 ease-out hover:bg-fg/[0.06] hover:text-alert active:scale-90"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </td>
                </FlaggableRow>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-fg/[0.03] text-sm font-semibold tabular-nums">
              <td className="px-3 py-3" colSpan={2}>
                <button
                  type="button"
                  onClick={addRow}
                  className="tap-target relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-star-200 ring-1 ring-star-400/40 transition-[transform,background-color] duration-150 ease-out hover:bg-star-400/10 active:scale-[0.97]"
                >
                  <Plus className="size-3.5" aria-hidden /> Add row
                </button>
              </td>
              <td className="px-3 py-3 text-right">
                <Ticker value={formatMoney(income, currency)} num={income} />
              </td>
              <td className="px-3 py-3 text-right">
                <Ticker value={formatMoney(expenses, currency)} num={expenses} />
              </td>
              <td className={clsx("px-3 py-3", income - expenses < 0 && "text-alert")} colSpan={3}>
                Net <Ticker value={formatMoney(income - expenses, currency)} num={income - expenses} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const field =
  "w-full min-w-0 rounded-lg bg-fg/[0.05] px-3 py-2 text-sm text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-focus/70";

/** One transaction as a stacked card, for narrow screens. */
function RowCard({
  state,
  onSettled,
  row,
  issue,
  channels,
  onUpdate,
  onType,
  onAmount,
  onRemove,
}: {
  state: "staying" | "entering" | "leaving";
  onSettled: () => void;
  row: TreasuryEntry;
  issue?: string;
  channels: string[];
  onUpdate: (patch: Partial<TreasuryEntry>) => void;
  onType: (type: TreasuryEntry["type"]) => void;
  onAmount: (value: number) => void;
  onRemove: () => void;
}) {
  const categories = row.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <PresenceItem state={state} onSettled={onSettled} className={clsx("space-y-2 p-3.5", issue && "bg-caution/[0.07]")}>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={row.date}
          onChange={(e) => e.target.value && onUpdate({ date: e.target.value })}
          aria-label="Date"
          className={clsx(field, "flex-1")}
        />
        <div role="radiogroup" aria-label="Money in or out" className="flex shrink-0 rounded-full bg-fg/[0.04] p-0.5 ring-1 ring-line" onKeyDown={rovingKeys}>
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={row.type === t}
              tabIndex={row.type === t ? 0 : -1}
              onClick={() => row.type !== t && onType(t)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors pointer-coarse:py-2.5",
                row.type === t ? (t === "income" ? "bg-growth/20 text-growth" : "bg-alert/15 text-alert") : "text-muted",
              )}
            >
              {t === "income" ? "In" : "Out"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete row"
          className="tap-target relative grid size-8 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-fg/[0.06] hover:text-alert"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <input
        value={row.note}
        onChange={(e) => onUpdate({ note: e.target.value.slice(0, 120) })}
        placeholder="What was it?"
        aria-label="Description"
        className={field}
      />
      <div className="grid grid-cols-2 gap-2">
        <AmountCell
          value={row.amount}
          onCommit={onAmount}
          label={row.type === "income" ? "Money in" : "Money out"}
          placeholder="Amount"
          className={field}
        />
        <select value={row.category} onChange={(e) => onUpdate({ category: e.target.value })} aria-label="Category" className={field}>
          {categories.map((c) => (
            <option key={c} value={c} className="bg-surface-800">
              {c}
            </option>
          ))}
        </select>
      </div>
      {row.type === "income" && (
        <label className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-faint">Sold through</span>
          <select value={row.channel ?? ""} onChange={(e) => onUpdate({ channel: e.target.value || undefined })} className={field}>
            <option value="" className="bg-surface-800">
              Not sure
            </option>
            {channels.map((c) => (
              <option key={c} value={c} className="bg-surface-800">
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      {issue && (
        <p className="flex gap-1.5 text-xs text-caution">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden /> {issue}
        </p>
      )}
    </PresenceItem>
  );
}

function Total({ label, value, num, alert = false }: { label: string; value: string; num: number; alert?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 @md:block">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className={clsx("whitespace-nowrap text-sm font-semibold @md:mt-0.5", alert && "text-alert")}>
        <Ticker value={value} num={num} />
      </dd>
    </div>
  );
}

function FlaggableRow({
  issue,
  state,
  onSettled,
  children,
}: {
  issue?: string;
  state: "staying" | "entering" | "leaving";
  onSettled: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <PresenceItem as="tr" fade state={state} onSettled={onSettled} className={clsx("border-b border-line/60", issue && "bg-caution/[0.07]")}>
        {children}
      </PresenceItem>
      {issue && (
        <tr className="bg-caution/[0.07]">
          <td colSpan={7} className="px-4 pb-2.5 text-xs text-caution">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> {issue}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

/** Amount input that keeps what's typed ("12.") and saves on blur or Enter. */
function AmountCell({
  value,
  onCommit,
  label,
  placeholder,
  className = cell,
}: {
  value: number;
  onCommit: (v: number) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value > 0 ? value.toFixed(2) : "");

  function commit() {
    if (draft === null) return;
    const v = parseAmount(draft);
    onCommit(Number.isFinite(v) ? v : 0);
    setDraft(null);
  }

  return (
    <input
      inputMode="decimal"
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      aria-label={label}
      placeholder={placeholder}
      className={clsx(className, "text-right tabular-nums")}
    />
  );
}
