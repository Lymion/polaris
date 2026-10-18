"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowRight, ArrowUp, Download, FileUp, ListChecks, LoaderCircle, ShieldCheck, Tags, Upload } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot/Mascot";
import { mascotName, usePolaris } from "@/lib/store";

export type AssistTask = "statement" | "categorise" | "check" | null;

/** Lumi's money helpers: one-tap jobs on the month's entries, a running commentary, and questions. */
export function LumiAssist({
  busy,
  message,
  flags,
  onStatement,
  onCategorise,
  onCheck,
  onDownloadExcel,
  onUploadExcel,
  onShowSheet,
  className,
}: {
  busy: AssistTask;
  message: string;
  flags: { id: string; issue: string }[];
  onStatement: () => void;
  onCategorise: () => void;
  onCheck: () => void;
  onDownloadExcel: () => void;
  onUploadExcel: () => void;
  /** Opens the sheet, where flagged rows are highlighted. */
  onShowSheet?: () => void;
  className?: string;
}) {
  const profile = usePolaris((s) => s.profile);
  const openMascot = usePolaris((s) => s.openMascot);
  const setMascotOnStage = usePolaris((s) => s.setMascotOnStage);
  const [question, setQuestion] = useState("");
  const name = mascotName(profile);
  const mood: MascotMood = busy ? "thinking" : "idle";

  // Lumi is already on the page here, so the corner Lumi and its tip bubble step aside, as in the
  // studio. Otherwise the two speech bubbles can land on top of each other.
  useEffect(() => {
    setMascotOnStage(true);
    return () => setMascotOnStage(false);
  }, [setMascotOnStage]);

  return (
    <aside className={clsx("panel space-y-5 p-5 sm:p-6", className)} aria-label={`${name}, your money helper`}>
      <div className="flex items-start gap-3">
        <Mascot size={64} mood={mood} greet className="shrink-0" />
        <div className="relative mt-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug text-space-900" role="status">
          {busy ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              {busy === "statement" ? "Reading your statement…" : busy === "categorise" ? "Sorting your rows…" : "Checking every row…"}
            </span>
          ) : (
            message
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AssistButton icon={FileUp} label="Fill from my bank statement" hint="CSV, Excel, PDF or a photo" onClick={onStatement} disabled={!!busy} />
        <AssistButton icon={Tags} label="Sort categories for me" hint="Fills and fixes categories" onClick={onCategorise} disabled={!!busy} />
        <AssistButton icon={ListChecks} label="Check for mistakes" hint="Duplicates, typos, wrong way round" onClick={onCheck} disabled={!!busy} />
      </div>

      <div>
        <p className="eyebrow text-faint">Excel template</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDownloadExcel}
            className="flex items-center justify-center gap-2 rounded-xl bg-fg/[0.04] px-3 py-2.5 text-sm font-medium ring-1 ring-line transition-colors hover:bg-fg/[0.08]"
          >
            <Download className="size-4 shrink-0 text-star-300" aria-hidden /> Download
          </button>
          <button
            type="button"
            onClick={onUploadExcel}
            disabled={!!busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-fg/[0.04] px-3 py-2.5 text-sm font-medium ring-1 ring-line transition-colors hover:bg-fg/[0.08] disabled:opacity-50"
          >
            <Upload className="size-4 shrink-0 text-star-300" aria-hidden /> Upload filled
          </button>
        </div>
      </div>

      {flags.length > 0 && (
        <div>
          <p className="eyebrow text-caution">{flags.length} to look at</p>
          <ul className="mt-2 space-y-1.5 text-xs text-muted">
            {flags.slice(0, 6).map((f) => (
              <li key={f.id} className="rounded-lg bg-caution/[0.07] px-3 py-2 ring-1 ring-caution/25">
                {f.issue}
              </li>
            ))}
          </ul>
          {onShowSheet && (
            <button
              type="button"
              onClick={onShowSheet}
              className="tap-target relative mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-star-200 hover:underline"
            >
              See them in the sheet <ArrowRight className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          openMascot(question.trim());
          setQuestion("");
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask ${name} about this month…`}
          aria-label={`Ask ${name} about this month`}
          className="min-w-0 flex-1 rounded-full bg-fg/[0.05] px-4 py-2 text-sm ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-star-400/70"
        />
        <button
          type="submit"
          aria-label="Ask"
          disabled={!question.trim()}
          className="tap-target relative grid size-9 shrink-0 place-items-center rounded-full bg-star-400 text-on-accent transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-30"
        >
          <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
        </button>
      </form>

      <p className="flex gap-2 text-xs leading-relaxed text-faint">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
        Statements aren&apos;t stored. Account and card numbers are hidden before {name} reads the transactions.
      </p>
    </aside>
  );
}

function AssistButton({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: typeof FileUp;
  label: string;
  hint: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl bg-fg/[0.04] px-3.5 py-2.5 text-left ring-1 ring-line transition-colors hover:bg-fg/[0.08] disabled:opacity-50"
    >
      <Icon className="size-4 shrink-0 text-star-300" aria-hidden />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-faint">{hint}</span>
      </span>
    </button>
  );
}
