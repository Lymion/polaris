"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Modal } from "@/components/ui/Modal";
import { AiError, categoriseRows, checkSheet, createMonthReport, importStatement } from "@/lib/ai/client";
import type { ParsedTransaction } from "@/lib/ai/shared";
import { downloadMonthWorkbook, readMonthWorkbook } from "@/lib/excel";
import { mascotName, usePolaris } from "@/lib/store";
import type { MonthlyReport } from "@/lib/types";
import type { AssistTask } from "./sheet/LumiAssist";
import { MonthWrapped } from "./wrapped/MonthWrapped";

// Month-level tools shared by the Treasury tabs: one selected month, Lumi's sheet helpers
// (statement import, sorting, mistake check) and the month's Wrapped story.

export function MonthNav({ label, onPrev, onNext, canNext }: { label: string; onPrev: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="tap-target relative grid size-9 place-items-center rounded-full text-muted ring-1 ring-line transition-colors hover:bg-fg/[0.06] hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <p className="min-w-40 text-center font-semibold">{label}</p>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next month"
        className="tap-target relative grid size-9 place-items-center rounded-full text-muted ring-1 ring-line transition-colors not-disabled:hover:bg-fg/[0.06] not-disabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Lumi's helpers for one month of transactions. Flags found by the check show on the sheet's rows. */
export function useSheetHelper(month: string, monthLabel: string) {
  const entries = usePolaris((s) => s.entries);
  const updateEntry = usePolaris((s) => s.updateEntry);
  const [busy, setBusy] = useState<AssistTask>(null);
  const [message, setMessage] = useState("");
  const [flags, setFlags] = useState<{ id: string; issue: string }[]>([]);
  const [preview, setPreview] = useState<ParsedTransaction[] | null>(null);

  const rows = entries.filter((e) => e.date.startsWith(month));
  const defaultMessage = rows.length
    ? `${rows.length} ${rows.length === 1 ? "entry" : "entries"} in ${monthLabel}. Tap a helper, or ask me anything about this month's money.`
    : `Upload your ${monthLabel} bank statement and I'll fill the month in for you.`;

  const sheetRows = () => rows.map((r) => ({ id: r.id, date: r.date, description: r.note, amount: r.amount, type: r.type, category: r.category, channel: r.channel }));

  function reset() {
    setFlags([]);
    setMessage("");
  }

  async function importFile(file: File) {
    setBusy("statement");
    setMessage("");
    try {
      setPreview(await importStatement(file, month));
    } catch (err) {
      setMessage(err instanceof AiError ? err.message : "I couldn't read that file. Try a CSV export from your bank.");
    } finally {
      setBusy(null);
    }
  }

  async function categorise() {
    if (!rows.length) return setMessage("There's nothing to sort yet. Add some entries first.");
    setBusy("categorise");
    try {
      const { updates } = await categoriseRows(sheetRows());
      let changed = 0;
      for (const u of updates) {
        const row = rows.find((r) => r.id === u.id);
        if (!row) continue;
        const patch = {
          ...(u.category && u.category !== row.category && { category: u.category }),
          ...(u.channel && u.channel !== row.channel && { channel: u.channel }),
        };
        if (Object.keys(patch).length) {
          updateEntry(u.id, patch);
          changed++;
        }
      }
      setMessage(changed ? `Done! I updated ${changed} ${changed === 1 ? "entry" : "entries"}. Check they look right in the sheet.` : "Everything already looks well sorted.");
    } catch (err) {
      setMessage(err instanceof AiError ? err.message : "I couldn't sort them just now. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    if (!rows.length) return setMessage("Nothing logged this month, so nothing to check yet.");
    setBusy("check");
    try {
      const result = await checkSheet(sheetRows());
      setFlags(result.flags);
      setMessage(result.summary || (result.flags.length ? `I found ${result.flags.length} things to look at.` : "No mistakes found. Nice and tidy!"));
    } catch (err) {
      setMessage(err instanceof AiError ? err.message : "I couldn't check the month just now. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    message: message || defaultMessage,
    setMessage,
    flags,
    preview,
    closePreview: (added: number) => {
      setPreview(null);
      if (added)
        setMessage(
          added === 1
            ? "Added 1 entry from your statement. Want me to check it for mistakes?"
            : `Added ${added} entries from your statement. Want me to check them for mistakes?`,
        );
    },
    importFile,
    categorise,
    check,
    reset,
  };
}

/**
 * The Excel round trip for one month: download the template pre-filled, upload it back (replacing
 * the month after a confirm). A spreadsheet that isn't our template is read as a bank statement.
 */
export function useExcelRoundTrip(month: string, monthLabel: string, opts: { onMessage: (text: string) => void; onNotTemplate: (file: File) => void }) {
  const profile = usePolaris((s) => s.profile);
  const entries = usePolaris((s) => s.entries);
  const activities = usePolaris((s) => s.activities);
  const channels = usePolaris((s) => s.channels);
  const replaceMonthEntries = usePolaris((s) => s.replaceMonthEntries);
  const saveActivity = usePolaris((s) => s.saveActivity);
  const removeActivity = usePolaris((s) => s.removeActivity);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof readMonthWorkbook>>>(null);

  const rows = entries.filter((e) => e.date.startsWith(month));
  const fileRows = pending ? pending.entries.filter((e) => e.date.startsWith(month)) : [];
  const fileActivities = pending ? pending.activities.filter((a) => a.date.startsWith(month)) : [];

  function download() {
    void downloadMonthWorkbook({
      month,
      monthLabel,
      business: profile.businessName,
      currency: profile.currency,
      entries: rows,
      activities: activities.filter((a) => a.date.startsWith(month)),
      channels,
    });
    opts.onMessage(`Your ${monthLabel} template is downloading. Fill the green table with money in and the red one with money out, then upload it here.`);
  }

  async function upload(file: File) {
    try {
      const parsed = await readMonthWorkbook(file);
      if (!parsed) {
        opts.onMessage("That isn't the Polaris template, so I'm reading it like a bank statement…");
        return opts.onNotTemplate(file);
      }
      setPending(parsed);
    } catch {
      opts.onMessage("I couldn't open that Excel file. Is it saved as .xlsx?");
    }
  }

  function apply() {
    if (!pending) return;
    replaceMonthEntries(month, fileRows);
    for (const a of activities.filter((a) => a.date.startsWith(month))) removeActivity(a.id);
    for (const a of fileActivities) saveActivity(a);
    opts.onMessage(
      `Loaded ${fileRows.length} rows from your file.${
        pending.skipped.length
          ? ` I skipped ${pending.skipped.length} incomplete ${pending.skipped.length === 1 ? "row" : "rows"} (${pending.skipped.slice(0, 3).join(", ")}${pending.skipped.length > 3 ? "…" : ""}).`
          : ""
      }`,
    );
    setPending(null);
  }

  return {
    download,
    upload,
    pending: pending ? { rows: fileRows.length, activities: fileActivities.length, replacing: rows.length } : null,
    apply,
    cancel: () => setPending(null),
  };
}

/** Making and watching the month's Wrapped story. */
export function useWrapped(month: string) {
  const saveMonthReport = usePolaris((s) => s.saveMonthReport);
  const [state, setState] = useState<"idle" | "writing" | "error">("idle");
  const [error, setError] = useState("");
  const [watching, setWatching] = useState<MonthlyReport | null>(null);

  async function make() {
    setState("writing");
    setError("");
    try {
      const made = await createMonthReport(month);
      saveMonthReport(made);
      setState("idle");
      setWatching(made);
    } catch (err) {
      setError(err instanceof AiError ? err.message : "I couldn't write your story just now. Try again.");
      setState("error");
    }
  }

  return { state, error, dismissError: () => setState("idle"), make, watching, watch: setWatching, close: () => setWatching(null) };
}

/** What goes on screen around a Wrapped: Lumi writing it (or why it didn't finish), then the story itself. */
export function WrappedOverlays({ wrapped, monthLabel }: { wrapped: ReturnType<typeof useWrapped>; monthLabel: string }) {
  const name = usePolaris((s) => mascotName(s.profile));
  const writing = wrapped.state === "writing";
  return (
    <>
      {wrapped.state !== "idle" && (
        <Modal onClose={() => !writing && wrapped.dismissError()} labelledBy="writing-title">
          <div className="flex flex-col items-center py-6 text-center" aria-live="polite">
            <Mascot size={130} mood={writing ? "thinking" : "idle"} />
            <h2 id="writing-title" className="mt-3 font-semibold">
              {writing ? `${name} is writing your ${monthLabel} story…` : "Story didn't finish"}
            </h2>
            <p className={writing ? "mt-1 text-sm text-muted" : "mt-1 text-sm text-alert"}>
              {writing ? "Comparing months and linking your activities to sales with NVIDIA Nemotron Ultra." : wrapped.error}
            </p>
            {writing && <LoaderCircle className="mt-4 size-5 animate-spin text-star-300" aria-hidden />}
          </div>
        </Modal>
      )}
      {wrapped.watching && <MonthWrapped report={wrapped.watching} onClose={wrapped.close} />}
    </>
  );
}

/** Lets Lumi see the month's entries (sent with chat messages) while a money tab is open. */
export function useMonthContext(month: string, monthLabel: string, active: boolean) {
  const entries = usePolaris((s) => s.entries);
  const currency = usePolaris((s) => s.profile.currency);
  const setPageContext = usePolaris((s) => s.setPageContext);

  const rows = entries.filter((e) => e.date.startsWith(month));
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const spent = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const lines = rows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 60)
    .map((r) => `${r.date} | ${r.note || "-"} | ${r.type === "income" ? "in" : "out"} ${r.amount} | ${r.category}${r.channel ? ` | ${r.channel}` : ""}`);
  const context = active
    ? `They are looking at their ${monthLabel} money sheet in ${currency}: ${rows.length} rows, money in ${income}, money out ${spent}.${
        lines.length ? `\nRows (date | description | amount | category | platform):\n${lines.join("\n")}` : ""
      }`
    : null;

  useEffect(() => {
    setPageContext(context);
  }, [context, setPageContext]);
  useEffect(() => () => setPageContext(null), [setPageContext]);
}
